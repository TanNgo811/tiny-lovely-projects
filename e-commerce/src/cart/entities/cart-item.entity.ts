import { Product } from '../../products/entities/product.entity';
import { Cart } from './cart.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cartId: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' }) // If cart is deleted, items are deleted
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { eager: true, onDelete: 'SET NULL' })
  // eager: true will always load the product details with the cart item
  // onDelete: 'SET NULL' means if product is deleted, productId in cart item becomes null (or handle differently)
  @JoinColumn({ name: 'productId' })
  product: Product; // This allows easy access to product details like name, current price

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtTimeOfAddition: number; // Price of ONE unit of the product when it was added

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}