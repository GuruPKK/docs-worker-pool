class DochubPublishHandler {
    async publish(cdn, currentJob, logger) {
        logger.log(' ** Running dochub-fastly migration');
        if (!currentJob.payload.source || !currentJob.payload.source) {
            throw new Error(`${'(DOCHUB)'.padEnd(15)}failed due to no targets defined`);
        }

        await cdn.upsertEdgeDictionary().catch(err => {
            throw new Error(`could not complete map ${err}`);
        });
    }
}

module.exports = {
    DochubPublishHandler
};
