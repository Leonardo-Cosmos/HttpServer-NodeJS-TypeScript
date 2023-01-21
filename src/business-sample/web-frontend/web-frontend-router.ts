import { Router } from 'express';
import path from 'path';

const router = Router();

router.get('/*', (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  const filePath = path.join(__dirname, url.pathname);
  res.sendFile(filePath);
});

export default router;
