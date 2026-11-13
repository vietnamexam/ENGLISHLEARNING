import { auth } from '../lib/firebase';

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!response.ok) {
    const err = new Error(payload.error || `Lỗi máy chủ (${response.status})`);
    (err as Error & { code?: string; status?: number }).code = payload.code;
    (err as Error & { code?: string; status?: number }).status = response.status;
    throw err;
  }
  return payload;
}
