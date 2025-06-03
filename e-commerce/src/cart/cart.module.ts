import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module'; // To use ProductsService

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem]),
    AuthModule, // For JwtAuthGuard and GetUser decorator
    ProductsModule, // To inject ProductsService
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService], // Export if OrdersModule needs to interact with CartService (e.g., to clear cart after order)
})
export class CartModule {}