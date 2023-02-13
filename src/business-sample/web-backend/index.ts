import { container } from "tsyringe";
import router from './web-backend-router';
import { RouterHandler } from '../../routes/router-handler';

const routerHandler = new RouterHandler('/web-backend', router);

container.register<RouterHandler>(RouterHandler, { useValue: routerHandler });

export default routerHandler;
