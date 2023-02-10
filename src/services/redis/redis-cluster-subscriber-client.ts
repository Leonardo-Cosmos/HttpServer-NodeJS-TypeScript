import * as errors from 'restify-errors';
import { v4 as uuid } from 'uuid';
import {
  RedisClient,
  RedisInfo,
  RedisSimpleOptions,
  NodeAddress,
  createRedisClientOptions,
  createRedisClient,
} from './redis-client-utils';
import logger from '../services/logger-service';

const MODULE = 'redis-cluster-subscriber-client';

declare type RedisClientWithInfo = RedisClient & RedisInfo;
declare type ChannelMessageListener = (message: string, channel: string) => void;

export class RedisClusterSubscribeClient {

  private readonly nodeAddresses: NodeAddress[] = [];
  private readonly nodeClientMap: Map<number, RedisClientWithInfo> = new Map();
  private readonly nodeClientStatus: Map<string, string> = new Map();

  private readonly STATUS_REPLACE = 'replace';
  private readonly STATUS_READY = 'ready';
  private readonly STATUS_ERROR = 'error';

  private readonly channelListenerMap: Map<string, Set<ChannelMessageListener>> = new Map();

  private baseClient: RedisClient;
  private baseClientInitialized = false;
  private baseClientClosed = false;

  constructor(
    private options: RedisSimpleOptions,
  ) {
    this.baseClient = createRedisClient(createRedisClientOptions(this.options));
  }

  private async fetchClusterNodes(): Promise<NodeAddress[]> {
    const _log = logger.child({ module: MODULE, method: 'fetchClusterNodes' });
    _log.info('Fetch Redis cluster node list.');

    try {
      if (!this.baseClientInitialized) {
        this.baseClientInitialized = true;
        await this.baseClient.connect();
      }

      const nodes = await this.baseClient.clusterNodes();
      return nodes.map(node => {
        return { host: node.host, port: node.port };
      });
    } catch (err) {
      _log.error('Fetch Redis cluster node list failed. %s', (errors as any).fullStack(err));
      return [];
    }
  }

  private async connectNode(nodeAddress: NodeAddress) {
    const _log = logger.child({ module: MODULE, method: 'connectNodes' });
    _log.info('Connect to Redis cluster node %j.', nodeAddress);

    try {
      const nodeClient = this.createNodeClient(nodeAddress);
      await nodeClient.connect();

      this.nodeClientMap.set(nodeAddress.port, nodeClient);

    } catch (err) {
      _log.error('Connect to Redis cluster node %j failed. %s', nodeAddress, (errors as any).fullStack(err));
    }
  }

  private async disconnectNode(nodeAddress: NodeAddress) {
    const _log = logger.child({ module: MODULE, method: 'disconnectNodes' });
    _log.info('Disconnect from Redis cluster node %j.', nodeAddress);

    try {
      const nodeClient = this.nodeClientMap.get(nodeAddress.port);
      if (!nodeClient) {
        return;
      }

      await nodeClient.disconnect();

      this.nodeClientMap.delete(nodeAddress.port);

    } catch (err) {
      _log.error('Disconnect from Redis cluster node %j failed. %s', nodeAddress, (errors as any).fullStack(err));
    }
  }

  private async recoverSubscription(nodeClient: RedisClientWithInfo) {
    const _log = logger.child({ module: MODULE, method: 'recoverSubscription' });
    _log.info('Recover subscription of %s.', nodeClient.clientName);

    try {
      for (const channel of this.channelListenerMap.keys()) {
        const listenerSet = this.channelListenerMap.get(channel)!;
        _log.debug("Recover subscription channel %s, listener count %d.", channel, listenerSet.size);
        for (const listener of listenerSet) {
          await nodeClient.subscribe(channel, listener);
        }
      }
    } catch (err) {
      _log.error('Recover subscription of %s failed. %s', nodeClient.clientName,
        (errors as any).fullStack(err));
    }
  }

  private createNodeClient(nodeAddress: NodeAddress) {
    const nodeClient = createRedisClient(createRedisClientOptions(`${this.clientName}-${nodeAddress.port}-${uuid().substring(0, 8)}`,
      this.host, nodeAddress.port, this.password, this.tls));

    nodeClient.on('ready', async () => {
      await this.onNodeClientReady(nodeClient, nodeAddress);
    })

    nodeClient.on('error', async () => {
      await this.onNodeClientError(nodeClient, nodeAddress);
    });

    nodeClient.on('end', async () => {
      await this.onNodeClientEnd(nodeClient);
    });

    return nodeClient;
  }

