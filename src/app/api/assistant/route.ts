import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getServerEnv } from '@/config/env';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { hashIp } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/lib/turnstile';
import { askLocalFallback, buildAssistantSystemPrompt } from '@/lib/anthropic/assistant';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(1200),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
});

export async function POST(req: NextRequest) {
  const originCheck = assertSameOrigin(req);
  if (!originCheck.ok) return originCheck.response;

  const env = getServerEnv();
  const ipHash = hashIp(extractClientIp(req)) ?? 'anon';

  const rl = checkRateLimit(`assistant:${ipHash}`, env.ASSISTANT_RATE_LIMIT_PER_HOUR, 3600_000);
  if (!rl.allowed) {
    return apiError(
      'RATE_LIMITED',
      'Too many assistant requests. Please try again later.',
      429,
      undefined,
      { 'Retry-After': String(rl.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON request body.', 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Please send a valid message under 600–1200 characters.',
      400,
    );
  }

  const messages = parsed.data.messages;
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  if (!env.ANTHROPIC_API_KEY) {
    return apiOk({
      reply: askLocalFallback(lastUserMsg),
      source: 'local',
    });
  }

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 600,
      system: buildAssistantSystemPrompt(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return apiOk({
      reply: text || askLocalFallback(lastUserMsg),
      source: 'anthropic',
    });
  } catch (err) {
    console.error('[assistant] Anthropic API error, falling back cleanly:', err);
    return apiOk({
      reply: askLocalFallback(lastUserMsg),
      source: 'fallback',
    });
  }
}

