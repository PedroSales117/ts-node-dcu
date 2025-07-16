import { Entity, PrimaryColumn, Column, BaseEntity, Generated, ManyToOne } from 'typeorm';
import { IsUUID, IsString, IsDate, IsOptional } from 'class-validator';
import { Individual } from './Individual';
import { Affiliation } from './Affiliation';

@Entity('affiliation_members')
export class AffiliationMember extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;

    @Column('varchar')
    @IsString()
    role!: string; // E.g: 'Field Leader', 'Member', 'Consultant'

    @Column('timestamp')
    @IsDate()
    join_date!: Date;
    
    @Column('timestamp', { nullable: true })
    @IsDate()
    @IsOptional()
    exit_date?: Date;

    @ManyToOne(() => Individual, individual => individual.affiliations)
    individual!: Individual;

    @ManyToOne(() => Affiliation, affiliation => affiliation.members)
    affiliation!: Affiliation;
}