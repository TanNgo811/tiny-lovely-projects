import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { CategoriesModule } from '../categories/categories.module'; // Import CategoriesModule
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    CategoriesModule, // Make CategoriesService available
    AuthModule, // For JwtAuthGuard and RolesGuard
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // Export if other modules (e.g., CartModule, OrdersModule) need it
})
export class ProductsModule {}