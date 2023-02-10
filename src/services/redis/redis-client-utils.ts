import * as _ from 'lodash';
import * as redis from 'redis';
import { RedisClientOptions, RedisClusterOptions } from 'redis';
import * as errors from 'restify-errors';
import { v4 as uuid } from 'uuid';
import logger from '../services/logger-service';

export declare type RedisClient = ReturnType<typeof redis.createClient>;
export declare type RedisCluster = ReturnType<typeof redis.createCluster>;
export declare type RedisApp = RedisClient | RedisCluster;

const redisAddressRegExp = /(.+):(?<port>\d+)/;

const MODULE = 'redis-client-utils';

export declare type RedisInfo = {
  clientName: string,
};

export declare type RedisSimpleOptions = {
  host: string,
  port: number,
  password: string,
  tls: boolean,

  clientName: string,
}

export function createRedisClientOptions(simpleOptions: RedisSimpleOptions): RedisClientOptions & RedisInfo {
  
  const options: RedisClientOptions & RedisInfo = {
    clientName: simpleOptions.clientName,
    socket: {
      host: simpleOptions.host,
      port: simpleOptions.port,
      tls: simpleOptions.tls,
      servername: simpleOptions.tls ? simpleOptions.host : undefined,
    },
    password: simpleOptions.password,
  };
  if (simpleOptions.tls && options.socket) {
    options.socket.tls = true;
  }

  return options;
}

export function createRedisClient(redisClientOptions: RedisClientOptions & RedisInfo
): RedisClient & RedisInfo {

  const log = logger.child({ module: MODULE, method: 'createRedisClient' });
  const redisClientName = `${redisClientOptions.clientName}-${uuid().substring(0, 8)}`;
  log.info('Create %s', redisClientName);
  const redisClientOptionsClone = _.cloneDeep(redisClientOptions);
  redisClientOptionsClone.password = '***';
  log.trace('Create %s: %j', redisClientName, redisClientOptionsClone);

  const redisClient = redis.createClient(redisClientOptions) as RedisClient & RedisInfo;

  redisClient.on('connect', () => {
    const _log = log.child({ module: MODULE, method: 'redisConnect' });
    _log.info('The %s is initiating a connection', redisClientName);
  });

  redisClient.on('ready', () => {
    const _log = log.child({ module: MODULE, method: 'redisReady' });
    _log.info('The %s successfully initiated the connection', redisClientName);
  });

  redisClient.on('end', () => {
    const _log = log.child({ module: MODULE, method: 'redisEnd' });
    _log.info('The %s disconnected the connection', redisClientName);
  });

  redisClient.on('error', (err) => {
    const _log = log.child({ module: MODULE, method: 'redisError' });
    _log.error('A network error of %s has occured: %s', redisClientName, (errors as any).fullStack(err));
  });

  redisClient.on('reconnecting', () => {
    const __log = log.child({ module: MODULE, method: 'redisReconnecting' });
    __log.info('The %s is trying to reconnect', redisClientName);
  });

  redisClient.clientName = redisClientName;
  return redisClient;
}

export declare type NodeAddress = { host: string, port: number };
// const clusterNodeAddresses: NodeAddress[] = [];
// function addRedisClusterNodeAddress(nodeAddress: NodeAddress) {
//   const exists = clusterNodeAddresses.some(
//     address => address.host === nodeAddress.host && address.port === nodeAddress.port);

//   if (!exists) {
//     clusterNodeAddresses.push(nodeAddress);
//   }
// }

// export function getRedisClusterNodeAddresses(): NodeAddress[] {
//   return [...clusterNodeAddresses];
// }

export function createRedisClusterClientOptions(simpleOptions: RedisSimpleOptions): RedisClusterOptions & RedisInfo {
  const options: RedisClusterOptions & RedisInfo = {
    clientName: simpleOptions.clientName,

    rootNodes: [{
      socket: {
        host: simpleOptions.host,
        port: simpleOptions.port,
      },
    }],

    defaults: {
      socket: {
        tls: simpleOptions.tls,
        servername: simpleOptions.tls ? simpleOptions.host : undefined,
      },
      password: simpleOptions.password,
    },

    nodeAddressMap: address => {
      const log = logger.child({ module: MODULE, method: 'nodeAddressMap' });
      log.info('Redis address %s', address);

      let nodePort = simpleOptions.port.toString();
      const matches = redisAddressRegExp.exec(address);
      if (matches && matches.length > 0 && matches.groups) {
        nodePort = matches.groups.port || nodePort;
      }

      const nodeAddress = {
        host: simpleOptions.host,
        port: Number.parseInt(nodePort),
      };

      log.info('The %s mapped address %s to %j', simpleOptions.clientName, address, nodeAddress);
      // addRedisClusterNodeAddress(nodeAddress);
      return nodeAddress;
    }
  }

  return options;
}

export function createRedisClusterClient(redisClusterOptions: RedisClusterOptions & RedisInfo
): RedisCluster & RedisInfo {

  const log = logger.child({ module: MODULE, method: 'createRedisClusterClient' });
  const redisClientName = `${redisClusterOptions.clientName}-${uuid().substring(0, 8)}`;
  log.info('Create %s', redisClientName);
  const redisClusterOptionsClone = _.cloneDeep(redisClusterOptions);
  _.set(redisClusterOptionsClone, 'defaults.password', '***');
  log.trace('Create %s: %j', redisClientName, redisClusterOptionsClone);

  const redisClusterClient = redis.createCluster(redisClusterOptions) as RedisCluster & RedisInfo;

  redisClusterClient.on('connect', () => {
    const _log = log.child({ module: MODULE, method: 'redisConnect' });
    _log.info('The %s is initiating a connection', redisClientName);
  });

  redisClusterClient.on('ready', () => {
    const _log = log.child({ module: MODULE, method: 'redisReady' });
    _log.info('The %s successfully initiated the connection', redisClientName);
  });

  redisClusterClient.on('end', () => {
    const _log = log.child({ module: MODULE, method: 'redisEnd' });
    _log.info('The %s disconnected the connection', redisClientName);
  });

  redisClusterClient.on('error', (err) => {
    const _log = log.child({ module: MODULE, method: 'redisError' });
    _log.error('A network error of %s has occured: %s', redisClientName, (errors as any).fullStack(err));
  });

  redisClusterClient.on('reconnecting', () => {
    const _log = log.child({ module: MODULE, method: 'redisReconnecting' });
    _log.info('The %s is trying to reconnect', redisClientName);
  });

  redisClusterClient.clientName = redisClientName;
  return redisClusterClient;
}
