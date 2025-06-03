import { User } from '../../users/entities/user.entity';
import { CartItem } from './cart-item.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' }) // If user is deleted, their cart is also deleted
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, { cascade: true, eager: false })
  // cascade: true means operations on Cart (like save) can cascade to CartItems
  // eager: false means cartItems are not automatically loaded unless specified in a query
  items: CartItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Total price can be calculated dynamically in the service/response DTO
  // or stored denormalized if performance becomes an issue (requires careful updates).
  // For now, we'll calculate it on the fly.
}
