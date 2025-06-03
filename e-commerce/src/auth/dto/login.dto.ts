import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@$$wOrd123', description: 'User password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  password: string;
}