import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailHost || !emailPort || !emailUser || !emailPass) {
      console.warn('[email] Email service not configured. Missing environment variables.');
      return;
    }

    const config: EmailConfig = {
      host: emailHost,
      port: parseInt(emailPort, 10),
      secure: parseInt(emailPort, 10) === 465, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };

    this.transporter = nodemailer.createTransport(config);
    this.isConfigured = true;
    console.log('[email] Email service configured successfully');
  }

  async sendPasswordResetEmail(email: string, resetCode: string, username: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.error('[email] Email service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Recuperação de Senha - Almoxarifado TI',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; text-align: center;">Recuperação de Senha</h2>
              <p>Olá <strong>${username}</strong>,</p>
              <p>Você solicitou a recuperação de senha para sua conta no Sistema de Almoxarifado TI.</p>
              <div style="background-color: #fff; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #666;">Seu código de recuperação é:</p>
                <h1 style="color: #007bff; font-size: 32px; margin: 10px 0; letter-spacing: 4px;">${resetCode}</h1>
                <p style="margin: 0; font-size: 12px; color: #999;">Este código expira em 15 minutos</p>
              </div>
              <p>Use este código na tela de redefinição de senha do sistema.</p>
              <p style="color: #666; font-size: 14px;">
                <strong>Importante:</strong> Se você não solicitou esta recuperação, ignore este email. 
                Sua senha permanecerá inalterada.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                Sistema de Almoxarifado TI<br>
                Este é um email automático, não responda.
              </p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`[email] Password reset email sent to ${email}`);
      return true;
    } catch (error: any) {
      console.error('[email] Failed to send password reset email:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response
      });
      return false;
    }
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();
