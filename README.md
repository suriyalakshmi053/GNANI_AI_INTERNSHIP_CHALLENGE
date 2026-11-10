# GNANI_AI_INTERNSHIP_CHALLENGE
A multilingual AI-powered interview practice platform using Gnani Speech-to-Text API to help students and job seekers improve communication and interview confidence through voice-based practice in Tamil and English.
# VoiceBridge AI

### Find Your Voice. Own the Interview.

## About the Project

VoiceBridge AI is a multilingual interview practice platform designed to help students and job seekers improve their communication skills and build confidence for interviews.

Users can practise answering interview questions through voice recordings in Tamil and Indian English. The platform integrates Gnani's Vachana Speech-to-Text API to convert spoken answers into editable text.

## Features

- **Voice-Based Interview Practice:** Record answers to interview questions.
- **Multilingual Support:** Practise in Tamil and Indian English.
- **AI Speech-to-Text:** Convert spoken answers into text using Gnani Vachana API.
- **Interview Question Bank:** Practise HR, technical, behavioural, and project-based questions.
- **Transcript Review:** Edit, copy, and download transcribed answers.
- **Practice History:** View previous practice sessions.
- **Answer Improvement:** Review responses and identify areas for improvement.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, Vite, HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Speech Recognition | Gnani Vachana API |
| Audio Recording | Browser MediaRecorder API |
| Audio Processing | FFmpeg |

## Project Structure

```text
VoiceBridge-AI/
│
├── frontend/
│
├── backend/
│
├── docs/
│   └── VoiceBridge_AI_Solution_Pitch.pdf
│
├── README.md
└── .gitignore
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd VoiceBridge-AI
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Backend Setup

Open another terminal:

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
GNANI_API_KEY=your_gnani_api_key
PORT=5000
```

Start the backend:

```bash
node server.js
```

**Note:** Obtain your own Gnani API key and keep it private. Never upload your `.env` file to GitHub.

## Target Users

- College students
- Fresh graduates
- Job seekers
- Campus placement candidates

## Expected Impact

VoiceBridge AI makes interview practice more accessible through multilingual voice-based interaction. It helps users practise speaking, review their answers, and gradually build confidence for real interviews.

## Future Enhancements

- AI-powered personalised interview feedback.
- Support for additional Indian languages.
- Advanced performance analytics.
- Personalised interview preparation recommendations.

## Project Information

**Project Name:** VoiceBridge AI

**Tagline:** Find Your Voice. Own the Interview.

**AI Integration:** Gnani Vachana Speech-to-Text API

**Developed for:** The Great Indian AI Internship Challenge

---
