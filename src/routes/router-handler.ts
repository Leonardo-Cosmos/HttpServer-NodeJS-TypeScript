import { Router } from 'express';

export interface RouterHandler {
  path: string,
  handler: Router,
}
