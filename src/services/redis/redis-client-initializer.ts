import { RedisApp, RedisInfo } from "./redis-client-utils";

const { setTimeoutAsync } = require('../helper');
const logger = require('../logger');

const MODULE = 'services/redis-client-initializer';

const WAIT_INTERVAL = process.env.WAIT_INTERVAL ? Number.parseInt(process.env.WAIT_INTERVAL) : 500;
const MAX_WAIT_COUNT = process.env.MAX_WAIT_COUNT ? Number.parseInt(process.env.MAX_WAIT_COUNT) : 20;

declare type RedisClientWithInfo = RedisApp & RedisInfo;

export declare type InitOptions = {
  disposeCallback?: (client: RedisApp) => Promise<void>,
  waitInterval?: number,
  maxWaitCount?: number,
}

export class RedisClientInitializer {

  private initializing = false;
  private initialized = false;

  private createCallback: () => Promise<RedisClientWithInfo>;
  private initCallback: (client: RedisApp) => Promise<void>;
  private disposeCallback?: (client: RedisApp) => Promise<void>;

  private waitInterval: number;
  private maxWaitCount: number;

  private client?: RedisClientWithInfo;

  /**
   * 
   * @param {Function} createCallback 
   * @param {Function} initCallback 
   * @param {{ waitInterval: number, maxWaitCount: number, disposeCallback: Function}} options 
   */
  constructor(createCallback: () => Promise<RedisClientWithInfo>, initCallback: (client: RedisApp) => Promise<void>, options?: InitOptions) {

    this.createCallback = createCallback;
    this.initCallback = initCallback;
    this.disposeCallback = options?.disposeCallback;

    this.waitInterval = (options?.waitInterval) || WAIT_INTERVAL;
    this.maxWaitCount = (options?.maxWaitCount) || MAX_WAIT_COUNT;
  }

  private async init(log = logger) {
    const _log = log.child({ module: MODULE, method: 'init' });

    this.initializing = true;

    this.client = await this.createCallback();

    try {
      _log.debug('Initialize %s', this.client.clientName);
      await this.initCallback(this.client);
      _log.debug('Initialize %s successfully', this.client.clientName);
      this.initialized = true;
    } catch (err) {
      _log.error('Initialize %s failed', this.client.clientName);
      throw err;
    } finally {
      this.initializing = false;
    }
  }

  private async awaitInit(log = logger) {
    const _log = log.child({ module: MODULE, method: 'waitInit' });

    let waitCount = 0;
    while (!this.initialized) {
      _log.trace('Wait %d millisecond for %s', this.waitInterval, this.client?.clientName ?? '*');
      await setTimeoutAsync(this.waitInterval);
      _log.trace('Waited %d millisecond for %s', this.waitInterval, this.client?.clientName ?? '*');

      waitCount++;
      if (waitCount >= this.maxWaitCount) {
        _log.warn('Skip waiting for %s after %d times. There must be something wrong.',
          this.client?.clientName ?? '*', this.maxWaitCount);
        break;
      }
    }
  }

  async getClient() {
    const _log = logger.child({ module: MODULE, method: 'getClient' });

    if (this.initializing) {
      if (!this.initialized) {
        await this.awaitInit();
      } else {
        _log.warn('Unexpected condition. There must be someting wrong has to be fixed in this class.')
      }
    } else {
      if (!this.initialized) {
        await this.init();
      } else {
        // Most common condition, do nothing.
      }
    }

    _log.trace('Got %s', this.client?.clientName ?? '*');
    return this.client;
  }

  async resetClient() {
    const _log = logger.child({ module: MODULE, method: 'resetClient' });
    if (this.initializing) {
      await this.awaitInit();
    }

    if (this.initialized) {
      const oldClient = this.client!;

      _log.debug('Dispose existing %s, the client will be created and initialized again.', this.client!.clientName);
      this.client = undefined;
      this.initialized = false;

      if (this.disposeCallback) {
        try {
          _log.debug('Dispose %s', oldClient.clientName);
          await this.disposeCallback(oldClient);
          _log.debug('Dispose %s successfully', oldClient.clientName);
        } catch (err) {
          _log.debug('Dispose %s failed', oldClient.clientName);
          throw err;
        }
      }
    }
  }

}

