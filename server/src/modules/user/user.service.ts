import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        profileImageUrl: true,
        isBlocked: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, dto: UpdateUserProfileDto) {
    const existing = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('User not found');

    const profileImageUrl =
      dto.profileImageUrl === undefined
        ? undefined
        : dto.profileImageUrl === null || String(dto.profileImageUrl).trim() === ''
          ? null
          : String(dto.profileImageUrl).trim();

    return this.prisma.user.update({
      where: { id },
      data: profileImageUrl === undefined ? {} : { profileImageUrl },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        profileImageUrl: true,
        isBlocked: true,
        createdAt: true,
      },
    });
  }
}

