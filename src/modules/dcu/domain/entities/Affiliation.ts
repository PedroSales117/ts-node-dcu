import { Entity, PrimaryColumn, Column, BaseEntity, Generated, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsUUID, IsString, IsOptional, IsEnum } from 'class-validator';
import { Individual } from './Individual';
import { Location } from './Location';
import { AffiliationMember } from './AffiliationMember';
import { AffiliationType } from '../types/dcu.enums';

@Entity('affiliations')
export class Affiliation extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;

    @Column('varchar', { unique: true })
    @IsString()
    name!: string;

    @Column({ type: 'enum', enum: AffiliationType, default: AffiliationType.NEUTRAL_FACTION })
    @IsEnum(AffiliationType)
    affiliation_type!: AffiliationType;
    
    @Column('text')
    @IsString()
    modus_operandi!: string;

    @Column('text', { nullable: true })
    @IsString()
    @IsOptional()
    mission_statement?: string;

    @Column('boolean', { default: true })
    is_active!: boolean;

    @ManyToOne(() => Individual, { nullable: true })
    @IsOptional()
    known_leader?: Individual;

    @ManyToOne(() => Location, { nullable: true })
    @IsOptional()
    base_of_operations?: Location;

    @OneToMany(() => AffiliationMember, member => member.affiliation)
    members!: AffiliationMember[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}