// a fake zookeeper client
var container = require('../../index');
var logger = require('../logger');

let clientId = 1;

@container.provide('zookeeperClient', {singleton: false})
class MockZookeeperClient {
  constructor() {
    logger.info('creating zookeeper client');
    this.clientId = clientId++;
    logger.info('zookeeper client created');
  }
}

exports.MockZookeeperClient = MockZookeeperClient;
