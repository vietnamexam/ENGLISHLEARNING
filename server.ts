import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  createAdminSessionToken,
  parseCookies,
  requireAdminSession,
  updateAdminPassword,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from './server/authMiddleware.ts';
import geminiRoutes from './server/routes/geminiRoutes.ts';

dotenv.config();

async function createServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'english-learning-api' });
  });

  // Admin auth routes (password never exists in frontend bundle)
  app.get('/api/admin/session', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const authenticated = verifyAdminSessionToken(cookies['el_admin_session']);
    res.json({ authenticated });
  });

  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body as { password?: string };
    if (!password || !verifyAdminPassword(String(password))) {
      res.status(401).json({ error: 'Mật khẩu Admin không đúng.' });
      return;
    }
    const token = createAdminSessionToken();
    res.cookie('el_admin_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60 * 1000,
    });
    res.json({ authenticated: true });
  });

  app.post('/api/admin/logout', (_req, res) => {
    res.clearCookie('el_admin_session', { path: '/' });
    res.json({ ok: true });
  });

  app.post('/api/admin/change-password', requireAdminSession, (req, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    const result = updateAdminPassword(String(currentPassword || ''), String(newPassword || ''));
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true, message: 'Đổi mật khẩu Admin thành công.' });
  });

  // Server-side Gemini proxy routes
  app.use('/api/gemini', geminiRoutes);

  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ENGLISH LEARNING server running at http://0.0.0.0:${port}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
