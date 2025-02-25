import { Entity, PrimaryColumn, Column, BaseEntity, Generated } from 'typeorm';
import { IsUUID, IsEmail, IsString, IsBoolean, IsOptional, IsDate, Length } from 'class-validator';

@Entity('users')
export class User extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;

    @Column('varchar', { unique: true })
    @IsEmail()
    email!: string;

    @Column('varchar', { length: 60 })
    @IsString()
    @Length(1, 60)
    password!: string;

    @Column('varchar')
    @IsString()
    full_name!: string;

    @Column('varchar', { default: 'user' })
    @IsString()
    role!: 'user';

    @Column('boolean', { default: true })
    @IsBoolean()
    is_active!: boolean;

    @Column('boolean', { default: false })
    @IsBoolean()
    is_email_verified!: boolean;

    @Column('varchar', { length: 100, nullable: true })
    @IsOptional()
    @IsString()
    @Length(1, 100)
    email_verification_code?: string;

    @Column('timestamp', { nullable: true })
    @IsOptional()
    @IsDate()
    email_verification_expires_at?: Date;
}