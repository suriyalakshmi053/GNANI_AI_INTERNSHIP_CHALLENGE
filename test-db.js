require("dotenv").config();
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
  .then(async () => {
    console.log("MongoDB connected. Database:", mongoose.connection.name);
    await mongoose.disconnect();
  })
  .catch((err) => {
    console.error("MongoDB FAILED:", err.message);
    process.exit(1);
  });
  