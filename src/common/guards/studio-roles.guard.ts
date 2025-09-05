import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudioMember, StudioRole } from '../../entities/studio-member.entity';
import { STUDIO_ROLES_KEY } from '../decorators/studio-roles.decorator';

@Injectable()
export class StudioRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(StudioMember)
    private studioMemberRepository: Repository<StudioMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<StudioRole[]>(STUDIO_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const studioId = request.params.studioId || request.params.id;

    if (!user || !studioId) {
      throw new ForbiddenException('Access denied');
    }

    const member = await this.studioMemberRepository.findOne({
      where: {
        studioId,
        userId: user.id,
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this studio');
    }

    const hasRole = requiredRoles.includes(member.role);
    if (!hasRole) {
      throw new ForbiddenException(`Required role: ${requiredRoles.join(', ')}. Your role: ${member.role}`);
    }

    // Attach member info to request for later use
    request.studioMember = member;
    
    return true;
  }
}
