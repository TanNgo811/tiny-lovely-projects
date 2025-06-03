import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodosService } from './todos.service';
import { TodosController } from './todos.controller';
import { Todo } from './entities/todo.entity';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule for protecting routes

@Module({
  imports: [
    TypeOrmModule.forFeature([Todo]),
    AuthModule, // To use @UseGuards(JwtAuthGuard)
  ],
  providers: [TodosService],
  controllers: [TodosController],
})
export class TodosModule {}