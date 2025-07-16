import { Entity, PrimaryColumn, Column, BaseEntity, Generated, ManyToOne } from 'typeorm';
import { IsUUID, IsEnum } from 'class-validator';
import { MasteryLevel } from '../types/dcu.enums';
import { Individual } from './Individual';
import { Ability } from './Ability';

@Entity('ability_registries')
export class AbilityRegistry extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;
    
    @Column({ type: 'enum', enum: MasteryLevel, default: MasteryLevel.CONTROLLED })
    @IsEnum(MasteryLevel)
    mastery_level!: MasteryLevel;
    
    @ManyToOne(() => Individual, individual => individual.abilities)
    individual!: Individual;

    @ManyToOne(() => Ability, { eager: true })
    ability!: Ability;
}