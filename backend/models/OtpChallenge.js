const mongoose = require("mongoose");

const otpChallengeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true }, // bcrypt hash, never plain text
  otpHash: { type: String, required: true },      // hashed OTP, never plain text
  attempts: { type: Number, default: 0 },
  resendCount: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// MongoDB deletes the document automatically once expiresAt has passed.
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.OtpChallenge ||
  mongoose.model("OtpChallenge", otpChallengeSchema);