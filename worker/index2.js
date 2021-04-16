const workerApp = require('./app');

// Setup the server with startServer()
workerApp
  .startServer()
  .then(() => {
    // Begin working!
    workerApp.start();
  })
  .catch(err => {
    console.log(`ERROR: ${err}`);
  });

// Handle SIGINT / SIGTERM from KUBERNETES
process.on('SIGINT', async () => {
  console.log('Received SIGINT');
  await workerApp.gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM');
  await workerApp.gracefulShutdown();
  process.exit(0);
});
