import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL_USER,   // your gmail address
    pass: process.env.SMTP_EMAIL_PASS,   // your gmail app password (not your real password)
  },
});

export async function sendCustomPasswordResetEmail(
    email: string,
    displayName: string,
    link: string
){
    const mailOptions = {
        from: `"WHISPXR Support" <${process.env.SMTP_EMAIL_USER}>`,
        to: email,
        subject: "Reset your password - WHISPXR",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Hi ${displayName},</p>
                <p>We received a request to reset your password. Click the button below to proceed:</p>
                <a href="${link}" style="
                display: inline-block;
                padding: 12px 24px;
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                margin: 16px 0;
                ">
                Reset Password
                </a>
                <p>This link will expire in <strong>1 hour</strong>.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
            `,
    };
    
    await transporter.sendMail(mailOptions);
}