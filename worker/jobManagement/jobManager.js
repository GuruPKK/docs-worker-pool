const utils = require('../utils/utils');
const Logger = require('../services/logger').Logger;
const Verifier = require('./verifier').Verifier;
const Preparer = require('./preparer').Preparer;
const Enricher = require('./enricher').JobEnricher;

class JobManager {
    constructor(config, logger, queue, sourceControlClient, dbClient, cdn) {
        this.appLogger = logger;
        this.config = config;
        this.queue = queue;
        this.sourceControlClient = sourceControlClient;
        this.shouldStop = false;
        this.currentJob = null;
        this.dbClient = dbClient;
        this.cdn = cdn;
        this.jobLogger = null;
    }

    //#region Job Updates
    async failCurrentJobWithReason(reason) {
        this.shouldStop = true;
        if (this.currentJob) {
            const logMsg = `${'    (ERROR)'.padEnd(this.config.LOG_PADDING)}Failing Job with ID: ${this.currentJob._id} ${reason}`;
            this.jobLogger.log(logMsg);
            await utils.promiseTimeoutS(this.config.TIMEOUT_S, await this.updateJobStatus(this.currentJob._id, 'failed', reason),
                `Timeout Error: Timed out finishing failed job with jobId: ${this.currentJob._id}`);
        }
    }

    async updateJobStatus(id, status, reason) {
        console.log(`updating ${id} ${status}`);
        await this.queue.updateStatus(id, reason, status);
        console.log(`updated ${id} ${status}`);
    }

    //#endregion

    //#region Job Processing
    async pollJob() { 
        let job = null;
        const item = await utils
            .promiseTimeoutS(
                this.config.POLL_TIMEOUT_S,
                this.queue.getNextItem(),
                'Timeout Error: Timed out getting next job from queue collection'
            )
            .catch(error => {
                this.appLogger.reportStatus(`error getting job ${error}`);
            });

        if (item && item.value) {
            job = item.value;

        } else {
            // Log that no jobs were found
            this.appLogger.reportStatus('No Jobs Found');
        }
        return job;
    }

    async executeJob() {
        try {
            // Verify
            console.log("Verifying");
            const verifier = new Verifier(this.config, this.jobLogger, this.sourceControlClient, this.dbClient)
            this.currentJob = await verifier.execute(this.currentJob);

            // Prepare
            console.log("Preparing");
            const preparer = new Preparer(this.config,this.jobLogger, this.sourceControlClient);
            this.currentJob = await preparer.execute(this.currentJob);

            // enrich
            console.log("enriching");
            const enricher = new Enricher(this.config, this.jobLogger, this.sourceControlClient);
            this.currentJob = await enricher.execute(this.currentJob)
            console.log("encriched");
            // build
            console.log("building");
            if (this.config.jobtypes[this.currentJob.payload.jobType]['buildModule']) {
                const builder = new this.config.jobtypes[this.currentJob.payload.jobType]['buildModule'](this.currentJob, this.sourceControlClient, this.jobLogger, this.config);
                const buildResult = await builder.build();
                await verifier.verifyBuildResults(buildResult);
                this.currentJob = builder.job;
            }
            console.log("build completed");

            // publish
            console.log("publishing");
            if (this.config.jobtypes[this.currentJob.payload.jobType]['publishModule']) {
                const publisher = new this.config.jobtypes[this.currentJob.payload.jobType]['publishModule'](this.cdn, this.currentJob, this.jobLogger);
                const publishResult = await publisher.publish();
                await verifier.verifyPublishResults(publishResult);
            }
            console.log("published");
        } catch (error) {
            this.jobLogger.log(error.stack)
            this.updateJobStatus(this.currentJob._id, 'failed', error);
        }
    }

    async managePlatformJobs() {
        if (this.shouldStop) {
            this.logger.reportStatus('shutting down');
            throw new Error('Shutting Down --> Should not get new jobs');
        }

        try {
            const job = await this.pollJob()
            if (!job) {
                this.appLogger.reportStatus('No Jobs to handle');
            } else { 
                job.payload.isLocalBuild = false;
                this.currentJob = job;
                this.jobLogger = new Logger(this.config, this.dbClient, job._id, this.appLogger.ip);
                await this.executeJob(false);
                
            }
        } catch (error) {
            console.log(error)
            this.jobLogger.log(error)
        }
        this.jobLogger = null;
        this.currentJob = null;
        setTimeout(this.managePlatformJobs.bind(this), this.config.RETRY_TIMEOUT_MS);
    }

    async manageLocalJob(job) {
        this.currentJob = job;
        await this.executeJob(true);
    }
    //#endregion   
}

module.exports = {
    JobManager: JobManager
}