  private async onNodeClientReady(nodeClient: RedisClientWithInfo, nodeAddress: NodeAddress) {
    const _log = logger.child({ module: MODULE, method: 'onNodeClientReady' });

    const currentStatus = this.nodeClientStatus.get(nodeClient.clientName);
    this.nodeClientStatus.set(nodeClient.clientName, this.STATUS_READY);

    if (currentStatus === this.STATUS_REPLACE) {
      _log.info('The %s is ready to replace existing one with error.', nodeClient.clientName);

      const oldNodeClient = this.nodeClientMap.get(nodeAddress.port);
      if (oldNodeClient) {
        try {
          await oldNodeClient.disconnect();
        } catch (err) {
          _log.error('Disconnect replaced node client %s failed. %s',
            oldNodeClient.clientName, (errors as any).fullStack(err));
        }
      } else {
        _log.warn('The existing node client on %j is not found', nodeAddress);
      }
      this.nodeClientMap.set(nodeAddress.port, nodeClient);
    }

    this.recoverSubscription(nodeClient);
  }

  private async onNodeClientError(nodeClient: RedisClientWithInfo, nodeAddress: NodeAddress) {
    const _log = logger.child({ module: MODULE, method: 'onNodeClientError' });

    const currentStatus = this.nodeClientStatus.get(nodeClient.clientName);
    this.nodeClientStatus.set(nodeClient.clientName, this.STATUS_ERROR);

    if (currentStatus === this.STATUS_READY) {
      _log.info('The %s comes across error first time after ready.', nodeClient.clientName);

      const newNodeClient = this.createNodeClient(nodeAddress);
      this.nodeClientStatus.set(newNodeClient.clientName, this.STATUS_REPLACE);
      try {
        await newNodeClient.connect();
      } catch (err) {
        _log.error('Connect replacement node client %s failed. %s',
          newNodeClient.clientName, (errors as any).fullStack(err));
      }
    }
  }

  private async onNodeClientEnd(nodeClient: RedisClientWithInfo) {
    const _log = logger.child({ module: MODULE, method: 'onNodeClientEnd' });

    _log.info('The %s is ended successfully.', nodeClient.clientName);
    this.nodeClientStatus.delete(nodeClient.clientName);
  }

  private async checkClusterNodes(log = logger) {
    const _log = log.child({ module: MODULE, method: 'checkClusterNodes' });
    const nodeAddresses = await this.fetchClusterNodes();
    _log.info('Redis cluster nodes: %j', nodeAddresses);
    if (nodeAddresses.length === 0) {
      _log.warn('Redis cluster node list is not available.');
      return;
    }

    const addedNodes = [];
    const removedNodes = [];
    const connectedNodeAddresses = this.nodeAddresses;

    for (const nodeAddress of nodeAddresses) {
      const exists = connectedNodeAddresses.some(
        address => address.port === nodeAddress.port);
      if (!exists) {
        addedNodes.push(nodeAddress);
      }
    }

    for (const connectedNodeAddress of connectedNodeAddresses) {
      const alive = nodeAddresses.some(
        address => address.port === connectedNodeAddress.port);
      if (!alive) {
        removedNodes.push(connectedNodeAddress);
      }
    }

    if (addedNodes.length > 0 || removedNodes.length > 0) {
      this.nodeAddresses.splice(0);
      this.nodeAddresses.push(...nodeAddresses);
    }

    const promises = [];
    if (addedNodes.length > 0) {
      for (const nodeAddress of addedNodes) {
        promises.push(this.connectNode(nodeAddress));
      }
    }
    if (removedNodes.length > 0) {
      for (const nodeAddress of removedNodes) {
        promises.push(this.disconnectNode(nodeAddress));
      }
    }
    await Promise.all(promises);
  }

  private async startCheckClusterNodes(log = logger) {
    const _log = log.child({ module: MODULE, method: 'startCheckClusterNodes' });
    if (this.baseClientClosed) {
      return;
    }

    try {
      await this.checkClusterNodes(log);
    } catch (err) {
      _log.error('Check cluster nodes failed. %s', (errors as any).fullStack(err));
    }

    setTimeout(async () => {
      this.startCheckClusterNodes(log);
    }, REDIS_CHECK_NODE_INTERVAL);
  }

  async connect() {
    const _log = logger.child({ module: MODULE, method: 'connect' });

    // const nodeAddresses = await this.fetchClusterNodes();

    // _log.info('Redis cluster nodes: %j', nodeAddresses);
    // if (nodeAddresses.length === 0) {
    //   _log.warn('Redis cluster nodes list is not ready.');
    //   return;
    // }

    // await this.connectNodes(nodeAddresses);

    this.startCheckClusterNodes(_log);
  }

  async disconnect() {
    const promises = [];
    for (const nodeAddress of this.nodeAddresses) {
      promises.push(this.disconnectNode(nodeAddress));
    }
    await Promise.all(promises);

    if (this.baseClientInitialized) {
      this.baseClientClosed = true;
      await this.baseClient.disconnect();
    }
  }

  async subscribe(channel: string, listener: ChannelMessageListener) {

    let listenerSet: Set<ChannelMessageListener>;
    if (this.channelListenerMap.has(channel)) {
      listenerSet = this.channelListenerMap.get(channel)!;
    } else {
      listenerSet = new Set();
      this.channelListenerMap.set(channel, listenerSet);
    }

    listenerSet.add(listener);

    const promises = [];
    for (const nodeClient of this.nodeClientMap.values()) {
      promises.push(nodeClient.subscribe(channel, listener));
    }
    await Promise.all(promises);
  }
}
