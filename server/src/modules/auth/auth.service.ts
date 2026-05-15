import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthRole, JwtPayload } from './auth.types';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const isAdminAttempt = Boolean(dto.username && dto.username.trim().length > 0);

    if (isAdminAttempt) {
      const username = dto.username?.trim();
      const password = dto.password ?? '';

      if (username !== (process.env.ADMIN_USERNAME ?? 'admin')) {
        throw new UnauthorizedException('Invalid credentials');
      }
      if (password !== (process.env.ADMIN_PASSWORD ?? 'admin')) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload: JwtPayload = { sub: 'admin', role: 'ADMIN' };
      return { token: await this.jwt.signAsync(payload), role: 'ADMIN' as AuthRole };
    }

    const role = dto.role === 'DISPATCHER' ? 'DISPATCHER' : 'USER';
    const name = (dto.name?.trim() || (role === 'DISPATCHER' ? 'Dispatcher' : 'User')).slice(0, 80);

    const email = dto.email?.trim();
    const password = dto.password ?? '';

    if (email) {
      if (!password.trim()) throw new BadRequestException('password is required');

      if (role === 'DISPATCHER') {
        const dispatcher = await this.prisma.dispatcher.findUnique({ where: { email } });
        if (!dispatcher) throw new UnauthorizedException('Invalid credentials');
        if (!dispatcher.passwordHash) {
          const passwordHash = await this.hashPassword(password);
          const upgraded = await this.prisma.dispatcher.update({
            where: { id: dispatcher.id },
            data: { passwordHash },
          });
          const payload: JwtPayload = { sub: upgraded.id, role: 'DISPATCHER' };
          return { token: await this.jwt.signAsync(payload), role: 'DISPATCHER' as AuthRole, dispatcher: upgraded };
        }
        const ok = await this.verifyPassword(password, dispatcher.passwordHash);
        if (!ok) throw new UnauthorizedException('Invalid credentials');
        const payload: JwtPayload = { sub: dispatcher.id, role: 'DISPATCHER' };
        return { token: await this.jwt.signAsync(payload), role: 'DISPATCHER' as AuthRole, dispatcher };
      }

      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) throw new UnauthorizedException('Invalid credentials');
      if (!user.passwordHash) {
        const passwordHash = await this.hashPassword(password);
        const upgraded = await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
        const payload: JwtPayload = { sub: upgraded.id, role: 'USER' };
        return { token: await this.jwt.signAsync(payload), role: 'USER' as AuthRole, user: upgraded };
      }
      const ok = await this.verifyPassword(password, user.passwordHash);
      if (!ok) throw new UnauthorizedException('Invalid credentials');
      const payload: JwtPayload = { sub: user.id, role: 'USER' };
      return { token: await this.jwt.signAsync(payload), role: 'USER' as AuthRole, user };
    }

    const phone = dto.phone?.trim();
    if (!phone) throw new BadRequestException('phone is required');

    if (role === 'DISPATCHER') {
      const dispatcher = await this.prisma.dispatcher.upsert({
        where: { phone },
        update: { name },
        create: { phone, name },
      });
      const payload: JwtPayload = { sub: dispatcher.id, role: 'DISPATCHER' };
      return { token: await this.jwt.signAsync(payload), role: 'DISPATCHER' as AuthRole, dispatcher };
    }

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: { name },
      create: { phone, name },
    });
    const payload: JwtPayload = { sub: user.id, role: 'USER' };
    return { token: await this.jwt.signAsync(payload), role: 'USER' as AuthRole, user };
  }

  async signup(dto: SignupDto) {
    const phone = dto.phone?.trim() || dto.email?.trim();
    const email = dto.email?.trim();
    const password = dto.password ?? '';
    const role = dto.role === 'DISPATCHER' ? 'DISPATCHER' : 'USER';
    const name = (dto.name?.trim() || (role === 'DISPATCHER' ? 'Dispatcher' : 'User')).slice(0, 80);

    if (!email) throw new BadRequestException('email is required');
    if (!phone) throw new BadRequestException('phone is required');
    if (!password.trim()) throw new BadRequestException('password is required');

    const passwordHash = await this.hashPassword(password);

    if (role === 'DISPATCHER') {
      const existingByPhone = await this.prisma.dispatcher.findUnique({ where: { phone } });
      if (existingByPhone) throw new ConflictException('Dispatcher already exists');
      const existingByEmail = await this.prisma.dispatcher.findUnique({ where: { email } });
      if (existingByEmail) throw new ConflictException('Dispatcher already exists');

      const dispatcher = await this.prisma.dispatcher.create({ data: { phone, name, email, passwordHash } });
      const payload: JwtPayload = { sub: dispatcher.id, role: 'DISPATCHER' };
      return { token: await this.jwt.signAsync(payload), role: 'DISPATCHER' as AuthRole, dispatcher };
    }

    const existingByPhone = await this.prisma.user.findUnique({ where: { phone } });
    if (existingByPhone) throw new ConflictException('User already exists');
    const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingByEmail) throw new ConflictException('User already exists');

    const user = await this.prisma.user.create({ data: { phone, name, email, passwordHash } });
    const payload: JwtPayload = { sub: user.id, role: 'USER' };
    return { token: await this.jwt.signAsync(payload), role: 'USER' as AuthRole, user };
  }

  private async hashPassword(password: string) {
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
}
