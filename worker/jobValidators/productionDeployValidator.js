const validator = require('validator');
const error = require('../utils/errors');

class ProductionDeployValidator {
    // anything that is passed to an exec must be validated or sanitized
    // we use the term sanitize here lightly -- in this instance this // ////validates
    safeString(stringToCheck) {
        return (
            validator.isAscii(stringToCheck) &&
            validator.matches(stringToCheck, /^((\w)*[-.]?(\w)*)*$/)
        );
    }

    validate(currentJob, logger) {
        if (
            !currentJob ||
            !currentJob.payload ||
            !currentJob.payload.repoName ||
            !currentJob.payload.repoOwner ||
            !currentJob.payload.branchName
        ) {
            logger.log.logInMongo(currentJob, `${'    (sanitize)'.padEnd(15)}failed due to insufficient job definition`);
            throw error.invalidJobDef;
        }

        if (
            !this.safeString(currentJob.payload.repoName) ||
            !this.safeString(currentJob.payload.repoOwner) ||
            !this.safeString(currentJob.payload.branchName)
        ) {
            throw error.invalidJobDef;
        }
    }
}

module.exports = {
    ProductionDeployValidator
};