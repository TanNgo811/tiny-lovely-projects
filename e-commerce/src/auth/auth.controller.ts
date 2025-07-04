import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  UseInterceptors,
  ClassSerializerInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

@ApiTags('Authentication')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor) // Ensures User entity's @Exclude works
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully and token returned.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., validation error).',
  })
  @ApiResponse({ status: 409, description: 'Conflict. Email already in use.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in an existing user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, token returned.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., validation error).',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (invalid credentials).',
  })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth() // Informs Swagger UI that this endpoint needs a Bearer token
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile.',
    type: User /* Specify response type for Swagger */,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@GetUser() user: Omit<User, 'password'>) {
    // request.user is populated by JwtStrategy
    // The GetUser decorator makes it cleaner
    return user;
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully.',
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token.' })
  async refreshTokens(
    @Request()
    req: {
      user: { id: string };
      headers: { authorization: string };
    },
  ) {
    const userId = req.user.id;
    const refreshToken = req.headers.authorization
      .replace('Bearer', '')
      .replace('bearer', '')
      .trim();

    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout a user' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logout(@GetUser() user: { id: string; email: string; role: string }) {
    return this.authService.logout(user.id);
  }
}
