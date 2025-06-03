import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo, TodoStatus } from './entities/todo.entity';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { User } from '../users/entities/user.entity'; // Import User entity

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private todosRepository: Repository<Todo>,
  ) {}

  async create(createTodoDto: CreateTodoDto, user: User): Promise<Todo> {
    const { title, description, status } = createTodoDto;
    const todo = this.todosRepository.create({
      title,
      description: description || '',
      status: status || TodoStatus.OPEN,
      user: user, // Associate with the logged-in user
      userId: user.id, // Store userId directly
    });
    return this.todosRepository.save(todo);
  }

  async findAll(user: User): Promise<Todo[]> {
    return this.todosRepository.find({ where: { userId: user.id } });
  }

  async findOne(id: string, user: User): Promise<Todo> {
    const todo = await this.todosRepository.findOne({ where: { id, userId: user.id } });
    if (!todo) {
      throw new NotFoundException(`Todo with ID "${id}" not found or access denied.`);
    }
    return todo;
  }

  async update(id: string, updateTodoDto: UpdateTodoDto, user: User): Promise<Todo> {
    const todo = await this.findOne(id, user); // findOne already checks ownership

    // Only update fields that are provided in the DTO
    Object.assign(todo, updateTodoDto);

    return this.todosRepository.save(todo);
  }

  async remove(id: string, user: User): Promise<void> {
    const todo = await this.findOne(id, user); // Ensure user owns the todo
    const result = await this.todosRepository.delete(todo.id); // Use todo.id from the found entity
    if (result.affected === 0) {
      throw new NotFoundException(`Todo with ID "${id}" not found.`);
    }
  }

    async createBulk(createTodoDtos: CreateTodoDto[], user: User): Promise<Todo[]> {
        if (!Array.isArray(createTodoDtos) || createTodoDtos.length === 0) {
        throw new Error('Invalid input: Expected an array of CreateTodoDto');
        }

        const todos = createTodoDtos.map(dto => ({
        ...dto,
        user: user, // Associate with the logged-in user
        userId: user.id, // Store userId directly
        }));

        return this.todosRepository.save(todos);
    }
}