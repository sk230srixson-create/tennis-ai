import { Platform } from 'react-native';

const ANTHROPIC_VERSION = '2023-06-01';
// On web: local dev uses the proxy-server, production (Vercel) uses the serverless API route.
const WEB_ENDPOINT = __DEV__
  ? 'http://localhost:3001/v1/messages'
  : '/api/v1/messages';
const ENDPOINT = Platform.OS === 'web'
  ? WEB_ENDPOINT
  : 'https://api.anthropic.com/v1/messages';

export const CHAT_MODEL = 'claude-haiku-4-5-20251001';
export const VISION_MODEL = 'claude-sonnet-4-6';

export class ClaudeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeError';
  }
}

export async function claudeComplete(
  model: string,
  system: string | null,
  messages: Array<{ role: string; content: any }>,
  maxTokens: number,
): Promise<string> {
  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages };
  if (system) body.system = system;

  const headers: Record<string, string> = {
    'anthropic-version': ANTHROPIC_VERSION,
    'content-type': 'application/json',
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ClaudeError(`Claude APIエラー (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const text: string = (data.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();

  if (!text) throw new ClaudeError('Claude APIからの応答を解析できませんでした。');
  return text;
}

export function buildImageContent(base64Frames: string[], text: string): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = base64Frames.map((data) => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data },
  }));
  blocks.push({ type: 'text', text });
  return blocks;
}
