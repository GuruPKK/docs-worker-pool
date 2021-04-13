/** ******************************************************************
 *                  Fastly test                       *
 ******************************************************************* */

const Fastly = require('../../services/fastly').Fastly;
const environment = require('../../utils/environment').EnvironmentClass;

const payloadObj = {
    source: 'someSource',
    target: 'someTarget',
};

const goodDochuhJob = {
    payload: payloadObj
};

const doc = {
    _id: { $oid: '4db32eacdbd1ff5a7a24ff17' },
    url: 'http://www.mongodb.org/display/DOCS/Collections',
    name: 'collections'
};

const map = {
    'source': 'source',
    'target': 'target'
};

// test purge urls
const urlsExistInFastly = [
    'https://docs.mongodb.com/drivers/cxx/'
];

const urlsNoExist = [
    'https://docs.opsmanager.mongodb.com/current/installation/',
    'https://docs.opsmanager.mongodb.com/current/core/requirements/',
];

describe('Fastly Tests', () => {

    let fastly;

    beforeAll(() => {
        fastly = new Fastly(environment.getFastlyServiceId(),environment.getFastlyToken(), console);
    });

    afterAll(() => { });

    beforeEach(() => { });

    afterEach(() => { });

    it('FastlyJob test connect and upsert', async () => {
        return fastly.upsertEdgeDictionary(map).catch(error => {
            console.log(error)
            expect(error).toBeDefined();
        });
    });

    it('FastlyJob test purge', async () => {
        resp = await fastly.purgeCache(urlsExistInFastly).then(output => {
            expect(output.status).toEqual('success');
            expect(output).toHaveProperty('fastlyMessages');
            output.fastlyMessages.forEach(fastlyMessage => expect(JSON.parse(fastlyMessage)['status']).toEqual('ok'));
        });
    });

    it('FastlyJob test purge for url that does not exist', async () => {
        return fastly.purgeCache(urlsNoExist).then(output => {
            expect(output.status).toEqual('success');
            expect(output).toHaveProperty('fastlyMessages');
            expect(output.fastlyMessages[0].status).toEqual('failure');
        });
    });

});
