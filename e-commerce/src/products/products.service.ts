import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CategoriesService } from '../categories/categories.service'; // To validate categoryId
import { ProductQueryDto } from './dto/product-query.dto';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private categoriesService: CategoriesService, // Inject CategoriesService
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, sku, ...restOfDto } = createProductDto;

    if (sku) {
      const existingBySku = await this.productsRepository.findOne({
        where: { sku },
      });
      if (existingBySku) {
        throw new ConflictException(
          `Product with SKU "${sku}" already exists.`,
        );
      }
    }

    let category: Category | null = null;
    if (categoryId) {
      try {
        category = await this.categoriesService.findOne(categoryId);
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new BadRequestException(
            `Category with ID "${categoryId}" not found.`,
          );
        }
        throw error; // Re-throw other errors
      }
    }

    const product: Product = this.productsRepository.create({
      ...restOfDto,
      sku: sku,
      category: category, // Assign the category entity if found
      categoryId: category ? category.id : null, // Or just the ID
    });

    try {
      return await this.productsRepository.save(product);
    } catch (error) {
      throw new InternalServerErrorException('Error creating product.');
    }
  }

  async findAll(
    queryDto: ProductQueryDto,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder: SelectQueryBuilder<Product> = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category') // Join with category to include its details
      .skip(skip)
      .take(limit);

    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }
    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (sortBy && (sortOrder === 'ASC' || sortOrder === 'DESC')) {
      const allowedSortFields = ['name', 'price', 'createdAt', 'stockQuantity']; // Whitelist sortable fields
      if (allowedSortFields.includes(sortBy)) {
        queryBuilder.orderBy(`product.${sortBy}`, sortOrder);
      } else if (sortBy === 'categoryName' && categoryId) {
        // Example: sorting by joined field
        queryBuilder.orderBy(`category.name`, sortOrder);
      } else {
        queryBuilder.orderBy(`product.createdAt`, 'DESC'); // Default sort
      }
    } else {
      queryBuilder.orderBy('product.createdAt', 'DESC'); // Default sort
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category'], // Eagerly load the category
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id); // Ensures product exists

    const { categoryId, sku, ...restOfDto } = updateProductDto;

    if (sku && sku !== product.sku) {
      const existingBySku = await this.productsRepository.findOne({
        where: { sku },
      });
      if (existingBySku && existingBySku.id !== id) {
        throw new ConflictException(
          `Another product with SKU "${sku}" already exists.`,
        );
      }
    }

    if (categoryId && categoryId !== product.categoryId) {
      try {
        const category = await this.categoriesService.findOne(categoryId);
        product.category = category;
        product.categoryId = category.id;
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new BadRequestException(
            `Category with ID "${categoryId}" not found during update.`,
          );
        }
        throw error;
      }
    } else if (categoryId === null && product.categoryId !== null) {
      // Explicitly setting category to null
      product.category = null;
      product.categoryId = null;
    }

    // Merge the rest of the DTO properties
    // TypeORM's merge is good but be careful with partial updates on related entities.
    // Here, we handle category separately.
    Object.assign(product, restOfDto);
    if (sku !== undefined) product.sku = sku;

    try {
      return await this.productsRepository.save(product);
    } catch (error) {
      throw new InternalServerErrorException('Error updating product.');
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.productsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
  }

  // Example method to update stock, could be used by an OrdersService later
  async updateStock(
    productId: string,
    quantityChange: number,
  ): Promise<Product> {
    const product = await this.findOne(productId);
    const newStock = product.stockQuantity + quantityChange; // quantityChange can be negative for sales
    if (newStock < 0) {
      throw new BadRequestException('Not enough stock available.');
    }
    product.stockQuantity = newStock;
    return this.productsRepository.save(product);
  }

  async updateStockWithQueryRunner(
    queryRunner: QueryRunner,
    productId: string,
    quantityChange: number,
  ): Promise<Product> {
    // Ensure quantityChange is positive for restocking and negative for stock deduction during sale.
    // The OrdersService will pass positive quantity for restocking (cancellation).
    const product = await queryRunner.manager.findOne(Product, {
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID "${productId}" not found for stock update.`,
      );
    }
    const newStock = product.stockQuantity + quantityChange; // e.g. stock 10, quantityChange +5 (restock) => 15. stock 10, quantityChange -2 (sale) => 8

    // If quantityChange is negative (meaning a sale or stock deduction), check if stock is sufficient.
    // This check is also done before creating order item, but good to have here for direct calls.
    if (
      quantityChange < 0 &&
      product.stockQuantity < Math.abs(quantityChange)
    ) {
      throw new BadRequestException(
        `Not enough stock for product "${product.name}". Available: ${product.stockQuantity}, Tried to deduct: ${Math.abs(quantityChange)}`,
      );
    }
    // For restocking (quantityChange > 0), we generally don't have an upper limit unless business rules dictate.

    product.stockQuantity = newStock;
    if (product.stockQuantity < 0) {
      // This should ideally not happen if checks are in place.
      // Could indicate a concurrency issue if not handled by DB pessimistic locking for stock updates.
      // For now, prevent stock from going below zero.
      console.warn(
        `Stock for product <span class="math-inline">\{productId\} attempted to go negative \(</span>{product.stockQuantity}), setting to 0.`,
      );
      product.stockQuantity = 0;
    }
    return queryRunner.manager.save(Product, product);
  }

  async updateProductAverageRating(
    productId: string,
    averageRating: number | null,
    reviewCount: number,
  ): Promise<void> {
    await this.productsRepository.update(productId, {
      averageRating,
      reviewCount,
    });
  }
}
