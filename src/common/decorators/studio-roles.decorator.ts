import { SetMetadata } from '@nestjs/common';
import { StudioRole } from '../../entities/studio-member.entity';

export const STUDIO_ROLES_KEY = 'studioRoles';
export const StudioRoles = (...roles: StudioRole[]) => SetMetadata(STUDIO_ROLES_KEY, roles);
