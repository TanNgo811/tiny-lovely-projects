import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity'; // Adjust path

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Omit<User, 'password'> => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // User object is attached by JwtStrategy
  },
);