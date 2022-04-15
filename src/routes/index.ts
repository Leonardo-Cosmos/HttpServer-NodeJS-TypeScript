import helmet from 'helmet';
import noCache from 'nocache';
import { Router } from 'express';
import healthRouter from './health';
import {
  errorHandler,
  pageNotFound,
  setReqLogger,
  setRequestHeader
} from '../services/middlewares';
import sampleRouter from '../business-sample/sample-router';

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
router.use('/sample/1.0', sampleRouter);

router.use(pageNotFound());
router.use(errorHandler());

export default router;
