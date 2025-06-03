import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics', description: 'Name of the category' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'All kinds of electronic gadgets.',
    description: 'Optional description of the category',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: 'electronics-gadgets',
    description:
      'SEO-friendly slug for the category URL (e.g., no spaces, lowercase)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be lowercase, alphanumeric, with hyphens as separators (e.g., my-category-slug)',
  })
  slug: string;
}
