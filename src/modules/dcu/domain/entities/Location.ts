import { Entity, PrimaryColumn, Column, BaseEntity, Generated, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsUUID, IsString, IsOptional } from 'class-validator';

@Entity('locations')
export class Location extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;

    @Column('varchar', { unique: true })
    @IsString()
    name!: string; // E.g: 'Earth', 'Metropolis', 'Belle Reve'

    @Column('varchar')
    @IsString()
    type!: string; // E.g: 'Planet', 'City', 'Base of Operations'

    @Column('text', { nullable: true })
    @IsString()
    @IsOptional()
    description?: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}