
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendVerificationOTP(email, otp) {
  return transporter.sendMail({
    from: `"VoiceBridge" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: "Your VoiceBridge verification code",
    text: `Your OTP is ${otp}. It expires in 5 minutes. Do not share this code.`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px">
        <h2 style="color:#7655d9">💜 VoiceBridge</h2>
        <p>Your email verification code is:</p>
        <h1 style="letter-spacing:8px">${otp}</h1>
        <p>This code expires in 5 minutes.</p>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationOTP };
