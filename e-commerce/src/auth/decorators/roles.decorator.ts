import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity'; // Adjust path as needed

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
