import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudioInvite, InviteStatus, InviteType } from '../entities/studio-invite.entity';
import { Studio } from '../entities/studio.entity';
import { StudioMember } from '../entities/studio-member.entity';
import { User } from '../entities/user.entity';
import { EmailService } from '../common/services/email.service';
import { nanoid } from 'nanoid';
import { CreateInviteDto, VerifyInviteDto, ResendInviteDto } from './dto/invite.dto';

@Injectable()
export class InviteService {
  constructor(
    @InjectRepository(StudioInvite)
    private readonly inviteRepository: Repository<StudioInvite>,
    @InjectRepository(Studio)
    private readonly studioRepository: Repository<Studio>,
    @InjectRepository(StudioMember)
    private readonly memberRepository: Repository<StudioMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async createInvite(studioId: string, userId: string, dto: CreateInviteDto) {
    const studio = await this.studioRepository.findOne({
      where: { id: studioId },
    });

    if (!studio) {
      throw new NotFoundException('스튜디오를 찾을 수 없습니다');
    }

    // 초대 타입에 따른 처리
    if (dto.type === InviteType.EMAIL) {
      // 이미 멤버인지 확인
      const existingMember = await this.memberRepository.findOne({
        where: { studioId, userEmail: dto.email },
      });

      if (existingMember) {
        throw new ConflictException('이미 스튜디오 멤버입니다');
      }

      // 기존 초대가 있는지 확인
      const existingInvite = await this.inviteRepository.findOne({
        where: {
          studioId,
          email: dto.email,
          status: InviteStatus.PENDING,
        },
      });

      if (existingInvite) {
        // 기존 초대 업데이트
        existingInvite.code = this.generateInviteCode();
        existingInvite.expiresAt = this.getExpirationDate(dto.expiresIn);
        existingInvite.role = dto.role || 'editor';
        existingInvite.invitedBy = userId;
        
        const updated = await this.inviteRepository.save(existingInvite);
        
        // 이메일 재전송
        await this.sendInviteEmail(studio, updated);
        
        return updated;
      }
    }

    // 새 초대 생성
    const invite = this.inviteRepository.create({
      studioId,
      email: dto.email,
      code: this.generateInviteCode(),
      type: dto.type || InviteType.EMAIL,
      role: dto.role || 'editor',
      invitedBy: userId,
      expiresAt: this.getExpirationDate(dto.expiresIn),
      maxUses: dto.maxUses,
    });

    const saved = await this.inviteRepository.save(invite);

    // 이메일 초대인 경우 이메일 전송
    if (dto.type === InviteType.EMAIL && dto.email) {
      await this.sendInviteEmail(studio, saved);
    }

    return saved;
  }

  async createLinkInvite(studioId: string, userId: string, dto: CreateInviteDto) {
    const studio = await this.studioRepository.findOne({
      where: { id: studioId },
    });

    if (!studio) {
      throw new NotFoundException('스튜디오를 찾을 수 없습니다');
    }

    const invite = this.inviteRepository.create({
      studioId,
      code: this.generateInviteCode(),
      type: InviteType.LINK,
      role: dto.role || 'editor',
      invitedBy: userId,
      expiresAt: dto.expiresIn ? this.getExpirationDate(dto.expiresIn) : null,
      maxUses: dto.maxUses,
    });

    return await this.inviteRepository.save(invite);
  }

  async verifyAndAcceptInvite(dto: VerifyInviteDto, userId: string) {
    const invite = await this.inviteRepository.findOne({
      where: { code: dto.code },
      relations: ['studio'],
    });

    if (!invite) {
      throw new NotFoundException('유효하지 않은 초대 코드입니다');
    }

    // 초대 상태 확인
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('이미 사용된 초대입니다');
    }

    // 만료 확인
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      invite.status = InviteStatus.EXPIRED;
      await this.inviteRepository.save(invite);
      throw new BadRequestException('만료된 초대입니다');
    }

    // 사용 횟수 확인
    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      throw new BadRequestException('초대 사용 횟수를 초과했습니다');
    }

    // 이미 멤버인지 확인
    const existingMember = await this.memberRepository.findOne({
      where: { studioId: invite.studioId, userId },
    });

    if (existingMember) {
      throw new ConflictException('이미 스튜디오 멤버입니다');
    }

    // 사용자 정보 가져오기
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    // 멤버 추가
    const member = this.memberRepository.create({
      studioId: invite.studioId,
      userId,
      userEmail: user.email,
      role: invite.role,
    });

    await this.memberRepository.save(member);

    // 초대 업데이트
    invite.acceptedBy = userId;
    invite.acceptedAt = new Date();
    invite.usedCount += 1;
    
    if (invite.type === InviteType.EMAIL || (invite.maxUses && invite.usedCount >= invite.maxUses)) {
      invite.status = InviteStatus.ACCEPTED;
    }

    await this.inviteRepository.save(invite);

    return {
      studio: invite.studio,
      member,
    };
  }

  async resendInvite(inviteId: string, userId: string) {
    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId },
      relations: ['studio'],
    });

    if (!invite) {
      throw new NotFoundException('초대를 찾을 수 없습니다');
    }

    if (invite.type !== InviteType.EMAIL) {
      throw new BadRequestException('이메일 초대만 재전송할 수 있습니다');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('대기 중인 초대만 재전송할 수 있습니다');
    }

    // 새 코드 생성 및 만료 시간 갱신
    invite.code = this.generateInviteCode();
    invite.expiresAt = this.getExpirationDate(7); // 7일 연장

    const updated = await this.inviteRepository.save(invite);
    
    await this.sendInviteEmail(invite.studio, updated);
    
    return updated;
  }

  async cancelInvite(inviteId: string, userId: string) {
    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('초대를 찾을 수 없습니다');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('대기 중인 초대만 취소할 수 있습니다');
    }

    invite.status = InviteStatus.CANCELLED;
    
    return await this.inviteRepository.save(invite);
  }

  async getStudioInvites(studioId: string, status?: InviteStatus) {
    const query = this.inviteRepository.createQueryBuilder('invite')
      .leftJoinAndSelect('invite.inviter', 'inviter')
      .leftJoinAndSelect('invite.acceptedUser', 'acceptedUser')
      .where('invite.studioId = :studioId', { studioId });

    if (status) {
      query.andWhere('invite.status = :status', { status });
    }

    return await query.orderBy('invite.createdAt', 'DESC').getMany();
  }

  async getInviteByCode(code: string) {
    const invite = await this.inviteRepository.findOne({
      where: { code },
      relations: ['studio'],
    });

    if (!invite) {
      throw new NotFoundException('초대를 찾을 수 없습니다');
    }

    // 민감한 정보 제거
    const { email, ...publicInvite } = invite;

    return publicInvite;
  }

  private generateInviteCode(): string {
    return nanoid(10).toUpperCase();
  }

  private getExpirationDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private async sendInviteEmail(studio: Studio, invite: StudioInvite) {
    const inviteUrl = `${process.env.FRONTEND_URL}/invite/${invite.code}`;
    
    await this.emailService.sendEmail({
      to: invite.email,
      subject: `${studio.name} 스튜디오 초대`,
      template: 'studio-invite',
      context: {
        studioName: studio.name,
        inviteUrl,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
    });
  }
}
