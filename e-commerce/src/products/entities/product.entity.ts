import { Category } from '../../categories/entities/category.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 }) // Example: 99999999.99
  price: number;

  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Index({ unique: true }) // Assuming SKU should be unique if used
  @Column({ length: 100, unique: true, nullable: true })
  sku?: string; // Stock Keeping Unit

  @Column({ nullable: true })
  imageUrl?: string;

  // Relation: A product belongs to one category
  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL', // Or 'RESTRICT' or 'CASCADE' based on your business logic
    nullable: true, // If a product can exist without a category
  })
  @JoinColumn({ name: 'categoryId' }) // Foreign key column in the products table
  category?: Category | null; // Use null if the product can exist without a category

  @Column({ type: 'uuid', nullable: true }) // Store the categoryId directly
  categoryId?: string | null; // Nullable if the product can exist without a category

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    default: null,
  })
  averageRating: number | null;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;
}
