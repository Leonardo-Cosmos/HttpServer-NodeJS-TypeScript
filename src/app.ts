import cors from 'cors';
import * as bodyParser from 'body-parser';
import express, { Request } from 'express';

import routes from './routes';
import log from './services/logger-service';

const app = express();

const logger = log.child({ module: 'app' });

app.use(bodyParser.json({ type: ['application/json', 'application/*+json'] }));

function corsOptions(req: Request, callback: (err: Error | null, options: any) => void) {
  let _corsOptions;
  const origin = req.header('Origin');
  if (!origin) return callback(null, true);

  const whiteList = process.env.WHITE_LIST ? process.env.WHITE_LIST : '';
  const originIsWhitelisted = whiteList.split(',').indexOf(origin) !== -1;

  if (originIsWhitelisted) {
    _corsOptions = { origin: origin, credentials: true }; // reflect (enable) the requested origin in the CORS response
  } else {
    _corsOptions = { origin: false }; // disable CORS for this request
  }
  callback(originIsWhitelisted ? null : new Error('WARNING: CORS Origin Not Allowed'), _corsOptions); // callback expects two parameters: error and options
}
// app.use(cors(corsOptions));
// app.options('*', cors(corsOptions));

app.use(routes);

process.on('uncaughtException', function (err) {
  logger.error('Uncaught exception: ', err.stack);
});

export default app;

