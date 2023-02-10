import * as errors from 'restify-errors';
import { v4 as uuid } from 'uuid';
import {
  RedisClient,
  RedisCluster,
  RedisInfo,
  RedisSimpleOptions,
  createRedisClientOptions,
  createRedisClient,
} from './redis-client-utils';
import logger from '../services/logger-service';

type SlotInfosPromise = ReturnType<RedisClient['clusterSlots']>;
type SlotInfos = Awaited<SlotInfosPromise>;
type SlotInfo = SlotInfos[0];

const MODULE = 'redis-cluster-connection-keeper';

const REDIS_REFRESH_CONNECTION_INTERVAL = process.env.REDIS_REFRESH_CONNECTION_INTERVAL_SEC ?
  Number.parseInt(process.env.REDIS_REFRESH_CONNECTION_INTERVAL_SEC) * 1000 : 9 * 60 * 1000;

const REDIS_RANDOM_KEY_MAX_NUM = process.env.REDIS_RANDOM_KEY_MAX_NUM ?
  parseInt(process.env.REDIS_RANDOM_KEY_MAX_NUM) : 100;

declare type RedisClusterWithInfo = RedisCluster & RedisInfo;

export class RedisClusterConnectionKeeper {

  private readonly slotInfos: SlotInfo[] = [];
  private readonly nodeKeys: string[] = [];

  private readonly clusterClients: RedisClusterWithInfo[] = [];

  private isRunning = false;

  constructor(
    private options: RedisSimpleOptions,
  ) { }

  private async generateRefreshKeys(log = logger) {
    const _log = log.child({ module: MODULE, method: 'generateRefreshKeys' });
    const client = createRedisClient(createRedisClientOptions(this.options));

    try {
      await client.connect();
      const slotInfos: SlotInfos = await client.clusterSlots();
      const existingSlotInfos = this.slotInfos;

      let isSlotChanged = false;
      for (const slotInfo of slotInfos) {
        const exists = existingSlotInfos.some(info =>
          info.from === slotInfo.from && info.to === slotInfo.to && info.master.port === slotInfo.master.port);
        if (!exists) {
          isSlotChanged = true;
          break;
        }
      }

      for (const existingSlotInfo of existingSlotInfos) {
        const alive = slotInfos.some(info =>
          info.from === existingSlotInfo.from && info.to === existingSlotInfo.to && info.master.port === existingSlotInfo.master.port);
        if (!alive) {
          isSlotChanged = true;
          break;
        }
      }

      if (!isSlotChanged) {
        _log.info('Redis hash slots are not changed');
        return;
      }

      _log.info('Redis hash slots are changed, generate keys');
      const nodeSet = new Set();
      for (const slotInfo of slotInfos) {
        _log.info('Slots from %d to %d are on node of port %d', slotInfo.from, slotInfo.to, slotInfo.master.port);
        nodeSet.add(slotInfo.master.port);
      }

      const nodeKeyMap = new Map();
      for (let i = 0; i < REDIS_RANDOM_KEY_MAX_NUM; i++) {
        const randomKey = uuid();
        const slot = await client.clusterKeySlot(randomKey);
        const slotInfo = slotInfos.find(info => slot >= info.from && slot <= info.to);
        const nodePort = slotInfo!.master.port;
        _log.info('Key %s is on slot %d, node of port %d', randomKey, slot, nodePort);
        if (!nodeKeyMap.has(nodePort)) {
          nodeKeyMap.set(nodePort, randomKey);

          if (nodeSet.size === nodeKeyMap.size) {
            this.slotInfos.splice(0);
            this.slotInfos.push(...slotInfos);

            this.nodeKeys.splice(0);
            this.nodeKeys.push(...nodeKeyMap.values());
            break;
          }
        }
      }
    } catch (err) {
      _log.error('Fetch Redis cluster node list failed. %s', (errors as any).fullStack(err));
    } finally {
      await client.disconnect();
    }
  }

  private async startRefreshConnection(log = logger) {
    const _log = log.child({ module: MODULE, method: 'startRefreshConnection' });

    if (!this.isRunning) {
      return;
    }

    try {
      await this.generateRefreshKeys();
    } catch (err) {
      _log.error('Generate refresh keys failed. %s', (errors as any).fullStack(err));
    }

    try {
      for (const clusterClient of this.clusterClients) {
        for (const key of this.nodeKeys) {
          _log.info('Refresh connection of %s by key %s', clusterClient.clientName, key);
          await clusterClient.set(key, uuid(), { EX: 60 });
          await clusterClient.del(key);
        }
      }
    } catch (err) {
      _log.error('Refresh connection failed. %s', (errors as any).fullStack(err));
    }

    setTimeout(() => {
      this.startRefreshConnection(log);
    }, REDIS_REFRESH_CONNECTION_INTERVAL)
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;

      this.startRefreshConnection();
    }
  }

  stop() {
    this.isRunning = false;
  }

  addClient(client: RedisClusterWithInfo) {
    if (!client) {
      return;
    }

    const index = this.clusterClients.indexOf(client);
    if (index === -1) {
      this.clusterClients.push(client);
    }
  }

  removeClient(client: RedisClusterWithInfo) {
    if (!client) {
      return;
    }

    const index = this.clusterClients.indexOf(client);
    if (index > -1) {
      this.clusterClients.splice(index, 1);
    }
  }

}
