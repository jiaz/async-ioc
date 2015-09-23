// cluster manager get membership config/update from zookeeper
var container = require('../../index');
var logger = require('../logger');
var EventEmitter = require('events').EventEmitter;

@container.provide('clusterManager', {requireInit: true})
@container.inject('zookeeperClient', 'zookeeperServers')
class MockClusterManager extends EventEmitter {
  constructor(zookeeperClient, zookeeperServers) {
    super();
    logger.info('creating cluster manager');
    this.zookeeperClient = zookeeperClient;
    this.zookeeperServers = zookeeperServers;
    logger.info('cluster manager created');
  }

  init() {
    // wait 2 sec, simulate we are using the zookeeperClient to connect to zookeeperServers
    logger.info('initializing cluster manager');
    return Promise.delay(2000).then(function() {
      logger.info('cluster manager initialized');
    });
  }

  getRedisServers() {
    return ['server1', 'server2'];
  }
}

exports.MockClusterManager = MockClusterManager;
