import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderItemResponseDto } from './order-item-response.dto';
import { AddressDto } from './address.dto';

// For user details in order response
export class OrderUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName?: string;

  @ApiProperty()
  lastName?: string;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    type: () => OrderUserResponseDto,
    description: 'Details of the user who placed the order',
  })
  user: OrderUserResponseDto | null; // Simplified user info

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ type: AddressDto }) // Use AddressDto for shape
  shippingAddress: AddressDto;

  @ApiProperty({ type: AddressDto, nullable: true })
  billingAddress?: AddressDto;

  @ApiProperty()
  orderDate: Date;

  @ApiProperty({ required: false })
  paymentIntentId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
