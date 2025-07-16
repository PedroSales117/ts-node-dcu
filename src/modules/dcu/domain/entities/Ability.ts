import { Entity, PrimaryColumn, Column, BaseEntity, Generated, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsUUID, IsString } from 'class-validator';

@Entity('abilities')
export class Ability extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;
    
    @Column('varchar', { unique: true })
    @IsString()
    name!: string;

    @Column('text')
    @IsString()
    description!: string;
    
    @Column('varchar')
    @IsString()
    power_origin!: string; // E.g: 'Metagene (Accident)', 'Alien Technology', 'Magic'

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}