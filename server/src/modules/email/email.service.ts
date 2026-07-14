import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordResetCode(to: string, code: string) {
    const subject = "Your Muhafiz Armour password reset code";
    const text = [
      "You requested a password reset for your Muhafiz Armour account.",
      "",
      `Your verification code is: ${code}`,
      "",
      "This code expires in 15 minutes.",
      "If you did not request this, you can ignore this email.",
    ].join("\n");

    const html = `
      <p>You requested a password reset for your Muhafiz Armour account.</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p>This code expires in 15 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    await this.sendMail({ to, subject, text, html });
  }

  private stripEnv(value: string | undefined) {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1).trim();
    }
    return trimmed;
  }

  private parseFromAddress(rawFrom: string, fallbackUser?: string) {
    const match = rawFrom.match(/^(.*)<([^>]+)>$/);
    if (match) {
      const name = match[1].trim().replace(/^["']|["']$/g, "");
      const address = match[2].trim();
      return { name: name || "Muhafiz Armour", address };
    }
    return { name: "Muhafiz Armour", address: fallbackUser ?? rawFrom };
  }

  private createTransporter(host: string, port: number, user?: string, pass?: string) {
    const auth = user && pass ? { user, pass } : undefined;
    if (host === "smtp.gmail.com") {
      return nodemailer.createTransport({
        service: "gmail",
        auth,
      } satisfies SMTPTransport.Options);
    }
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth,
    } satisfies SMTPTransport.Options);
  }

  private async sendMail(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) {
    const rawFrom = this.stripEnv(process.env.SMTP_FROM);
    const host = this.stripEnv(process.env.SMTP_HOST);
    const port = Number(process.env.SMTP_PORT ?? "587");
    const user = this.stripEnv(process.env.SMTP_USER);
    const pass = this.stripEnv(process.env.SMTP_PASS);
    const to = input.to.trim().toLowerCase();

    if (!rawFrom || !host) {
      if (process.env.NODE_ENV !== "production") {
        this.logger.warn(
          `[dev] Email not configured. Password reset code for ${to}: ${input.text}`,
        );
        return;
      }
      throw new Error("Email delivery is not configured");
    }

    const from = this.parseFromAddress(rawFrom, user);
    const transporter = this.createTransporter(host, port, user, pass);

    try {
      const info = await transporter.sendMail({
        from,
        to,
        replyTo: user ?? from.address,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });

      if (info.rejected?.length) {
        throw new Error(`Email rejected for: ${info.rejected.join(", ")}`);
      }

      this.logger.log(
        `Password reset email accepted for ${to} (messageId=${info.messageId ?? "unknown"})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to}: ${message}`);
      throw new Error(`Could not send verification email. ${message}`);
    }
  }
}
