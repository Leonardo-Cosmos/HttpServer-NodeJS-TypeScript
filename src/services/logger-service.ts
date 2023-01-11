import * as Pino from 'pino';
import * as errors from 'restify-errors';
import config from '../config/logger-config';

export interface LoggerContainer {
  log: any;
}

export function logError(err: any, log: any) {
  if (err instanceof Error) {
    log.error('%s', (errors as any).fullStack(err));
  } else {
    log.error('%j', err);
  }
}

export function isDebugEnabled(log: any) {
  return log?.isLevelEnabled('debug');
}

export function logExtraValues(log: any, msg: string, ...values: any[]) {

  if (isDebugEnabled(log)) {

    for (const value of values) {
      if ('string' === typeof (value)) {
        msg += ' %s';
      } else if ('number' === typeof (value)) {
        msg += ' %d';
      } else {
        msg += ' %j';
      }
    }

    log.debug(msg, ...values);

  } else {

    log.info(msg);

  }
}

const defaultLogger = Pino.default(config);

export function getLogger() {
  return defaultLogger;
}

export default defaultLogger;
