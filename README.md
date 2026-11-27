# Draftly — AI-Powered Content Generation & Analysis Platform

Draftly turns ideas, notes and existing content into useful writing for different formats. It includes content generation, rewriting, summarization, analysis, multi-platform repurposing, and source-grounded claim review.

## Features

- **Create content:** Draft blogs, LinkedIn posts, social captions, emails, product descriptions and video scripts.
- **Rewrite:** Improve clarity and tone while asking the model to preserve the supplied meaning.
- **Summarize:** Extract key points from longer text.
- **Analyze:** Review tone, themes, audience, readability and keywords.
- **Repurpose content:** Generate separate versions for LinkedIn, Blog, Instagram, Email, Facebook and X/Twitter from one source.
- **Fact check:** Compare generated text against the original source and report supported claims, unsupported additions, potential contradictions, and missing details.
- **Copy and export:** Copy output or download it as a text file. The 30 most recent drafts, including their inputs and settings, are saved in this browser with `localStorage` and can be reopened after a refresh. This is browser-local storage, not cloud backup or cross-device sync.

> Fact-checking compares text with the source supplied by the user. It is not external fact verification, and unsupported claims are flagged for review rather than automatically declared false.

## Requirements

- Node.js 20 or newer recommended
- A Google Gemini API key with access to the configured model

## Setup

1. Extract the project ZIP and open a terminal in the `ai-content-platform` folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file by copying `.env.example` and add your key:

   ```env
   GEMINI_API_KEY=your_real_key_here
   GEMINI_MODEL=gemini-3.8-flash
   PORT=5000
   ```

   If that model is unavailable to your API key, set `GEMINI_MODEL` to a model name enabled for your account.

4. Start the API server in one terminal:

   ```bash
   npm run server
   ```

5. Start the Vite frontend in another terminal:

   ```bash
   npm run dev
   ```

6. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Checks

Run the storage helper tests (no API key is needed):

```bash
npm test
```

Build the frontend after installing dependencies:

```bash
npm run build
```

Manual persistence smoke test: generate one draft, open **Recent drafts**, refresh the browser, open **Recent drafts** again, then click the saved card. The output and original form settings should be restored.

## API

- `GET /api/health` — reports whether the API key is configured, the selected model, and the request timeout. It does not call Gemini, so it does not confirm model access or spend quota.
- `POST /api/generate` — accepts a task and its input fields, then returns `{ text, model, task }`.

Gemini requests have a 45-second per-attempt timeout and one retry for temporary failures. The frontend stops waiting after 95 seconds and displays a diagnostic message. Check the backend terminal for the exact upstream error. The API key belongs only in the backend `.env` file. Do not add it to frontend code or commit `.env` to Git.
