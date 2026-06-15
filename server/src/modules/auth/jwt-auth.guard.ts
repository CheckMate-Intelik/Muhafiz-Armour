import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowDevHeaderAuth =
      process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_HEADER_AUTH === 'true';

    if (allowDevHeaderAuth) {
      const request = context.switchToHttp().getRequest<{ headers?: Record<string, unknown>; user?: unknown }>();
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
    }

    return super.canActivate(context);
  }
}

function headerString(headers: Record<string, unknown>, name: string) {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0].trim();
  return null;
}
