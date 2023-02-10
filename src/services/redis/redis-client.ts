import * as errors from 'restify-errors';
import {
  createRedisClientOptions,
  createRedisClient,
  createRedisClusterClientOptions,
  createRedisClusterClient,
} from './redis-client-utils';
import logger from '../services/logger-service';
import { RedisClusterSubscribeClient } from './redis-cluster-subscriber-client';

const MODULE = 'redis-client';

const _ = {
  getLogger(): any {
    return logger;
  }
};

const REDIS_HOST = 'localhost';
const REDIS_PORT = 6379;
const REDIS_API_KEY = '';
const REDIS_TLS_ENABLED = false;
const REDIS_CLUSTER_ENABLED = false;

function createClient() {
  if (REDIS_CLUSTER_ENABLED) {
    return createRedisClusterClient(createRedisClusterClientOptions(
      'redis cluster client', REDIS_HOST, REDIS_PORT, REDIS_API_KEY, REDIS_TLS_ENABLED));
  } else {
    return createRedisClient(createRedisClientOptions(
      'redis client', REDIS_HOST, REDIS_PORT, REDIS_API_KEY, REDIS_TLS_ENABLED));
  }
}

const client = createClient();
let clientInitialized = false;
export async function getClient() {
  if (!clientInitialized) {
    clientInitialized = true;
    try {
      await client.connect();
    } catch (err) {
      throw new errors.InternalServerError(err, 'Connect redis client failed.');
    }
  }
  return client;
}

function createKeyspaceClient() {
  if (REDIS_CLUSTER_ENABLED) {
    return new RedisClusterSubscribeClient('redis keyspace client',
      REDIS_HOST, REDIS_PORT, REDIS_API_KEY, REDIS_TLS_ENABLED);
  } else {
    return createRedisClient(createRedisClientOptions(
      'redis keyspace client', REDIS_HOST, REDIS_PORT, REDIS_API_KEY, REDIS_TLS_ENABLED));
  }
}

const keyspaceClient = createKeyspaceClient();
let keyspaceClientInitialized = false;
export async function getKeyspaceClient() {
  if (!keyspaceClientInitialized) {
    keyspaceClientInitialized = true;
    try {
      await keyspaceClient.connect();
    } catch (err) {
      throw new errors.InternalServerError(err, 'Connect redis keyspace client failed.');
    }
  }
  return keyspaceClient;
}

function createNotificationClient() {
  return createRedisClient(createRedisClientOptions(
    'redis notification client', REDIS_HOST, REDIS_PORT, REDIS_API_KEY, REDIS_TLS_ENABLED));
}

const notificationClient = createNotificationClient();
let notificationClientInitialized = false;
export async function getNotificationClient() {
  if (!notificationClientInitialized) {
    notificationClientInitialized = true;
    try {
      await notificationClient.connect();
    } catch (err) {
      throw new errors.InternalServerError(err, 'Connect redis notification client failed.');
    }
  }
  return notificationClient;
}
