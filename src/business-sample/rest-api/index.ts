import router from './rest-api-router';
import { RouterHandler } from '../../routes/router-handler';

const routerHandler: RouterHandler = {
  path: '/rest/1.0',
  handler: router,
};

export default routerHandler;
