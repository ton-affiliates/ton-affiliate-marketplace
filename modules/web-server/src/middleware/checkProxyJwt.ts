// src/middleware/checkProxyJwt.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function checkProxyJwt(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-proxy-authorization'];
  if (!token) {
    res.status(401).json({ error: 'Missing proxy authorization token' });
    return; // return void
  }

  try {
    jwt.verify(token as string, process.env.PROXY_JWT_SECRET!);
    next(); // also return void
  } catch {
    res.status(401).json({ error: 'Invalid or expired proxy token' });
    return;
  }
}
