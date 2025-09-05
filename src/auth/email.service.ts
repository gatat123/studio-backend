import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST') || 'smtp.gmail.com',
      port: this.configService.get('MAIL_PORT') || 587,
      secure: false,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/auth/verify-email/${token}`;
    
    const mailOptions = {
      from: `"스토리보드 플랫폼" <${this.configService.get('MAIL_FROM') || 'noreply@example.com'}>`,
      to: email,
      subject: '이메일 인증을 완료해주세요',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">이메일 인증</h2>
          <p>안녕하세요!</p>
          <p>스토리보드 플랫폼에 가입해 주셔서 감사합니다. 아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              이메일 인증하기
            </a>
          </div>
          <p>또는 다음 링크를 브라우저에 직접 입력하세요:</p>
          <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            이 이메일은 자동으로 발송되었습니다. 문의사항이 있으시면 지원팀에 문의해주세요.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent to:', email);
    } catch (error) {
      console.error('Error sending verification email:', error);
      // In production, you might want to throw an error or handle it differently
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/auth/reset-password/${token}`;
    
    const mailOptions = {
      from: `"스토리보드 플랫폼" <${this.configService.get('MAIL_FROM') || 'noreply@example.com'}>`,
      to: email,
      subject: '비밀번호 재설정',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">비밀번호 재설정</h2>
          <p>안녕하세요!</p>
          <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새로운 비밀번호를 설정하세요.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              비밀번호 재설정하기
            </a>
          </div>
          <p>또는 다음 링크를 브라우저에 직접 입력하세요:</p>
          <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
          <p style="color: #dc3545; font-weight: bold;">
            이 링크는 1시간 후에 만료됩니다.
          </p>
          <p>비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            이 이메일은 자동으로 발송되었습니다. 문의사항이 있으시면 지원팀에 문의해주세요.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent to:', email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }

  async sendWelcomeEmail(email: string, nickname: string) {
    const mailOptions = {
      from: `"스토리보드 플랫폼" <${this.configService.get('MAIL_FROM') || 'noreply@example.com'}>`,
      to: email,
      subject: '스토리보드 플랫폼에 오신 것을 환영합니다!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">환영합니다, ${nickname}님!</h2>
          <p>스토리보드 플랫폼 가입을 축하드립니다.</p>
          <p>이제 다음과 같은 기능을 사용하실 수 있습니다:</p>
          <ul style="line-height: 1.8;">
            <li>스튜디오 생성 및 관리</li>
            <li>프로젝트 협업</li>
            <li>실시간 피드백 시스템</li>
            <li>버전 관리 및 히스토리</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('FRONTEND_URL')}/dashboard" 
               style="background-color: #28a745; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              대시보드로 이동
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            문의사항이 있으시면 언제든 지원팀에 문의해주세요.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent to:', email);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }
}
