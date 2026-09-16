import type { IncomingMessage, ServerResponse } from 'node:http';
export type Request = IncomingMessage & { body?: unknown };
export type Response = ServerResponse;
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(res: Response, status: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}
export function postOnly(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    throw new HttpError(405, 'Method not allowed.');
  }
  if (!String(req.headers['content-type'] || '').startsWith('application/json'))
    throw new HttpError(415, 'Use application/json.');
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin)) throw new HttpError(403, 'Origin not allowed.');
}
export function bodyObject(req: Request, maxBytes = 16000) {
  if (Number(req.headers['content-length'] || 0) > maxBytes)
    throw new HttpError(413, 'Request too large.');
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      throw new HttpError(400, 'Invalid JSON.');
    }
  }
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Buffer.byteLength(JSON.stringify(body)) > maxBytes
  )
    throw new HttpError(400, 'Invalid request.');
  return body as Record<string, unknown>;
}
export function respondError(res: Response, error: unknown) {
  if (error instanceof HttpError) return json(res, error.status, { error: error.message });
  // Never log submitted enquiries, bearer tokens, private keys or SDK messages.
  console.error('Portfolio API request failed.');
  return json(res, 503, { error: 'Service temporarily unavailable. Please try again.' });
}
