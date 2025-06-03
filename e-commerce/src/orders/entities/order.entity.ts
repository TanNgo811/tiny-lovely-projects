import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../enums/order-status.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

// Define a simple structure for addresses. In a real app, this might be a separate entity or a more complex JSON schema.
export class Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  state?: string; // Optional
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) // If user deleted, keep order but nullify user link or handle differently
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true, // Operations on Order (like save) will cascade to OrderItems
    eager: false, // Load items explicitly when needed
  })
  items: OrderItem[];

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number; // Total amount for this order

  @Column({ type: 'jsonb', nullable: true }) // Using jsonb for flexibility
  shippingAddress: Address;

  @Column({ type: 'jsonb', nullable: true })
  billingAddress: Address; // Could be same as shipping

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  orderDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Payment details (e.g., paymentIntentId from Stripe) could be added here
  @Column({ nullable: true })
  paymentIntentId?: string;
}
