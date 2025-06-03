import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    example: '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
    description: 'ID of the product being reviewed',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 5, description: 'Rating from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 'This product is amazing!',
    description: 'Optional comment for the review',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
