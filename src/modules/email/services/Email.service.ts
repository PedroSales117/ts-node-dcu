import { Err, Ok, Result } from "../../../shared/core/Result";
import logger from "../../../shared/utils/logger";
import { MailAdapter } from "../adapters/mail.adapter";

/**
 * Service for handling email-related operations.
 * It relies on an adapter to send emails, making it flexible and testable.
 */
export class EmailService {
    private mailAdapter: MailAdapter;

    /**
     * Constructs the EmailService with the given MailAdapter.
     * @param mailAdapter The adapter used for sending emails.
     */
    constructor(mailAdapter: MailAdapter) {
        this.mailAdapter = mailAdapter;
    }

    /**
     * Sends a generic email using the adapter.
     * @param options - Email options including recipient, subject, and content.
     * @param options.to - The recipient's email address.
     * @param options.subject - The subject of the email.
     * @param options.text - (Optional) The plain text content of the email.
     * @param options.html - (Optional) The HTML content of the email.
     * @returns A Result indicating success (Ok) or error (Err).
     */
    async sendMail(options: {
        email_from?: string;
        to: string;
        subject: string;
        text?: string;
        html?: string;
    }): Promise<Result<void, string>> {
        const result = await this.mailAdapter.sendMail({
            from: options.email_from || process.env.EMAIL_FROM || '"No Reply" <no-reply@example.com>',
            ...options,
        });

        if (result.isOk()) {
            logger.info(`Email sent to ${options.to}`);
            return Ok(undefined);
        } else {
            logger.error(`Failed to send email to ${options.to}: ${result.error}`);
            return Err(result.error);
        }
    }
}
