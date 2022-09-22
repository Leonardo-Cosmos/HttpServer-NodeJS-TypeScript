import { getRedisClient } from './redis-client';
import config from '../config/redis-config';

const MODULE = 'redis';

function generateKey(key: string) {
  return `${config.keyPrefix}${key}`;
}

export default {

  async delete(key: string, log: any) {
    const _log = log.child({ module: MODULE, method: 'delete' });
    const client = await getRedisClient(_log);

    _log.debug('DEL %s', key);
    const reply = await client.del(generateKey(key));
    _log.debug('DEL %s => %s', key, reply);

    return reply;
  },

  async setExpire(key: string, expire: number, log: any) {
    const _log = log.child({ module: MODULE, method: 'setExpire' });
    const client = await getRedisClient(_log);

    _log.debug('EXPIRE %s', key);
    const reply = await client.expire(generateKey(key), expire);
    _log.debug('EXPIRE %s => %s', key, reply);

    return reply;
  },

  async getString(key: string, log: any) {
    const _log = log.child({ module: MODULE, method: 'getString' });
    const client = await getRedisClient(_log);

    _log.debug('GET %s', key);
    const reply = await client.get(generateKey(key));
    _log.debug('GET %s => %s', key, reply);

    return reply;
  },

  async setString(key: string, value: string, expire: number, log: any) {
    const _log = log.child({ module: MODULE, method: 'setString' });
    const client = await getRedisClient(_log);

    _log.debug('SET %s %s, expire: %d', key, value, expire);
    let reply;
    if (expire && expire > 0) {
      reply = await client.set(generateKey(key), value, { EX: expire });
    } else {
      reply = await client.set(generateKey(key), value);
    }
    _log.debug('SET %s => %s', key, reply);

    return reply;
  },

  async getHashField(key: string, field: string, log: any) {
    const _log = log.child({ module: MODULE, method: 'getHashField' });
    const client = await getRedisClient(_log);

    _log.debug('HGET %s %s', key, field);
    const reply = await client.hGet(generateKey(key), field);
    _log.debug('HGET %s, %s => %s', key, field, reply);
    return reply;
  },

  async setHashField(key: string, field: string, value: string, expire: number, log: any) {
    const _log = log.child({ module: MODULE, method: 'setHashField' });
    const client = await getRedisClient(_log);

    _log.debug('HSET %s %s %s', key, field, value);
    const reply = await client.hSet(generateKey(key), field, value);
    _log.debug('HSET %s, %s => %s', key, field, reply);

    if (expire && expire > 0) {
      await this.setExpire(key, expire, log);
    }

    return reply;
  },

  async deleteHashField(key: string, field: string, log: any) {
    const _log = log.child({ module: MODULE, method: 'deleteHashField' });
    const client = await getRedisClient(_log);

    _log.debug('HDEL %s %s', key, field);
    const reply = await client.hDel(generateKey(key), field);
    _log.debug('HDEL %s, %s => %s', key, field, reply);
    return reply;
  },

  async isSetMember(key: string, value: string, log: any) {
    const _log = log.child({ module: MODULE, method: 'isSetMember' });
    const client = await getRedisClient(_log);

    _log.debug('SISMEMBER %s %s', key, value);
    const reply = await client.sIsMember(generateKey(key), value);
    _log.debug('SISMEMBER %s => %s', key, reply);

    return reply;
  },

  async getSetMembers(key: string, log: any) {
    const _log = log.child({ module: MODULE, method: 'getSetMembers' });
    const client = await getRedisClient(_log);

    _log.debug('SMEMBERS %s', key)
    const reply = await client.sMembers(generateKey(key));
    _log.debug('SMEMBERS %s => %j', key, reply);

    return reply;
  },

  async addSetMember(key: string, value: string, expire: number, log: any) {
    const _log = log.child({ module: MODULE, method: 'addSetMember' });
    const client = await getRedisClient(_log);

    _log.debug('SADD %s %s', key, value);
    const reply = await client.sAdd(generateKey(key), value);
    _log.debug('SADD %s => %s', key, reply);

    if (expire && expire > 0) {
      await this.setExpire(key, expire, log);
    }

    return reply;
  },

  async removeSetMember(key: string, value: string, log: any) {
    const _log = log.child({ module: MODULE, method: 'removeSetMember' });
    const client = await getRedisClient(_log);

    _log.debug('SREM %s %s', key, value);
    const reply = await client.sRem(generateKey(key), value);
    _log.debug('SREM %s => %s', key, reply);

    return reply;
  },

  async addSortedListMember(key: string, score: number, value: string, expire: number, log: any) {
    const _log = log.child({ module: MODULE, method: 'addSortedListMember' });
    const client = await getRedisClient(_log);

    _log.debug('ZADD %s %s', key, value);
    const reply = await client.zAdd(generateKey(key), { score, value });
    _log.debug('ZADD %s => %s', key, reply);

    if (expire && expire > 0) {
      await this.setExpire(key, expire, log);
    }

    return reply;
  },

  async removeSortedListMember(key: string, value: string, log: any) {
    const _log = log.child({ module: MODULE, method: 'removeSortedListMember' });
    const client = await getRedisClient(_log);

    _log.debug('ZREM %s %s', key, value);
    const reply = await client.zRem(generateKey(key), value);
    _log.debug('ZREM %s => %s', key, reply);

    return reply;
  },

};
