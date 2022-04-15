import axios from 'axios';
import http from 'http';
import https from 'https';
import * as errors from 'restify-errors';
import defaultLogger, { isDebugEnabled } from './logger-service';

const MODULE = 'axios';

export class LogOptions {
  constructor(
    public log: any,
    public description?: string,
    public ignoreBody?: boolean,
  ) { }
}

export const axiosInstance = axios.create({
  timeout: process.env.API_TIMEOUT ? parseInt(process.env.API_TIMEOUT) : 30000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true
  })
});

export async function axiosRequest(axiosOptions: any, logOptions?: LogOptions) {

  const log = logOptions?.log ?? defaultLogger;

  const _log = log.child({ module: MODULE });

  const description = logOptions?.description ?? 'HTTP'

  try {
    const httpBodyLogged = isDebugEnabled(_log) && !(logOptions?.ignoreBody)

    const reqLog = {
      axiosRequest: {
        method: axiosOptions.method,
        url: axiosOptions.url,
      },
      headers: axiosOptions.headers ? JSON.stringify(axiosOptions.headers) : undefined,
      query: axiosOptions.params ? JSON.stringify(axiosOptions.params) : undefined,
      body: httpBodyLogged && axiosOptions.data ? JSON.stringify(axiosOptions.data) : undefined,
      msg: `Axios sent request: ${description}`,
    };

    if (httpBodyLogged) {
      _log.debug(reqLog);
    } else {
      _log.info(reqLog);
    }

    const { data, status } = await axiosInstance(axiosOptions);

    const resLog = {
      axiosResponse: {
        status: status,
      },
      body: httpBodyLogged ? JSON.stringify(data) : undefined,
      msg: `Axios received response: ${description}`
    }

    if (httpBodyLogged) {
      _log.debug(resLog);
    } else {
      _log.info(resLog);
    }

    return data;

  } catch (err: any) {
    if (err.response) {
      const { data, status } = err.response;

      const errLog = {
        axiosResponse: {
          status: status,
        },
        body: JSON.stringify(data),
        msg: `Axios received error: ${description}`
      }

      _log.error(errLog);
    }

    throw new errors.InternalServerError(err, `Axios received error: ${description}`);
  }
}
