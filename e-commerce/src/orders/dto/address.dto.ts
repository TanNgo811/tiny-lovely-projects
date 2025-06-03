import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class AddressDto {
  @ApiProperty({ example: '123 Main St', description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  street: string;

  @ApiProperty({ example: 'Anytown', description: 'City' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: '12345', description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({ example: 'USA', description: 'Country' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;

  @ApiProperty({ example: 'CA', description: 'State or Province (optional)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;
}