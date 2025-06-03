import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule for RolesGuard dependency if reflector is not global

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    AuthModule, // If RolesGuard or JwtAuthGuard are from AuthModule and not globally provided
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService], // Export service if it needs to be used by ProductsModule
})
export class CategoriesModule {}