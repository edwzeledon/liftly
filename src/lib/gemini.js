const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
const FALLBACK_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

export function buildGeminiGenerateContentUrl(apiKey, model = getGeminiModel()) {
  return `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`;
}

export async function generateGeminiContent(apiKey, contents, options = {}) {
  const { retries = 3, backoff = 1000 } = options;
  const primaryModel = getGeminiModel();
  const models = [primaryModel, FALLBACK_GEMINI_MODEL];
  
  let lastError = null;

  for (const model of models) {
    let currentRetries = retries;
    let currentBackoff = backoff;

    while (currentRetries >= 0) {
      try {
        const url = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          let message = response.statusText;

          try {
            const parsed = JSON.parse(errorBody);
            message = parsed?.error?.message || message;
          } catch {
            message = errorBody || message;
          }

          // 429 = rate limit, 500+ = server error; both are retryable
          if (response.status === 429 || response.status >= 500) {
            const error = new Error(`[${model}] API Error: ${message}`);
            error.retryable = true;
            error.model = model;
            throw error;
          }

          // 400, 401, 403 are not retryable
          const error = new Error(`[${model}] API Error: ${message}`);
          error.retryable = false;
          error.model = model;
          throw error;
        }

        return { response, model };
      } catch (error) {
        lastError = error;

        // If not retryable or no retries left, try next model
        if (!error.retryable || currentRetries === 0) {
          break;
        }

        // Retry with backoff
        await new Promise(r => setTimeout(r, currentBackoff));
        currentBackoff *= 2;
        currentRetries--;
      }
    }
  }

  // All models and retries exhausted
  throw lastError || new Error('Failed to generate Gemini content');
}