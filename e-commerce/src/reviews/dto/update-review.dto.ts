import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4, description: 'New rating from 1 to 5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    example: 'Actually, I changed my mind, it has a few flaws.',
    description: 'New optional comment for the review',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
