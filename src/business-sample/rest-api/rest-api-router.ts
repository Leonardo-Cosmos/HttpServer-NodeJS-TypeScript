import { Router } from 'express';
import {
  reply,
} from '../../services/middlewares';
import {
  handleSample
} from './rest-api-controller';
const MODULE = 'sample/router';

const router = Router();

router.post('/handle',
  reply(async (req) => {
    const log = req.log.child({ module: MODULE, method: 'handleSample' });
    log.info('Handle sample message start. %j', { body: req.body });

    const result = await handleSample(req.body, req.log);

    log.info('Handle sample message end. %j', result);
    return result;
  })
);

export default router;
