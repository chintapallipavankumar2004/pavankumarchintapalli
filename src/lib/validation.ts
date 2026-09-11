export const categories = ['website', 'webapp', 'poster', 'logo', 'automation', 'app'] as const;
export const services = ['website', 'webapp', 'branding', 'automation'] as const;
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function slugify(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '');
}
export function httpsUrl(value: string, optional = false) {
  if (!value) return optional;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function pdfUrl(value: string) {
  return value === '' || value === '/resume.pdf' || (httpsUrl(value) && new URL(value).pathname.toLowerCase().endsWith('.pdf'));
}
export function validateEnquiry(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid enquiry.');
  const data = input as Record<string, unknown>;
  const text = (key: string, min: number, max: number) => {
    if (typeof data[key] !== 'string') throw new Error(`Please check ${key}.`);
    const value = data[key].trim();
    if (value.length < min || value.length > max) throw new Error(`Please check ${key} (${min}-${max} characters).`);
    return value;
  };
  const fullName = text('fullName', 2, 120);
  const email = text('email', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  const phone = text('phone', 0, 32);
  if (phone && !/^\+?[0-9 ()-]{7,32}$/.test(phone)) throw new Error('Enter a valid phone number.');
  const service = text('service', 1, 30);
  if (!(services as readonly string[]).includes(service)) throw new Error('Choose a service.');
  const budget = text('budget', 1, 120);
  const description = text('description', 20, 5000);
  return { fullName, email, phone, service, budget, description };
}
