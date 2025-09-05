import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendStudioInvitation(email: string, studioId: string, inviterId: string): Promise<void> {
    const inviteUrl = `${this.configService.get('FRONTEND_URL')}/studios/join?studio=${studioId}`;

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_FROM'),
      to: email,
      subject: 'Studio Invitation',
      html: `
        <h2>You've been invited to join a studio!</h2>
        <p>Click the link below to join:</p>
        <a href="${inviteUrl}">${inviteUrl}</a>
      `,
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get('SMTP_FROM'),
      to,
      subject,
      html,
    });
  }
}
