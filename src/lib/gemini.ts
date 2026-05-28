import { GoogleGenerativeAI, type ChatSession } from '@google/generative-ai';

export const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
] as const;

type GeminiOptions = {
  apiKey: string;
  systemPrompt: string;
  preferredModel?: string;
};

const clientCache = new Map<string, GoogleGenerativeAI>();
const chatCache = new Map<string, ChatSession>();

function getClient(apiKey: string): GoogleGenerativeAI {
  const cached = clientCache.get(apiKey);

  if (cached) {
    return cached;
  }

  const client = new GoogleGenerativeAI(apiKey);
  clientCache.set(apiKey, client);
  return client;
}

function chatCacheKey(apiKey: string, modelName: string, systemPrompt: string): string {
  return `${apiKey}::${modelName}::${systemPrompt}`;
}

function getChat(apiKey: string, modelName: string, systemPrompt: string): ChatSession {
  const key = chatCacheKey(apiKey, modelName, systemPrompt);
  const cached = chatCache.get(key);

  if (cached) {
    return cached;
  }

  const model = getClient(apiKey).getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({ history: [] });
  chatCache.set(key, chat);

  return chat;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableModelError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /429|quota|rate limit|resource exhausted|model/i.test(error.message);
}

function getModelList(preferredModel?: string): string[] {
  if (!preferredModel) {
    return [...MODEL_CANDIDATES];
  }

  return [preferredModel, ...MODEL_CANDIDATES.filter((model) => model !== preferredModel)];
}

async function sendWithBackoff(chat: ChatSession, prompt: string): Promise<string> {
  const delays = [700, 1400];

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      const result = await chat.sendMessage(prompt);
      return result.response.text().trim();
    } catch (error) {
      if (!isRetryableModelError(error) || attempt === delays.length) {
        throw error;
      }

      await sleep(delays[attempt]);
    }
  }

  throw new Error('Gemini request failed after backoff.');
}

export async function askGemini(prompt: string, options: GeminiOptions): Promise<string> {
  let lastError: unknown;

  for (const modelName of getModelList(options.preferredModel)) {
    try {
      const chat = getChat(options.apiKey, modelName, options.systemPrompt);
      return await sendWithBackoff(chat, prompt);
    } catch (error) {
      lastError = error;

      if (!isRetryableModelError(error)) {
        throw error;
      }

      const cacheKey = chatCacheKey(options.apiKey, modelName, options.systemPrompt);
      chatCache.delete(cacheKey);
    }
  }

  throw lastError instanceof Error
    ? new Error(`Gemini is unavailable right now: ${lastError.message}`)
    : new Error('Gemini is unavailable right now.');
}

export async function* askGeminiStream(
  prompt: string,
  options: GeminiOptions,
): AsyncGenerator<string, void, void> {
  type StreamChunk = { text: () => string };
  type StreamResult = { stream: AsyncIterable<StreamChunk> };
  type StreamChat = { sendMessageStream: (value: string) => Promise<StreamResult> };

  for (const modelName of getModelList(options.preferredModel)) {
    try {
      const chat = getChat(options.apiKey, modelName, options.systemPrompt);
      const result = await (chat as StreamChat).sendMessageStream(prompt);
      for await (const chunk of result.stream) {
        yield chunk.text();
      }
      return;
    } catch (error) {
      if (!isRetryableModelError(error)) {
        throw error;
      }
    }
  }

  throw new Error('Gemini streaming is unavailable right now.');
}