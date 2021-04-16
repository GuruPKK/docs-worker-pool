const validator = require('validator');
const error = require('../utils/errors');

class GithubPushValidator {
  // anything that is passed to an exec must be validated or sanitized
  // we use the term sanitize here lightly -- in this instance this // ////validates
  safeString(stringToCheck) {
    return (
      validator.isAscii(stringToCheck) &&
      validator.matches(stringToCheck, /^((\w)*[-.]?(\w)*)*$/)
    );
  }

  safeBranch(currentJob) {
    if (currentJob.payload.upstream) {
      return currentJob.payload.upstream.includes(currentJob.payload.branchName);
    }

    // master branch cannot run through github push, unless upstream for server docs repo
    if (currentJob.payload.branchName === 'master' && currentJob.title !== 'Regression Test Child Process') {
      logger.log(`${'(BUILD)'.padEnd(15)} failed, master branch not supported on staging builds`);
      throw new Error('master branches not supported');
    }
    return true;
  }

  validate(currentJob, logger) {
    if (
      !currentJob
      || !currentJob.payload
      || !currentJob.payload.repoName
      || !currentJob.payload.repoOwner
      || !currentJob.payload.branchName
    ) {
      logger.log(`${'(sanitize)'.padEnd(15)} failed due to insufficient job definition`);
      throw error.invalidJobDef;
    }

    if (
      !safeString(currentJob.payload.repoName)
      || safeString(currentJob.payload.repoOwner)
      || safeString(currentJob.payload.branchName)
      || safeBranch(currentJob)
    ) {
      throw error.invalidJobDef;
    }

  }
}

module.exports = {
  GithubPushValidator
};