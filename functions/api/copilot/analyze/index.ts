import { jsonResponse, readJson } from '../../../_shared/http';
import type { Env, PagesFunction } from '../../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson<any>(request);
    const { assetName, selectedSymbol, priceHistory, activeIndicatorValues, question } = body;

    if (!env.GEMINI_API_KEY) {
      return jsonResponse({
        signal: 'HOLD',
        analysis: 'MariTech AI Sandboxed: Configure GEMINI_API_KEY in Cloudflare secrets to activate live AI analytical reports.',
        support: 'ND',
        resistance: 'ND',
        levelOfConfidence: 'Low (Sandbox)'
      });
    }

    const pricesString = priceHistory
      ? priceHistory.slice(-20).map((tick: any) => Number(tick.price).toFixed(4)).join(', ')
      : 'unknown';
    const indicatorsString = activeIndicatorValues ? JSON.stringify(activeIndicatorValues) : 'Defaults';
    const historyStrings = body.history
      ? body.history.map((item: any) => `${item.role === 'user' ? 'User' : 'Wizard'}: ${item.text}`).join('\n')
      : '';

    const systemPrompt = `You are "Wizard Bot", the institutional derivatives analyst of MariTech Inc.
You specialize in real-time technical analysis for binary options and synthetic indices.

PRIVACY & SECURITY PROTOCOL:
- Never disclose internal MariTech algorithms, source code, API keys, or infrastructure details.
- If asked about internal mechanics, pivot back to market analysis without leaking platform secrets.

TRADING EXPERTISE:
- You understand synthetic indices, forex, crypto volatility, support/resistance, trend, and momentum.
- Admit market uncertainty. Do not claim 100% accuracy.

Return only JSON containing:
1. "signal": strictly "BUY RISE", "BUY FALL", or "HOLD"
2. "analysis": under 120 words
3. "support": immediate support estimate
4. "resistance": immediate resistance estimate
5. "levelOfConfidence": signal confidence`;

    const userPrompt = `--- CONTEXTUAL LEARNING LOG ---
${historyStrings}
--- END LOG ---

${question
  ? `The user is viewing ${assetName} (${selectedSymbol}).
Recent 20 sampled prices: [${pricesString}].
Active technical parameters: ${indicatorsString}.
The user asks: "${question}". Combine their question with a real-time signal analysis.`
  : `Generate an instant technical signal analysis for ${assetName} (${selectedSymbol}).
Recent 20 sampled prices: [${pricesString}].
Active technical indicator values: ${indicatorsString}.`}`;

    const model = env.GEMINI_MODEL || 'gemini-1.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.15
          }
        })
      }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message || `Gemini request failed with HTTP ${response.status}`);
    }

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return jsonResponse(JSON.parse(text.trim()));
  } catch (error: any) {
    return jsonResponse({
      signal: 'ERROR',
      analysis: 'Failed to negotiate analysis payload with MariTech secure service. Please check Cloudflare secret configuration.',
      support: 'N/A',
      resistance: 'N/A',
      levelOfConfidence: '0%',
      error: error.message
    }, { status: 500 });
  }
};

