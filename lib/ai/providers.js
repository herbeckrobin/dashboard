const MAX_TOKENS = 16384
const TIMEOUT_MS = 180000

// Modelle pro Provider: id, label, Preise pro Million Tokens
const AI_MODELS = {
  anthropic: [
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', cost: '~$0.005', inputPricePerM: 1, outputPricePerM: 5 },
    { id: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5', cost: '~$0.05', inputPricePerM: 3, outputPricePerM: 15 },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: '~$0.005', inputPricePerM: 0.15, outputPricePerM: 0.60 },
    { id: 'gpt-4o', label: 'GPT-4o', cost: '~$0.05', inputPricePerM: 2.50, outputPricePerM: 10 },
  ],
}

const PROVIDERS = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (systemPrompt, userPrompt, model) => ({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    parseResponse: (data) => {
      if (data.error) throw new Error(data.error.message || 'AI API Fehler')
      const text = data.content?.[0]?.text
      if (!text) throw new Error('Leere AI-Antwort')
      return text
    },
    parseUsage: (data) => ({
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    }),
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (systemPrompt, userPrompt, model) => ({
      model,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    parseResponse: (data) => {
      if (data.error) throw new Error(data.error.message || 'AI API Fehler')
      const text = data.choices?.[0]?.message?.content
      if (!text) throw new Error('Leere AI-Antwort')
      return text
    },
    parseUsage: (data) => ({
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    }),
  },
}

// Kosten berechnen aus Token-Usage
function calculateCost(usage, modelId, provider) {
  if (!usage || (!usage.inputTokens && !usage.outputTokens)) return 0
  const models = AI_MODELS[provider]
  const model = models?.find(m => m.id === modelId)
  if (!model) return 0
  const inputCost = (usage.inputTokens / 1_000_000) * model.inputPricePerM
  const outputCost = (usage.outputTokens / 1_000_000) * model.outputPricePerM
  return Math.round((inputCost + outputCost) * 10000) / 10000 // 4 Dezimalstellen
}

export { AI_MODELS, PROVIDERS, MAX_TOKENS, TIMEOUT_MS, calculateCost }
