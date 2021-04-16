const invalidJobDef = new Error('job not valid');
const invalidEnvironment = new Error(
  'environment variables missing for jobtype'
);
const invalidEntitlement = new Error('entitlement failed');
const branchNotConfigured = new Error('Branch not configured for publish');

module.exports = {
    invalidJobDef,
    invalidEnvironment,
    invalidEntitlement,
    branchNotConfigured
}