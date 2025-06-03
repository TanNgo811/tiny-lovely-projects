import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiCounterMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract the token from the Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the token
        const payload: {
          sub: string; // User ID
          email: string; // User email
          role: string; // User role
        } = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });

        if (payload && payload.sub) {
          console.log(
            `API call by user: ${payload.email} (ID: ${payload.sub})`,
          );
          // Asynchronously increment the API call count
          this.incrementApiCallCount(payload.sub).catch((error) =>
            console.error('Failed to increment API call count:', error),
          );
        }
      }
    } catch (error) {
      // Just log the error and continue - we don't want this middleware to block the request
      console.error('Error in ApiCounterMiddleware:', error);
    }

    // Continue with the request regardless of counter status
    next();
  }

  private async incrementApiCallCount(userId: string): Promise<void> {
    await this.usersService.incrementApiCallCount(userId);
  }
}
