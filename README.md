# Async IoC container

## WARNING: NOT Production Quality

Use at your own risk if you don't understand the code.

## Main Purpose

For a large enough nodejs app, you will probably need some code bootstrapping the server, especially due to node's async nature.

For example, before the server can accept request, you might need to make connections to database, get configuration from external source such as zookeeper, get data from database and generate data structures for the service, etc, etc. When things are synchornized, they are easier because you can just create objects one by one and then start listening to the TCP port after all required objects are created. However for node, you may need to write specific async handling code to initialize all these stuffs.

Another problem of this is, people are thus encouraged to create stateful modules due to the fact of initialization and deep dependency. For example, the project I worked on have a specific module that owns a connection pool to redis servers, which is initialized during the server startup. So that other modules depend on the connection pool can require the module to get access to the pool. Otherwise there is no good place to put such shared objects (global would be a bad idea). However, I personally don't like modules to have states, which may introducing subtle bugs that are difficult to track, so I want to minimize the number of such modules.

## Introduction of the Async IoC container

I used to work with Spring/Guice framework and I pretty much like it, it handles the object dependency resolution at runtime, which is flexible, and also the initialization/bootstrapping of the application.

So I borrowed some idea from Spring/Guice and created a simple framework that does two things:

1. Resolve objects dependency at runtime
2. Handle async initialization

The way to handle async initialization is to make a convention that Classes require initialization need to have a `init()` function that returns a Promise. So the framework can rely on the resolution of the Promise to control the flow of initialization.

I also used the ES7 annotation to demonstrate how annotations can be useful to make code cleaner.

## How to use the container

### @inject and @provide

`@inject(...string)` annotation is used to declare the dependencies of the current Class, it accepts variable args, each represents a dependency that need to be resolved and potentially initialized before the current Class can be instantiated. See example below for usage.

`@provide(string, options)` annotation is used to declare a name that represents the instance of the current Class. It also accepts an `options` object to specify how the instance of the current Class is instantiated. Available options:

- singleton: [true|false]. You can specify whether the instance of the current Class is a singleton or should be instantiated whenever required. By default, singleton is true.
- requireInit: [true|false]. You can speicify whether the instance of the current Class need to be initialized before it can be used. By default, requireInit is false. When initialiation is required, the framework will look for the `init()` method and invoke it. The framework will expect the `init()` method to return a Promise and it will wait the Promise to be resolved before finishing the current instantiation.

A major difference of this IoC container and containers like Guice/Spring is, here you don't use class name mapping to specify dependencies, you have to use `@provide` to tell the framework what name do you want to use to identify the instance of the decorated Class.

An example to demonstrate the usage is shown below:

```javascript
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
    // wait 2 sec, pretending we are using the zookeeperClient to connect to zookeeperServers
    logger.info('initializing cluster manager');
    return Promise.delay(2000).then(function() {
      logger.info('cluster manager initialized');
    });
  }

  getRedisServers() {
    return ['server1', 'server2'];
  }
}
```

### container.resolve

Sometimes it's convenient to do something after getting all the dependencies. Then you can use `container.resolve([dep1, dep2, ...], function callback(dep1, dep2, ...))` to resolve the required dependencies and the framework will callback after all the dependencies are instantiated. 

### container.config

Due to the nature of javascript module, you need to actually require it before you can get all the information, so you need `container.config([path1, path2, ...], extraDependencies)` to config the load path of all possible modules that contain dependencies and also provide some extraDependencies that are given at runtime, for example database names, API keys, etc.

### container.build

After you config the container, you can call `container.build()` to build and initialize the whole dependency graph defined by `@depend` and `@inject`.

`container.build()` will return a Promise that resolves after the container is fully initialized.

### Error handling

If the framework detects that there is any dependency that can never be resolved (missing), it will throw exception to report error and thus the Promise returned by `build()` will be rejected with that reason.

If any initialization of objects failed during the build process, the whole Promise will also be rejected with the same reason.

## Example

Please refer to `sample` folder for a simple app that uses zookeeper to manage redis cluster membership, all implementation are fake and are just used to demonstrate the usage of `@inject` and `@provide`.

To run the example, you need first run `npm install` in the project root. Also you need `npm install -g babel` to have a global babel installation.

Optionally can run `npm install -g bunyan` to get a bunyan cli for better log message.

Then you can run `node index | bunyan -o short` under the `sample` folder. The sample also uses some ES6 features, so it also uses babel to do the compilation at runtime.

Below is a sample output. As you can see, you don't need to write any specific bootstrapping code, all you need to do is to declare dependencies and the dependency graph will be built and initialized automatically.

```
$ node index | bunyan -o short
06:13:54.937Z  INFO app: now bootstrapping...
06:13:54.961Z  INFO app: creating zookeeper client
06:13:54.961Z  INFO app: zookeeper client created
06:13:54.961Z  INFO app: creating cluster manager
06:13:54.961Z  INFO app: cluster manager created
06:13:54.961Z  INFO app: initializing cluster manager
06:13:56.968Z  INFO app: cluster manager initialized
06:13:56.968Z  INFO app: creating RedisConnectionManager
06:13:56.968Z  INFO app: RedisConnectionManager created
06:13:56.969Z  INFO app: initializing RedisConnectionManager
06:13:56.969Z  INFO app: connecting to server: server1
06:13:56.969Z  INFO app: connecting to server: server2
06:13:57.971Z  INFO app: server: server1 connected
06:13:57.971Z  INFO app: server: server2 connected
06:13:57.971Z  INFO app: creating consistent hashing ring
06:13:57.971Z  INFO app: consistent hashing ring created
06:13:57.971Z  INFO app: RedisConnectionManager initialized
06:13:57.971Z  INFO app: creating RedisClient
06:13:57.972Z  INFO app: RedisClient created
06:13:57.972Z  INFO app: we now get redisClient, which is already initialized with all the dependencies!
06:13:57.972Z  INFO app: Here is the redisClient: {"redisConnectionManager":{"clusterManager":{"domain":null,"_events":{},"_maxListeners":10,"zookeeperClient":{"clientId":1},"zookeeperServers":["zkserver1","zkserver2"]},"ring":{"nodes":["server1","server2"]}}}
06:13:57.972Z  INFO app: yay! bootstrapped!
```

## Limitations

1. Currently you cannot create multiple container, so the container itself is a stateful module.
2. Current code doesn't handle cyclic dependency.
3. Currently, if you only define `@inject` without specifying `@provide`, then that class is actually skipped. This makes sense because if there is no `@provide` declared, then the current Class will never be able to be referenced by other Class thus excluded from the dependency graph.
4. Current implementation uses ES7 decorators, so basically you need a compiler like babel to make the code work, however it can be easily changed to use plain functions if you don't want to use ES7 features.
