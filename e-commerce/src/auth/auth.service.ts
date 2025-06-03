import { ConflictException, Injectable } from '@nestjs/common';
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

  login(userPayload: Omit<User, 'password'>) {
    const payload = {
      email: userPayload.email,
      sub: userPayload.id,
      role: userPayload.role,
    };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
      }),
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
}
