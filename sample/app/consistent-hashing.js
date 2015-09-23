var logger = require('../logger');

class ConsistentHashing {
  constructor(nodes) {
    logger.info('creating consistent hashing ring');
    this.nodes = nodes;
    logger.info('consistent hashing ring created');
  }

  removeNode(node) {
    // blah, blah
  }

  addNode(node) {
    // blah, blah
  }

  clear() {
    // blah, blah
  }

  hashByKey(key) {
    // pretend we did consistent hashing
    return nodes[0];
  }
}

exports.ConsistentHashing = ConsistentHashing;
