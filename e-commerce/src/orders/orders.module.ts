import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module'; // Potentially needed for User entity if not through AuthModule
import { ProductsModule } from '../products/products.module'; // For ProductsService
import { CartModule } from '../cart/cart.module'; // For CartService

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    AuthModule,
    UsersModule, // Ensure User entity is available if needed directly
    ProductsModule,
    CartModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}