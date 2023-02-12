import { container } from "tsyringe";
import router from './rest-api-router';
import { RouterHandler } from '../../routes/router-handler';

const routerHandler = new RouterHandler('/rest/1.0', router);

container.register<RouterHandler>(RouterHandler, { useValue: routerHandler });

export default routerHandler;
