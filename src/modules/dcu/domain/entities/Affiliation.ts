import { Entity, PrimaryColumn, Column, BaseEntity, Generated, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsUUID, IsString, IsOptional } from 'class-validator';
import { Individual } from './Individual';
import { Location } from './Location';
import { AffiliationMember } from './AffiliationMember';

@Entity('affiliations')
export class Affiliation extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;

    @Column('varchar', { unique: true })
    @IsString()
    name!: string;
    
    @Column('text')
    @IsString()
    modus_operandi!: string;

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