import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, firstName, lastName, role } = createUserDto;

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = this.usersRepository.create({
      email,
      password, // Password will be hashed by the @BeforeInsert hook in the entity
      firstName,
      lastName,
      role: role || UserRole.USER, // Default to USER if not provided
    });

    try {
      await this.usersRepository.save(user);
      // The password field is automatically excluded by `class-transformer`
      // due to @Exclude in the entity, if you return the user object directly.
      // However, it's good practice to explicitly deselect it or map to a safe DTO.
      const { password, ...result } = user;
      return result as User; // Or map to a UserResponseDto
    } catch (error) {
      // Handle specific database errors, e.g., unique constraint violation if not caught above
      if (error.code === '23505') {
        // PostgreSQL unique violation
        throw new ConflictException('Email already exists.');
      }
      throw new InternalServerErrorException('Error creating user.');
    }
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
    // In a real app, you'd want to exclude passwords or map to DTOs
    // And add pagination
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id); // Ensures user exists

    // If password is being updated, hash it
    if (updateUserDto.password) {
      const saltOrRounds = 10;
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        saltOrRounds,
      );
    }

    // Merge existing user with update DTO
    // Note: This directly updates. For more complex logic (e.g. role changes),
    // you might want more checks.
    this.usersRepository.merge(user, updateUserDto);
    await this.usersRepository.save(user);
    const { password, ...result } = user;
    return result as User;
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
  }

  async incrementLoginCount(userId: string): Promise<void> {
    const user = await this.findOne(userId);
    user.loginCount += 1;
    await this.usersRepository.save(user);
  }

  async incrementApiCallCount(userId: string): Promise<void> {
    const user = await this.findOne(userId);
    user.apiCallCount += 1;
    await this.usersRepository.save(user);
  }
}
