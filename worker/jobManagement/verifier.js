const error = require('../utils/errors');
const yaml = require('js-yaml');


class Verifier {
    constructor(config, logger, sourceControlClient, dbClient) {
        this.config = config;
        this.sourceControlClient = sourceControlClient;
        this.shouldStop = false;
        this.dbClient = dbClient;
        this.logger = logger
    }

    //#region validation
    async validateJobDef() {
        if (this.config.jobtypes[this.job.payload.jobType]['validationEnabled']) {
            let validator = new this.config.jobtypes[this.job.payload.jobType]['validationModule']();
            validator.validate(this.job, this.logger)
        }
        return this;
    }

    async isUserEntitled() {
        if (this.config.jobtypes[this.job.payload.jobType]['entitlementsEnabled']) {
            if (!await this.verifyUserEntitlements()) {
                throw error.invalidEntitlement;
            }
        }
        return this;
    }

    async isBranchConfiguredForPublish() {
        if (this.config.jobtypes[this.job.payload.jobType]['branchPushEnabled']) {
            if (!await this.verifyBranchConfiguredForPublish()) {
                throw error.branchNotConfigured;
            }
        }
        return this;
    }

    async verifyUserEntitlements() {
        const user = this.job.user;
        const query = { 'github_username': user };
        const entitlementsObject = await this.dbClient.findOne(this.config.ATLAS.DBNAME, this.config.ATLAS.ENTITLEMENT_COLLECTION_NAME,query);
        const repoOwner = this.job.payload.repoOwner;
        const repoName = this.job.payload.repoName;
        if (entitlementsObject && entitlementsObject.repos && entitlementsObject.repos.indexOf(`${repoOwner}/${repoName}`) !== -1) {
            return true;
        }
        return false;
    }

    async verifyBranchConfiguredForPublish() {
        const repoName = this.job.payload.repoName;
        const repoContent = await this.sourceControlClient.downloadFile(`https://raw.githubusercontent.com/mongodb/docs-worker-pool/meta/publishedbranches/${repoName}.yaml`, yaml.safeLoad);
        let branchConfigured = false
        if (repoContent && repoContent.status === 'success') {
            const publishedBranches = repoContent.content.git.branches.published;
            //if this is stable branch AND [its the primary alias OR no aliases exist], then we want to use this build's manifest for global search
            this.job.payload["stableBranch"] = (repoContent.content.version.stable === this.job.payload.branchName && (this.job.payload.primaryAlias || !this.job.payload.aliased)) ? '-g' : "";
            branchConfigured = publishedBranches.includes(this.job.payload.branchName);
        }
        return branchConfigured;
    }

    async verifyBuildResults(buildOutput) {
        if (buildOutput && buildOutput.status === 'success') {
            // only post entire build output to slack if there are warnings
            let outputString = `${buildOutput.stdout}\n\n${buildOutput.stderr}`;
            outputString = this.logger.trimOutputForUserFacingLogMessages(outputString);
            await this.logger.log(outputString, true);
        } else {
            throw Error(`Build failed for ${this.job._id} ${JSON.stringify(buildOutput)}`);
        }
    }

    async verifyPublishResults(publishOutput) {
        if (publishOutput && publishOutput.status === 'success') {
            await this.logger.log(publishOutput.stdout, true);

        } else {
            throw Error(`Publish failed for ${this.job._id} ${publishOutput}`);
        }
    }
    //#endregion

    async execute(job) {
        this.job = job
        await this.validateJobDef();
        await this.isUserEntitled();
        await this.isBranchConfiguredForPublish();
        return this.job;
    }
}
module.exports = {
    Verifier
};
