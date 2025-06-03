import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity'; // Adjust path

// This decorator extracts the user from the request object, which is populated by the JwtStrategy after successful authentication.
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Omit<User, 'password'> => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // User object is attached by JwtStrategy
  },
);
