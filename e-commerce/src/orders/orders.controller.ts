import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderResponseDto } from './dto/order-response.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create a new order from the user's cart" })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully.',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., empty cart, insufficient stock).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createOrder(
    @GetUser() user: User,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(user.id, createOrderDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get the authenticated user's order history" })
  @ApiResponse({
    status: 200,
    description: "List of user's orders.",
    type: [OrderResponseDto],
  }) // Note: Actual response is {data, total, page, limit}
  @ApiQuery({ name: 'status', required: false, enum: UserRole })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'YYYY-MM-DD',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  getUserOrders(@GetUser() user: User, @Query() queryDto: OrderQueryDto) {
    // : Promise<{ data: OrderResponseDto[], total: number, page: number, limit: number }>
    return this.ordersService.findAllUserOrders(user.id, queryDto);
  }

  @Get('all') // For admins
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all orders (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all orders.',
    type: [OrderResponseDto],
  }) // Note: Actual response is {data, total, page, limit}
  @ApiQuery({ name: 'userId', required: false, type: String })
  // Add other query params from OrderQueryDto as ApiQuery here for Swagger if needed
  getAllOrders(@Query() queryDto: OrderQueryDto) {
    return this.ordersService.findAllOrders(queryDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get details of a specific order' })
  @ApiResponse({
    status: 200,
    description: 'Order details.',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (User does not own order and is not admin).',
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  getOrderById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findOrderById(id, user);
  }

  @Patch(':id/status') // For admins
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update the status of an order (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated.',
    type: OrderResponseDto,
  })
  updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateOrderStatus(id, updateOrderStatusDto);
  }

  @Patch(':id/cancel') // For users to cancel their own order
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cancel an order (User can cancel their own if conditions met)',
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully.',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., order not in cancellable state).',
  })
  cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(id, user.id);
  }
}
