import { ApiProperty } from '@nestjs/swagger';

// Simplified User DTO for embedding in review response
class ReviewUserDto {
  @ApiProperty()
  id: string;
  @ApiProperty({ required: false })
  firstName?: string;
  @ApiProperty({ required: false })
  lastName?: string;
  // Avoid sending full user object, especially email unless intended
}

// Simplified Product DTO for embedding
class ReviewProductDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
}

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: () => ReviewUserDto })
  user: ReviewUserDto;

  @ApiProperty({ type: () => ReviewProductDto })
  product: ReviewProductDto;

  @ApiProperty()
  rating: number;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
