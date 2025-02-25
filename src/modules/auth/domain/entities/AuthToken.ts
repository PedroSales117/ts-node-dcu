import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    BaseEntity,
    Generated,
} from 'typeorm';
import { IsUUID, IsString, IsBoolean, IsDate, IsOptional, IsNumber, Length } from 'class-validator';

@Entity('auth_tokens')
export class AuthToken extends BaseEntity {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    @IsUUID()
    id!: string;

    @Column('uuid', { nullable: false })
    @IsUUID()
    user_id!: string;

    @Column('varchar', { length: 500, nullable: false })
    @IsString()
    @Length(1, 500)
    access_token!: string;

    @Column('varchar', { length: 500, nullable: false })
    @IsString()
    @Length(1, 500)
    refresh_token!: string;

    @Column('timestamp', { nullable: true })
    @IsOptional()
    @IsDate()
    expires_at!: Date | null;

    @Column('boolean', { default: false, nullable: false })
    @IsBoolean()
    revoked!: boolean;

    @Column('varchar', { length: 255, nullable: true })
    @IsOptional()
    @IsString()
    @Length(1, 255)
    ip_address!: string | null;

    @Column('varchar', { length: 255, nullable: true })
    @IsOptional()
    @IsString()
    @Length(1, 255)
    user_agent!: string | null;

    @Column('varchar', { length: 500, nullable: true })
    @IsOptional()
    @IsString()
    @Length(1, 500)
    remember_me_token!: string | null;

    @Column('timestamp', { nullable: true })
    @IsOptional()
    @IsDate()
    remember_me_expires_at!: Date | null;

    @Column('boolean', { default: false, nullable: false })
    @IsBoolean()
    is_remember_me_token!: boolean;

    @Column('timestamp', { nullable: true })
    @IsOptional()
    @IsDate()
    last_used_at!: Date | null;

    @Column('integer', { nullable: true })
    @IsOptional()
    @IsNumber()
    token_version!: number | null;

    @CreateDateColumn({ type: 'timestamp', nullable: false })
    @IsDate()
    created_at!: Date;

    @UpdateDateColumn({ type: 'timestamp', nullable: false })
    @IsDate()
    updated_at!: Date;

    public isValid(): boolean {
        if (this.revoked) return false;
        if (!this.expires_at) return false;
        return new Date() < this.expires_at;
    }

    public isRememberMeValid(): boolean {
        if (!this.is_remember_me_token) return false;
        if (!this.remember_me_expires_at) return false;
        return new Date() < this.remember_me_expires_at;
    }

    public updateLastUsed(): void {
        this.last_used_at = new Date();
    }

    public revokeToken(): void {
        this.revoked = true;
        this.updateLastUsed();
    }

    public updateRememberMeExpiration(durationInDays: number = 14): void {
        if (this.is_remember_me_token) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + durationInDays);
            this.remember_me_expires_at = expiresAt;
            this.updateLastUsed();
        }
    }
}