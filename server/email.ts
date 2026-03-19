import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, "") : "";
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || "";
const FROM_NAME = process.env.FROM_NAME || "VevoLine Dashboard";
const APP_URL = process.env.REPL_SLUG
  ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER?.toLowerCase()}.repl.co`
  : process.env.APP_URL || "http://localhost:5000";

let transporter: nodemailer.Transporter | null = null;

export async function initializeEmailTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("⚠️ SMTP credentials not configured - emails will not be sent");
    return;
  }

  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      requireTLS: SMTP_PORT === 587,
      pool: false, // disable pool to avoid connection reuse issues on shared hosting
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    } as any);

    // Attempt verification but DON'T block email sending on it
    transporter.verify((error) => {
      if (error) {
        console.warn("⚠️ Email transporter verify warning (non-fatal):", error.message);
        console.warn("   Emails will still be attempted. Check SMTP credentials if emails fail.");
      } else {
        console.log("✅ Email transporter verified and ready");
      }
    });

    console.log(`📧 Email transporter initialized: ${SMTP_USER} via ${SMTP_HOST}:${SMTP_PORT}`);
  } catch (error) {
    console.error("❌ Failed to initialize email transporter:", error);
    transporter = null;
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("❌ Email not sent: SMTP credentials missing");
    return false;
  }

  // Create a fresh transporter if not initialized
  if (!transporter) {
    console.warn("⚠️ Transporter not initialized, attempting to re-initialize...");
    await initializeEmailTransporter();
    if (!transporter) {
      console.error("❌ Email not sent: transporter unavailable");
      return false;
    }
  }

  const resolvedFromEmail =
    SMTP_HOST.includes("gmail.com") && SMTP_USER ? SMTP_USER : FROM_EMAIL || SMTP_USER;

  const transientCodes = new Set([
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ESOCKET",
    "ECONNRESET",
    "ENOTFOUND",
  ]);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`📤 Sending email to ${to} (attempt ${attempt}/3)...`);
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${resolvedFromEmail}>`,
        to,
        subject,
        html,
      });
      console.log(`✅ Email successfully sent to: ${to}`);
      return true;
    } catch (error: any) {
      const code = error?.code || error?.errno || error?.responseCode;
      const isTransient = transientCodes.has(code) || typeof code === "number";
      console.error(`❌ Email attempt ${attempt} failed:`, error.message, `(code: ${code})`);

      if (attempt < 3 && isTransient) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.error("❌ All email send attempts failed for:", to);
      return false;
    }
  }
  return false;
}

export async function sendInvitationEmail(
  email: string,
  name: string,
  token: string,
  role: string
): Promise<boolean> {
  const setPasswordUrl = `${APP_URL}/set-password?token=${token}`;

  const roleLabels: Record<string, string> = {
    admin: "مدير / Admin",
    sales: "مبيعات / Sales",
    execution: "تنفيذ / Execution",
    finance: "مالية / Finance",
    viewer: "مشاهد / Viewer",
  };

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .welcome { font-size: 20px; color: #1f2937; margin-bottom: 20px; }
    .message { color: #4b5563; line-height: 1.8; margin-bottom: 25px; }
    .role-badge { display: inline-block; background: #f3e8ff; color: #7c3aed; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 10px 0; }
    .button { display: inline-block; background: #7c3aed; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #6d28d9; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
    .link { color: #7c3aed; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 VevoLine Dashboard</h1>
    </div>
    <div class="content">
      <p class="welcome">مرحباً ${name} 👋</p>
      <p class="message">
        تمت دعوتك للانضمام إلى لوحة تحكم VevoLine!
        <br><br>
        You have been invited to join the VevoLine Dashboard!
      </p>
      <p>
        <span class="role-badge">${roleLabels[role] || role}</span>
      </p>
      <p class="message">
        لبدء استخدام حسابك، يرجى تعيين كلمة المرور الخاصة بك:
        <br>
        To start using your account, please set your password:
      </p>
      <p style="text-align: center;">
        <a href="${setPasswordUrl}" class="button">تعيين كلمة المرور / Set Password</a>
      </p>
      <p class="message" style="font-size: 14px; color: #9ca3af;">
        إذا لم يعمل الزر، يمكنك نسخ الرابط التالي:
        <br>
        If the button doesn't work, copy this link:
        <br>
        <a href="${setPasswordUrl}" class="link">${setPasswordUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>هذه الدعوة صالحة لمدة 7 أيام</p>
      <p>This invitation expires in 7 days</p>
      <p style="margin-top: 15px;">© ${new Date().getFullYear()} VevoLine</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail(
    email,
    "دعوة للانضمام إلى VevoLine Dashboard / Invitation to VevoLine Dashboard",
    html
  );
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .message { color: #4b5563; line-height: 1.8; margin-bottom: 25px; }
    .button { display: inline-block; background: #7c3aed; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #6d28d9; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
    .link { color: #7c3aed; word-break: break-all; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 إعادة تعيين كلمة المرور</h1>
    </div>
    <div class="content">
      <p class="message">
        تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في VevoLine Dashboard.
        <br><br>
        We received a request to reset your password for your VevoLine Dashboard account.
      </p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">إعادة تعيين كلمة المرور / Reset Password</a>
      </p>
      <div class="warning">
        ⚠️ إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.
        <br>
        If you didn't request a password reset, please ignore this email.
      </div>
      <p class="message" style="font-size: 14px; color: #9ca3af;">
        إذا لم يعمل الزر، يمكنك نسخ الرابط التالي:
        <br>
        If the button doesn't work, copy this link:
        <br>
        <a href="${resetUrl}" class="link">${resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>هذا الرابط صالح لمدة 24 ساعة</p>
      <p>This link expires in 24 hours</p>
      <p style="margin-top: 15px;">© ${new Date().getFullYear()} VevoLine</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail(
    email,
    "إعادة تعيين كلمة المرور / Password Reset - VevoLine Dashboard",
    html
  );
}
