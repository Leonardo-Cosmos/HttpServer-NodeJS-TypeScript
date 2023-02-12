import { container } from "tsyringe";
import router from './web-frontend-router';
import { RouterHandler } from '../../routes/router-handler';

const routerHandler = new RouterHandler('/web-frontend', router);

container.register<RouterHandler>(RouterHandler, { useValue: routerHandler });

export default routerHandler;
