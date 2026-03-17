import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(cors({ origin: true, methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());
app.use(express.static('.'));

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.warn('Warning: GOOGLE_API_KEY is not set in .env. Gemini calls will fail.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

app.post('/api/generate-report', async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: 'GOOGLE_API_KEY is not configured on the server.' });
    }

    const { project, devName, extra, commits } = req.body || {};

    if (!project) {
      return res.status(400).json({ error: 'Missing project field' });
    }

    const commitText = Array.isArray(commits) && commits.length
      ? commits.map(c => `[${c.sha}] ${c.message} (by ${c.author} at ${c.date})`).join('\n')
      : '(No commits fetched — rely on extra context/instructions.)';

    const prompt = `You are a developer daily-standup report generator.

Given the following Git commits, generate a structured daily update report.

PROJECT / CLIENT: ${project}
DEVELOPER: ${devName || 'Developer'}
DATE: ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}

GIT COMMITS:
${commitText}

${extra ? 'EXTRA CONTEXT:\n' + extra : ''}

Generate a JSON object with this exact structure (respond ONLY with valid JSON, no markdown, no backticks):
{
  "summary": "A 2-3 sentence professional daily update message describing what was accomplished today.",
  "tasks": [
    {
      "project": "${project}",
      "description": "Clear task description derived from commits",
      "hours": 1.5,
      "status": "Completed",
      "remarks": "Brief technical note or remark"
    }
  ],
  "totalHours": 8
}

Rules:
- Group related commits into meaningful tasks (don't list every commit separately)
- status must be exactly one of: "Completed", "In Progress", "Pending"
- hours should be a realistic number (0.5 increments, min 0.5)
- totalHours = sum of all task hours
- Keep descriptions concise but specific (mention component/feature names from commits)
- remarks should add value (code quality, UX improvement, etc.)
- If commits mention a fix, mark as Completed; if WIP/draft, mark as In Progress`;

    // Use a currently supported Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Using the simple text API, which is the recommended pattern
    const result = await model.generateContent(prompt);

    const rawText = (result.response && typeof result.response.text === 'function')
      ? result.response.text()
      : '';
    const clean = rawText.replace(/```json|```/g, '').trim();

    let report;
    try {
      report = JSON.parse(clean);
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', e, '\nRaw output:\n', rawText);
      return res.status(500).json({ error: 'Failed to parse Gemini response as JSON.' });
    }

    return res.json({ report });
  } catch (err) {
    console.error('Error in /api/generate-report:', err);
    const message = err?.message || 'Internal server error.';
    return res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`DevLog daily update server running on http://localhost:${port}`);
});

