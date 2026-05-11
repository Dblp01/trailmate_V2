exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };
  try {
    const { messages, system, max_tokens } = JSON.parse(event.body);
    if (process.env.OPENAI_API_KEY) {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-5',
          instructions: system || '',
          input: (messages || []).map(m => `${String(m.role || 'user').toUpperCase()}: ${m.content || ''}`).join('\n\n'),
          max_output_tokens: max_tokens || 3000,
          store: false
        })
      });
      const data = await res.json();
      const text = extractOpenAIText(data);
      return {
        statusCode: res.status,
        headers,
        body: JSON.stringify(res.ok ? {
          provider: 'openai',
          model: data.model,
          content: [{ type: 'text', text }]
        } : data)
      };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: { message: 'Ajoute OPENAI_API_KEY dans Netlify. Sinon ANTHROPIC_API_KEY peut aussi fonctionner.' } })
      };
    }
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: max_tokens || 2000,
        system,
        messages
      })
    });
    const data = await res.json();
    return { statusCode: res.status, headers, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: { message: e.message } }) };
  }
};

function extractOpenAIText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}
