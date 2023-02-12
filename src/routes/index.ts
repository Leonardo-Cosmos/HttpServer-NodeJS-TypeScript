import helmet from 'helmet';
import noCache from 'nocache';
import { Router } from 'express';
import { container } from "tsyringe";
import { RouterHandler } from './router-handler';
import healthRouter from './health';
import {
  errorHandler,
  pageNotFound,
  setReqLogger,
  setRequestHeader
} from '../services/middlewares';
import '../business-sample/rest-api';
import '../business-sample/web-frontend';
import '../business-sample/web-backend';

const router = Router();

/**
 * Define the middlewares
 */
router.use(setRequestHeader());
router.use(setReqLogger());

// Secure the application by setting some default HTTP headers.
// If you want to customize helmet for specific endpoints, please refer to
// Documentation: https://github.com/helmetjs/helmet
router.use(helmet());
router.use(noCache());


/**
 * Define the endpoints
 */
router.get('/', (req, res) => res.send('Welcome!'));
router.get('/_health', healthRouter);

const routerHandlers = container.resolveAll(RouterHandler);
for (const routerHandler of routerHandlers) {
  router.use(routerHandler.path, routerHandler.handler);
}

router.use(pageNotFound());
router.use(errorHandler());

export default router;
