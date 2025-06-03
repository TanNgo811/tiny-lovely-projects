import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
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

@Entity('reviews')
@Index(['user', 'product'], { unique: true }) // A user can review a product only once
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' }) // If user is deleted, their reviews are deleted
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' }) // If product is deleted, its reviews are deleted
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'smallint' }) // Assuming rating is 1-5
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
