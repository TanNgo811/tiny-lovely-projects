import { Product } from '../../products/entities/product.entity'; // We'll create this later
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true }) // Ensure name is unique and indexed for faster lookups
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index({ unique: true }) // Ensure slug is unique
  @Column({ length: 150 })
  slug: string; // For SEO-friendly URLs, e.g., "electronics-deals"

  // Relation: A category can have many products
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // You could add a @BeforeInsert or @BeforeUpdate hook here to auto-generate the slug
  // from the name if it's not provided, or to normalize it.
  // For simplicity, we'll expect it in the DTO for now.
}
