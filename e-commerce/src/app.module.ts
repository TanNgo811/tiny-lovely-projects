import {
  Module,
  MiddlewareConsumer,
  RequestMethod,
  NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity'; // Import User entity
import { ApiCounterMiddleware } from './middleware/api-counter.middleware';
import { JwtModule } from '@nestjs/jwt';

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
    JwtModule.register({}), // Register JwtModule globally
    // Add other modules like ProductsModule, OrdersModule here later
  ],
  controllers: [],
  providers: [ApiCounterMiddleware],
  exports: [ApiCounterMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiCounterMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
      )
      .forRoutes('*'); // Apply to all routes except excluded ones
  }
  // Optionally, you can add global guards, interceptors, or filters here
  // For example, you can add a global authentication guard
  // @UseGuards(JwtAuthGuard) // Uncomment if you want to apply JWT guard globally
  // @UseInterceptors(ClassSerializerInterceptor) // Uncomment if you want to apply serialization globally
  // @UseFilters(new HttpExceptionFilter()) // Uncomment if you want to apply a global exception filter
  // @UsePipes(new ValidationPipe()) // Uncomment if you want to apply validation globally
}
