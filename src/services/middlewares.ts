import { Request, Response, NextFunction } from 'express';
import * as errors from 'restify-errors';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import logger, { LoggerContainer } from './logger-service';

/**
   * You could customise the middleware to better fit the application's need.
   *
   * The middleware formats and enriches the error response.
   */
export function errorHandler() {
  return (err: errors.HttpError, req: Request, res: Response, next: NextFunction) => {
    const _log = ((req as any).log || logger).child({ module: '_outbound' });
    if (err == null) {
      next();
    } else {
      if (err.statusCode == null) {
        err = new errors.InternalServerError(err);
      }
      const status = err.statusCode;
      const errBody = {
        status: err.statusCode,
        title: err.name,
        detail: err.message,
      };
      if (status >= 500) {
        _log.error('sending error response:', (errors as any).fullStack(err));
      } else {
        _log.warn('sending error response:', err.message);
      }
      res.status(status).json({ errors: [errBody] });
    }
  };
}

/**
 * You could customise the middleware to better fit the application's need.
 *
 * Handle the page not found error.
 */
export function pageNotFound() {
  return (req: Request, res: Response, next: NextFunction) => {
    const _log = (req as any).log ?? logger;
    _log.warn({ module: '_pageNotFound' }, 'The client is requesting for a missing page: %s', req.url);
    next(new errors.NotFoundError('The resource does not exist'));
  };
}

/**
 * You could customise the middleware to better fit the application's need.
 *
 * The middleware converts the async function into Express middleware.
 * Reference: https://strongloop.com/strongblog/async-error-handling-expressjs-es7-promises-generators/
 * @param {Function} fn - The function should take `req` as the only input parameters.
 */
export function reply(fn: (req: Request & LoggerContainer) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req as any))
      .then((data) => res.send(data))
      .catch((err) => next(err));
  };
}

export function accept(fn: (req: Request & LoggerContainer) => void) {
  return (req: Request, res: Response, next: (err: Error | void) => void) => {
    return Promise.resolve(fn(req as any))
      .then(data => { next(); })
      .catch(err => { next(err); });
  };
}

export function handle(fn: (req: Request & LoggerContainer, res: Response) => void) {
  return (req: Request, res: Response, next: (err: Error | void) => void) => {
    return Promise.resolve(fn(req as any, res))
      .catch(err => { next(err); });
  };
}

/**
 * You could customise the middleware to better fit the application's need.
 *
 * Create the express middleware which add request logger to the `req` object
 * @return {Middleware} the express middleware
 */
export function setReqLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const log = logger.child({
      trace_id: req.header('trace_id'),
      client_ip: req.header('client_ip'),
      user_agent: req.header('user_agent'),
    });

    (req as any).log = log;

    // skip the request log from the health API
    if ((req as any)._parsedUrl.pathname === '/_health') {
      next();
      return;
    }

    log.info({
      module: 'express',
      request: {
        httpVersion: req.httpVersion,
        method: req.method,
        pathname: (req as any)._parsedUrl.pathname,
        headers: _.pick(req.headers, ['host', 'user-agent', 'referer', 'x-forwarded-for']),
        remoteFamily: req.connection.remoteFamily,
        remoteAddress: req.connection.remoteAddress,
        remotePort: req.connection.remotePort,
      }
    }, 'Express received request');

    res.on('finish', () => {
      const time = Date.now() - startTime;
      log.info({
        module: 'express',
        response: {
          time,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: {
            contentType: res.get('content-type'),
            contentLength: parseInt(res.get('content-length') || '0'),
          }
        }
      }, 'Express sent response');
    });

    next();
  };
}

export function setRequestHeader() {
  return (req: Request, res: Response, next: NextFunction) => {
    let trace_id = req.header('trace_id') ?? uuid();
    const user_agent = req.headers['user-agent'];

    req.headers.trace_id = trace_id;
    req.headers.user_agent = user_agent;

    next();
  };
}

