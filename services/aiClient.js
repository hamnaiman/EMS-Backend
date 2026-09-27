// services/aiClient.js
// Screens resumes against job requirements using Groq's chat completions API.
//
// Requires in .env:
//   GROQ_API_KEY=gsk_xxxxxxxx
//   GROQ_MODEL=llama-3.3-70b-versatile   (optional — defaults to this)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are an HR screening assistant. You will be given a job role's
requirements and the raw text of a candidate's resume/CV. Evaluate how well the candidate
matches the role and respond with ONLY a JSON object (no markdown, no extra text) in exactly
this shape:

{
  "name": "candidate's full name, or empty string if not found",
  "email": "candidate's email, or empty string if not found",
  "phone": "candidate's phone number, or empty string if not found",
  "matchScore": <integer 0-100, how well this candidate matches the role>,
  "relevant": <true if matchScore >= 50, otherwise false>,
  "summary": "a concise 1-2 sentence summary of why this candidate is or isn't a good fit",
  "skills": ["a short list of up to 8 relevant skills/technologies found in the resume"]
}

Base the score on real evidence in the resume text (matching skills, years of experience,
relevant roles) — do not guess or inflate. If the text does not look like a resume at all,
set matchScore to 0, relevant to false, and explain why in the summary.`;

/**
 * @param {string} jobTitle
 * @param {string} jobRequirements
 * @param {string} resumeText
 * @returns {Promise<object>} parsed screening result
 */
async function screenResume(jobTitle, jobRequirements, resumeText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in the environment');
  }

  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  // Resumes are short; trimming just protects against an unusually large/garbled PDF extract.
  const trimmedResume = resumeText.slice(0, 12000);

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Job Title: ${jobTitle}\n\nJob Requirements:\n${jobRequirements}\n\n---\n\nResume Text:\n${trimmedResume}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Groq API error (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: strip accidental markdown code fences and retry once.
    const cleaned = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  }

  return {
    name: parsed.name || '',
    email: parsed.email || '',
    phone: parsed.phone || '',
    matchScore: Math.max(0, Math.min(100, Number(parsed.matchScore) || 0)),
    relevant: Boolean(parsed.relevant),
    summary: parsed.summary || '',
    skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 8) : [],
  };
}

module.exports = { screenResume };