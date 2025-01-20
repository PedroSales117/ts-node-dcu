import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsUrl, IsInt, Min } from 'class-validator';

/**
 * Example entity to demonstrate how to define a TypeORM entity with validation.
 * This entity is not meant to be used in the actual database schema but serves as a reference.
 */
@Entity('example_products')
export class ExampleProduct extends BaseEntity {

    /**
     * The unique identifier for the product.
     * This column is automatically generated.
     * @type {number}
     */
    @PrimaryGeneratedColumn()
    id!: number;

    /**
     * The name of the product.
     * @type {string}
     */
    @Column({ type: 'varchar' })
    @IsString({ message: 'The name must be a string.' })
    @IsNotEmpty({ message: 'The name is required.' })
    name!: string;

    /**
     * A brief description of the product.
     * @type {string}
     */
    @Column({ type: 'text' })
    @IsString({ message: 'The description must be a string.' })
    @IsNotEmpty({ message: 'The description is required.' })
    description!: string;

    /**
     * The price of the product.
     * This column is of type decimal with a precision of 10 and scale of 2.
     * @type {number}
     */
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    @IsNumber({}, { message: 'The price must be a number.' })
    @IsPositive({ message: 'The price must be a positive number.' })
    price!: number;

    /**
     * The URL to the product's image.
     * @type {string}
     */
    @Column({ type: 'varchar' })
    @IsString({ message: 'The image URL must be a string.' })
    @IsNotEmpty({ message: 'The image URL is required.' })
    @IsUrl({}, { message: 'The image URL must be a valid URL.' })
    imageUrl!: string;

    /**
     * The number of items in stock.
     * @type {number}
     */
    @Column({ type: 'int' })
    @IsInt({ message: 'The stock must be an integer.' })
    @Min(0, { message: 'The stock cannot be negative.' })
    stock!: number;
}
