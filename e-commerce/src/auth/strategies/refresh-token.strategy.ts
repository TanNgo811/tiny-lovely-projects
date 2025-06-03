import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secretOrKey = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secretOrKey) {
      throw new Error(
        'JWT_REFRESH_SECRET is not defined in the configuration.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secretOrKey,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: {
      sub: string; // User ID
      email: string; // User email
      role: string; // User role
    },
  ) {
    const refreshToken = (req?.headers?.authorization ?? '')
      .replace('Bearer', '')
      .replace('bearer ', '')
      .trim();

    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify that the stored refresh token matches the one provided
    const isRefreshTokenMatching = refreshToken === user.refreshToken;
    if (!isRefreshTokenMatching) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
