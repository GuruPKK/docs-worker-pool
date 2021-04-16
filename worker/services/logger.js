class Logger {
    constructor(config, dbClient, instanceId, ip) {
        this.config = config;
        this.dbClient = dbClient
        this.instanceId = instanceId
        this.ip = ip
    }

    async log(message, notify = false) {
        if (this.config.cloudLog && this.config.cloudLog == true) {
            const query = { _id: this.instanceId };
            let update = {};
            if (notify) {
                update = {
                    $push: { comMessage: this.trimOutputForUserFacingLogMessages(message) },
                };

            } else {
                update = {
                    $push: { ['logs']: message },
                };
            }
            try {
                return await this.dbClient.updateOne(this.config.dbConfig['dbName'], this.config.dbConfig['dbCollectionName'], query, update, upsert = false)
            } catch (error) {
                console.log(`${this.instanceId}:${message}`)
            }
        } else {
            console.log(`${this.instanceId}:${message}`)
        }
    }

    async reportStatus(status) {
        if (this.config.cloudLog && this.config.cloudLog == true) {
            const query = { _id: this.ip };
            const update = {
                $set: { status: status, updateTime: new Date() }
            };
            try {
                return await this.dbClient.updateOne(this.config.dbConfig['dbName'], this.config.dbConfig['dbCollectionName'], query, update, upsert = true)
            } catch (err) {
                console.log(`Error in reportStatus(): ${err}`);
            }
        } else {
            console.log(status);
        }
    } 

trimOutputForUserFacingLogMessages(output) {
    let trimmedOutput = '';
    const splitOutput = output.split('\n');
    splitOutput.forEach((line) => {
        if (line.indexOf('WARNING') > -1 || line.indexOf('ERROR') > -1 || line.indexOf('INFO') > -1) {
            trimmedOutput = trimmedOutput.concat(line).concat('\n');
        }
    });
    return trimmedOutput.replace(/\n$/, '');
}
}

module.exports = {
    Logger: Logger
  }
