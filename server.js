
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStoreModule = require("connect-mongo");
const MongoStore = MongoStoreModule.default || MongoStoreModule;
const helmet = require("helmet");
const authRoutes = require("./routes/auth");

const execFileAsync = promisify(execFile);
const app = express();

const PORT = process.env.PORT || 5000;
const MAX_AUDIO_SIZE = 15 * 1024 * 1024;

const ffmpegPath = path.join(
  process.env.LOCALAPPDATA || "",
  "Microsoft",
  "WinGet",
  "Packages",
  "Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe",
  "ffmpeg-9.0.2-full_build-shared",
  "bin",
  "ffmpeg.exe"
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_SIZE },
});

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET || !process.env.MONGODB_URI) {
  console.error("SESSION_SECRET and MONGODB_URI must be set in backend/.env");
  process.exit(1);
}

if (isProduction) app.set("trust proxy", 1);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection failed:", err.message));

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.use(
  session({
    name: "vb.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, ttl: 14 * 24 * 60 * 60 }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api/auth", authRoutes);

// Convert browser recordings such as WebM to a standard WAV file.
async function convertToWav(inputBuffer, inputExtension = "webm") {
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "voicebridge-")
  );

  const safeExtension = /^[a-z0-9]+$/i.test(inputExtension)
    ? inputExtension
    : "audio";

  const inputPath = path.join(tempDir, `input.${safeExtension}`);
  const outputPath = path.join(tempDir, "output.wav");

  try {
    await fs.promises.writeFile(inputPath, inputBuffer);

    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-i", inputPath,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "pcm_s16le",
        outputPath,
      ],
      { windowsHide: true, timeout: 60000 }
    );

    return await fs.promises.readFile(outputPath);
  } finally {
    await fs.promises.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

app.get("/", (req, res) => {
  res.send("VoiceBridge AI backend is running!");
});

app.get("/api/status", (req, res) => {
  res.json({
    app: "VoiceBridge AI",
    server: "running",
    apiKeyConfigured: Boolean(process.env.GNANI_API_KEY),
  });
});

// Speech-to-text using Gnani / Vachana API.
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const apiKey = process.env.GNANI_API_KEY;

    if (!apiKey || apiKey === "PASTE_YOUR_API_KEY_HERE") {
      return res.status(500).json({
        error: "Gnani API key is missing. Check backend/.env.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No audio file received. Please record or upload audio.",
      });
    }

    const languageCode = req.body.language_code || "ta-IN";

    if (!["ta-IN", "en-IN"].includes(languageCode)) {
      return res.status(400).json({
        error: "Unsupported language. Choose Tamil or Indian English.",
      });
    }

    const originalName = req.file.originalname || "recording.webm";
    const extension = path.extname(originalName)
      .slice(1)
      .toLowerCase();

    const supportedExtensions = [
      "wav",
      "mp3",
      "m4a",
      "ogg",
      "aac",
      "flac",
    ];

    const mimeByExtension = {
      wav: "audio/wav",
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      ogg: "audio/ogg",
      aac: "audio/aac",
      flac: "audio/flac",
    };

    let audioBuffer = req.file.buffer;
    let uploadName = originalName;
    let mimeType = mimeByExtension[extension] || req.file.mimetype;

    if (!supportedExtensions.includes(extension)) {
      audioBuffer = await convertToWav(
        req.file.buffer,
        extension || "webm"
      );

      uploadName = "recording.wav";
      mimeType = "audio/wav";
    }

    const form = new FormData();

    form.append(
      "audio_file",
      new Blob([audioBuffer], { type: mimeType || "audio/wav" }),
      uploadName
    );
    form.append("language_code", languageCode);
    form.append("format", "transcribe");

    const response = await fetch("https://api.vachana.ai/stt/v3", {
      method: "POST",
      headers: {
        "X-API-Key-ID": apiKey,
      },
      body: form,
      signal: AbortSignal.timeout(90000),
    });

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }

    if (!response.ok) {
      console.error("Gnani API status:", response.status);
      console.error("Gnani API response:", data);

      const apiError =
        typeof data.error === "object"
          ? data.error.message
          : data.error;

      return res.status(502).json({
        error:
          apiError ||
          data.message ||
          data.detail ||
          "Gnani could not transcribe this audio. Please try another recording.",
        type:
          typeof data.error === "object"
            ? data.error.type
            : undefined,
      });
    }

    return res.json({
      success: data.success ?? true,
      transcript: data.transcript || "",
      request_id: data.request_id,
    });
  } catch (error) {
    console.error("Transcription error:", error.message);

    if (error.code === "ENOENT") {
      return res.status(500).json({
        error:
          "FFmpeg was not found. Check the ffmpeg.exe path in server.js.",
      });
    }

    if (error.name === "TimeoutError") {
      return res.status(504).json({
        error: "Transcription timed out. Please try a shorter recording.",
      });
    }

    return res.status(500).json({
      error:
        "Transcription failed. Check the backend terminal for details.",
    });
  }
});

