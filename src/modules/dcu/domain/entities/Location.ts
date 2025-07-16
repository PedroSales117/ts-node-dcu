import { Entity, PrimaryColumn, Column, BaseEntity, Generated, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { IsUUID, IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { LocationType } from '../types/dcu.enums';

@Entity('locations')
export class Location extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;

    @Column('varchar', { unique: true })
    @IsString()
    name!: string;

    @Column({ type: 'enum', enum: LocationType })
    @IsEnum(LocationType)
    type!: LocationType;

    @Column('text', { nullable: true })
    @IsString()
    @IsOptional()
    description?: string;

    @Column('decimal', { precision: 10, scale: 7, nullable: true })
    @IsNumber()
    @IsOptional()
    latitude?: number;

    @Column('decimal', { precision: 10, scale: 7, nullable: true })
    @IsNumber()
    @IsOptional()
    longitude?: number;

    @ManyToOne(() => Location, { nullable: true })
    @IsOptional()
    parent_location?: Location;

    @Column('boolean', { default: true })
    is_accessible!: boolean;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}