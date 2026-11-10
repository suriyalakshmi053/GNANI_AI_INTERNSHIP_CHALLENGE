require("dotenv").config();
const { sendVerificationOTP } = require("./emailService");

const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"];
required.forEach((name) =>
  console.log(name.padEnd(12), process.env[name] ? "SET" : "MISSING")
);

const to = process.argv[2];
if (!to) {
  console.log("\nUsage: node test-email.js your-own-email@gmail.com");
  process.exit(1);
}

sendVerificationOTP(to, "123456")
  .then((info) => console.log("\nEmail sent OK. Check your inbox/spam. Accepted:", info.accepted))
  .catch((err) => console.error("\nEmail FAILED:", err.code, "-", err.message));