import { Entity, PrimaryColumn, Column, BaseEntity, Generated, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsUUID, IsString, IsArray, IsEnum, IsOptional, IsDate } from 'class-validator';
import { ThreatLevel, BiologicalStatus } from '../types/dcu.enums';
import { Location } from './Location';
import { AffiliationMember } from './AffiliationMember';
import { AbilityRegistry } from './AbilityRegistry';
import { InvolvementLog } from './InvolvementLog';

@Entity('individuals')
export class Individual extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;

    @Column('varchar', { unique: true })
    @IsString()
    primary_designation!: string;

    @Column('varchar', { nullable: true })
    @IsString()
    @IsOptional()
    civilian_identity?: string;

    @Column('simple-array', { nullable: true })
    @IsArray()
    @IsOptional()
    known_aliases?: string[];

    @Column('varchar')
    @IsString()
    species!: string;

    @Column('varchar', { nullable: true })
    @IsString()
    @IsOptional()
    profession?: string;

    @Column({ type: 'enum', enum: BiologicalStatus, default: BiologicalStatus.UNKNOWN })
    @IsEnum(BiologicalStatus)
    biological_status!: BiologicalStatus;

    @Column('text')
    @IsString()
    psychological_profile!: string;

    @Column({ type: 'enum', enum: ThreatLevel, default: ThreatLevel.UNKNOWN })
    @IsEnum(ThreatLevel)
    threat_level!: ThreatLevel;

    @Column('date', { nullable: true })
    @IsDate()
    @IsOptional()
    first_appearance?: Date;

    @Column('text', { nullable: true })
    @IsString()
    @IsOptional()
    notes?: string;

    @ManyToOne(() => Location, { nullable: true, eager: true })
    @IsOptional()
    origin_planet?: Location;

    @ManyToOne(() => Location, { nullable: true })
    @IsOptional()
    current_location?: Location;

    @OneToMany(() => AffiliationMember, member => member.individual)
    affiliations!: AffiliationMember[];

    @OneToMany(() => AbilityRegistry, registry => registry.individual)
    abilities!: AbilityRegistry[];
    
    @OneToMany(() => InvolvementLog, log => log.individual)
    incidents!: InvolvementLog[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}