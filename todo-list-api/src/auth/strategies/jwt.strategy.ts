import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service'; // Import JwtPayload
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService, // Inject AuthService
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Passport first verifies the JWT's signature and expiration based on secretOrKey.
    // If valid, this validate method is called with the decoded payload.
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('Invalid token or user does not exist.');
    }
    // The user object returned here will be injected into the request (e.g., req.user)
    // It's good practice to not include the password here.
    // The AuthService.validateUser should ideally return a user object without the password.
    // Or ensure UsersService.findOneById doesn't select the password field if possible,
    // or explicitly delete it before returning from validateUser.
    user.password = ''; // Ensure password is not attached to request object
    return user;
  }
}