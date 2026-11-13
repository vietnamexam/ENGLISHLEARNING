import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';

const PROJECT_ID = 'englishlearning68';
const DATA_DIR = path.resolve(process.cwd(), '.data');
const ADMIN_AUTH_FILE = path.join(DATA_DIR, 'admin-auth.json');

interface AdminAuthStore {
  salt: string;
  passwordHash: string;
  sessionSecret: string;
  updatedAt: string;
}

interface CertCache {
  certs: Record<string, string>;
  expiresAt: number;
}

let certCache: CertCache | null = null;

function ensureAdminStore(): AdminAuthStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(ADMIN_AUTH_FILE)) {
    const raw = fs.readFileSync(ADMIN_AUTH_FILE, 'utf8');
    return JSON.parse(raw) as AdminAuthStore;
  }
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'a0988948882A@';
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(initialPassword, salt, 64).toString('hex');
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  const store: AdminAuthStore = {
    salt,
    passwordHash,
    sessionSecret,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify(store, null, 2), 'utf8');
  return store;
}

export function verifyAdminPassword(password: string): boolean {
  const store = ensureAdminStore();
  const derived = crypto.scryptSync(password, store.salt, 64);
  const expected = Buffer.from(store.passwordHash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function updateAdminPassword(currentPassword: string, newPassword: string): { ok: boolean; error?: string } {
  if (!verifyAdminPassword(currentPassword)) {
    return { ok: false, error: 'Mật khẩu Admin hiện tại không chính xác.' };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: 'Mật khẩu mới phải có ít nhất 8 ký tự.' };
  }
  const store = ensureAdminStore();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
  const updated: AdminAuthStore = {
    ...store,
    salt,
    passwordHash,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify(updated, null, 2), 'utf8');
  return { ok: true };
}

export function createAdminSessionToken(): string {
  const store = ensureAdminStore();
  const payload = JSON.stringify({
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 12 * 60 * 60 * 1000,
  });
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', store.sessionSecret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token || !token.includes('.')) return false;
  const store = ensureAdminStore();
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;
  const expectedSig = crypto.createHmac('sha256', store.sessionSecret).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { role?: string; exp?: number };
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

export function requireAdminSession(req: Request, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  if (!verifyAdminSessionToken(cookies['el_admin_session'])) {
    res.status(401).json({ error: 'Phiên đăng nhập Admin không hợp lệ hoặc đã hết hạn.' });
    return;
  }
  next();
}

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) {
    return certCache.certs;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Không thể tải chứng chỉ xác thực Firebase.');
  }
  const certs = (await resp.json()) as Record<string, string>;
  const cacheControl = resp.headers.get('cache-control') || '';
  const match = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = match ? Number(match[1]) : 3600;
  certCache = {
    certs,
    expiresAt: Date.now() + maxAgeSec * 1000,
  };
  return certs;
}

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  idToken: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Token xác thực Firebase không đúng định dạng.');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Thuật toán token Firebase không hợp lệ.');
  }
  if (payload.aud !== PROJECT_ID || payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) {
    throw new Error('Token Firebase không thuộc dự án này.');
  }
  if (!payload.sub || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    throw new Error('Phiên đăng nhập Firebase đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const certs = await getGoogleCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Không tìm thấy khóa công khai phù hợp để xác thực token.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const isValid = verifier.verify(cert, Buffer.from(sigB64, 'base64url'));
  if (!isValid) {
    throw new Error('Chữ ký token Firebase không hợp lệ.');
  }

  return {
    uid: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    idToken,
  };
}

interface FirestoreFieldValue {
  stringValue?: string;
  booleanValue?: boolean;
}

async function fetchFirestoreDoc(
  docPath: string,
  idToken: string
): Promise<Record<string, FirestoreFieldValue> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) {
    throw new Error(`Không thể kiểm tra quyền trên Firestore (${resp.status}).`);
  }
  const data = (await resp.json()) as { fields?: Record<string, FirestoreFieldValue> };
  return data.fields || null;
}

export interface RequestWithAuth extends Request {
  firebaseUser?: VerifiedFirebaseUser;
}

export async function optionalFirebaseAuth(
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    next();
    return;
  }
  try {
    const user = await verifyFirebaseIdToken(token);
    const teacherFields = await fetchFirestoreDoc(`teachers/${user.uid}`, token);
    if (teacherFields?.status?.stringValue === 'locked') {
      res.status(403).json({ error: 'Tài khoản của bạn đã bị Admin khóa. Vui lòng liên hệ quản trị viên.' });
      return;
    }
    req.firebaseUser = user;
    next();
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Xác thực người dùng thất bại.',
    });
  }
}

export async function requireTeacherAndVipCheck(
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Vui lòng đăng nhập tài khoản giáo viên để sử dụng chức năng này.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  try {
    const user = await verifyFirebaseIdToken(token);
    req.firebaseUser = user;

    const [teacherFields, vipConfigFields] = await Promise.all([
      fetchFirestoreDoc(`teachers/${user.uid}`, token),
      fetchFirestoreDoc('systemConfig/vipSettings', token),
    ]);

    if (!teacherFields) {
      res.status(403).json({ error: 'Không tìm thấy hồ sơ giáo viên hợp lệ trên hệ thống.' });
      return;
    }

    if (teacherFields.status?.stringValue === 'locked') {
      res.status(403).json({ error: 'Tài khoản giáo viên đã bị khóa bởi Admin.' });
      return;
    }

    const vipModeEnabled = vipConfigFields?.vipModeEnabled?.booleanValue === true;
    const accountType = teacherFields.accountType?.stringValue || 'FREE';
    const role = teacherFields.role?.stringValue || 'teacher';

    if (vipModeEnabled && accountType !== 'VIP' && role !== 'admin') {
      res.status(403).json({
        error: 'Chế độ VIP toàn hệ thống đang bật. Chức năng này chỉ dành cho tài khoản giáo viên VIP.',
        code: 'VIP_REQUIRED',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Không thể xác thực quyền truy cập.',
    });
  }
}
