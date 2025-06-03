import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, MoreThanOrEqual } from 'typeorm';
import { Review } from './entities/review.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { ProductsService } from '../products/products.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    private productsService: ProductsService, // To check if product exists
  ) {}

  private mapToReviewResponseDto(review: Review): ReviewResponseDto {
    return {
      id: review.id,
      user: {
        id: review.user.id, // Assuming user relation is loaded
        firstName: review.user.firstName,
        lastName: review.user.lastName,
      },
      product: {
        id: review.product.id, // Assuming product relation is loaded
        name: review.product.name,
      },
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  async createReview(
    userId: string,
    createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const { productId, rating, comment } = createReviewDto;

    // 1. Check if product exists
    // We call findOne from productsService, which throws NotFoundException if product doesn't exist.
    const product = await this.productsService.findOne(productId);

    // 2. Check if user has already reviewed this product (due to unique constraint on entity)
    // The database will throw an error if a duplicate review is attempted.
    // We can pre-emptively check here for a friendlier error message.
    const existingReview = await this.reviewsRepository.findOne({
      where: { userId, productId },
    });
    if (existingReview) {
      throw new ConflictException('You have already reviewed this product.');
    }

    // 3. Optional: Check if user purchased the product (more complex, requires Order history access)
    // For now, we skip this check.

    const review = this.reviewsRepository.create({
      userId,
      productId,
      rating,
      comment,
      // user and product entities will be set by TypeORM if IDs are correct and relations are well-defined
    });

    try {
      const savedReview = await this.reviewsRepository.save(review);
      // Re-fetch with relations to populate user and product for the response DTO
      const fullReview: Review | null = await this.reviewsRepository.findOne({
        where: { id: savedReview.id },
        relations: ['user', 'product'],
      });
      if (!fullReview) {
        throw new InternalServerErrorException(
          'Review not found after creation.',
        );
      }
      const { averageRating, reviewCount } =
        await this.getAverageRatingForProduct(productId);
      await this.productsService.updateProductAverageRating(
        productId,
        averageRating,
        reviewCount,
      );

      return this.mapToReviewResponseDto(fullReview);
    } catch (error) {
      if (error.code === '23505') {
        // PostgreSQL unique violation code
        throw new ConflictException(
          'You have already reviewed this product (database constraint).',
        );
      }
      console.error('Error creating review:', error);
      throw new InternalServerErrorException('Could not create review.');
    }
  }

  async findReviews(queryDto: ReviewQueryDto): Promise<{
    data: ReviewResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { productId, userId, minRating, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const findOptions: FindManyOptions<Review> = {
      where: {},
      relations: ['user', 'product'], // Eager load user and product for response DTO
      skip: skip,
      take: limit,
      order: { createdAt: 'DESC' }, // Default sort order
    };

    if (productId) {
      findOptions.where = { ...findOptions.where, productId };
    }
    if (userId) {
      findOptions.where = { ...findOptions.where, userId };
    }
    if (minRating !== undefined) {
      findOptions.where = {
        ...findOptions.where,
        rating: MoreThanOrEqual(minRating),
      }; // Requires importing MoreThanOrEqual from 'typeorm'
    }

    // If using MoreThanOrEqual, you'd do:
    // import { MoreThanOrEqual } from 'typeorm';
    // if (minRating !== undefined) {
    //   queryBuilder.andWhere('review.rating >= :minRating', { minRating });
    // }
    // For simplicity with FindManyOptions, filtering by exact rating or range might need more complex `where` clauses or QueryBuilder.
    // Let's keep it simple for now or use QueryBuilder if complex filtering is key.
    // For minRating, a simple approach without MoreThanOrEqual if not imported:
    if (minRating !== undefined && findOptions.where) {
      // This is a simplified way, proper way is to use TypeORM operators like MoreThanOrEqual
      // Or build a query with QueryBuilder for such range queries.
      // This example will just filter if rating is exactly minRating if we don't use operators.
      // For a true "minimum", you'd need a custom query or TypeORM's Advanced FindOptions.
      // Let's assume for now we are filtering for ratings >= minRating conceptually.
      // We'll use QueryBuilder below for a more robust filtering.
    }

    const queryBuilder = this.reviewsRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.product', 'product')
      .orderBy('review.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (productId)
      queryBuilder.andWhere('review.productId = :productId', { productId });
    if (userId) queryBuilder.andWhere('review.userId = :userId', { userId });
    if (minRating !== undefined)
      queryBuilder.andWhere('review.rating >= :minRating', { minRating });

    const [reviews, total] = await queryBuilder.getManyAndCount();
    const data = reviews.map((review) => this.mapToReviewResponseDto(review));
    return { data, total, page, limit };
  }

  async findReviewById(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
      relations: ['user', 'product'],
    });
    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found.`);
    }
    return this.mapToReviewResponseDto(review);
  }

  async updateReview(
    reviewId: string,
    currentUserId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
      relations: ['user', 'product'],
    });
    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found.`);
    }

    if (review.userId !== currentUserId) {
      throw new ForbiddenException(
        'You are not authorized to update this review.',
      );
    }

    // Update fields if they are provided in the DTO
    if (updateReviewDto.rating !== undefined) {
      review.rating = updateReviewDto.rating;
    }
    if (updateReviewDto.comment !== undefined) {
      review.comment = updateReviewDto.comment;
    }
    review.updatedAt = new Date(); // Manually update if not relying on @UpdateDateColumn for partial updates

    const updatedReview = await this.reviewsRepository.save(review);
    const { averageRating, reviewCount } =
      await this.getAverageRatingForProduct(review.productId);
    await this.productsService.updateProductAverageRating(
      review.productId,
      averageRating,
      reviewCount,
    );
    return this.mapToReviewResponseDto(updatedReview); // The relations should still be loaded
  }

  async deleteReview(
    reviewId: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<void> {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found.`);
    }

    if (review.userId !== currentUserId && currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You are not authorized to delete this review.',
      );
    }

    const { averageRating, reviewCount } =
      await this.getAverageRatingForProduct(review.productId);
    await this.productsService.updateProductAverageRating(
      review.productId,
      averageRating,
      reviewCount,
    );

    const result = await this.reviewsRepository.delete(reviewId);
    if (result.affected === 0) {
      // This case should ideally be caught by the findOne check above
      throw new NotFoundException(
        `Review with ID "${reviewId}" could not be deleted or was already deleted.`,
      );
    }
  }

  async getAverageRatingForProduct(
    productId: string,
  ): Promise<{ averageRating: number | null; reviewCount: number }> {
    const result:
      | {
          averageRating: string | null; // TypeORM returns numbers as strings in raw queries
          reviewCount: string; // Count is always a string
        }
      | undefined = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .where('review.productId = :productId', { productId })
      .getRawOne(); // getRawOne returns an object with properties averageRating and reviewCount

    // averageRating might be null if there are no reviews, or a string that needs parsing
    const averageRating =
      result && result.averageRating
        ? parseFloat(parseFloat(result.averageRating).toFixed(2))
        : null;
    const reviewCount =
      result && result.reviewCount ? parseInt(result.reviewCount, 10) : 0;

    return { averageRating, reviewCount };
  }
}
