import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

/** Configure: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET; optional CLOUDINARY_UPLOAD_FOLDER (default muhafiz-armour). */

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  isConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
    );
  }

  uploadFolder(): string {
    return (process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'muhafiz-armour').trim() || 'muhafiz-armour';
  }

  async uploadImage(buffer: Buffer, subfolder: 'vehicles' | 'profiles'): Promise<{ url: string; publicId: string }> {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException('Image upload is not configured (missing Cloudinary env vars)');
    }
    const folder = `${this.uploadFolder()}/${subfolder}`;
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          overwrite: false,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result?.secure_url) {
            this.logger.error(error);
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      uploadStream.end(buffer);
    });
  }
}
