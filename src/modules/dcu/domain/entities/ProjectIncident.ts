import { Entity, PrimaryColumn, Column, BaseEntity, Generated, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsUUID, IsString, IsEnum, IsDate, IsOptional } from 'class-validator';
import { IncidentType, IncidentResult } from '../types/dcu.enums';
import { Location } from './Location';
import { InvolvementLog } from './InvolvementLog';

@Entity('projects_incidents')
export class ProjectIncident extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;

    @Column('varchar', { unique: true })
    @IsString()
    codename!: string;

    @Column({ type: 'enum', enum: IncidentType })
    @IsEnum(IncidentType)
    incident_type!: IncidentType;

    @Column('timestamp')
    @IsDate()
    start_date!: Date;

    @Column('timestamp', { nullable: true })
    @IsDate()
    @IsOptional()
    end_date?: Date;
    
    @Column('text')
    @IsString()
    primary_objective!: string;

    @Column('text')
    @IsString()
    operational_summary!: string;

    @Column({ type: 'enum', enum: IncidentResult, default: IncidentResult.ONGOING })
    @IsEnum(IncidentResult)
    result!: IncidentResult;

    @ManyToOne(() => Location, { eager: true })
    primary_location!: Location;

    @OneToMany(() => InvolvementLog, log => log.incident)
    participants!: InvolvementLog[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}