import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from './email.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, nickname } = registerDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token
    const emailVerificationToken = uuidv4();

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      nickname: nickname || email.split('@')[0],
      emailVerificationToken,
    });

    await this.userRepository.save(user);

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);

    // Generate tokens
    const tokens = await this.getTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        isEmailVerified: user.isEmailVerified,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password, rememberMe } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();

    // Generate tokens
    const tokens = await this.getTokens(user, rememberMe);

    // Save refresh token and remember token if applicable
    user.refreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    if (rememberMe) {
      user.rememberToken = tokens.rememberToken;
    }
    
    await this.userRepository.save(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        role: user.role,
      },
      ...tokens,
    };
  }

  async logout(userId: string) {
    await this.userRepository.update(userId, {
      refreshToken: null,
      rememberToken: null,
    });
    return { message: 'Logged out successfully' };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.getTokens(user);
    user.refreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.save(user);
    
    return tokens;
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await this.userRepository.save(user);

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(newPassword, salt);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update user fields
    if (updateProfileDto.nickname) {
      user.nickname = updateProfileDto.nickname;
    }
    if (updateProfileDto.avatar) {
      user.avatar = updateProfileDto.avatar;
    }

    await this.userRepository.save(user);

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  private async getTokens(user: User, rememberMe?: boolean) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    let rememberToken = null;
    if (rememberMe) {
      rememberToken = await this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      });
    }

    return {
      accessToken,
      refreshToken,
      rememberToken,
    };
  }

  async findUserById(userId: string) {
    return this.userRepository.findOne({ where: { id: userId } });
  }
}
