import { createHash } from 'node:crypto';
export function signUpload(params: Record<string, string | number | boolean>, secret: string) {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha256')
    .update(serialized + secret)
    .digest('hex');
}
