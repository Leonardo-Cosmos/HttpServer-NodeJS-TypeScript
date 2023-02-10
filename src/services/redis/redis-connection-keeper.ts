import * as errors from 'restify-errors';
import {
  RedisClient,
  RedisInfo,
} from './redis-client-utils';
import logger from '../services/logger-service';

const MODULE = 'redis-connection-keeper';

const REDIS_REFRESH_CONNECTION_INTERVAL = process.env.REDIS_REFRESH_CONNECTION_INTERVAL_SEC ?
  Number.parseInt(process.env.REDIS_REFRESH_CONNECTION_INTERVAL_SEC) * 1000 : 9 * 60 * 1000;

declare type RedisClientWithInfo = RedisClient & RedisInfo;

export class RedisConnectionKeeper {

  private readonly clients: RedisClientWithInfo[] = [];

  private isRunning = false;

  private async startRefreshConnection(log = logger) {
    const _log = log.child({ module: MODULE, method: 'startRefreshConnection' });
    if (!this.isRunning) {
      return;
    }

    for (const client of this.clients) {
      try {
        _log.info('Refresh connection of %s', client.clientName);
        await client.ping();

      } catch (err) {
        _log.error('Refresh connection of %s failed. %s', client.clientName, (errors as any).fullStack(err));
      }
    }

    setTimeout(() => {
      this.startRefreshConnection(log);
    }, REDIS_REFRESH_CONNECTION_INTERVAL);
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

  addClient(client: RedisClientWithInfo) {
    if (!client) {
      return;
    }
    const index = this.clients.indexOf(client);
    if (index === -1) {
      this.clients.push(client);
    }
  }

  removeClient(client: RedisClientWithInfo) {
    if (!client) {
      return;
    }
    const index = this.clients.indexOf(client);
    if (index > -1) {
      this.clients.splice(index, 1);
    }
  }

}
