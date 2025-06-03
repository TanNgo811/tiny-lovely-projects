import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../products/entities/product.entity'; // For typing

export class OrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string | null;

  // You might want to include a simplified product object here
  @ApiProperty({
    type: () => Product,
    description: 'Snapshot of product details, if product still exists',
  })
  product?: Partial<Product>; // Only selected fields

  @ApiProperty()
  productNameSnapshot: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  priceAtTimeOfOrder: number;

  @ApiProperty()
  itemTotal: number;
}
