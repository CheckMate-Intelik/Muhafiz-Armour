import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordResetCode(to: string, code: string) {
    const subject = 'Your Muhafiz Armour password reset code';
    const text = [
      'You requested a password reset for your Muhafiz Armour account.',
      '',
      `Your verification code is: ${code}`,
      '',
      'This code expires in 15 minutes.',
      'If you did not request this, you can ignore this email.',
    ].join('\n');

    const html = `
      <p>You requested a password reset for your Muhafiz Armour account.</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p>This code expires in 15 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    await this.sendMail({ to, subject, text, html });
  }

  private async sendMail(input: { to: string; subject: string; text: string; html: string }) {
    const from = process.env.SMTP_FROM?.trim();
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? '587');
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;

    if (!from || !host) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`[dev] Email not configured. Password reset code for ${input.to}: ${input.text}`);
        return;
      }
      throw new Error('Email delivery is not configured');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }
}
