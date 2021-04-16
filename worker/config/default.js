const defer = require('config/defer').deferConfig;
module.exports = {
    POLL_TIMEOUT_S: 15,
    JOB_TIMEOUT_S: 900,
    RETRY_TIMEOUT_MS: 5000,
    MIN_TIMEOUT_MS: 1,
    LOG_PADDING: 15,
    PORT: 3000,
    stage: "STAGE",
    githubUserName: "GITHUB_BOT_USERNAME",
    githubPassword: "GITHUB_BOT_PASSWORD",
    awsAccessKey: "AWS_ACCESS_KEY_ID",
    awsAccessSecret: "AWS_SECRET_ACCESS_KEY",
    jobQueue: "ATLAS",
    cdn: "FASTLY",
    repoDir: "repos",
    prodDeploy: "productionDeploy",
    ATLAS: {
        DBNAME: "DB_NAME",
        COLLECTION_NAME: "COL_NAME",
        ENTITLEMENT_COLLECTION_NAME: "entitlements",
        isXlarge: true,
        JOB_QUEUED: "inQueue",
        JOB_PICKED: "inProgress",
        USER_NAME: "MONGO_ATLAS_USERNAME",
        PASS_WORD: "MONGO_ATLAS_PASSWORD",
        CLUSTER: "ATLAS_CLUSTER_NAME",
        queue: require('../queues/atlasQueue').AtlasQueue,
        client: require('../services/atlas').Atlas,
        url: defer(function () {
            return `mongodb+srv://${this.ATLAS.USER_NAME}:${this.ATLAS.PASS_WORD}@${this.ATLAS.CLUSTER}/admin?retryWrites=true`;
        })
    },
    FASTLY: {
        dochubMap: "FASTLY_DOCHUB_MAP",
        token: "FASTLY_TOKEN",
        serviceId: "FASTLY_SERVICE_ID"
    },
    jobtypes: {
        publishDochub: {
            buildModule: null,
            validationEnabled: true,
            validationModule: require('../jobValidators/publishDocHubValidator').PublishDocHubValidator,
            branchPushEnabled: false,
            entitlementsEnabled: false,
            publishModule: require('../jobManagement/dochubPublisher').DochubPublishHandler
        },
        productionDeploy: {
            buildModule: require('../jobManagement/builder').BuildHandler,
            validationEnabled: true,
            validationModule: require('../jobValidators/productionDeployValidator').ProductionDeployValidator,
            branchPushEnabled: true,
            entitlementsEnabled: true,
        },
        githubPush: {
            module: require('../jobManagement/builder').BuildHandler,
            validationEnabled: true,
            validationModule: require('../jobValidators/publishDocHubValidator').PublishDocHubValidator,
            branchPushEnabled: false,
            entitlementsEnabled: false,
        }
    }
}