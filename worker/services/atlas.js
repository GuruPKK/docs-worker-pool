const { MongoClient } = require('mongodb');

class AtlasService {

  constructor(url, logger) {
    this.client = new MongoClient(url, { useNewUrlParser: true });
    this.client.connect();
    if (!logger) {
      logger = console;
    }
    this.logger = logger
  }

  getCollection(dbName, collectionName) {
    try {
      if (this.client) {
        return this.client.db(dbName).collection(collectionName);
      }
    } catch (error) {
      this.logger.log(error)
    }
    return null;
  }

  async updateOne(dbName, collectionName, query, update, upsert=true) {
    const collection = this.getCollection(dbName, collectionName)
    if (collection) {
      try {
        return await collection.updateOne(query, update, { upsert: upsert });
      } catch (err) {
        this.logger.log(`Error in update: ${err}`);
      }
    } else {
      this.logger.log(`Error in update: ${collectionName} does not exist`);
    }
  }

  async findOneAndUpdate(dbName, collectionName, query, update, options) {
    const collection = this.getCollection(dbName, collectionName)
    if (collection) {
      try {
        return await collection.findOneAndUpdate(query, update, options);
      } catch (err) {
        this.logger.log(`Error in findOneAndUpdate: ${err}`);
        throw err;
      }
    } else {
      this.logger.log(`Error in update: ${collectionName} does not exist`);
      throw new Error(`Error in update: ${collectionName} does not exist`);
    }
  }
}

module.exports = {
  Atlas: AtlasService
};