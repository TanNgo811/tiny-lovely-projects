import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../products/entities/product.entity'; // For typing

// A DTO for individual items within the cart response
export class CartItemResponseDto {
  @ApiProperty()
  id: string; // CartItem ID

  @ApiProperty()
  productId: string;

  @ApiProperty({ type: () => Product }) // For Swagger to know the shape of Product
  product: Partial<Product | null>; // Send only necessary product details

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  priceAtTimeOfAddition: number;

  @ApiProperty()
  itemTotal: number; // quantity * priceAtTimeOfAddition
}

export class CartResponseDto {
  @ApiProperty()
  id: string; // Cart ID

  @ApiProperty()
  userId: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty()
  grandTotal: number; // Sum of all itemTotals

  @ApiProperty()
  updatedAt: Date;
}