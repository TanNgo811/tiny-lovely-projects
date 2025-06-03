import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { AddItemToCartDto } from './dto/add-item-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CartResponseDto } from './dto/cart-response.dto';

@ApiTags('Shopping Cart')
@ApiBearerAuth() // All routes in this controller require authentication
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('items')
  @ApiOperation({ summary: "Add an item to the authenticated user's cart" })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart.',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., insufficient stock, invalid product ID).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  addItemToCart(
    @GetUser() user: User,
    @Body() addItemToCartDto: AddItemToCartDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addItemToCart(user.id, addItemToCartDto);
  }

  @Get()
  @ApiOperation({ summary: "Get the authenticated user's cart" })
  @ApiResponse({
    status: 200,
    description: 'User cart details.',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getCart(@GetUser() user: User): Promise<CartResponseDto | null> {
    return this.cartService.getCart(user.id);
  }

  @Patch('items/:cartItemId')
  @ApiOperation({
    summary: "Update quantity of an item in the authenticated user's cart",
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated.',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., insufficient stock).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  updateCartItem(
    @GetUser() user: User,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateCartItem(
      user.id,
      cartItemId,
      updateCartItemDto,
    );
  }

  @Delete('items/:cartItemId')
  @ApiOperation({
    summary: "Remove an item from the authenticated user's cart",
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item removed.',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  removeCartItem(
    @GetUser() user: User,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.removeCartItem(user.id, cartItemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Clear all items from the authenticated user's cart",
  })
  @ApiResponse({ status: 204, description: 'Cart cleared successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  clearCart(@GetUser() user: User): Promise<void> {
    return this.cartService.clearCart(user.id);
  }
}
