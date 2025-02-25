import { EmailService } from '../services/Email.service';
import { MailAdapterFactory } from '../factories/MailAdapter.factory';
import { AdapterReply, AdapterRequest } from '../../../shared/configurations/adapters/server.adapter';
import { HttpStatus } from '../../../shared/helpers/http-status.helper';

/**
 * The EmailController class handles incoming HTTP requests related to email operations
 * and delegates the processing to the EmailService.
 */
export class EmailController {
    private emailService: EmailService;

    /**
     * Initializes the EmailController by creating an instance of EmailService
     * using the MailAdapterFactory.
     */
    constructor() {
        const mailAdapter = MailAdapterFactory.create();
        this.emailService = new EmailService(mailAdapter);
    }

    /**
     * Handles the HTTP request to send a generic email.
     * Extracts email details from the request body and delegates to the EmailService.
     *
     * @param request - The incoming request object, which should contain email details in the body.
     * @param reply - The reply object used to send back the HTTP response.
     * @returns A Promise that resolves when the response is sent.
     */
    async sendEmail(request: AdapterRequest, reply: AdapterReply) {
        const { from, to, subject, text, html } = request.body as {
            from?: string;
            to: string;
            subject: string;
            text?: string;
            html?: string;
        };

        const result = await this.emailService.sendMail({ email_from: from, to, subject, text, html });

        result.match(
            () => reply.status(HttpStatus.OK).send({ message: 'Email sent successfully!' }),
            error => reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: error })
        );
    }
}
