import _ from 'lodash';
import glob from 'glob';
import path from 'path';
import Promise from 'bluebird';

const resolved = {};
const unresolved = {};
const fulfillQueue = [];

class GraphNode {
  constructor(v) {
    this.v = v;
    this.children = [];
  }
}

function config(paths, extraObjects) {
  // stolen from: https://github.com/aseemk/requireDir/blob/master/index.js#L18
  //
  // make a note of the calling file's path, so that we can resolve relative
  // paths. this only works if a fresh version of this module is run on every
  // require(), so important: we clear the require() cache each time!
  const parent = module.parent;
  const parentFile = parent.filename;
  const parentDir = path.dirname(parentFile);

  _.forEach(extraObjects, (val, name) => {
    resolved[name] = {
      singleton: true,
      obj: val,
    };
  });
  paths.forEach(p => {
    const resolvedPath = path.resolve(parentDir, p);
    const files = glob.sync(resolvedPath);
    files.forEach(file => {
      require(file);
    });
  });

  delete require.cache[__filename];
}

function resolve(deps, fn) {
  fulfillQueue.push({deps, fn});
}

function construct(constructor, args) {
  function F() {
    return constructor.apply(this, args);
  }
  F.prototype = constructor.prototype;
  return new F();
}

function createObj(objTemplate) {
  if (objTemplate.singleton) {
    return Promise.resolve(objTemplate.obj);
  }
  return objTemplate.ctor();
}

function buildObjTemplate(type, deps, options) {
  function buildIt() {
    const args = _.map(deps, dep => createObj(resolved[dep]));
    return Promise.all(args).then(resolvedArgs => {
      const res = construct(type, resolvedArgs);
      if (options && options.requireInit) {
        return res.init().then(() => {
          return res;
        });
      }
      return Promise.resolve(res);
    });
  }
  function ctor() {
    return buildIt();
  }
  let result;
  // by default singleton
  if (!options || options.singleton) {
    // build the obj directly
    result = buildIt().then(obj => {
      return {
        singleton: true,
        obj,
      };
    });
  } else {
    // create a ctor to build the obj
    result = Promise.resolve({
      singleton: false,
      ctor,
    });
  }
  return result;
}

function build() {
  return new Promise((resolvePromise) => {
    // check resolvable
    _.forOwn(unresolved, node => {
      const type = node.v;
      _.forEach(type.$injects, dep => {
        // TODO: find cicle reference
        if (!unresolved.hasOwnProperty(dep) && !resolved.hasOwnProperty(dep)) {
          throw new Error(`unresolvable dependency: ${dep}`);
        }
        if (!resolved.hasOwnProperty(dep)) {
          const p = unresolved[dep];
          p.children.push(node);
        }
      });
    });
    // start building
    function doBuildObjTemplate(node) {
      const provides = node.v.$provides.name;
      const options = node.v.$provides.options;
      const deps = node.v.$injects;
      if (_.every(deps, dep => resolved.hasOwnProperty(dep))) {
        // can be built
        buildObjTemplate(node.v, deps, options).then((objTemplate) => {
          resolved[provides] = objTemplate;
          delete unresolved[provides];
          if (Object.keys(unresolved).length === 0) {
            resolvePromise();
          } else {
            _.forEach(node.children, child => {
              doBuildObjTemplate(child);
            });
          }
        });
      }
    }
    _.forOwn(unresolved, doBuildObjTemplate);
  }).then(() => {
    _.forEach(fulfillQueue, item => {
      const args = item.deps.map(i => createObj(resolved[i]));
      Promise.all(args).then(resolvedArgs => item.fn.apply(null, resolvedArgs));
    });
  });
}

function inject(...args) {
  return function decorator(target) {
    target.$injects = args;
  };
}

function provide(name, options) {
  return function decorator(target) {
    if (unresolved.hasOwnProperty(name) || resolved.hasOwnProperty(name)) {
      throw new Error(`duplicated provides: ${name}`);
    } else {
      target.$provides = {
        name,
        options,
      };
      unresolved[name] = new GraphNode(target);
    }
  };
}

export default {
  config,
  resolve,
  build,
  inject,
  provide,
};
