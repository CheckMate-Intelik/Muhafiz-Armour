import {
  BadRequestException,
  Controller,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { AuthUser } from '../auth/auth-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CloudinaryService } from './cloudinary.service';

const MAX_BYTES = 5 * 1024 * 1024;

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post('upload/vehicle')
  @Roles('DISPATCHER')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BYTES },
    }),
  )
  async uploadVehicle(@AuthUser() _user: JwtPayload, @UploadedFile() file?: Express.Multer.File) {
    if (!this.cloudinary.isConfigured()) {
      throw new ServiceUnavailableException('Image upload is not configured');
    }
    if (!file?.buffer?.length) throw new BadRequestException('Missing file');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Only image uploads are allowed');
    const { url, publicId } = await this.cloudinary.uploadImage(file.buffer, 'vehicles');
    return { url, publicId };
  }

  @Post('upload/profile')
  @Roles('USER', 'DISPATCHER')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BYTES },
    }),
  )
  async uploadProfile(@AuthUser() _user: JwtPayload, @UploadedFile() file?: Express.Multer.File) {
    if (!this.cloudinary.isConfigured()) {
      throw new ServiceUnavailableException('Image upload is not configured');
    }
    if (!file?.buffer?.length) throw new BadRequestException('Missing file');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Only image uploads are allowed');
    const { url, publicId } = await this.cloudinary.uploadImage(file.buffer, 'profiles');
    return { url, publicId };
  }
}
