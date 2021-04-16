const utils = require('../utils/utils');
const fs = require('fs').promises;

class Preparer {
    constructor(config, logger, sourceControlClient) {
        this.logger = logger;
        this.sourceControlClient = sourceControlClient
        this.config = config
        this.job = null;
    }

    getRepoDirName() {
        return `${this.job.payload.repoName}`;
    }

    async executeCommands(commands) {
        try {
            const exec = utils.getExecPromise();
            await exec(commands.join(' && '));
        } catch (error) {
            this.logger.log(`${'(BUILD)'.padEnd(15)}failed with code: ${error.code}. `);
            this.logger.log(`${'(BUILD)'.padEnd(15)}stdErr: ${error.stderr}`);
            throw error;
        }
        return this;
    }

    async cleanup() {
        this.logger.log(`${'(rm)'.padEnd(15)}Cleaning up repository`);
        try {
            utils.removeDirectory(`${this.config.repoDir}/${this.getRepoDirName()}`);
            this.logger.log(`${'(rm)'.padEnd(15)}Finished cleaning repo`);
        } catch (errResult) {
            this.logger.log(`${'(CLEANUP)'.padEnd(15)}failed cleaning repo directory`);
            throw errResult;
        }
        return this;
    }

    async clone() {
        console.log(`${this.job.payload.branchName}, ${this.job.payload.repoOwner}, ${this.getRepoDirName()}, ${this.job.payload.branchName}, ${this.job.payload.private}`);
        await this.sourceControlClient.cloneRepo(this.config.repoDir, this.job.payload.repoOwner, this.getRepoDirName(), this.job.payload.branchName, this.job.payload.private);
        return this;
    }

    async applyPatch() {
        //create patch file
        if (this.job.payload.patch) {
            try {
                await fs.writeFileSync(`${this.config.repoDir}/${this.getRepoDirName()}/myPatch.patch`, this.job.payload.patch, { encoding: 'utf8', flag: 'w' });

            } catch (error) {
                this.logger.log('Error creating patch ', error);
                throw error;
            }
            //apply patch
            try {
                const commandsToBuild = [
                    `cd ${this.config.repoDir}/${this.getRepoDirName()}`,
                    `patch -p1 < myPatch.patch`
                ];
                const exec = utils.getExecPromise();
                await exec(commandsToBuild.join(' && '));

            } catch (error) {
                this.logger.log('Error applying patch: ', error)
                throw error;
            }
        }
        return this
    }

    async throwIfCommitHashInvalid() {
        const commitCheckCommands = [
            `cd ${this.config.repoDir}/${this.getRepoDirName()}`,
            `git fetch`,
            `git checkout ${ this.job.payload.branchName}`,
            `git branch ${ this.job.payload.branchName} --contains ${job.payload.newHead}`
        ];

        const {
            stdout
        } = await this.executeCommands(commitCheckCommands.join(' && '));

        if (!stdout.includes(`* ${ this.job.payload.branchName}`)) {
            const err = new Error(`Specified commit does not exist on ${ this.job.payload.branchName} branch`);
            this.logger.log(`${'(BUILD)'.padEnd(15)} failed. The specified commit does not exist on ${ this.job.payload.branchName} branch.`);
            throw err
        }
    }

    async getPullRepoCommands() {
        this.pullRepoCommands = [`cd ${this.config.repoDir}/${this.getRepoDirName()}`];
        if (this.job.payload.newHead && this.job.title !== 'Regression Test Child Process') {
            // if commit hash is provided, use that
            await this.throwIfCommitHashInvalid();
            this.pullRepoCommands.push(
                ...[
                    `git checkout ${job.payload.branchName}`,
                    `git pull origin ${job.payload.branchName}`,
                    `git checkout ${job.payload.newHead} .`
                ]
            );

        } else {
            this.pullRepoCommands.push(
                ...[
                    `git checkout ${ this.job.payload.branchName}`,
                    `git pull origin ${ this.job.payload.branchName}`
                ]
            );
        }
        return this;
    }

    async updateMakeFile() {
        // overwrite repo makefile with the one our team maintains
        const makefileContents = await this.sourceControlClient.downloadFile(`https://raw.githubusercontent.com/mongodb/docs-worker-pool/meta/makefiles/Makefile.${this.getRepoDirName()}`);
        if (makefileContents && makefileContents.status === 'success') {
            const writeOptions = {
                encoding: 'utf8',
                flag: 'w'
            };
            await fs.writeFile(`${this.config.repoDir}/${this.getRepoDirName()}/Makefile`, makefileContents.content, writeOptions);
        } else {
            this.logger.log('ERROR: makefile does not exist in /makefiles directory on meta branch.');
        }
        return this;
    }

    async execute(job) {
        if (!job.payload.isLocalBuild) {
            // setup for building
            this.job = job;
            await this.cleanup();
            await this.clone();
            await this.getPullRepoCommands();
            await this.executeCommands(this.pullRepoCommands);
            await this.applyPatch()
            await this.updateMakeFile()
            return this.job;
        }
        return job;
    }
}
module.exports = {
    Preparer: Preparer
}