const interviewQuestions = [
  {
    id: 1,
    question: "Tell me about yourself.",
    tips: [
      "Introduce your education",
      "Mention your key skills",
      "Connect your skills to the role",
    ],
  },
  {
    id: 2,
    question: "Explain a project you are proud of.",
    tips: [
      "Explain the problem",
      "Describe your technology stack",
      "Share your contribution and result",
    ],
  },
  {
    id: 3,
    question: "What are your strengths?",
    tips: [
      "Mention two relevant strengths",
      "Give a real example",
      "Explain how they help at work",
    ],
  },
  {
    id: 4,
    question: "Why should we hire you?",
    tips: [
      "Connect your skills to the job",
      "Mention your willingness to learn",
      "Give a specific example",
    ],
  },
];

app.get("/api/interview/questions", (req, res) => {
  res.json({ success: true, questions: interviewQuestions });
});

app.post("/api/interview/feedback", (req, res) => {
  const { answer, question } = req.body || {};

  if (typeof answer !== "string" || !answer.trim()) {
    return res.status(400).json({
      success: false,
      error: "Please provide your interview answer.",
    });
  }

  const words = answer.trim().split(/\s+/).filter(Boolean);
  const tips = [];

  if (words.length < 20) {
    tips.push("Try giving a more detailed answer with a specific example.");
  } else if (words.length > 150) {
    tips.push("Make your answer more concise and focus on the key points.");
  } else {
    tips.push("Your answer has a reasonable length. Keep it focused.");
  }

  if (
    !/\b(because|so|therefore|result|improved|built|developed|learned)\b/i.test(
      answer
    )
  ) {
    tips.push(
      "Explain your reasoning, action, or result to make the answer stronger."
    );
  }

  if (!/\b(I|my|me|we|our)\b/i.test(answer)) {
    tips.push(
      "Clearly explain your personal contribution using examples."
    );
  }

  const score = Math.min(
    100,
    Math.max(
      35,
      50 +
        (words.length >= 20 && words.length <= 150 ? 20 : 0) +
        (tips.length === 1 ? 10 : 0)
    )
  );

  res.json({
    success: true,
    feedbackType: "rule-based",
    question: question || "Interview practice",
    wordCount: words.length,
    score,
    strengths: [
      "You completed an answer for the interview question.",
    ],
    improvements: tips,
    sampleStructure:
      "Use this structure: Situation -> Action -> Result -> What you learned.",
  });
});

// Return upload errors as readable JSON.
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "Audio file is too large. Maximum size is 15 MB.",
      });
    }

    return res.status(400).json({ error: error.message });
  }

  console.error("Backend error:", error.message);
  return res.status(500).json({
    error: "Unexpected backend error.",
  });
});

app.listen(PORT, () => {
  console.log(`VoiceBridge AI running at http://localhost:${PORT}`);
  console.log(`FFmpeg path configured: ${ffmpegPath}`);
});
