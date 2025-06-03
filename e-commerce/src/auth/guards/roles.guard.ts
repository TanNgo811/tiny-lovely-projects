import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity'; // Adjust path
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../users/entities/user.entity'; // Adjust path

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    console.log('RolesGuard: Checking user roles...');
    console.log('RolesGuard: Context:', context);
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true; // No roles specified, access granted
    }
    const { user } = context.switchToHttp().getRequest<{ user: User }>(); // User object from JwtAuthGuard
    if (!user || !user.role) {
      return false; // No user or role found
    }
    return requiredRoles.some((role) => user.role === role);
  }
}
