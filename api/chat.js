/**
 * Vercel Serverless Function: Nova AI Copilot with Google Gemini 3.8 Flash
 * 
 * Flow: Ask -> Help -> Question -> Plan -> Execute
 * Output Schema: { stage, speech, text, plan, needs_confirmation }
 */

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

const SYSTEM_INSTRUCTION = `You are Nova-Orchestrator, an Autonomous Fleet SRE Copilot and Cloud Infrastructure Orchestrator managing a dual-engine architecture:
- Chef Client (Ruby, Pull model, HTTPS port 443, idempotent converging)
- SaltStack Minions (YAML/Python, Push model, ZeroMQ ports 4505/4506, event-driven state execution)

Fleet Nodes:
1. prod-web-01 (Ubuntu 22.04, webserver, managed by Chef)
2. prod-app-01 (Ubuntu 22.04, appserver, managed by Chef + Salt)
3. prod-db-01 (Debian 12, database, managed by SaltStack)
4. prod-mon-01 (Ubuntu 22.04, monitoring, managed by SaltStack)
5. stg-app-01 (Ubuntu 22.04, appserver, staging, managed by Chef + Salt)
6. dev-all-in-one (Debian 12 / Docker, development, managed by Chef + Salt)

Chef Cookbooks Available:
- app_server (FastAPI systemd deployment)
- nginx (Reverse proxy and TLS)
- postgresql (PostgreSQL 15 installation & config)
- monitoring (Prometheus and Node Exporter)

Salt States Available:
- top.sls, common.sls, app_server.sls, nginx.sls, postgresql.sls, monitoring.sls

Lifecycle Stages:
- Ask: User asks a question or initiates interaction.
- Help: Providing architectural explanation, diagnosis, or status advice.
- Question: Asking clarifying questions before generating a high-impact plan.
- Plan: Generating an actionable orchestration plan for deployment or remediation.
- Execute: Requesting confirmation or launching deployment.

CRITICAL INSTRUCTION: You MUST return a VALID JSON object (and NOTHING ELSE) matching this exact schema:
{
  "stage": "Ask" | "Help" | "Question" | "Plan" | "Execute",
  "speech": "Brief 1-2 sentence spoken summary for voice mode (no markdown or special symbols).",
  "text": "Complete markdown-formatted response for the operator display.",
  "plan": null or {
    "name": "Deployment Title",
    "description": "Short explanation",
    "environment": "production" | "staging" | "development",
    "tool": "chef" | "salt" | "both",
    "target_hosts": "node names or pattern like prod-web-01 or *",
    "chef_runlist": "recipe[nginx::default] or null",
    "salt_states": "common, postgresql or null"
  },
  "needs_confirmation": boolean
}

Rules:
- If asked to deploy, roll out, update, or remediate infrastructure, generate a Plan stage with a non-null plan object and set needs_confirmation to true.
- If target environment is "production", needs_confirmation must always be true.
- Keep the "speech" attribute concise (under 25 words) so voice mode speaks promptly.
- Never include backticks or markdown fences in the "speech" property.`;

export default async function handler(req, res) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', status: 405 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0 || apiKey === 'your_gemini_api_key_here') {
    console.error('[Nova API] GEMINI_API_KEY environment variable is missing or empty.');
    return res.status(401).json({
      error: 'AI key missing',
      status: 401,
      detail: 'GEMINI_API_KEY is not configured in Vercel environment variables.'
    });
  }

  const body = req.body || {};
  const prompt = (body.prompt || body.message || '').trim();
  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const fleetContext = body.fleetContext || body.context || {};

  if (!prompt) {
    return res.status(400).json({
      error: 'Invalid Request',
      status: 400,
      detail: 'Prompt field is required.'
    });
  }

  // Format contents for Gemini API
  const contents = [];

  // Add recent chat history if present
  for (const msg of history) {
    if (msg.role === 'user' || msg.sender === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: msg.text || msg.content || '' }]
      });
    } else if (msg.role === 'model' || msg.sender === 'agent' || msg.role === 'assistant') {
      contents.push({
        role: 'model',
        parts: [{ text: msg.text || msg.content || '' }]
      });
    }
  }

  // Append current prompt with fleet telemetry context
  let finalPrompt = prompt;
  if (fleetContext && Object.keys(fleetContext).length > 0) {
    finalPrompt += `\n\n[Active Cluster Telemetry]: ${JSON.stringify(fleetContext)}`;
  }

  contents.push({
    role: 'user',
    parts: [{ text: finalPrompt }]
  });

  // Setup abort timeout for ~20s
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const payload = {
      contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1200
      }
    };

    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (_) {
        errorData = { raw: await response.text() };
      }
      console.error('[Nova API] Gemini 3.8 Flash API error:', response.status, errorData);
      const errorMsg = errorData?.error?.message || `Google API returned status ${response.status}`;
      return res.status(response.status).json({
        error: errorMsg,
        status: response.status,
        detail: errorData
      });
    }

    const data = await response.json();
    const rawCandidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip code fences and parse JSON safely
    let cleanJson = rawCandidateText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedResult = null;
    try {
      parsedResult = JSON.parse(cleanJson);
    } catch (_) {
      // Safe fallback if model didn't return valid JSON
      parsedResult = {
        stage: 'Help',
        speech: rawCandidateText.slice(0, 120).replace(/[*#`_~]/g, ''),
        text: rawCandidateText,
        plan: null,
        needs_confirmation: false
      };
    }

    // Ensure all required fields exist
    const output = {
      stage: parsedResult.stage || 'Help',
      speech: (parsedResult.speech || parsedResult.text || '').slice(0, 200).replace(/[*#`_~]/g, ''),
      text: parsedResult.text || rawCandidateText,
      plan: parsedResult.plan || null,
      needs_confirmation: Boolean(parsedResult.needs_confirmation),
      model: 'gemini-3.8-flash'
    };

    return res.status(200).json(output);

  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[Nova API] Communication failure:', err.name === 'AbortError' ? 'Timeout 20s' : err.message);
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Gateway Timeout',
        status: 504,
        detail: 'Gemini API call timed out after 20 seconds.'
      });
    }
    return res.status(500).json({
      error: err.message || 'Internal Server Error',
      status: 500,
      detail: err.stack || String(err)
    });
  }
}
