import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // Make User entity available in this module
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // Export UsersService if needed by other modules (e.g., AuthModule)
})
export class UsersModule {}