import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { Result, Ok, Err } from '../../../../shared/core/Result';

/**
 * MailAdapter provides a generic interface for email services,
 * enabling easy configuration and sending of emails with error handling.
 */
export class MailAdapter {
    private transporter: Transporter;

    /**
     * Initializes the adapter with the given configuration for the SMTP server.
     * @param config The SMTP configuration for the email service.
     */
    constructor(config: nodemailer.TransportOptions) {
        this.transporter = nodemailer.createTransport(config);
    }

    /**
     * Sends an email using the configured transporter.
     * @param options The email options, including `to`, `from`, `subject`, and `text`/`html`.
     * @returns A Result indicating success (Ok) or an error message (Err).
     */
    async sendMail(options: SendMailOptions): Promise<Result<void, string>> {
        try {
            await this.transporter.sendMail(options);
            return Ok(undefined);
        } catch (error) {
            return Err(
                `Failed to send email: ${error instanceof Error ? error.message : error}`,
            );
        }
    }

    /**
     * Verifies the connection configuration for the transporter.
     * Useful for ensuring the SMTP server is reachable.
     * @returns A Result indicating success (Ok) or an error message (Err).
     */
    async verifyConnection(): Promise<Result<void, string>> {
        try {
            await this.transporter.verify();
            return Ok(undefined);
        } catch (error) {
            return Err(
                `Failed to verify connection: ${error instanceof Error ? error.message : error}`,
            );
        }
    }
}
