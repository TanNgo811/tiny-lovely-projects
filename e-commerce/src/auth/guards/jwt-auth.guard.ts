import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // You can override handleRequest for custom error handling if needed
  handleRequest(err, user, info, context: ExecutionContext) {
    if (err || !user) {
      // info can be JsonWebTokenError, TokenExpiredError, etc.
      // console.error('JWT Auth Guard Error:', info?.message || err?.message);
      throw err || new UnauthorizedException(info?.message || 'Authentication token is invalid or expired.');
    }
    return user; // This user object is attached to request.user
  }
}