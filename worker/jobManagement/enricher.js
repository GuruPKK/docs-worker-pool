const utils = require('../utils/utils');
const fs = require('fs');
const fsAsync = require('fs').promises;
const yaml = require('js-yaml');

class JobEnricher {
    constructor(config, logger, sourceControlClient) {
        this.config = config;
        this.logger = logger;
        this.sourceControlClient = sourceControlClient;
    }

    async executeCommands(commands) {
        try {
            const exec = utils.getExecPromise();
            return await exec(commands.join(' && '));
        } catch (error) {
            this.logger.log(`${'(BUILD)'.padEnd(15)}failed with code: ${error.code}. `);
            this.logger.log(`${'(BUILD)'.padEnd(15)}stdErr: ${error.stderr}`);
            throw error;
        }
    }

    async setNextGenBuild() {
        const workerPath = `repos/${this.job.payload.repoName}/worker.sh`;
        let workerLines = []
        if (fs.existsSync(workerPath)) {
            // the way we now build is to search for a specific function string in worker.sh
            // which then maps to a specific target that we run
            const workerContents = await fsAsync.readFile(workerPath, {
                encoding: 'utf8'
            });
            workerLines = workerContents.split(/\r?\n/);
        }
        console.log(workerPath);
        console.log(workerLines);
        console.log(workerLines.indexOf('"build-and-stage-next-gen"'));
        this.job.payload.isBuildNextGen = workerLines.indexOf('"build-and-stage-next-gen"') >= 0;
    }

    async setProdDeploy() {
        this.job.payload.isProdDeploy = this.job.payload.jobType == this.config.prodDeploy;
    }

    async constructPrefix() {

        if (this.job.payload.isBuildNextGen) {
            try {
                const repoName = this.job.payload.repoName;
                const repoContent = await this.sourceControlClient.downloadFile(`https://raw.githubusercontent.com/mongodb/docs-worker-pool/meta/publishedbranches/${repoName}.yaml`, yaml.safeLoad);
                const server_user = await utils.getServerUser()
                let pathPrefix;
                if (this.job.payload.isProdDeploy) {
                    //versioned repo
                    if (repoContent) {
                        if (repoContent.content.version.active.length > 1) {
                            pathPrefix = `${repoContent.content.prefix}/${this.job.payload.alias ? this.job.payload.alias : this.job.payload.branchName}`;
                        } else {
                            pathPrefix = `${this.job.payload.alias ? this.job.payload.alias : repoContent.content.prefix}`;
                        }
                    }
                }
                // server staging commit jobs
                else if (this.job.payload.patch && this.job.payload.patchType === 'commit') {
                    pathPrefix = `${repoContent.content.prefix}/${this.job.user}/${this.job.payload.localBranchName}/${server_user}/${this.job.payload.branchName}`;
                }
                //mut only expects prefix or prefix/version for versioned repos, have to remove server user from staging prefix
                if (typeof pathPrefix !== 'undefined' && pathPrefix !== null) {
                    this.job.payload.pathPrefix = pathPrefix;
                    const mutPrefix = pathPrefix.split(`/${server_user}`)[0];
                    this.job.payload.mutPrefix = mutPrefix;
                }
            } catch (error) {
                this.logger.log(error)
                throw error
            }
        }
    }

    async configureGatsby() {
        if (this.job.payload.isBuildNextGen) {
            let server_user = await utils.getServerUser();
            let envVars = `GATSBY_PARSER_USER=${server_user}\nGATSBY_PARSER_BRANCH=${this.job.payload.branchName}\n`;
            if (this.job.payload.pathPrefix) {
                envVars += `PATH_PREFIX=${this.job.payload.pathPrefix}\n`
            }
            await fsAsync.writeFile(`repos/${this.job.payload.repoName}/.env.production`, envVars, { encoding: 'utf8', flag: 'w' });
        }
    }

    async constructManifestIndexPath() {
        if (this.job.payload.isBuildNextGen && this.job.payload.isProdDeploy && (!this.job.payload.aliased ||
            (this.job.payload.aliased && this.job.payload.primaryAlias))) {
            const commands = [
                `. /venv/bin/activate`,
                `cd ~/repos/${this.job.payload.repoName}`,
                `make get-project-name`
            ]
            const { stdout } = await this.executeCommands(commands);
            this.job.payload.manifestPrefix = stdout.trim() + '-' + (this.job.payload.alias ? this.job.payload.alias : this.job.payload.branchName)
        }
    }

    async execute(job) {
        this.job = job;
        await this.setNextGenBuild();
        await this.setProdDeploy();
        await this.constructPrefix();
        await this.constructManifestIndexPath();
        await this.configureGatsby();
        return this.job;
    }
}
module.exports = {
    JobEnricher
  }
  