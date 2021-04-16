const validator = require('validator');
const error = require('../utils/errors');

class PublishDocHubValidator {
    validate(currentJob, logger) {
        if (
          !currentJob ||
          !currentJob.payload ||
          !currentJob.payload.source ||
          !currentJob.payload.target ||
          !currentJob.email
        ) {
          logger.log(`${'    (sanitize)'.padEnd(15)}failed due to insufficient job definition`);
          throw error.invalidJobDef;
        }
      
        if (!validator.isAscii(currentJob.payload.source) || !validator.isAscii(currentJob.payload.target)) {
        throw error.invalidJobDef;
        }
      }

}

module.exports = {
  PublishDocHubValidator
};
