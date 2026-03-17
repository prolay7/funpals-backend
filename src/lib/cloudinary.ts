// CloudinaryService.ts
import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';
import { Readable } from 'stream';

export class CloudinaryService {
  private static instance: CloudinaryService;

  private constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.API_KEY,
      api_secret: process.env.API_SECRET,
    });
  }

  public static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  public async uploadBuffer(buffer: Buffer, folder = 'frendor'): Promise<{ url: string; public_id: string }> {
    const stream = Readable.from(buffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
        if (err || !result) return reject(err);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      });

      stream.pipe(uploadStream);
    });
  }

  public async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok' || result.result === 'not found';
    } catch (err) {
      throw err;
    }
  }
}
