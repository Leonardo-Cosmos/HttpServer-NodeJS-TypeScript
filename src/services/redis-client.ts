import { createClient, RedisClientOptions } from 'redis';
import * as errors from 'restify-errors';
import config from '../config/redis-config';
import { sleepAsync } from './helper';
import logger, { logError } from './logger-service';

const MODULE = 'redis';

function buildReidsClientOptions(): RedisClientOptions {
  const options: any = {};
  if (config.port) {
    options.socket ??= {};
    options.socket.port = config.port;
  }

  if (config.host) {
    options.socket ??= {};
    options.socket.host = config.host;
  }

  if (config.username) {
    options.username = config.username;
  }

  if (config.password && config.password.length > 0) {
    options.password = config.password;
  }

  if (config.database) {
    options.database = config.database;
  }

  return options;
}


const client = createClient(buildReidsClientOptions());

client.on('error', (err) => {
  const _log = logger.child({ module: MODULE, method: 'onClientError' });
  _log.error('Redis client error');
  logError(err, _log);
});

client.on('connect', (err) => {
  const _log = logger.child({ module: MODULE, method: 'onClientConnect' });
  if (err) {
    _log.error('Connect Redis failed. %s', (errors as any).fullStack(err));
  } else {
    _log.info('Connect Redis successfully.');
  }
});

let connecting = false;
let connected = false;

export async function initRedisClient(log: any) {
  const _log = log.child({ module: MODULE, method: 'initRedisClient' });

  if (!connected && !connecting) {
    connecting = true;
    try {
      await client.connect();
    } catch (err) {
      _log.error('Connect Redis failed', (errors as any).fullStack(err));
    } finally {
      connected = true;
      connecting = false;
    }
  }

  while (!connected) {
    _log.info('Awaiting Redis client connecting');
    await sleepAsync(1000);
  }
}

export async function getRedisClient(log: any) {
  await initRedisClient(log);
  
  if (!client) {
    throw new errors.InternalServerError('Redis client is not ready.');
  }

  return client;
}
