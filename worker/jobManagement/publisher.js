
const workerUtils = require('../utils/utils');

class Publisher {

    constructor(cdn, job, logger) {
        this.cdn = cdn;
        this.job = job;
        this.logger = logger;
    }

    //#region STAGE
    async buildStageDeployCommands() {
        this.stageCommands = [
            '. /venv/bin/activate',
            `cd ${this.config.repoDir}/${job.payload.repoName}`,
            'make stage'
        ];
        if (this.job.payload.isBuildNextGen) {
            if (this.job.payload.pathPrefix) {
                this.stageCommands[stageCommands.length - 1] = `make next-gen-stage MUT_PREFIX=${job.payload.mutPrefix}`;
            } else {
                // front end constructs path prefix for regular githubpush jobs and commitless staging jobs
                this.stageCommands[stageCommands.length - 1] = 'make next-gen-stage'
            }
        }
        return this;
    }

    async deployStage() {
        try {
            const exec = workerUtils.getExecPromise();
            const command = this.stageCommands.join(' && ');
            const { stdout, stderr } = await exec(command);
            let stdoutMod = stdout;

            if (stderr && stderr.indexOf('ERROR') !== -1) {
                logger.log(
                    `${'(stage)'.padEnd(15)}Failed to push to staging`
                );
                throw new Error(`Failed pushing to staging: ${stderr}`)
            }
            // get only last part of message which includes # of files changes + s3 link
            if (stdout.indexOf('Summary') !== -1) {
                stdoutMod = stdout.substr(stdout.indexOf('Summary'));
            }
            logger.log(`${'(stage)'.padEnd(15)}Finished pushing to staging`);
            logger.log(`${'(stage)'.padEnd(15)}Staging push details:\n\n${stdoutMod}`);
            return {
                status: 'success',
                stdout: stdoutMod
            };
        } catch (errResult) {
            logger.log(`${'(stage)'.padEnd(15)}stdErr: ${errResult.stderr}`);
            throw errResult;
        }
    }
    async pushToStage() {
        if (!this.job.payload.isProdDeploy) {
            this.logger.log(`${'(stage)'.padEnd(15)}Pushing to staging`);
            await this.buildStageDeployCommands()
                .deployStage();
        }
    }

    //#endregion STAGE

    //#region PROD

    async buildProdDeployCommands() {
        this.deployCommands = [
            '. /venv/bin/activate',
            `cd ${this.config.repoDir}/${this.job.payload.repoName}`,
            'make publish && make deploy'
        ];
        // check if need to build next-gen
        if (this.job.payload.isBuildNextGen) {
            const manifestPrefix = this.job.payload.manifestPrefix
            deployCommands[deployCommands.length - 1] = `make next-gen-deploy MUT_PREFIX=${this.job.payload.mutPrefix}`;
            //set makefile vars related to search indexing if this is a build we are supposed to index
            //as defined in githubJob.js
            if (manifestPrefix) {
                deployCommands[deployCommands.length - 1] += ` MANIFEST_PREFIX=${manifestPrefix} GLOBAL_SEARCH_FLAG=${this.job.payload.stableBranch}`;
            }
        }
        return this;
    }

    async deploy() {
        try {
            const exec = workerUtils.getExecPromise();
            const command = this.deployCommands.join(' && ');
            this.deployResults = await exec(command);
            if (this.deployResults.stderr && this.deployResults.stderr.indexOf('ERROR') !== -1) {
                logger.save(`${'(prod)'.padEnd(15)}Failed to push to prod`);
                throw new Error(`Failed pushing to prod: ${this.deployResults.stderr}`)
            }
        } catch (errResult) {
            this.logger.log(`${'(prod)'.padEnd(15)}stdErr: ${errResult.stderr}`);
            throw errResult;
        }
        return this;
    }

    async validateDeployAndPurge() {
        try {
            const validateJsonOutput = this.deployResults.stdout ? this.deployResults.stdout.substr(0, stdout.lastIndexOf(']}') + 2) : '';
            this.deployResults.stdoutJSON = JSON.parse(validateJsonOutput);
            this.purgeUrls = stdoutJSON.urls;
            stdoutMod = this.deployResults.stdout;
            await this.cdn.purgeCache(stdoutJSON.urls);
            logger.log(`${'(prod)'.padEnd(15)}Fastly finished purging URL's`);
            logger.log('CDN Summary: The following pages were purged from cache for your deploy', true);
            let batchedUrls = [];
            for (let i = 0; i < urls.length; i++) {
                const purgedUrl = urls[i];
                if (purgedUrl && purgedUrl.indexOf('.html') !== -1) {
                    batchedUrls.push(purgedUrl);
                }
                // if over certain length, send as a single slack message and reset the array
                if (batchedUrls.length > 20 || i >= (urls.length - 1)) {
                    logger.log(`${batchedUrls.join('\n')}`, true);
                    batchedUrls = [];
                }
            }
        } catch (error) {
            if (this.deployResults.stdout.indexOf('Summary') !== -1) {
                stdoutMod = this.deployResults.stdout.substr(this.deployResults.stdout.indexOf('Summary'));
            }
        }
        this.logger.log(`${'(prod)'.padEnd(15)}Finished pushing to production`);
        this.logger.log(`${'(prod)'.padEnd(15)}Deploy details:\n\n${stdoutMod}`);
        return {
            status: 'success',
            stdout: stdoutMod
        };
    }

    async pushToProduction() {
        if (this.job.payload.isProdDeploy) {
            this.logger.log(`${'(prod)'.padEnd(15)}Pushing to production`);
            await this.buildProdDeployCommands()
                .deploy()
                .validateDeployAndPurge();
        }
    }

    //#endregion

    async publish() {
        await this.pushToStage();
        await this.pushToProduction();
    }
}

module.exports = {
    Publisher
};
