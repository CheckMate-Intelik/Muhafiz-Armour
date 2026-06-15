import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AuthEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthRole, JwtPayload } from './auth.types';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultAdmin();
  }

  async login(dto: LoginDto, meta?: RequestMeta) {
    const isAdminAttempt = Boolean(dto.username && dto.username.trim().length > 0);

    if (isAdminAttempt) {
      return this.loginAdmin(dto, meta);
    }

    const role = dto.role === 'DISPATCHER' ? 'DISPATCHER' : 'USER';
    const email = dto.email?.trim();
    const password = dto.password ?? '';

    if (!email) {
      await this.audit.logAuthEvent({
        eventType: AuthEventType.LOGIN_FAILURE,
        role,
        message: 'email is required',
        meta,
      });
      throw new BadRequestException('email is required');
    }
    if (!password.trim()) {
      await this.audit.logAuthEvent({
        eventType: AuthEventType.LOGIN_FAILURE,
        role,
        email,
        message: 'password is required',
        meta,
      });
      throw new BadRequestException('password is required');
    }

    try {
      if (role === 'DISPATCHER') {
        const result = await this.loginDispatcherWithEmail(email, password);
        await this.audit.logAuthEvent({
          eventType: AuthEventType.LOGIN_SUCCESS,
          role: 'DISPATCHER',
          email,
          meta,
        });
        return result;
      }

      const result = await this.loginUserWithEmail(email, password);
      await this.audit.logAuthEvent({
        eventType: AuthEventType.LOGIN_SUCCESS,
        role: 'USER',
        email,
        meta,
      });
      return result;
    } catch (e) {
      await this.audit.logAuthEvent({
        eventType: AuthEventType.LOGIN_FAILURE,
        role,
        email,
        message: e instanceof Error ? e.message : 'Login failed',
        meta,
      });
      throw e;
    }
  }

  async signup(dto: SignupDto, meta?: RequestMeta) {
    const phone = dto.phone?.trim() || dto.email?.trim();
    const email = dto.email?.trim();
    const password = dto.password ?? '';
    const role = dto.role === 'DISPATCHER' ? 'DISPATCHER' : 'USER';
    const name = (dto.name?.trim() || (role === 'DISPATCHER' ? 'Dispatcher' : 'User')).slice(0, 80);

    if (!email) throw new BadRequestException('email is required');
    if (!phone) throw new BadRequestException('phone is required');
    if (!password.trim()) throw new BadRequestException('password is required');

    try {
      const passwordHash = await this.hashPassword(password);

      if (role === 'DISPATCHER') {
        const existingByPhone = await this.prisma.dispatcher.findUnique({ where: { phone } });
        if (existingByPhone) throw new ConflictException('Dispatcher already exists');
        const existingByEmail = await this.prisma.dispatcher.findUnique({ where: { email } });
        if (existingByEmail) throw new ConflictException('Dispatcher already exists');

        const dispatcher = await this.prisma.dispatcher.create({ data: { phone, name, email, passwordHash } });
        const payload: JwtPayload = { sub: dispatcher.id, role: 'DISPATCHER' };
        await this.audit.logAuthEvent({
          eventType: AuthEventType.SIGNUP_SUCCESS,
          role: 'DISPATCHER',
          email,
          meta,
        });
        return { token: await this.jwt.signAsync(payload), role: 'DISPATCHER' as AuthRole, dispatcher: this.sanitizeDispatcher(dispatcher) };
      }

      const existingByPhone = await this.prisma.user.findUnique({ where: { phone } });
      if (existingByPhone) throw new ConflictException('User already exists');
      const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingByEmail) throw new ConflictException('User already exists');

      const user = await this.prisma.user.create({ data: { phone, name, email, passwordHash } });
      const payload: JwtPayload = { sub: user.id, role: 'USER' };
      await this.audit.logAuthEvent({
        eventType: AuthEventType.SIGNUP_SUCCESS,
        role: 'USER',
        email,
        meta,
      });
      return { token: await this.jwt.signAsync(payload), role: 'USER' as AuthRole, user: this.sanitizeUser(user) };
    } catch (e) {
      await this.audit.logAuthEvent({
        eventType: AuthEventType.SIGNUP_FAILURE,
        role,
        email,
        message: e instanceof Error ? e.message : 'Signup failed',
        meta,
      });
      throw e;
    }
  }

  private async loginAdmin(dto: LoginDto, meta?: RequestMeta) {
    const username = dto.username?.trim();
    const password = dto.password ?? '';

    if (!username || !password.trim()) {
      await this.audit.logAuthEvent({
        eventType: AuthEventType.LOGIN_FAILURE,
        role: 'ADMIN',
        username,
        message: 'username and password are required',
        meta,
      });
      throw new BadRequestException('username and password are required');
    }

    const admin = await this.prisma.admin.findUnique({ where: { username } });
    if (!admin || !admin.isActive) {
      await this.audit.logAuthEvent({
        eventType: AuthEventType.LOGIN_FAILURE,
        role: 'ADMIN',
        username,
        message: 'Invalid credentials',
        meta,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await this.verifyPassword(password, admin.passwordHash);
    if (!ok) {
      await this.audit.logAuthEvent({
        eventType: AuthEventType.LOGIN_FAILURE,
        role: 'ADMIN',
        username,
        message: 'Invalid credentials',
        meta,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: admin.id, role: 'ADMIN' };
    await this.audit.logAuthEvent({
      eventType: AuthEventType.LOGIN_SUCCESS,
      role: 'ADMIN',
      username,
      meta,
    });
    return { token: await this.jwt.signAsync(payload), role: 'ADMIN' as AuthRole };
  }

  private async loginUserWithEmail(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await this.verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const payload: JwtPayload = { sub: user.id, role: 'USER' };
    return { token: await this.jwt.signAsync(payload), role: 'USER' as AuthRole, user: this.sanitizeUser(user) };
  }

  private async loginDispatcherWithEmail(email: string, password: string) {
    const dispatcher = await this.prisma.dispatcher.findUnique({ where: { email } });
    if (!dispatcher || !dispatcher.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await this.verifyPassword(password, dispatcher.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const payload: JwtPayload = { sub: dispatcher.id, role: 'DISPATCHER' };
    return {
      token: await this.jwt.signAsync(payload),
      role: 'DISPATCHER' as AuthRole,
      dispatcher: this.sanitizeDispatcher(dispatcher),
    };
  }

  private async ensureDefaultAdmin() {
    const count = await this.prisma.admin.count();
    if (count > 0) return;

    const username = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const password = process.env.ADMIN_PASSWORD?.trim() || 'changeme1';
    const passwordHash = await this.hashPassword(password);
    await this.prisma.admin.create({
      data: {
        username,
        passwordHash,
        displayName: 'Default Admin',
      },
    });
  }

  async hashPassword(password: string) {
    const salt = randomBytes(16);
    const derivedKey = (await scrypt(password, salt, 32)) as Buffer;
    return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
  }

  private async verifyPassword(password: string, stored: string) {
    const parts = stored.split(':');
    if (parts.length !== 2) return false;
    const [saltHex, keyHex] = parts;
    if (!saltHex || !keyHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const key = Buffer.from(keyHex, 'hex');
    const derivedKey = (await scrypt(password, salt, key.length)) as Buffer;
    if (derivedKey.length !== key.length) return false;
    return timingSafeEqual(derivedKey, key);
  }

  private sanitizeUser<T extends { passwordHash?: string | null }>(user: T) {
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }

  private sanitizeDispatcher<T extends { passwordHash?: string | null }>(dispatcher: T) {
    const { passwordHash: _passwordHash, ...rest } = dispatcher;
    return rest;
  }
}
