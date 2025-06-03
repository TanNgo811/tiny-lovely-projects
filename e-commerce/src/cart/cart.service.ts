import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductsService } from '../products/products.service';
import { AddItemToCartDto } from './dto/add-item-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemResponseDto, CartResponseDto } from './dto/cart-response.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    private productsService: ProductsService,
  ) {}

  private async findOrCreateCartByUserId(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'], // Eagerly load items and their products
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId });
      await this.cartRepository.save(cart);
      cart.items = []; // Initialize items if it's a new cart
    }
    if (!cart.items) cart.items = []; // Ensure items array is initialized
    return cart;
  }

  private mapToCartResponseDto(cart: Cart): CartResponseDto {
    const cartItemsResponse: CartItemResponseDto[] = cart.items.map((item) => {
      // Ensure product details are available, especially if not using eager loading everywhere
      const productDetails = item.product
        ? {
            id: item.product.id,
            name: item.product.name,
            imageUrl: item.product.imageUrl,
            price: item.product.price, // Current price
            stockQuantity: item.product.stockQuantity,
          }
        : null;

      return {
        id: item.id,
        productId: item.productId,
        product: productDetails,
        quantity: item.quantity,
        priceAtTimeOfAddition: Number(item.priceAtTimeOfAddition),
        itemTotal: Number(item.priceAtTimeOfAddition) * item.quantity,
      };
    });

    const grandTotal = cartItemsResponse.reduce(
      (sum, item) => sum + item.itemTotal,
      0,
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items: cartItemsResponse,
      grandTotal: Number(grandTotal.toFixed(2)),
      updatedAt: cart.updatedAt,
    };
  }

  async addItemToCart(
    userId: string,
    addItemDto: AddItemToCartDto,
  ): Promise<CartResponseDto> {
    const product = await this.productsService.findOne(addItemDto.productId);
    if (!product) {
      throw new NotFoundException(
        `Product with ID "${addItemDto.productId}" not found.`,
      );
    }
    if (product.stockQuantity < addItemDto.quantity) {
      throw new BadRequestException(
        `Not enough stock for product "${product.name}". Available: ${product.stockQuantity}`,
      );
    }

    const cart = await this.findOrCreateCartByUserId(userId);

    let cartItem = cart.items.find(
      (item) => item.productId === addItemDto.productId,
    );

    if (cartItem) {
      // Item already in cart, update quantity
      const newQuantity = cartItem.quantity + addItemDto.quantity;
      if (product.stockQuantity < newQuantity) {
        throw new BadRequestException(
          `Cannot add ${addItemDto.quantity} more. Total quantity (${newQuantity}) would exceed stock (${product.stockQuantity}) for "${product.name}".`,
        );
      }
      cartItem.quantity = newQuantity;
      // priceAtTimeOfAddition remains from the first time it was added.
      // If business rule is to update price, change here.
    } else {
      // New item for the cart
      cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId: product.id,
        quantity: addItemDto.quantity,
        priceAtTimeOfAddition: product.price, // Capture current product price
        product: product, // Associate product for eager loading if needed later
      });
      cart.items.push(cartItem); // Add to the cart's items array for the response mapping
    }

    try {
      // We need to save the cartItem first if it's new or updated quantity
      await this.cartItemRepository.save(cartItem);
      // Then update cart's updatedAt timestamp
      cart.updatedAt = new Date();
      await this.cartRepository.save(cart); // Save the cart to update its timestamp and relations if cascade is set up for items

      // Re-fetch the cart to get all updated items and relations correctly for the response DTO
      const updatedCart: Cart | null = await this.cartRepository.findOne({
        where: { id: cart.id },
        relations: ['items', 'items.product'],
      });
      if (!updatedCart) {
        throw new InternalServerErrorException('Cart not found after saving.');
      }
      return this.mapToCartResponseDto(updatedCart);
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw new InternalServerErrorException('Could not add item to cart.');
    }
  }

  async getCart(userId: string): Promise<CartResponseDto | null> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.product.category'], // Load products and their categories
    });

    if (!cart || !cart.items) {
      // Return an empty cart structure if no cart exists or it's empty
      return {
        id: null, // Or generate a temporary ID if you prefer
        userId: userId,
        items: [],
        grandTotal: 0,
        updatedAt: new Date(), // Or null
      };
    }
    return this.mapToCartResponseDto(cart);
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    updateDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const cart = await this.findOrCreateCartByUserId(userId); // Ensures cart exists
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId, cartId: cart.id }, // Ensure item belongs to user's cart
      relations: ['product'],
    });

    if (!cartItem) {
      throw new NotFoundException(
        `Cart item with ID "${cartItemId}" not found in your cart.`,
      );
    }

    if (updateDto.quantity <= 0) {
      // Should be handled by Min(1) in DTO, but good to double check
      throw new BadRequestException(
        'Quantity must be at least 1. To remove, use the delete endpoint.',
      );
    }

    if (cartItem.product.stockQuantity < updateDto.quantity) {
      throw new BadRequestException(
        `Not enough stock for product "${cartItem.product.name}". Available: ${cartItem.product.stockQuantity}, Requested: ${updateDto.quantity}`,
      );
    }

    cartItem.quantity = updateDto.quantity;
    await this.cartItemRepository.save(cartItem);

    cart.updatedAt = new Date();
    await this.cartRepository.save(cart);

    // Re-fetch the cart to get all updated items and relations correctly for the response DTO
    const updatedCart: Cart | null = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product'],
    });
    if (!updatedCart) {
      throw new InternalServerErrorException('Cart not found after updating.');
    }
    return this.mapToCartResponseDto(updatedCart);
  }

  async removeCartItem(
    userId: string,
    cartItemId: string,
  ): Promise<CartResponseDto> {
    const cart = await this.findOrCreateCartByUserId(userId);
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId, cartId: cart.id },
    });

    if (!cartItem) {
      throw new NotFoundException(
        `Cart item with ID "${cartItemId}" not found in your cart.`,
      );
    }

    await this.cartItemRepository.remove(cartItem);

    cart.updatedAt = new Date();
    await this.cartRepository.save(cart);

    // Re-fetch the cart to get all updated items and relations correctly for the response DTO
    const updatedCart: Cart | null = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product'],
    });
    if (!updatedCart) {
      throw new InternalServerErrorException(
        'Cart not found after removing item.',
      );
    }
    return this.mapToCartResponseDto(updatedCart);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'], // Need to load items to delete them
    });

    if (cart && cart.items && cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items); // Remove all associated cart items
      cart.items = []; // Clear items from the cart object
      cart.updatedAt = new Date();
      await this.cartRepository.save(cart);
    } else if (cart) {
      // Cart exists but is already empty, just update timestamp
      cart.updatedAt = new Date();
      await this.cartRepository.save(cart);
    }
    // If no cart, do nothing or throw NotFoundException if strict behavior is desired
  }
}
