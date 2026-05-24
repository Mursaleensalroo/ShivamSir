// Vercel Serverless Function — proxies a request to the Groq API.
// Place this file at /api/almanac.js in your Vercel project.
// Set GROQ_API_KEY in Vercel → Project → Settings → Environment Variables.
// Get a free key at https://console.groq.com/keys

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing GROQ_API_KEY' });
  }

  const { field, month, day, seed } = req.body || {};
  if (!field || !month || !day) {
    return res.status(400).json({ error: 'Missing field/month/day' });
  }

  const prompt = buildPrompt(field, month, day, seed);

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an editor who responds with valid JSON only. Never include markdown code fences, never include any text before or after the JSON object.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `Groq API ${r.status}: ${errText.slice(0, 200)}` });
    }

    const data = await r.json();
    const fullText = data?.choices?.[0]?.message?.content || '';

    return res.status(200).json({ text: fullText.trim() });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}

function buildPrompt(field, month, day, seed) {
  return `You are the editor of "The Almanac," a literary daily record of historical lives. Today is ${month} ${day}.

Choose a notable historical figure BORN on ${month} ${day} (any year) whose field is "${field}". They must be well-known enough that you have confident, accurate biographical knowledge of them — prefer figures who are deceased or whose primary work is firmly in the past. Surprise the reader: do not always pick the most obvious name. Random seed: ${seed} — use this to vary your choice.

CRITICAL ACCURACY RULE: only include specifics (dates, places, titles of works, names of collaborators, awards) that you are confident are correct. If uncertain about a detail, omit it or describe it more generally — do not invent. But do NOT fall back to generic platitudes like "endured uncertainty" — instead, name the things you DO know.

Return a JSON object in exactly this shape:

{
  "name": "Full name",
  "descriptor": "One line capturing who they were — specific, not generic. E.g. 'The Bengali polymath who rewrote a nation's idea of itself' rather than 'A great writer'.",
  "birth_year": 1861,
  "death_year": 1941,
  "chapters": [
    { "title": "Specific title anchored in this person's life (4-8 words). NOT 'Origins' or 'Early Life' — use something like 'A House on Jorasanko Street'.", "body": "2-4 sentences with real specifics: places, names, dates, works, particular events." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." }
  ],
  "pullquote": {
    "text": "A striking sentence — real quote (only if you're confident of the wording) or a concrete factual observation.",
    "attribution": "Short context (e.g. 'From a 1912 letter' or 'On winning the Nobel')"
  }
}

Five chapters chronological. Titles specific to this person — anchored in real places, works, events. Bodies must contain concrete specifics. No generic filler. Return ONLY the JSON object, nothing else.`;
}
