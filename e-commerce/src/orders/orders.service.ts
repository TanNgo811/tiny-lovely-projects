import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  SelectQueryBuilder,
  QueryRunner,
} from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from './enums/order-status.enum';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  OrderResponseDto,
  OrderUserResponseDto,
} from './dto/order-response.dto';
import { Product } from '../products/entities/product.entity';
import { OrderItemResponseDto } from './dto/order-item-response.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    private cartService: CartService,
    private productsService: ProductsService,
    private dataSource: DataSource, // Inject DataSource for transactions
  ) {}

  private mapToOrderResponseDto(order: Order): OrderResponseDto {
    const orderItemsResponse: OrderItemResponseDto[] =
      order.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        product: item.product
          ? {
              // Send partial product data if available
              id: item.product.id,
              name: item.product.name,
              imageUrl: item.product.imageUrl,
            }
          : undefined,
        productNameSnapshot: item.productNameSnapshot,
        quantity: item.quantity,
        priceAtTimeOfOrder: Number(item.priceAtTimeOfOrder),
        itemTotal: Number(item.priceAtTimeOfOrder) * item.quantity,
      })) || [];

    const userResponse: OrderUserResponseDto | null = order.user
      ? {
          id: order.user.id,
          email: order.user.email,
          firstName: order.user.firstName,
          lastName: order.user.lastName,
        }
      : null;

    return {
      id: order.id,
      user: userResponse,
      items: orderItemsResponse,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      shippingAddress: order.shippingAddress, // Assuming AddressDto matches Address structure
      billingAddress: order.billingAddress,
      orderDate: order.orderDate,
      paymentIntentId: order.paymentIntentId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async createOrder(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const cartResponse = await this.cartService.getCart(userId);
    if (!cartResponse || cartResponse.items.length === 0) {
      throw new BadRequestException(
        'Your cart is empty. Add items before creating an order.',
      );
    }

    // Start a database transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderItems: OrderItem[] = [];
      let calculatedTotalAmount = 0;

      for (const cartItem of cartResponse.items) {
        const product = await this.productsService.findOne(cartItem.productId); // Fetches current product details
        if (!product) {
          throw new NotFoundException(
            `Product with ID "${cartItem.productId}" in your cart was not found.`,
          );
        }
        if (product.stockQuantity < cartItem.quantity) {
          throw new BadRequestException(
            `Not enough stock for product "${product.name}". Requested: ${cartItem.quantity}, Available: ${product.stockQuantity}. Please update your cart.`,
          );
        }

        const orderItem = queryRunner.manager.create(OrderItem, {
          productId: product.id,
          productNameSnapshot: product.name,
          quantity: cartItem.quantity,
          priceAtTimeOfOrder: product.price, // Use current product price for the order item
          product: product, // Associate for FK
        });
        orderItems.push(orderItem);
        calculatedTotalAmount += product.price * cartItem.quantity;

        // Decrement stock (will be saved by queryRunner.manager if transaction commits)
        product.stockQuantity -= cartItem.quantity;
        await queryRunner.manager.save(Product, product); // Use queryRunner's manager
      }

      const newOrder = queryRunner.manager.create(Order, {
        userId,
        items: orderItems, // TypeORM will handle saving these due to cascade:true if set, or save them manually
        totalAmount: calculatedTotalAmount,
        status: OrderStatus.PENDING, // Or PROCESSING if payment is immediate
        shippingAddress: createOrderDto.shippingAddress,
        billingAddress:
          createOrderDto.billingAddress || createOrderDto.shippingAddress,
        orderDate: new Date(),
        paymentIntentId: createOrderDto.paymentMethodId, // Store if provided
      });

      // Save order items explicitly if cascade is not fully reliable or for clarity
      for (const item of orderItems) {
        item.order = newOrder; // Link back to the order (important before saving item if order isn't saved yet)
      }
      // Save the order (which should cascade to orderItems if configured)
      const savedOrder = await queryRunner.manager.save(Order, newOrder);
      // If cascade not working for items or want to be explicit:
      // for(const item of orderItems) { item.orderId = savedOrder.id; await queryRunner.manager.save(OrderItem, item); }

      // Clear the user's cart
      await this.cartService.clearCart(userId); // This service needs to be transaction-aware or refactored
      // For now, assuming clearCart is simple enough. If it has its own transaction, this could be an issue.
      // A better approach would be to have CartService expose a method that can accept a queryRunner.

      await queryRunner.commitTransaction();

      // Fetch the full order with relations for the response after commit
      const fullOrder: Order | null = await this.ordersRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['items', 'items.product', 'user'],
      });
      if (!fullOrder) {
        throw new InternalServerErrorException(
          'Order was created but could not be retrieved.',
        );
      }
      return this.mapToOrderResponseDto(fullOrder);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Error creating order:', error);
      throw new InternalServerErrorException(
        'Failed to create order. Please try again.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAllUserOrders(
    userId: string,
    queryDto: OrderQueryDto,
  ): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      sortBy = 'orderDate',
      sortOrder = 'DESC',
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'orderItem')
      .leftJoinAndSelect('orderItem.product', 'product') // To get product name/image for snapshot
      .leftJoinAndSelect('order.user', 'user')
      .where('order.userId = :userId', { userId })
      .skip(skip)
      .take(limit);

    this.applyOrderFilters(queryBuilder, { status, startDate, endDate });
    this.applyOrderSorting(queryBuilder, sortBy, sortOrder);

    const [orders, total] = await queryBuilder.getManyAndCount();
    const data = orders.map((order) => this.mapToOrderResponseDto(order));
    return { data, total, page, limit };
  }

  async findAllOrders(queryDto: OrderQueryDto): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Admin
    const {
      page = 1,
      limit = 10,
      userId,
      status,
      startDate,
      endDate,
      sortBy = 'orderDate',
      sortOrder = 'DESC',
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'orderItem')
      .leftJoinAndSelect('orderItem.product', 'product')
      .leftJoinAndSelect('order.user', 'user') // Include user details for admin view
      .skip(skip)
      .take(limit);

    this.applyOrderFilters(queryBuilder, {
      userId,
      status,
      startDate,
      endDate,
    });
    this.applyOrderSorting(queryBuilder, sortBy, sortOrder);

    const [orders, total] = await queryBuilder.getManyAndCount();
    const data = orders.map((order) => this.mapToOrderResponseDto(order));
    return { data, total, page, limit };
  }

  async findOrderById(
    orderId: string,
    requestingUser: User,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }
    // Check if the user owns the order or is an admin
    if (
      order.userId !== requestingUser.id &&
      requestingUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You are not authorized to view this order.',
      );
    }
    return this.mapToOrderResponseDto(order);
  }

  async updateOrderStatus(
    orderId: string,
    updateDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    // Admin
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'user'],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    // Add logic here if certain status transitions are not allowed
    // e.g., cannot change from 'delivered' back to 'pending' without specific conditions.
    // Also, if changing to 'cancelled' or 'failed', you might need to restock products.
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.FAILED
    ) {
      if (order.status !== updateDto.status) {
        // Allow updating to the same status for idempotency if needed, or block
        throw new BadRequestException(
          `Order is already in a final state (${order.status}) and cannot be changed to ${updateDto.status}.`,
        );
      }
    }

    // Restock if changing from a non-final, non-cancelled/failed state TO cancelled/failed
    const shouldRestock =
      order.status !== OrderStatus.CANCELLED &&
      order.status !== OrderStatus.FAILED &&
      (updateDto.status === OrderStatus.CANCELLED ||
        updateDto.status === OrderStatus.FAILED);

    if (shouldRestock) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        for (const item of order.items) {
          if (item.productId) {
            // Only restock if product still exists
            await this.productsService.updateStockWithQueryRunner(
              queryRunner,
              item.productId,
              item.quantity,
            ); // quantity is positive for restocking
          }
        }
        order.status = updateDto.status;
        await queryRunner.manager.save(Order, order);
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Error restocking during order status update:', error);
        throw new InternalServerErrorException(
          'Failed to update order status and restock items.',
        );
      } finally {
        await queryRunner.release();
      }
    } else {
      order.status = updateDto.status;
      await this.ordersRepository.save(order);
    }

    return this.mapToOrderResponseDto(order);
  }

  async cancelOrder(
    orderId: string,
    userId: string,
  ): Promise<OrderResponseDto> {
    // User cancelling their own order
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, userId: userId },
      relations: ['items', 'items.product', 'user'], // Load user to ensure it's the correct one
    });

    if (!order) {
      throw new NotFoundException(
        `Order with ID "${orderId}" not found or you do not own this order.`,
      );
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PROCESSING
    ) {
      // Only allow cancellation if order is not yet shipped or in a non-cancellable state
      throw new BadRequestException(
        `Order cannot be cancelled as it is already ${order.status}.`,
      );
    }

    // Use a transaction to update status and restock items
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(Order, order);

      // Restock items
      for (const item of order.items) {
        if (item.productId) {
          // Check if product ID exists (product might have been deleted)
          // productsService.updateStock expects quantityChange (negative for sale, positive for return/cancellation)
          await this.productsService.updateStockWithQueryRunner(
            queryRunner,
            item.productId,
            item.quantity,
          );
        }
      }
      await queryRunner.commitTransaction();
      return this.mapToOrderResponseDto(order);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error cancelling order:', error);
      throw new InternalServerErrorException(
        'Failed to cancel order. Please try again.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  // Helper for applying filters
  private applyOrderFilters(
    queryBuilder: SelectQueryBuilder<Order>,
    filters: {
      userId?: string;
      status?: OrderStatus;
      startDate?: string;
      endDate?: string;
    },
  ): void {
    if (filters.userId) {
      queryBuilder.andWhere('order.userId = :filterUserId', {
        filterUserId: filters.userId,
      });
    }
    if (filters.status) {
      queryBuilder.andWhere('order.status = :status', {
        status: filters.status,
      });
    }
    if (filters.startDate) {
      queryBuilder.andWhere('order.orderDate >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }
    if (filters.endDate) {
      // Add 1 day to endDate to make it inclusive of the entire day
      const endDatePlusOne = new Date(filters.endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      queryBuilder.andWhere('order.orderDate < :endDate', {
        endDate: endDatePlusOne,
      });
    }
  }

  // Helper for applying sorting
  private applyOrderSorting(
    queryBuilder: SelectQueryBuilder<Order>,
    sortBy: string,
    sortOrder: 'ASC' | 'DESC',
  ): void {
    const allowedSortFields = [
      'orderDate',
      'totalAmount',
      'status',
      'createdAt',
    ]; // Whitelist sortable fields on Order entity
    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`order.${sortBy}`, sortOrder);
    } else {
      queryBuilder.orderBy('order.orderDate', 'DESC'); // Default sort
    }
  }

  async updateStockWithQueryRunner(
    queryRunner: QueryRunner,
    productId: string,
    quantityChange: number,
  ): Promise<Product> {
    const product = await queryRunner.manager.findOne(Product, {
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID "${productId}" not found for stock update.`,
      );
    }
    const newStock = product.stockQuantity + quantityChange;
    if (newStock < 0 && quantityChange < 0) {
      // Only check for negative stock if we are DECREASING stock
      throw new BadRequestException('Not enough stock available.');
    }
    product.stockQuantity = newStock;
    return queryRunner.manager.save(Product, product);
  }
}
