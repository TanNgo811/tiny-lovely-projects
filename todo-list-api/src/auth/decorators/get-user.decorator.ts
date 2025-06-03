import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    // If you have customized the user property name in handleRequest of JwtAuthGuard,
    // make sure to use that name here.
    if (!request.user) {
        // This case should ideally not happen if JwtAuthGuard is working correctly
        // and throws an UnauthorizedException if user is not found.
        // However, it's good practice for the decorator to be robust.
        throw new Error('User not found in request. Ensure JwtAuthGuard is used and configured correctly.');
    }
    return request.user;
  },
);