const fs = require('fs-extra');
const utils = require('../utils/utils');
const yaml = require('js-yaml');
class BuildHandler {
    constructor(job, sourceControlClient, logger, config) {
        this.job = job;
        this.sourceControlClient = sourceControlClient;
        this.logger = logger;
        this.config = config;
    }

    getRepoDirName() {
        return `${this.job.payload.repoName}`;
    }

    async executeCommands(commands) {
        try {
            const exec = utils.getExecPromise();
            return await exec(commands.join(' && '));
        } catch (error) {
            await this.logger.log(`${'(BUILD)'.padEnd(15)}failed with code: ${error.code}. `);
            await this.logger.log(`${'(BUILD)'.padEnd(15)}stdErr: ${error.stderr}`);
            throw error;
        }
    }

    getBuildCommands() {
        // default commands to run to build repo
        const commandsToBuild = [
            `. /venv/bin/activate`,
            `cd ${this.config.repoDir}/${this.getRepoDirName()}`,
            `rm -f makefile`
        ];
        // Front end constructs path for regular staging jobs 
        // via the env vars defined/written in GatsbyAdapter.initEnv(), so the server doesn't have to create one here
        // check if need to build next-gen
        console.log(this.job);
        if (this.job.payload.isBuildNextGen) {
            if (!this.job.payload.isProdDeploy) {
                commandsToBuild.push('make next-gen-html');
            } else {
                commandsToBuild.push(...[
                    'make get-build-dependencies',
                    'make next-gen-html'
                ]);
            }
        }
        return commandsToBuild;

    }
    async build() {
        await this.logger.log(`${'(BUILD)'.padEnd(15)}Running Build`);
        await this.logger.log(`${'(BUILD)'.padEnd(15)}running worker.sh`);
        const {
            stdout,
            stderr
        } = await this.executeCommands(this.getBuildCommands());

        await this.logger.log(`${'(BUILD)'.padEnd(15)}Finished Build`);
        await this.logger.log(`${'(BUILD)'.padEnd(15)}worker.sh run details:\n\n${stdout}\n---\n${stderr}`);
        return {
            status: 'success',
            stdout,
            stderr
        }
    }
}

module.exports = {
    BuildHandler
};