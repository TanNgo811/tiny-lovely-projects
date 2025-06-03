import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 2,
    description: 'New quantity for the cart item (must be at least 1)',
  })
  @IsInt()
  @Min(1) // If quantity is 0, it should be a remove operation
  quantity: number;
}
