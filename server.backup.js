require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());

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

    const originalName = req.file.originalname || "recording.wav";
    const extension = originalName.split(".").pop().toLowerCase();

    const mimeByExtension = {
      wav: "audio/wav",
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      ogg: "audio/ogg",
      flac: "audio/flac",
    };

    const mimeType =
      mimeByExtension[extension] ||
      req.file.mimetype ||
      "application/octet-stream";

    const form = new FormData();

    form.append(
      "audio_file",
      new Blob([req.file.buffer], { type: mimeType }),
      originalName
    );
    form.append("language_code", languageCode);
    form.append("format", "transcribe");

    const response = await fetch("https://api.vachana.ai/stt/v3", {
      method: "POST",
      headers: {
        "X-API-Key-ID": apiKey,
      },
      body: form,
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

      return res.status(502).json({
        error:
          data.message ||
          data.detail ||
          data.error ||
          "Gnani could not transcribe this file. Try a WAV, MP3, M4A, OGG or FLAC recording.",
      });
    }

    return res.json({
      success: data.success,
      transcript: data.transcript,
      request_id: data.request_id,
    });
  } catch (error) {
    console.error("Transcription error:", error.message);

    return res.status(500).json({
      error: "Transcription failed. Check the backend terminal for details.",
    });
  }
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
  return res.status(500).json({ error: "Unexpected backend error." });
});

const PORT = process.env.PORT || 5000;

const interviewQuestions = [
  {
    id: 1,
    question: "Tell me about yourself.",
    tips: ["Introduce your education", "Mention your key skills", "Connect your skills to the role"],
  },
  {
    id: 2,
    question: "Explain a project you are proud of.",
    tips: ["Explain the problem", "Describe your technology stack", "Share your contribution and result"],
  },
  {
    id: 3,
    question: "What are your strengths?",
    tips: ["Mention two relevant strengths", "Give a real example", "Explain how they help at work"],
  },
  {
    id: 4,
    question: "Why should we hire you?",
    tips: ["Connect your skills to the job", "Mention your willingness to learn", "Give a specific example"],
  },
];

app.get("/api/interview/questions", (req, res) => {
  res.json({ success: true, questions: interviewQuestions });
});

app.post("/api/interview/feedback", (req, res) => {
  const { answer, question } = req.body || {};

  if (!answer || !answer.trim()) {
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

  if (!/\b(because|so|therefore|result|improved|built|developed|learned)\b/i.test(answer)) {
    tips.push("Explain your reasoning, action, or result to make the answer stronger.");
  }

  if (!/\b(I|my|me|we|our)\b/i.test(answer)) {
    tips.push("Clearly explain your personal contribution using examples.");
  }

  res.json({
    success: true,
    feedbackType: "rule-based",
    question: question || "Interview practice",
    wordCount: words.length,
    score: Math.min(100, Math.max(35, 50 + (words.length >= 20 && words.length <= 150 ? 20 : 0) + (tips.length === 1 ? 10 : 0))),
    strengths: [
      "You completed an answer for the interview question.",
    ],
    improvements: tips,
    sampleStructure: "Use this structure: Situation → Action → Result → What you learned.",
  });
});


app.listen(PORT, () => {
  console.log(`VoiceBridge AI running at http://localhost:${PORT}`);
});