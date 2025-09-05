import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailEnabled = this.configService.get('EMAIL_ENABLED', 'false');
    
    if (emailEnabled !== 'true') {
      this.logger.warn('Email service is disabled');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.debug('Email service is disabled, skipping email send');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: options.from || this.configService.get('SMTP_FROM'),
        ...options,
      });
      this.logger.debug(`Email sent to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }
}
