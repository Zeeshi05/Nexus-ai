import express, { Request, Response, NextFunction } from 'express';
import { authenticate, authorize, sanitizeInputs } from './authMiddleware';
import { Role, Permission } from './roles';
import { signToken } from './tokenService';

export const app = express();

app.use(express.json());

app.post('/auth/token', (req: Request, res: Response) => {
  const { userId, email, role } = req.body;

  if (!userId || !email || !role || !Object.values(Role).includes(role)) {
    res.status(400).json({ error: 'Invalid payload: userId, email, and valid role are required' });
    return;
  }

  const token = signToken({ userId, email, role });
  res.json({ token });
});

app.get('/api/data', [sanitizeInputs, authenticate, authorize(Permission.READ)], (req: Request, res: Response) => {
  res.json({ message: 'Data retrieved successfully', user: req.user });
});

app.delete('/api/resource', [sanitizeInputs, authenticate, authorize(Permission.DELETE)], (req: Request, res: Response) => {
  res.json({ message: 'Resource deleted successfully' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
}