import { registry } from "tsyringe";
import router from './web-backend-router';
import { RouterHandler } from '../../routes/router-handler';

const routerHandler: RouterHandler = {
  path: '/web-backend',
  handler: router,
};

@registry([
  {
    token: "RouterHandler", useValue: routerHandler
  }
])
class RegisterClass { }

export default routerHandler;
