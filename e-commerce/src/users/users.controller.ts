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
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // We'll create this soon
// import { RolesGuard } from '../auth/guards/roles.guard'; // For role-based access
// import { Roles } from '../auth/decorators/roles.decorator'; // For role-based access
import { UserRole, User } from './entities/user.entity';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor) // Ensures @Exclude in entity works
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // This endpoint is typically not public or only for admins.
  // For simplicity here, it's open, but AuthModule will have a public register endpoint.
  @Post()
  @ApiOperation({ summary: 'Create a new user (Admin)' })
  @ApiResponse({ status: 201, description: 'User created successfully.', type: User })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'Conflict. Email already exists.' })
  // @UseGuards(JwtAuthGuard, RolesGuard) // Example if you add Roles
  // @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard) // Protect this route
  @ApiBearerAuth() // Indicates JWT is required for Swagger
  @ApiOperation({ summary: 'Get all users (requires authentication, typically Admin)' })
  // @Roles(UserRole.ADMIN) // Uncomment if you implement RolesGuard
  findAll() {
    return this.usersService.findAll();
  }

  // A dedicated route to get the current logged-in user's profile
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  getProfile(@GetUser() user: User) { // GetUser is a custom decorator we'll create
    // The 'user' object is injected by JwtStrategy and GetUser decorator
    // It should already be a safe object without the password if JwtStrategy is well-implemented
    return this.usersService.findOne(user.id); // Re-fetch to ensure latest data & consistent format
  }


  @Get(':id')
  @UseGuards(JwtAuthGuard) // Protect this route
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by ID (requires authentication, further checks needed for non-admin)' })
  // Add logic here or in a guard to ensure a non-admin user can only get their own profile
  // or that only admins can get any user.
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard) // Protect this route
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user (requires authentication, further checks needed)' })
  // Add logic here or in a guard to ensure a non-admin user can only update their own profile
  // or that only admins can update any user.
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() currentUser: User
  ) {
    // Example: Allow user to update their own profile or admin to update any
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
        // throw new ForbiddenException('You are not allowed to update this user.');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard) // Protect this route
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user (requires authentication, typically Admin)' })
  // @Roles(UserRole.ADMIN) // Uncomment if you implement RolesGuard
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}