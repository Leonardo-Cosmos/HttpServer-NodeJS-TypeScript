import cookieParser from 'cookie-parser';
import { Router, urlencoded } from 'express';
import session from 'express-session';
import {
  loginSession,
  validateSession,
  logoutSession,
  getSessionUser,
} from './web-backend-controller';
import {
  handle,
} from '../../services/middlewares';

const router = Router();

/**
 * Support HTTP session.
 */
router.use(session({
  name: 'sample.sid',
  secret: 'sample',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Use true for HTTPS only.
    httpOnly: true, // Use true for cookie inaccessible to the JavaScript.
  }
}));

/**
 * Support HTTP request cookie.
 */
router.use(cookieParser());

router.post('/session/login',
  urlencoded({ extended: true }), // Support HTTP form data (application/x-www-form-urlencoded).
  handle(loginSession)
);

router.get('/session/validate', handle(validateSession));

router.delete('/session/logout', handle(logoutSession));

router.get('/session/user', handle(getSessionUser));

export default router;
