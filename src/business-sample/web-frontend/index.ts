import { registry } from "tsyringe";
import router from './web-frontend-router';
import { RouterHandler } from '../../routes/router-handler';

const routerHandler: RouterHandler = {
  path: '/web-frontend',
  handler: router,
};

@registry([
  {
    token: "RouterHandler", useValue: routerHandler
  }
])
class RegisterClass { }

export default routerHandler;
