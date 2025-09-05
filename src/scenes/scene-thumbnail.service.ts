import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConfigService } from '@nestjs/config';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
  quality: number;
}

@Injectable()
export class SceneThumbnailService {
  private readonly logger = new Logger(SceneThumbnailService.name);
  private readonly uploadPath: string;
  private readonly thumbnailSizes: ThumbnailSize[] = [
    { name: 'small', width: 150, height: 150, quality: 80 },
    { name: 'medium', width: 400, height: 300, quality: 85 },
    { name: 'large', width: 800, height: 600, quality: 90 },
  ];

  constructor(private configService: ConfigService) {
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
  }

  /**
   * Generate thumbnails for an uploaded image
   */
  async generateThumbnails(
    inputPath: string,
    outputDir?: string,
  ): Promise<Record<string, string>> {
    try {
      const thumbnailPaths: Record<string, string> = {};
      const fileDir = outputDir || path.dirname(inputPath);
      const fileName = path.basename(inputPath, path.extname(inputPath));
      const fileExt = path.extname(inputPath);

      // Ensure thumbnail directory exists
      const thumbnailDir = path.join(fileDir, 'thumbnails');
      await this.ensureDirectoryExists(thumbnailDir);

      // Generate thumbnail for each size
      for (const size of this.thumbnailSizes) {
        const thumbnailFileName = `${fileName}_${size.name}${fileExt}`;
        const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);

        await this.createThumbnail(inputPath, thumbnailPath, {
          width: size.width,
          height: size.height,
          quality: size.quality,
          fit: 'cover',
        });

        thumbnailPaths[size.name] = this.getRelativePath(thumbnailPath);
        this.logger.log(`Generated ${size.name} thumbnail: ${thumbnailPath}`);
      }

      // Also generate WebP versions for better performance
      const webpPath = await this.generateWebPThumbnail(inputPath, thumbnailDir, fileName);
      if (webpPath) {
        thumbnailPaths['webp'] = this.getRelativePath(webpPath);
      }

      return thumbnailPaths;
    } catch (error) {
      this.logger.error(`Failed to generate thumbnails: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a single thumbnail
   */
  async createThumbnail(
    inputPath: string,
    outputPath: string,
    options: ThumbnailOptions = {},
  ): Promise<void> {
    const {
      width = 300,
      height = 300,
      quality = 85,
      format = 'jpeg',
      fit = 'cover',
    } = options;

    try {
      let sharpInstance = sharp(inputPath)
        .resize(width, height, {
          fit,
          position: 'center',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        });

      // Apply format-specific optimizations
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality,
            progressive: true,
            mozjpeg: true,
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            quality,
            compressionLevel: 9,
            adaptiveFiltering: true,
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality,
            lossless: false,
            nearLossless: false,
            smartSubsample: true,
            effort: 6,
          });
          break;
      }

      await sharpInstance.toFile(outputPath);
    } catch (error) {
      this.logger.error(`Failed to create thumbnail: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate WebP version for better performance
   */
  async generateWebPThumbnail(
    inputPath: string,
    outputDir: string,
    fileName: string,
  ): Promise<string | null> {
    try {
      const webpFileName = `${fileName}_optimized.webp`;
      const webpPath = path.join(outputDir, webpFileName);

      await sharp(inputPath)
        .resize(800, 600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: 85,
          lossless: false,
          nearLossless: false,
          smartSubsample: true,
          effort: 6,
        })
        .toFile(webpPath);

      this.logger.log(`Generated WebP thumbnail: ${webpPath}`);
      return webpPath;
    } catch (error) {
      this.logger.warn(`Failed to generate WebP thumbnail: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract metadata from image
   */
  async extractImageMetadata(imagePath: string): Promise<sharp.Metadata> {
    try {
      const metadata = await sharp(imagePath).metadata();
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to extract metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * Optimize original image
   */
  async optimizeImage(inputPath: string, outputPath?: string): Promise<string> {
    try {
      const output = outputPath || inputPath.replace(/\.[^.]+$/, '_optimized.jpg');
      const metadata = await this.extractImageMetadata(inputPath);

      let sharpInstance = sharp(inputPath);

      // Resize if too large (max 2000px width while maintaining aspect ratio)
      if (metadata.width && metadata.width > 2000) {
        sharpInstance = sharpInstance.resize(2000, null, {
          withoutEnlargement: true,
          fit: 'inside',
        });
      }

      // Auto-rotate based on EXIF orientation
      sharpInstance = sharpInstance.rotate();

      // Optimize based on format
      if (metadata.format === 'png' && !this.hasTransparency(metadata)) {
        // Convert PNG without transparency to JPEG for better compression
        sharpInstance = sharpInstance.jpeg({
          quality: 90,
          progressive: true,
          mozjpeg: true,
        });
      } else if (metadata.format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({
          quality: 90,
          progressive: true,
          mozjpeg: true,
        });
      }

      await sharpInstance.toFile(output);
      this.logger.log(`Optimized image saved to: ${output}`);
      return output;
    } catch (error) {
      this.logger.error(`Failed to optimize image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate placeholder/blur hash for lazy loading
   */
  async generatePlaceholder(imagePath: string): Promise<string> {
    try {
      const { data, info } = await sharp(imagePath)
        .resize(20, 20, { fit: 'inside' })
        .blur(5)
        .toBuffer({ resolveWithObject: true });

      return `data:image/${info.format};base64,${data.toString('base64')}`;
    } catch (error) {
      this.logger.error(`Failed to generate placeholder: ${error.message}`);
      return '';
    }
  }

  /**
   * Batch process multiple images
   */
  async batchGenerateThumbnails(
    imagePaths: string[],
    outputDir?: string,
  ): Promise<Map<string, Record<string, string>>> {
    const results = new Map<string, Record<string, string>>();
    const batchSize = 5; // Process 5 images at a time to avoid memory issues

    for (let i = 0; i < imagePaths.length; i += batchSize) {
      const batch = imagePaths.slice(i, i + batchSize);
      const promises = batch.map(async (imagePath) => {
        try {
          const thumbnails = await this.generateThumbnails(imagePath, outputDir);
          return { path: imagePath, thumbnails };
        } catch (error) {
          this.logger.error(`Failed to process ${imagePath}: ${error.message}`);
          return { path: imagePath, thumbnails: {} };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach((result) => {
        results.set(result.path, result.thumbnails);
      });

      this.logger.log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(imagePaths.length / batchSize)}`);
    }

    return results;
  }

  /**
   * Clean up old thumbnails
   */
  async cleanupThumbnails(scenePath: string): Promise<void> {
    try {
      const dir = path.dirname(scenePath);
      const thumbnailDir = path.join(dir, 'thumbnails');
      const fileName = path.basename(scenePath, path.extname(scenePath));

      const files = await fs.readdir(thumbnailDir);
      const thumbnailFiles = files.filter(file => file.startsWith(fileName));

      for (const file of thumbnailFiles) {
        await fs.unlink(path.join(thumbnailDir, file));
        this.logger.log(`Deleted thumbnail: ${file}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup thumbnails: ${error.message}`);
    }
  }

  /**
   * Helper: Check if image has transparency
   */
  private hasTransparency(metadata: sharp.Metadata): boolean {
    return metadata.channels === 4 || metadata.hasAlpha;
  }

  /**
   * Helper: Ensure directory exists
   */
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Helper: Get relative path for storage
   */
  private getRelativePath(absolutePath: string): string {
    return path.relative(this.uploadPath, absolutePath).replace(/\\/g, '/');
  }
}
