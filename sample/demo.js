var container = require('../src/container');
var logger = require('./logger');

container.config(['./app/*.js'], {
  zookeeperServers: ['zkserver1', 'zkserver2'],
});

logger.info('now bootstrapping...');

container.build().then(() => {
  logger.info('yay! bootstrapped!');
}).catch(err => {
  logger.error(err);
});

container.resolve(['redisClient'], redisClient => {
  logger.info('we now get redisClient, which is already initialized with all the dependencies!');
  logger.info(`Here is the redisClient: ${JSON.stringify(redisClient)}`);
});
