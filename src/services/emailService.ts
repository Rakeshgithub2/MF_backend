import { Resend } from 'resend';
import Handlebars from 'handlebars';

interface EmailTemplate {
  subject: string;
  html: string;
}

interface VerificationEmailData {
  name: string;
  verificationUrl: string;
}

interface AlertEmailData {
  name: string;
  fundName: string;
  alertType: string;
  condition: string;
  currentValue: string;
}

interface DigestEmailData {
  name: string;
  portfolioSummary: {
    totalValue: string;
    dayChange: string;
    dayChangePercent: string;
  };
  topPerformers: Array<{
    name: string;
    change: string;
  }>;
  alerts: Array<{
    fundName: string;
    message: string;
  }>;
}

interface WelcomeEmailData {
  name: string;
  email: string;
  loginType: 'registration' | 'login' | 'google';
}

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@mutualfunds.com';
  }

  async sendVerificationEmail(
    to: string,
    data: VerificationEmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.getVerificationTemplate();
      const compiled = Handlebars.compile(template.html);
      const html = compiled(data);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: template.subject,
        html,
      });

      console.log(`Verification email sent to ${to}:`, result.data?.id);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send verification email to ${to}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendAlertEmail(
    to: string,
    data: AlertEmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.getAlertTemplate();
      const compiled = Handlebars.compile(template.html);
      const html = compiled(data);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: template.subject,
        html,
      });

      console.log(`Alert email sent to ${to}:`, result.data?.id);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send alert email to ${to}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendDigestEmail(
    to: string,
    data: DigestEmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.getDigestTemplate();
      const compiled = Handlebars.compile(template.html);
      const html = compiled(data);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: template.subject,
        html,
      });

      console.log(`Digest email sent to ${to}:`, result.data?.id);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send digest email to ${to}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendWelcomeEmail(
    to: string,
    data: WelcomeEmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.getWelcomeTemplate(data.loginType);
      const compiled = Handlebars.compile(template.html);
      const html = compiled(data);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: template.subject,
        html,
      });

      console.log(`✅ Welcome email sent to ${to}:`, result.data?.id);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${to}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getVerificationTemplate(): EmailTemplate {
    return {
      subject: 'Verify Your Mutual Funds Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Mutual Funds Portal</h1>
            </div>
            <div class="content">
              <h2>Hello {{name}},</h2>
              <p>Thank you for signing up! Please verify your email address to complete your account setup.</p>
              <p>Click the button below to verify your account:</p>
              <a href="{{verificationUrl}}" class="button">Verify Account</a>
              <p>If you didn't create an account, you can safely ignore this email.</p>
              <p>This verification link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Mutual Funds Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getAlertTemplate(): EmailTemplate {
    return {
      subject: 'Investment Alert - {{fundName}}',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Investment Alert</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .alert-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Investment Alert</h1>
            </div>
            <div class="content">
              <h2>Hello {{name}},</h2>
              <p>Your alert for <strong>{{fundName}}</strong> has been triggered.</p>
              <div class="alert-box">
                <h3>Alert Details:</h3>
                <p><strong>Type:</strong> {{alertType}}</p>
                <p><strong>Condition:</strong> {{condition}}</p>
                <p><strong>Current Value:</strong> {{currentValue}}</p>
              </div>
              <p>Please review your investment strategy and consider appropriate action.</p>
              <p>Login to your account to manage your alerts and portfolio.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Mutual Funds Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getDigestTemplate(): EmailTemplate {
    return {
      subject: 'Your Daily Investment Digest',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Digest</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .summary-box { background: #f0f9ff; border: 1px solid #7dd3fc; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .performer { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .performer:last-child { border-bottom: none; }
            .positive { color: #059669; }
            .negative { color: #dc2626; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Daily Investment Digest</h1>
            </div>
            <div class="content">
              <h2>Hello {{name}},</h2>
              <p>Here's your daily portfolio summary:</p>
              
              <div class="summary-box">
                <h3>Portfolio Summary</h3>
                <p><strong>Total Value:</strong> {{portfolioSummary.totalValue}}</p>
                <p><strong>Today's Change:</strong> 
                  <span class="{{#if portfolioSummary.dayChange}}{{#if (gt portfolioSummary.dayChange 0)}}positive{{else}}negative{{/if}}{{/if}}">
                    {{portfolioSummary.dayChange}} ({{portfolioSummary.dayChangePercent}})
                  </span>
                </p>
              </div>

              {{#if topPerformers}}
              <h3>Top Performers</h3>
              {{#each topPerformers}}
              <div class="performer">
                <strong>{{name}}</strong>: <span class="positive">{{change}}</span>
              </div>
              {{/each}}
              {{/if}}

              {{#if alerts}}
              <h3>Active Alerts</h3>
              {{#each alerts}}
              <div class="performer">
                <strong>{{fundName}}</strong>: {{message}}
              </div>
              {{/each}}
              {{/if}}

              <p>Login to your account for detailed analysis and portfolio management.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Mutual Funds Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getWelcomeTemplate(
    loginType: 'registration' | 'login' | 'google'
  ): EmailTemplate {
    const isNewUser = loginType === 'registration' || loginType === 'google';
    const greeting = isNewUser ? 'Welcome to' : 'Welcome back to';

    return {
      subject: isNewUser
        ? '🎉 Welcome to Mutual Funds Portal!'
        : '👋 Welcome Back to Mutual Funds Portal!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .content h2 { color: #667eea; margin-top: 0; }
            .feature-box { background: #f8f9ff; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; border-radius: 5px; }
            .feature-box h3 { margin: 0 0 10px 0; color: #667eea; font-size: 16px; }
            .feature-box p { margin: 0; color: #666; font-size: 14px; }
            .features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }
            .feature-item { background: #f0f4ff; padding: 15px; border-radius: 8px; text-align: center; }
            .feature-item .icon { font-size: 32px; margin-bottom: 10px; }
            .feature-item h4 { margin: 5px 0; font-size: 14px; color: #667eea; }
            .feature-item p { margin: 5px 0; font-size: 12px; color: #666; }
            .button { display: inline-block; background: #667eea; color: white !important; padding: 14px 35px; text-decoration: none; border-radius: 25px; margin: 25px 0; font-weight: bold; box-shadow: 0 4px 6px rgba(102,126,234,0.3); }
            .button:hover { background: #5568d3; }
            .stats { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .stats h3 { margin: 0 0 15px 0; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .stat-item { padding: 10px; }
            .stat-item .number { font-size: 24px; font-weight: bold; display: block; }
            .stat-item .label { font-size: 12px; opacity: 0.9; }
            .tips { background: #fff9e6; border: 1px solid #ffd966; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .tips h3 { color: #f59e0b; margin-top: 0; }
            .tips ul { margin: 10px 0; padding-left: 20px; }
            .tips li { margin: 8px 0; color: #666; }
            .footer { background: #f8f9fa; padding: 30px 20px; text-align: center; font-size: 14px; color: #666; }
            .footer a { color: #667eea; text-decoration: none; }
            .social-links { margin: 15px 0; }
            .social-links a { display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 ${greeting} Mutual Funds Portal</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.95;">Your Smart Investment Companion</p>
            </div>
            
            <div class="content">
              <h2>Hello {{name}}! 👋</h2>
              ${
                isNewUser
                  ? `
              <p>Congratulations on taking your first step towards smarter investing! We're thrilled to have you join our community of investors.</p>
              <p>Your account (<strong>{{email}}</strong>) is now active and ready to help you achieve your financial goals.</p>
              `
                  : `
              <p>Great to see you again! We're happy you're back to continue your investment journey with us.</p>
              <p>Your account (<strong>{{email}}</strong>) is ready to use.</p>
              `
              }

              <div class="stats">
                <h3>📊 Platform at a Glance</h3>
                <div class="stats-grid">
                  <div class="stat-item">
                    <span class="number">5000+</span>
                    <span class="label">Mutual Funds</span>
                  </div>
                  <div class="stat-item">
                    <span class="number">50+</span>
                    <span class="label">AMCs</span>
                  </div>
                  <div class="stat-item">
                    <span class="number">24/7</span>
                    <span class="label">Market Updates</span>
                  </div>
                </div>
              </div>

              <h3 style="color: #667eea; margin-top: 30px;">🚀 What You Can Do Now:</h3>
              
              <div class="features-grid">
                <div class="feature-item">
                  <div class="icon">📈</div>
                  <h4>Browse Funds</h4>
                  <p>Explore 5000+ mutual funds</p>
                </div>
                <div class="feature-item">
                  <div class="icon">⭐</div>
                  <h4>Create Watchlist</h4>
                  <p>Track your favorites</p>
                </div>
                <div class="feature-item">
                  <div class="icon">💼</div>
                  <h4>Build Portfolio</h4>
                  <p>Track investments</p>
                </div>
                <div class="feature-item">
                  <div class="icon">🧮</div>
                  <h4>Use Calculators</h4>
                  <p>SIP, Lumpsum & Tax</p>
                </div>
                <div class="feature-item">
                  <div class="icon">🔔</div>
                  <h4>Set Alerts</h4>
                  <p>Price & return alerts</p>
                </div>
                <div class="feature-item">
                  <div class="icon">📊</div>
                  <h4>Compare Funds</h4>
                  <p>Side-by-side analysis</p>
                </div>
              </div>

              ${
                isNewUser
                  ? `
              <div class="tips">
                <h3>💡 Quick Start Tips:</h3>
                <ul>
                  <li><strong>Complete Your KYC:</strong> Required for investing in mutual funds</li>
                  <li><strong>Set Your Goals:</strong> Define your investment objectives</li>
                  <li><strong>Build Watchlist:</strong> Add funds you're interested in</li>
                  <li><strong>Use Calculators:</strong> Plan your SIP or lumpsum investments</li>
                  <li><strong>Enable Alerts:</strong> Get notified about important changes</li>
                </ul>
              </div>
              `
                  : ''
              }

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5001'}" class="button">
                  ${isNewUser ? '🚀 Get Started Now' : '📊 View Your Dashboard'}
                </a>
              </div>

              <div class="feature-box">
                <h3>🔒 Your Security Matters</h3>
                <p>We use bank-level encryption and never store your passwords in plain text. Your data is safe with us.</p>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Need help? Our support team is here for you 24/7. Simply reply to this email or visit our help center.
              </p>
            </div>

            <div class="footer">
              <p><strong>Mutual Funds Portal</strong></p>
              <p>Smart Investing Made Simple</p>
              <div class="social-links">
                <a href="#">Twitter</a> | 
                <a href="#">LinkedIn</a> | 
                <a href="#">Facebook</a>
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #999;">
                This email was sent to {{email}}. If you didn't create an account, please ignore this email.
              </p>
              <p style="font-size: 12px; color: #999;">
                &copy; 2024 Mutual Funds Portal. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }
}

export const emailService = new EmailService();
