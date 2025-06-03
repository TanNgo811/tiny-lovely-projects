import { Product } from '../../products/entities/product.entity';
import { Order } from './order.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid', nullable: true }) // Product might be deleted later
  productId: string;

  @ManyToOne(() => Product, {
    eager: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'productId' })
  product: Product; // Reference to the actual product, can be null if product deleted

  @Column()
  productNameSnapshot: string; // Snapshot of product name at time of order

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtTimeOfOrder: number; // Unit price snapshot

  @CreateDateColumn() // Keep track of when this item was added to the order conceptually
  createdAt: Date;
}
