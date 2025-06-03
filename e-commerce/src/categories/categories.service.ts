import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check for existing name or slug
    const existingByName = await this.categoriesRepository.findOne({
      where: { name: createCategoryDto.name },
    });
    if (existingByName) {
      throw new ConflictException(
        `Category with name "${createCategoryDto.name}" already exists.`,
      );
    }
    const existingBySlug = await this.categoriesRepository.findOne({
      where: { slug: createCategoryDto.slug },
    });
    if (existingBySlug) {
      throw new ConflictException(
        `Category with slug "${createCategoryDto.slug}" already exists.`,
      );
    }

    const category = this.categoriesRepository.create(createCategoryDto);
    try {
      return await this.categoriesRepository.save(category);
    } catch (error) {
      // Generic error for other potential issues
      throw new InternalServerErrorException('Error creating category.');
    }
  }

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find();
    // Consider adding pagination if the number of categories can grow large
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return category;
  }

  async findOneBySlug(slug: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { slug },
    });
    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id); // Ensures category exists

    // Check for conflicts if name or slug is being changed
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingByName = await this.categoriesRepository.findOne({
        where: { name: updateCategoryDto.name },
      });
      if (existingByName && existingByName.id !== id) {
        throw new ConflictException(
          `Another category with name "${updateCategoryDto.name}" already exists.`,
        );
      }
    }
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingBySlug = await this.categoriesRepository.findOne({
        where: { slug: updateCategoryDto.slug },
      });
      if (existingBySlug && existingBySlug.id !== id) {
        throw new ConflictException(
          `Another category with slug "${updateCategoryDto.slug}" already exists.`,
        );
      }
    }

    this.categoriesRepository.merge(category, updateCategoryDto);
    try {
      return await this.categoriesRepository.save(category);
    } catch (error) {
      throw new InternalServerErrorException('Error updating category.');
    }
  }

  async remove(id: string): Promise<void> {
    // You might want to check if there are products associated with this category
    // before allowing deletion, or handle cascading deletes/setting products' category to null.
    // For now, a simple delete:
    const result = await this.categoriesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
  }
}
