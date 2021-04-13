const { head } = require('got');
const got = require('got');
class FastlyService {
  // pass in a job payload to setup class
  constructor(fastlyServiceId, fastlyToken, logger) {
    this.fastlyServiceId = fastlyServiceId;
    this.logger = logger;
    if (!logger) {
      console.log('Invalid logger passed in')
      this.logger = console
    }
    this.header = {
      'fastly-key': fastlyToken,
      'accept': 'application/json'
    }
  }

  // takes in an array of urls and purges cache for each
  async purgeCache(urlArray) {
    if (!Array.isArray(urlArray)) {
      throw new Error('Parameter `urlArray` needs to be an array of urls');
    }

    // the 1 is just "some" value needed for this header: https://docs.fastly.com/en/guides/soft-purges
    let header = this.header;
    header['Fastly-Soft-Purge'] = '1';
    const results = await urlArray.reduce(async (purgeMessages, url) => {
      try {
        let resp = await got(url, {
          method: 'PURGE',
          headers: header
        });
        (await purgeMessages).push(resp.body);
      } catch (error) {
        (await purgeMessages).push({
          'status': 'failure',
          'message': `service with url ${url} does not exist in fastly`
        });
        this.logger.log(`Error: ${error.response.body} for URL ${url}`)
      }
      return purgeMessages;
    }, []);

    return {
      'status': 'success',
      'fastlyMessages': results,
    }
  }

  // upserts {source: target} mappings
  // to the fastly edge dictionary
  async upsertEdgeDictionary(dictionaryId, dictionaryKey, dictionaryValue) {
    let header = this.header;
    header['Content-Type'] = 'application/x-www-form-urlencoded';
    const params = {
      item_value: dictionaryValue
    };
    return await got(`https://api.fastly.com/service/${this.fastlyServiceId}/dictionary/${dictionaryId}/item/${dictionaryKey}`,
      {
        method: 'PUT',
        headers: header,
        form: params
      });
  }
}

module.exports = {
  Fastly: FastlyService
};
