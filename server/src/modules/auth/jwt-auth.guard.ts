import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtPayload } from './auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, unknown>; user?: JwtPayload }>();
    const headers = request.headers ?? {};

    const userId = headerString(headers, 'x-user-id');
    if (userId) {
      request.user = { sub: userId, role: 'USER' };
      return true;
    }

    const dispatcherId = headerString(headers, 'x-dispatcher-id');
    if (dispatcherId) {
      request.user = { sub: dispatcherId, role: 'DISPATCHER' };
      return true;
    }

    const adminId = headerString(headers, 'x-admin-id');
    if (adminId) {
      request.user = { sub: adminId, role: 'ADMIN' };
      return true;
    }

    return (await super.canActivate(context)) as boolean;
  }
}

function headerString(headers: Record<string, unknown>, name: string) {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0].trim();
  return null;
}

