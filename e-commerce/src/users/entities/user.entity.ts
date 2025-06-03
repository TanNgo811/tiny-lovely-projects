import { Exclude } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users') // Specifies the table name
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Exclude() // Exclude password by default when transforming this entity to plain object
  @Column()
  password: string;

  @Column({ nullable: true, length: 100 })
  firstName?: string;

  @Column({ nullable: true, length: 100 })
  lastName?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      const saltOrRounds = 10; // Or use a salt string
      this.password = await bcrypt.hash(this.password, saltOrRounds);
    }
  }
}