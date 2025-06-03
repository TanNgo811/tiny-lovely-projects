import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service'; // Adjust path if needed
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secretOrKey = configService.get<string>('JWT_SECRET');
    if (!secretOrKey) {
      throw new Error('JWT_SECRET is not defined in the configuration.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretOrKey,
    });
  }

  async validate(
    payload: any,
  ): Promise<Omit<User, 'password' | 'hashPassword'>> {
    // Payload here is the decoded JWT (e.g., { sub: userId, email: userEmail, role: userRole })
    const user = await this.usersService.findOne(payload.sub); // 'sub' usually stores the user ID
    if (!user) {
      throw new UnauthorizedException('User not found or token invalid.');
    }
    // Passport automatically attaches this return value to request.user
    // Ensure you don't return the password
    const { password, ...result } = user;
    return result;
  }
}
