import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewResponseDto } from './dto/review-response.dto';

@ApiTags('Product Reviews')
@Controller() // Base path can be decided (e.g., 'reviews' or handled by specific routes)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews') // POST /reviews
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new review for a product' })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully.',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., validation error).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict (User already reviewed this product).',
  })
  createReview(
    @GetUser() user: User,
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.createReview(user.id, createReviewDto);
  }

  // Get reviews for a specific product
  @Get('products/:productId/reviews')
  @ApiOperation({ summary: 'Get all reviews for a specific product' })
  @ApiResponse({ status: 200, description: 'List of reviews for the product.' }) // Type will be {data, total, page, limit}
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findReviewsForProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() queryDto: ReviewQueryDto,
  ) {
    // : Promise<{ data: ReviewResponseDto[], total: number, page: number, limit: number }>
    // Override productId from path param, ignore from query if present
    return this.reviewsService.findReviews({
      ...queryDto,
      productId,
      userId: undefined,
    });
  }

  // Get all reviews (can be filtered by userId or productId via query)
  @Get('reviews')
  @ApiOperation({
    summary: 'Get reviews, optionally filtered by product or user',
  })
  @ApiResponse({ status: 200, description: 'List of reviews.' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAllReviews(@Query() queryDto: ReviewQueryDto) {
    return this.reviewsService.findReviews(queryDto);
  }

  @Get('products/:productId/reviews/average')
  @ApiOperation({
    summary: 'Get average rating and review count for a product',
  })
  @ApiResponse({ status: 200, description: 'Average rating and review count.' })
  getAverageRating(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.reviewsService.getAverageRatingForProduct(productId);
  }

  @Get('reviews/:id')
  @ApiOperation({ summary: 'Get a specific review by its ID' })
  @ApiResponse({
    status: 200,
    description: 'Review details.',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  findReviewById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.findReviewById(id);
  }

  @Patch('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review (user must own it)' })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully.',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (User does not own the review).',
  })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  updateReview(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.updateReview(id, user.id, updateReviewDto);
  }

  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a review (user must own it or be an admin)',
  })
  @ApiResponse({ status: 204, description: 'Review deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  deleteReview(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<void> {
    return this.reviewsService.deleteReview(id, user.id, user.role);
  }
}
