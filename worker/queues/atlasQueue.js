class AtlasQueue {
    constructor(config, client) {
        this.config = config
        this.jobDbName = this.config['ATLAS']['DBNAME'];
        this.jobCollectionName = this.config['ATLAS']['COLLECTION_NAME'];
        this.isXlarge = this.config['ATLAS']['isXlarge'];
        this.client = client
      }

      async getNextItem() {
        const query = {
          status: this.config['ATLAS']['JOB_QUEUED'],
          'payload.isXlarge': this.isXlarge,
          createdTime: { $lte: new Date() },
        }
        const update = { $set: { startTime: new Date(), status: this.config['ATLAS']['JOB_PICKED'] } };
        const options = { sort: { priority: -1, createdTime: 1 }, returnNewDocument: true };    
        return await this.client.findOneAndUpdate(this.jobDbName, this.jobCollectionName, query, update, options)
      }

      async updateStatus(itemId, reason, status) {
        const query = { _id: itemId};
        const update = {
          $set: { startTime: null, status: status,error: { time: new Date().toString(), reason: reason }}
        };
        return await this.client.updateOne(this.jobDbName, this.jobCollectionName,query, update, false);
      }
}

module.exports = {
  AtlasQueue
}
