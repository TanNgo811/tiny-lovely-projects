import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review } from './entities/review.entity';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module'; // For ProductsService
import { UsersModule } from '../users/users.module'; // For User entity context if needed

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    AuthModule, // For guards and GetUser decorator
    ProductsModule, // To inject ProductsService
    UsersModule, // To ensure User entity context is available for relations
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService], // Export if other modules need it (e.g., ProductsModule to show avg rating)
})
export class ReviewsModule {}