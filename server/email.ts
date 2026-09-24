import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { logError } from './logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

  async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    name: string,
    expiresInMinutes: number,
  ): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.error('[email] Email service not configured');
      // Só em desenvolvimento: sem SMTP configurado, o link vai para o log do
      // servidor para permitir testar o fluxo localmente. Nunca em produção.
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[email][dev] Link de redefinição para ${email}: ${resetUrl}`);
      }
      return false;
    }

    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(resetUrl);

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Redefinição de Senha - Almoxarifado TI',
        text: [
          `Olá ${name},`,
          '',
          'Recebemos um pedido para redefinir a senha da sua conta no Sistema de Almoxarifado TI.',
          `Acesse o link abaixo para criar uma nova senha (válido por ${expiresInMinutes} minutos e de uso único):`,
          '',
          resetUrl,
          '',
          'Se você não fez este pedido, ignore este email. Sua senha permanecerá inalterada.',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; text-align: center;">Redefinição de Senha</h2>
              <p>Olá <strong>${safeName}</strong>,</p>
              <p>Recebemos um pedido para redefinir a senha da sua conta no Sistema de Almoxarifado TI.</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${safeUrl}" style="background-color: #007bff; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Criar nova senha
                </a>
                <p style="margin: 12px 0 0; font-size: 12px; color: #999;">
                  O link expira em ${expiresInMinutes} minutos e só pode ser usado uma vez.
                </p>
              </div>
              <p style="font-size: 12px; color: #666; word-break: break-all;">
                Se o botão não funcionar, copie e cole este endereço no navegador:<br>${safeUrl}
              </p>
              <p style="color: #666; font-size: 14px;">
                <strong>Importante:</strong> Se você não fez este pedido, ignore este email.
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
      console.log('[email] Password reset email sent successfully');
      return true;
    } catch (error) {
      logError('[email] Failed to send password reset email:', error);
      return false;
    }
  }

  // Aviso de que a senha foi alterada, para o dono da conta perceber uma
  // redefinição que não pediu.
  async sendPasswordChangedEmail(email: string, name: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) return false;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Sua senha foi alterada - Almoxarifado TI',
        text: `Olá ${name},\n\nA senha da sua conta no Sistema de Almoxarifado TI acabou de ser redefinida.\nSe não foi você, procure imediatamente o administrador do sistema.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; text-align: center;">Senha alterada</h2>
              <p>Olá <strong>${escapeHtml(name)}</strong>,</p>
              <p>A senha da sua conta no Sistema de Almoxarifado TI acabou de ser redefinida.</p>
              <p style="color: #666; font-size: 14px;">
                <strong>Não foi você?</strong> Procure imediatamente o administrador do sistema.
              </p>
            </div>
          </div>
        `,
      });
      return true;
    } catch (error) {
      logError('[email] Failed to send password changed email:', error);
      return false;
    }
  }

  async verifyConnection(): Promise<{ success: boolean; error?: any }> {
    if (!this.isConfigured || !this.transporter) {
      return { success: false, error: 'Service not configured (missing env vars)' };
    }
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          response: error.response
        }
      };
    }
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();
