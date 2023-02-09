import "reflect-metadata";
import * as dotenv from 'dotenv';

dotenv.config();

import log from './services/logger-service';
import app from './app';

const port = process.env.NODE_PORT || 3000;

const server = app.listen(port, () => {
  log.info(`Application is running on port ${port}...`);
});
