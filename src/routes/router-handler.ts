import { Router } from 'express';
import { injectable } from 'tsyringe';

@injectable()
export class RouterHandler {
  constructor(
    private _path: string,
    private _handler: Router,
  ) { }

  get path(): string {
    return this._path;
  }

  get handler(): Router {
    return this._handler;
  }

}
