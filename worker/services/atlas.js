const { MongoClient } = require('mongodb');

class AtlasService {

  constructor(url) {
    this.client = new MongoClient(url, { useNewUrlParser: true }); 
  }

  async disconnect() {
    await this.client.close()
  }

  async connect() {
    await this.client.connect();
  }

  getCollection(dbName, collectionName) {
    try {
      if (this.client) {
        return this.client.db(dbName).collection(collectionName);
      } else {
        throw Error('Invalid DB Client');
      }
    } catch (error) {
      throw error;
    }
  }

  async updateOne(dbName, collectionName, query, update, upsert = true) {
    const collection = this.getCollection(dbName, collectionName)
    if (collection) {
      try {
        return await collection.updateOne(query, update, { upsert: upsert });
      } catch (err) {
        throw error;
      }
    } else {
      throw Error('Unknown Collection');
    }
  }

  async findOneAndUpdate(dbName, collectionName, query, update, options) {
    const collection = this.getCollection(dbName, collectionName)
    if (collection) {
      try {
        return await collection.findOneAndUpdate(query, update, options);
      } catch (err) {
        throw err;
      }
    } else {
      throw new Error(`Error in update: ${collectionName} does not exist`);
    }
  }

  async findOne(dbName, collectionName, query) {
    const collection = this.getCollection(dbName, collectionName)
    if (collection) {
      try {
        return await collection.findOne(query);
      } catch (err) {
        throw err;
      }
    } else {
      throw new Error(`Error in update: ${collectionName} does not exist`);
    }
  }
}

module.exports = {
  AtlasService
}