export type AIProvider = 'gemini' | 'huggingface';

export const AI_PROVIDER_STORAGE_KEY = 'AI_PROVIDER';
export const HF_TOKEN_STORAGE_KEY = 'HUGGINGFACE_API_TOKEN';
export const HF_MODEL_STORAGE_KEY = 'HUGGINGFACE_MODEL';

// Open-weights model served through Hugging Face Inference Providers.
export const DEFAULT_HF_MODEL = 'openai/gpt-oss-120b';

export const SUGGESTED_HF_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'meta-llama/Llama-3.3-70B-Instruct',
  'Qwen/Qwen2.5-72B-Instruct',
  'mistralai/Mistral-Small-24B-Instruct-2501'
];

export const getAIProvider = (): AIProvider => {
  if (typeof window === 'undefined') return 'gemini';
  return localStorage.getItem(AI_PROVIDER_STORAGE_KEY) === 'huggingface' ? 'huggingface' : 'gemini';
};

export const setAIProvider = (provider: AIProvider): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider);
};

export const getHuggingFaceToken = (): string => {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem(HF_TOKEN_STORAGE_KEY) || '').trim();
};

export const setHuggingFaceToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  if (token.trim()) {
    localStorage.setItem(HF_TOKEN_STORAGE_KEY, token.trim());
  } else {
    localStorage.removeItem(HF_TOKEN_STORAGE_KEY);
  }
};

export const getHuggingFaceModel = (): string => {
  if (typeof window === 'undefined') return DEFAULT_HF_MODEL;
  return (localStorage.getItem(HF_MODEL_STORAGE_KEY) || '').trim() || DEFAULT_HF_MODEL;
};

export const setHuggingFaceModel = (model: string): void => {
  if (typeof window === 'undefined') return;
  if (model.trim()) {
    localStorage.setItem(HF_MODEL_STORAGE_KEY, model.trim());
  } else {
    localStorage.removeItem(HF_MODEL_STORAGE_KEY);
  }
};
