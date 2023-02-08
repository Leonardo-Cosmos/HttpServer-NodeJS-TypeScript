import { Router } from 'express';

export class RouterHandler {
  constructor(
    public path: string,
    public handler: Router,
  ) {

  }
}
