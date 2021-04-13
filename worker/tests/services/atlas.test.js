const { MongoClient } = require('mongodb');
const atlasService = require('../../services/atlas').Atlas;
const env = require('../../utils/environment');

const runXlarge = env.EnvironmentClass.getXlarge();
const Monitor = require('../../utils/monitor').Monitor;

// Helper function to add n days to the current date
function newDateInNDays(n) {
  const date = new Date();
  date.setDate(date.getDate() + n);
  return date;
}

// Job 1 should be the first job taken off the queue because of its priority
const job1 = {
  payload: { jobType: 'job1', isXlarge: runXlarge },
  createdTime: newDateInNDays(0),
  startTime: null,
  endTime: null,
  priority: 2,
  status: 'inQueue',
  numFailures: 0,
  failures: [],
  result: null,
  logs: {}
};

// Job2 should be the second job taken off the queue because it has the earliest createdTime
const job2 = JSON.parse(JSON.stringify(job1));
job2.payload.jobType = 'job2';
job2.priority = 1;
job2.payload.isXlarge = runXlarge;
job2.createdTime = newDateInNDays(-2);

// Job 3 should be the third job taken off the queue because it has the oldest createdTime
const job3 = JSON.parse(JSON.stringify(job2));
job3.payload.jobType = 'job3';
job3.createdTime = newDateInNDays(0);

// Job 4 should not be taken off the queue because its createdTime is after new Date()
const job4 = JSON.parse(JSON.stringify(job2));
job4.payload.jobType = 'job4';
job4.createdTime = newDateInNDays(10);

describe('Atlas Tests', () => {
  let connection;
  let db;
  let atlas;

  // Use the mongo in-memory storage engine for testing
  // See tests/mongo/ for details on setup/teardown of this.
  beforeAll(async () => {
    
    connection = await MongoClient.connect(global.__MONGO_URI__, {
      useNewUrlParser: true
    });
    db = await connection.db(global.__MONGO_DB_NAME__);

    atlas = new atlasService(global.__MONGO_URI__, console)
    // Remove the jobs collection (should be empty anyways)
    db.dropCollection('jobs').catch(err => {
      console.log(err);
    });

    db.dropCollection('monitor').catch(err => {
      console.log(err);
    });

    monitorColl = db.collection('monitor');

    // Put jobs in a random order (shouldnt matter)
    const jobsColl = db.collection('jobs');
    const jobs = [job4, job2, job1, job3];
    await jobsColl.insertMany(jobs);
  });

  // Make sure to close the connection to the in-memory DB
  afterAll(async () => {
    await connection.close();
    await db.close();
  });

//   it('setup worked properly', async () => {
//     const jobsColl = db.collection('jobs');

//     // There should be 4 documents in the collection
//     const numJobs = await jobsColl.count();
//     expect(numJobs).toEqual(4);

//     // Following properties should be found in all of them
//     const currJob = await jobsColl.findOne({});
//     expect(currJob).toHaveProperty('payload');
//     expect(currJob).toHaveProperty('createdTime');
//     expect(currJob).toHaveProperty('startTime', null);
//     expect(currJob).toHaveProperty('endTime', null);
//     expect(currJob).toHaveProperty('priority');
//     expect(currJob).toHaveProperty('numFailures', 0);
//     expect(currJob).toHaveProperty('failures', []);
//     expect(currJob).toHaveProperty('result', null);
//   });

  /** ******************************************************************
   *                             getCollection()                         *
   ******************************************************************* */

//   it('getCollection with right collection and db name works properly', () => {
//     //   GIVEN
//     let dbName = global.__MONGO_DB_NAME__
//     let collectionName = 'jobs'

//     //  WHEN
//     const collection = atlas.getCollection(dbName, collectionName);

//     // THEN
//     console.log(collection)
//     expect(collection).toBeDefined();
//   });

  /** ******************************************************************
   *                             findOneAndUpdate()                         *
   ******************************************************************* */
//   it('findOneAndUpdate should get the correct record according to the query', async () => {

//     // GIVEN
//     let dbName = global.__MONGO_DB_NAME__
//     let collectionName = 'jobs'
//     const query = {
//         status: 'inQueue',
//         'payload.isXlarge': runXlarge,
//         createdTime: { $lte: new Date() },
//       }
//     const update = { $set: { startTime: new Date(), status: 'inProgress' } };
//     const options = { sort: { priority: -1, createdTime: 1 }, returnNewDocument: true };

//     // WHEN 
//     let item = await atlas.findOneAndUpdate(dbName, collectionName, query, update, options);

//     // THEN
//     console.log(item)
//     expect(item).toBeDefined();
//     expect(item).toHaveProperty('ok', 1);
//     expect(item).toHaveProperty('value');
//     expect(item.value).toHaveProperty('payload', {
//       jobType: 'job1',
//       isXlarge: runXlarge
//     });
//   }, 5000);
  /** ******************************************************************
   *                       Updateone                      *
   ******************************************************************* */
  it('Updateone works properly', async () => {
    // GIVEN
    let dbName = global.__MONGO_DB_NAME__
    let collectionName = 'jobs'
    const query = { _id: job2._id };
    const update = {
      $set: {
        status: 'completed',
        result:{ success: true },
        endTime: new Date(),
      },
    };

    // WHEN
    await atlas.updateOne(dbName, collectionName , query, update);

    // THEN
    const jobsColl = db.collection('jobs');
    const currJob = await jobsColl.findOne({ _id: job2._id });
    expect(currJob).toBeTruthy();
    expect(currJob.status).toEqual('completed');
    expect(currJob.endTime).toBeTruthy();
    expect(currJob.endTime).toBeInstanceOf(Date);
    expect(currJob.endTime.getTime()).toBeLessThanOrEqual(new Date().getTime());
    expect(currJob).toHaveProperty('result', { success: true });
  }, 5000);
 });
