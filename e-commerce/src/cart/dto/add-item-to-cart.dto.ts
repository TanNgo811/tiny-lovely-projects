import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min } from 'class-validator';

export class AddItemToCartDto {
  @ApiProperty({
    example: '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
    description: 'ID of the product to add to the cart',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 1, description: 'Quantity of the product' })
  @IsInt()
  @Min(1)
  quantity: number;
}