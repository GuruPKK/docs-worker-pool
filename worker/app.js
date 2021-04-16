
const config = require('config');
const uuidv4 = require('uuid').v4;
const ip = require('ip');
const workerUtils = require('./utils/utils');
const express = require('express');

const AtlasService = require('./services/atlas').AtlasService;
const Logger = require('./services/logger').Logger;
const JobManager = require('./jobManagement/jobManager').JobManager;
const AtlasQueue = require('./queues/atlasQueue').AtlasQueue;
const GithubService = require('./services/github').GithubService;
const FastlyService = require('./services/fastly').FastlyService;


// GLOBALS
const atlasService = new AtlasService(config.ATLAS.url)
const atlasQueue = new AtlasQueue(config, atlasService);
const githubService = new GithubService(config.githubUserName, config.githubPassword);
const fastlyService = new FastlyService(config.FASTLY.serviceId, config.FASTLY.token);
const logger = new Logger(config, atlasService, uuidv4(), ip.address());
const jobManager = new JobManager(config, logger, atlasQueue,githubService, atlasService, fastlyService);
const app = express();

module.exports = {

async startServer() {

    // Initialize MongoDB Collection
    // This is the collection that houses the work tickets
    console.log(JSON.stringify(config));
    await atlasService.connect();
    
    logger.reportStatus('start server');
    // Clean up the work folder
    workerUtils.resetDirectory('work/');

    // Setup http server
    return app.listen(config.PORT);
  },

  async gracefulShutdown() {
    logger.reportStatus('\nServer is starting cleanup');
    await jobManager.failCurrentJobWithReason('server is being shut down');
    if (atlasService) {
      logger.reportStatus('closed connection');
      atlasService.disconnect();
    }
  },

  async start() {
    await jobManager.managePlatformJobs();
  }
}