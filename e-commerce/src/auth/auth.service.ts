import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service'; // Adjust path
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from '../users/entities/user.entity'; // Adjust path
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result as Omit<User, 'password'>;
    }
    return null;
  }

  async login(userPayload: Omit<User, 'password'>) {
    const payload = {
      email: userPayload.email,
      sub: userPayload.id,
      role: userPayload.role,
    };

    // Generate tokens
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    // Update user's refresh token in database
    await this.updateRefreshToken(userPayload.id, refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: userPayload, // Send back some user info
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use.');
    }

    // Create user (password hashing is handled by User entity's @BeforeInsert)
    // Ensure `role` is not set to ADMIN by default during public registration
    const userToCreate = { ...registerDto, role: UserRole.USER };

    const newUser = await this.usersService.create(userToCreate);
    // newUser from usersService.create already excludes the password
    return this.login(newUser); // Automatically log in after registration
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenMatches = user.refreshToken === refreshToken;
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const [accessToken, newRefreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    await this.updateRefreshToken(user.id, newRefreshToken);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.usersService.update(userId, {
      refreshToken: '',
    });
    return { message: 'Logout successful' };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    await this.usersService.update(userId, {
      refreshToken,
    });
  }

  private generateAccessToken(payload: {
    email: string;
    sub: string; // User ID
    role: UserRole;
  }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
    });
  }

  private generateRefreshToken(payload: {
    email: string;
    sub: string; // User ID
    role: UserRole;
  }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
    });
  }
}
