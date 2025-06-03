import { BeforeInsert, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import * as bcrypt from 'bcrypt';
import { Todo } from "src/todos/entities/todo.entity";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column({ unique: true, nullable: false })
    username: string;

    @Column({ nullable: false })
    password: string;

    @OneToMany(() => Todo, todo => todo.user)
    todos: Todo[];

    @BeforeInsert()
    async hashPassword() {
        if (this.password) {
        const saltRounds = 10;
        this.password = await bcrypt.hash(this.password, saltRounds);
        }
    }

    // Method to compare passwords (useful in auth service)
    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }
}