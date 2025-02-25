import { MailAdapter } from "../adapters/mail.adapter";


/**
 * Factory for creating an instance of MailAdapter.
 * It reads configuration from environment variables.
 */
export class MailAdapterFactory {
    static create(): MailAdapter {
        const config: any = {
            host: process.env.SMTP_HOST!,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER!,
                pass: process.env.SMTP_PASSWORD!,
            },
        };

        return new MailAdapter(config);
    }
}
