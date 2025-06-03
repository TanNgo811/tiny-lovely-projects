import { Injectable, UnauthorizedException, Logger, Scope } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto'; // For registration

import { User } from '../users/entities/user.entity';
import { LoginUserDto } from './dto/login-user.dto';

export interface JwtPayload {
  username: string;
  sub: string; // Standard JWT claim for subject (user ID)
}

@Injectable({scope: Scope.DEFAULT}) // Optional: Use default's scope for singleton behavior
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<{ user: Omit<User, 'password'>, accessToken: string }> {
    const user = await this.usersService.create(createUserDto);
    // Password is already removed by usersService.create method
    const payload: JwtPayload = { username: user.username, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    return { user , accessToken };
  }

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string }> {
    const { username, password } = loginUserDto;
    const user = await this.usersService.findOneByUsername(username);

    if (user && (await user.validatePassword(password))) {
      const payload: JwtPayload = { username: user.username, sub: user.id };
      const accessToken = this.jwtService.sign(payload);
      return { accessToken };
    } else {
      this.logger.warn(`Failed login attempt for username: ${username}`);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found or token invalid.');
    }
    // Optionally, remove password before returning, though it's usually not selected
    // if you retrieve by ID for validation purposes.
    // delete user.password;
    return user;
  }
}