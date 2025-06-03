import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity'; // Import User entity

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available globally
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [User], // Add other entities here as you create them
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false), // Auto-create schema (dev only)
        autoLoadEntities: true, // Automatically load entities (recommended)
      }),
    }),
    UsersModule,
    AuthModule,
    // Add other modules like ProductsModule, OrdersModule here later
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}