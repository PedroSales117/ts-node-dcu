import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Example entity to demonstrate how to define a TypeORM entity with validation.
 * This entity is not meant to be used in the actual database schema but serves as a reference.
 */
@Entity('root')
export class Root extends BaseEntity {

    /**
     * The unique identifier for the product.
     * This column is automatically generated.
     * @type {number}
     */
    @PrimaryGeneratedColumn()
    id!: number;

    /**
     * The root message.
     * @type {string}
     */
    @Column({ type: 'varchar' })
    @IsString({ message: 'The root message must be a string.' })
    @IsNotEmpty({ message: 'The root message is required.' })
    message!: string;
}
