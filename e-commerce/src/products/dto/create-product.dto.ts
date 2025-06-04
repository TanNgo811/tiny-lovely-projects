import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
  IsUrl,
} from 'class-validator';
import { BeforeInsert } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop Pro 15', description: 'Name of the product' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'A high-performance laptop for professionals.',
    description: 'Optional description of the product',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 1299.99, description: 'Price of the product' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price: number;

  @ApiProperty({ example: 50, description: 'Available stock quantity' })
  @IsNumber()
  @Min(0)
  stockQuantity: number;

  @ApiProperty({
    example: 'LAPTOP-PRO-SKU123',
    description: 'Stock Keeping Unit (unique)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  sku?: string;

  @ApiProperty({
    example: 'https://example.com/images/laptop-pro.jpg',
    description: 'URL of the product image',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({
    example: '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
    description: 'ID of the category this product belongs to',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    example: 'Electronics',
    description: 'Category name for the product',
    required: false,
  })
  @IsOptional()
  slug?: string; // Optional slug for SEO-friendly URLs
}
