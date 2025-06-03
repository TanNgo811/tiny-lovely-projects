import { PartialType } from '@nestjs/swagger'; // Or @nestjs/mapped-types
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength, MaxLength, IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';


export class UpdateUserDto extends PartialType(CreateUserDto) {
  // You can override or add specific properties for update if needed
  // For example, password update might have different rules (currentPassword, newPassword)
  // For simplicity, we are extending CreateUserDto, making all fields optional.

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(50, { message: 'Password cannot be longer than 50 characters.'})
  password?: string; // If you allow password updates here

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}