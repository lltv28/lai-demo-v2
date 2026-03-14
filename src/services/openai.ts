const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT: ChatMessage = {
  role: 'system',
  content:
    'You are Lucas AI, an expert competitor ad research assistant. You help users analyze competitor Facebook ads, identify creative patterns, and generate new ad concepts. Keep your responses clear and actionable.',
};

function getApiKey(): string {
  const key = OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'OpenAI API key is not configured. Add VITE_OPENAI_API_KEY to your .env file. See .env.example for details.',
    );
  }
  return key;
}

export async function* streamChat(
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const apiKey = getApiKey();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [SYSTEM_PROMPT, ...messages],
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `OpenAI API error ${response.status}`;
    if (response.status === 401) {
      message = 'Invalid or expired API key. Check your VITE_OPENAI_API_KEY in .env.';
    } else if (response.status === 429) {
      message = 'Rate limit exceeded. Please try again later.';
    } else if (errorBody) {
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        message = `${message}: ${errorBody.slice(0, 200)}`;
      }
    }
    throw new Error(message);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip malformed chunks
      }
    }
  }
}
