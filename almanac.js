// Netlify Function — proxies a request to the Anthropic API.
// Place at /netlify/functions/almanac.js in your project.
// Set ANTHROPIC_API_KEY in Netlify → Site → Site configuration → Environment variables.

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server missing ANTHROPIC_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { field, month, day, seed } = body || {};
  if (!field || !month || !day) {
    return new Response(JSON.stringify({ error: 'Missing field/month/day' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const prompt = buildPrompt(field, month, day, seed);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: `Anthropic API ${r.status}: ${errText.slice(0, 200)}` }),
        { status: r.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await r.json();
    const fullText = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    return new Response(JSON.stringify({ text: fullText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/almanac' };

function buildPrompt(field, month, day, seed) {
  return `You are the editor of "The Almanac," a literary daily record of historical lives. Today is ${month} ${day}.

Choose a notable historical figure BORN on ${month} ${day} (any year) whose field is "${field}". They must be well-known enough that you have confident, accurate biographical knowledge of them — prefer figures who are deceased or whose primary work is firmly in the past. Surprise the reader: do not always pick the most obvious name. Random seed: ${seed} — use this to vary your choice.

CRITICAL ACCURACY RULE: only include specifics (dates, places, titles of works, names of collaborators, awards) that you are confident are correct. If uncertain about a detail, omit it or describe it more generally — do not invent. But do NOT fall back to generic platitudes like "endured uncertainty" — instead, name the things you DO know.

Return ONLY a JSON object — no preamble, no markdown fences — in this exact shape:

{
  "name": "Full name",
  "descriptor": "One line capturing who they were — specific, not generic.",
  "birth_year": 1861,
  "death_year": 1941,
  "chapters": [
    { "title": "Specific title anchored in this person's life (4-8 words)", "body": "2-4 sentences with real specifics." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." }
  ],
  "pullquote": {
    "text": "A striking sentence — real quote or concrete factual observation.",
    "attribution": "Short context"
  }
}

Five chapters chronological. Titles specific to this person — anchored in real places, works, events. Bodies must contain concrete specifics. No generic filler.

Return ONLY the JSON.`;
}
