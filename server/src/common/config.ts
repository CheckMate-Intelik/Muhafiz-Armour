export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProd) {
      throw new Error('JWT_SECRET is required in production');
    }
    return 'dev-secret';
  }

  if (isProd && (secret === 'dev-secret' || secret.length < 32)) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  return secret;
}

export function getCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) {
    return process.env.NODE_ENV === 'production' ? false : true;
  }
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}
