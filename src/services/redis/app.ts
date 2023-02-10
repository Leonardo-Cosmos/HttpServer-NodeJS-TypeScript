import { randomBytes } from 'crypto';
import * as errors from 'restify-errors';
import { RedisClient, RedisCluster, RedisApp } from './redis-client-utils';
import { getClient, getKeyspaceClient } from './redis-client';
import { RedisClusterSubscribeClient } from './redis-cluster-subscriber-client';
import { getLogger } from '../services/logger-service';
import { sleepAsync } from '../services/helper';

const MODULE = 'redis-app';

async function setString(redis: RedisApp, key: string, value: string, expire: number) {
  const log = getLogger().child({ module: MODULE, method: 'setString' });
  log.info('SET %s %s', key, expire);
  try {
    const reply = await redis.set(key, value, { EX: expire });
    log.info('SET %s => %s', key, reply);
    return reply;
  } catch (err) {
    log.error('SET %s error: %s', key, (errors as any).fullStack(err));
  }
}

async function getString(redis: RedisApp, key: string) {
  const log = getLogger().child({ module: MODULE, method: 'getString' });
  log.info('GET %s', key);
  try {
    const reply = await redis.get(key);
    log.info('GET %s => %s', key, reply);
    return reply;
  } catch (err) {
    log.error('GET %s error: %s', key, (errors as any).fullStack(err));
  }
}

async function subscribeExpireEvent(redis: RedisClient | RedisClusterSubscribeClient) {
  const log = getLogger().child({ module: MODULE, method: 'publishNotification' });
  const EXPIRED_CHANNEL = '__keyevent@0__:expired';
  let reply = await redis.subscribe(EXPIRED_CHANNEL, (message) => {
    const _log = getLogger().child({ module: MODULE, method: 'expireListener' });
    _log.info('Expired key: %s', message);
  });
  log.info('Subscribe expire', reply);
  reply = await redis.subscribe(EXPIRED_CHANNEL, (message) => {
    const _log = getLogger().child({ module: MODULE, method: 'expireListener' });
    _log.info('Expired key again: %s', message);
  });
  return reply;
}

async function subscribeNotification(redis: RedisClient | RedisClusterSubscribeClient, channel: string,
  listener: (message: string, channel: string) => void) {
  const log = getLogger().child({ module: MODULE, method: 'subscribeNotification' });
  await redis.subscribe(channel, listener);
  log.info('Subscribed channel %s', channel);
}

async function publishNotification(redis: RedisApp, channel: string, message: string) {
  const log = getLogger().child({ module: MODULE, method: 'publishNotification' });
  log.info('Publish notification %s to channel %s', message, channel);
  const reply = await redis.publish(channel, message);
  log.info('Published notification %s to channel %s => %s', message, channel, reply);
  return reply;
}

export async function randomNumberNotification() {
  const log = getLogger().child({ module: MODULE, method: 'randomNumberNotification' });

  const redisClient: RedisApp | null = await getClient();
  if (!redisClient) {
    return;
  }

  const subscriberClient = await getKeyspaceClient();
  await subscribeExpireEvent(subscriberClient);

  for (let j = 1; j <= 20; j++) {

    const version = randomBytes(4).toString('hex');
    const expire = 30 * j;

    for (let i = 0; i < 4; i++) {
      const buffer = randomBytes(8);
      const key = `${version}:${buffer.toString('hex')}`;
      await setString(redisClient, key, buffer.toString('base64'), expire);
      const value = await getString(redisClient, key);
      log.debug(`Value: ${value}`);
    }
  }

  await redisClient.disconnect();

  await sleepAsync(600 * 1000);
  await subscriberClient.disconnect();
}

export async function notification() {
  const log = getLogger().child({ module: MODULE, method: 'notification' });

  const redisClient = await getClient();
  const subscriberClient = await getKeyspaceClient();
  await subscribeNotification(subscriberClient, 'broadcast', (message) => {
    const _log = log.child({ module: MODULE, method: 'broadcastListener' });
    _log.info('On message %s', message);
  });

  await sleepAsync(5 * 1000);

  await publishNotification(redisClient, 'broadcast', 'Hello world');

  await sleepAsync(5 * 1000);

  await redisClient.disconnect();
  await subscriberClient.disconnect();
}

export async function randomNumber() {
  const log = getLogger().child({ module: MODULE, method: 'randomNumber' });

  const redisClient: RedisApp | null = await getClient();
  if (!redisClient) {
    return;
  }

  for (let j = 1; j <= 20; j++) {

    const version = randomBytes(4).toString('hex');
    const expire = 3 * j;

    for (let i = 0; i < 40; i++) {
      const buffer = randomBytes(8);
      const key = `CONN-GENESYS:${buffer.toString('hex')}-conversation`;
      await setString(redisClient, key, buffer.toString('base64'), expire);
      const value = await getString(redisClient, key);
      log.debug(`Value: ${value}`);
    }
  }

  await redisClient.disconnect();
}
