import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './address.dto';

export class CreateOrderDto {
  @ApiProperty({ description: 'Shipping address for the order' })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiProperty({
    description:
      'Billing address for the order (optional, if different from shipping)',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  // paymentMethodId might come from a frontend payment integration (e.g., Stripe)
  @ApiProperty({
    example: 'pm_1PeJNuL loremipsum',
    description: 'Payment method ID (optional, depends on payment flow)',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
