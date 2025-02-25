import fs from 'fs';
import path from 'path';
import logger from '../../../shared/utils/logger';
import { EmailService } from '../../email/services/Email.service';

interface VerificationEmailData {
    full_name: string;
    verification_code: string;
    code_first: string;
    code_second: string;
    expiration_minutes: number;
}

export class EmailClient {
    constructor(private readonly emailService: EmailService) { }

    /**
     * Sends a generic email using the email service.
     * @param options - Email options including recipient, subject, and content.
     * @returns A Promise resolving on success or rejecting on error.
     */
    async sendMail(options: {
        to: string;
        subject: string;
        text?: string;
        html?: string;
    }): Promise<void> {
        const result = await this.emailService.sendMail(options);

        if (result.isErr()) {
            throw new Error(`Error sending email to ${options.to}: ${result.error}`);
        }
    }

    /**
     * Reads and compiles an email template from the filesystem.
     * @param templateName - The name of the template file.
     * @param replacements - Key-value pairs for replacing placeholders in the template.
     * @returns The compiled email content as a string.
     */
    private compileTemplate(templateName: string, replacements: Record<string, any>): string {
        try {
            const templatePath = path.resolve(__dirname, `../templates/${templateName}.html`);
            const template = fs.readFileSync(templatePath, 'utf-8');

            return Object.entries(replacements).reduce(
                (content, [key, value]) => {
                    const safeValue = value ?? '';
                    return content.replace(new RegExp(`{{${key}}}`, 'g'), String(safeValue));
                },
                template
            );
        } catch (error) {
            logger.error(`Error compiling template ${templateName}:`, error);
            throw new Error(`Failed to compile email template: ${error}`);
        }
    }

    /**
     * Sends a verification email with the verification code split into groups.
     * @param to - The recipient's email address
     * @param data - Object containing verification code data and expiration time
     */
    async sendVerificationEmail(
        to: string,
        data: VerificationEmailData
    ): Promise<void> {
        try {
            const htmlContent = this.compileTemplate('email-verification', {
                ...data,
                current_year: new Date().getFullYear().toString(),
                app_url: process.env.SITE_URL!,
            });

            await this.sendMail({
                to,
                subject: 'Verifique seu Email - Bia Sales',
                html: htmlContent,
            });
        } catch (error) {
            logger.error(`Failed to send verification email to ${to}:`, error);
            throw error;
        }
    }
}
