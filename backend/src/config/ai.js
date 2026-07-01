export function getAiMode() {
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'demo';
}

export function getAiModeLabel() {
  const labels = { claude: 'Claude  ', openai: 'OpenAI  ', demo: 'Demo    ' };
  return labels[getAiMode()];
}
