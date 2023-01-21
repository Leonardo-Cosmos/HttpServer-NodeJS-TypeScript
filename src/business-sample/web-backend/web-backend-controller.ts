import { Request, Response } from 'express';
import * as errors from 'restify-errors';
import { LoggerContainer } from '../../services/logger-service';

const MODULE = 'web-backend/controller';

const authorizedCookieName = 'authorized';

export async function loginSession(req: Request & LoggerContainer, res: Response): Promise<any> {
  const _log = req.log.child({ module: MODULE, method: 'login' });

  const username = req.body.username;
  const forwardUrl = req.body.forwardUrl;
  const fallbackUrl = req.body.fallbackUrl;

  if (!username) {
    _log.info('Username is not found in session.');
    res.clearCookie(authorizedCookieName);
    res.redirect(fallbackUrl);
    return;
  }

  _log.info('Username in session is %s', username);
  (req.session as any).username = username;
  res.cookie(authorizedCookieName, '1', { maxAge: 1000 * 60 * 5 });
  res.redirect(forwardUrl);
}

export async function validateSession(req: Request & LoggerContainer, res: Response): Promise<any> {
  const _log = req.log.child({ module: MODULE, method: 'validateSession' });

  const username = (req.session as any).username;

  let authorized = req.cookies[authorizedCookieName] === '1';
  if (authorized) {
    _log.info('Authorized cookie detected');
  }

  if (username) {
    _log.info('Username in session is %s', username);
    res.cookie(authorizedCookieName, '1', { maxAge: 1000 * 60 * 5 })
    authorized = true;
  } else {
    _log.info('Username is not found in session');
    res.clearCookie(authorizedCookieName);
    authorized = false;
  }

  res.send({
    authorized
  });
}

export async function logoutSession(req: Request & LoggerContainer, res: Response) {
  const _log = req.log.child({ module: MODULE, method: 'login' });

  const username = (req.session as any).username;
  if (username) {
    _log.info('Username in session is %s', username);
    req.session.destroy((err) => {
      _log.error('Destroy session failed. %s', (errors as any).fullStack(err))
    });
    res.clearCookie(authorizedCookieName);
  } else {
    _log.info('Username is not found in session');
  }

  res.end();
}

export async function getSessionUser(req: Request & LoggerContainer, res: Response): Promise<any> {
  const _log = req.log.child({ module: MODULE, method: 'getSessionUser' });

  const username = (req.session as any).username;

  if (username) {
    _log.info('Username in session is %s', username);
    res.send({
      username
    });

  } else {
    _log.info('User is not found in session');
    res.sendStatus(401); // Unauthorized
  }
}
