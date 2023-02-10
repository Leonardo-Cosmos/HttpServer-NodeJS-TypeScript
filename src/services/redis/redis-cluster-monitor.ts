import * as errors from 'restify-errors';
import { Subject, Subscription } from 'rxjs'
import {
  RedisClient,
  RedisInfo,
  NodeAddress,
  createRedisClientOptions,
  createRedisClient,
  RedisSimpleOptions,
} from './redis-client-utils';
import logger from '../services/logger-service';

const MODULE = 'redis-cluster-monitor';

const REDIS_CHECK_NODE_INTERVAL = process.env.REDIS_CHECK_NODE_INTERVAL_SEC ?
  Number.parseInt(process.env.REDIS_CHECK_NODE_INTERVAL_SEC) * 1000 : 10 * 1000;

export class NodeChangedEvent {
  constructor(
    public nodes: NodeAddress[],
    public addedNodes: NodeAddress[],
    public removedNodes: NodeAddress[]) {
  }
}

export class RedisClusterMonitor {

  private readonly nodeAddresses: NodeAddress[] = [];

  private baseClient: RedisClient;
  private baseClientInitialized = false;
  private baseClientClosed = false;

  private nodeChangeSubject: Subject<NodeChangedEvent>;

  constructor(
    private options: RedisSimpleOptions,
  ) {
    this.baseClient = createRedisClient(createRedisClientOptions(this.options));
    this.nodeChangeSubject = new Subject<NodeChangedEvent>();
  }

  private async fetchClusterNodes(log = logger): Promise<NodeAddress[]> {
    const _log = log.child({ module: MODULE, method: 'fetchClusterNodes' });
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

    // const promises = [];
    // if (addedNodes.length > 0) {
    //   for (const nodeAddress of addedNodes) {
    //     promises.push(this.connectNode(nodeAddress));
    //   }
    // }
    // if (removedNodes.length > 0) {
    //   for (const nodeAddress of removedNodes) {
    //     promises.push(this.disconnectNode(nodeAddress));
    //   }
    // }
    // await Promise.all(promises);

    this.nodeChangeSubject.next({
      nodes: nodeAddresses,
      addedNodes,
      removedNodes,
    });
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

    setTimeout(() => {
      this.startCheckClusterNodes(log);
    }, REDIS_CHECK_NODE_INTERVAL);
  }

  async start() {
    const _log = logger.child({ module: MODULE, method: 'start' });

    await this.startCheckClusterNodes(_log);
  }

  async stop() {
    const _log = logger.child({ module: MODULE, method: 'stop' });

    if (this.baseClientInitialized) {
      this.baseClientClosed = true;
      await this.baseClient.disconnect();
    }
  }

  subscribeNodeChange(observer: (event: NodeChangedEvent) => void): Subscription {
    return this.nodeChangeSubject.subscribe(observer)
  }
}
