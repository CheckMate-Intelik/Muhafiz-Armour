import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Neon pooled hosts use PgBouncer (transaction mode). Without `pgbouncer=true`, Prisma can
 * reuse prepared plans that break after ALTER TYPE / column type changes ("cached plan must
 * not change result type", SQLSTATE 0A000). See Prisma + PgBouncer docs.
 */
function prismaDatabaseUrl(raw: string | undefined): string {
  if (!raw) {
    throw new Error('DATABASE_URL is not set');
  }
  const hasPgbouncerFlag = /[?&]pgbouncer=true(?:&|$)/i.test(raw);
  const looksLikeNeonPooler = /pooler\.|neon\.tech/i.test(raw);
  if (looksLikeNeonPooler && !hasPgbouncerFlag) {
    return `${raw}${raw.includes('?') ? '&' : '?'}pgbouncer=true`;
  }
  return raw;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: { url: prismaDatabaseUrl(process.env.DATABASE_URL) },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}

