// a fake redis client
var container = require('../../index');
var logger = require('../logger');
var ConsistentHashing = require('./consistent-hashing').ConsistentHashing;

@container.provide('redisConnectionManager', {requireInit: true})
@container.inject('clusterManager')
class RedisConnectionManager {
  constructor(clusterManager) {
    logger.info('creating RedisConnectionManager');
    this.clusterManager = clusterManager;
    clusterManager.on('add', this.addNode.bind(this));
    clusterManager.on('remove', this.removeNode.bind(this));
    logger.info('RedisConnectionManager created');
  }

  addNode(nodeName) {
    // add node to ring
    ring.addNode(nodeName);
  }

  removeNode(nodeName) {
    // delete the node from the ring
    ring.removeNode(nodeName);
  }

  getConnection(key) {
    return ring.hashByKey(key);
  }

  init() {
    logger.info('initializing RedisConnectionManager');
    var servers = this.clusterManager.getRedisServers();
    return Promise.resolve(servers).map(server => {
      // create real redis client and connect to the server
      // here is a fake implementation
      logger.info(`connecting to server: ${server}`);
      return Promise.delay(1000).then(() => {
        logger.info(`server: ${server} connected`);
        return server;
      });
    }).then(redisConnections => {
      this.ring = new ConsistentHashing(redisConnections);
      logger.info('RedisConnectionManager initialized');
    });
  }
}

@container.provide('redisClient')
@container.inject('redisConnectionManager')
class RedisClient {
  constructor(redisConnectionManager) {
    logger.info('creating RedisClient');
    this.redisConnectionManager = redisConnectionManager;
    logger.info('RedisClient created');
  }
}

exports.RedisConnectionManager = RedisConnectionManager;
exports.RedisClient = RedisClient;
