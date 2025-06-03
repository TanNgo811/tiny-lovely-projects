import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TodosService } from './todos.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { User } from '../users/entities/user.entity';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@Controller('todos')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Post()
  create(@Body() createTodoDto: CreateTodoDto, @GetUser() user: User) {
    // user object is injected by GetUser decorator, which gets it from JwtAuthGuard
    return this.todosService.create(createTodoDto, user);
  }

  @Post('bulk')
  createBulk(
    @Body() createTodoDtos: CreateTodoDto[],
    @GetUser() user: User,
  ) {
    // This endpoint allows creating multiple todos at once
    if (!Array.isArray(createTodoDtos) || createTodoDtos.length === 0) {
        throw new Error('Invalid input: Expected an array of CreateTodoDto');
    }
    return this.todosService.createBulk(createTodoDtos, user);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.todosService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.todosService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTodoDto: UpdateTodoDto,
    @GetUser() user: User,
  ) {
    return this.todosService.update(id, updateTodoDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 No Content on successful deletion
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.todosService.remove(id, user);
  }
}