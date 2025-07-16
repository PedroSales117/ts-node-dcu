import { Entity, PrimaryColumn, Column, BaseEntity, Generated, ManyToOne } from 'typeorm';
import { IsUUID, IsString, IsOptional } from 'class-validator';
import { Individual } from './Individual';
import { ProjectIncident } from './ProjectIncident';

@Entity('involvement_logs')
export class InvolvementLog extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;

    @Column('varchar')
    @IsString()
    role_in_incident!: string; // E.g: 'Main Threat', 'Field Asset', 'Target'

    @Column('text', { nullable: true })
    @IsString()
    @IsOptional()
    performance_notes?: string;

    @ManyToOne(() => Individual, individual => individual.incidents)
    individual!: Individual;

    @ManyToOne(() => ProjectIncident, incident => incident.participants)
    incident!: ProjectIncident;
}