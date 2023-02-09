import { container } from "tsyringe";
import router from './rest-api-router';
import { RouterHandler } from '../../routes/router-handler';

const routerHandler: RouterHandler = {
  path: '/rest/1.0',
  handler: router,
};

container.register("RouterHandler", { useValue: routerHandler });

export default routerHandler;
