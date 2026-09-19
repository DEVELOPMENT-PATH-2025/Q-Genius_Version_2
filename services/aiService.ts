import { Question, Difficulty } from "../types";
import * as gemini from './geminiService';
import * as huggingFace from './huggingFaceService';
import { getAIProvider } from './aiProvider';

export * from './aiProvider';
export { probeHuggingFaceServerToken } from './huggingFaceService';

// Provider-agnostic helpers (no model call involved).
export {
  extractTextFromPDF,
  extractTextFromWord,
  extractTextFromExcel,
  addQuestionsToMemory,
  resetApiCallCounter,
  getApiCallCount,
  reinitializeAI,
  getAIInstance,
  generateImageFromDescription
} from './geminiService';

export const isAIAvailable = (): boolean =>
  getAIProvider() === 'huggingface'
    ? huggingFace.isHuggingFaceAvailable()
    : gemini.isAIAvailable();

export const generateQuestionsFromPrompt = (
  promptText: string,
  count?: number,
  difficulty?: Difficulty,
  targetTotalMarks?: number,
  templateFile?: string,
  templateMimeType?: string,
  counts?: { mcqCount: number; shortCount: number; longCount: number },
  subjectName?: string,
  coInstructions?: string
): Promise<Question[]> =>
  getAIProvider() === 'huggingface'
    ? huggingFace.generateQuestionsFromPrompt(promptText, count, difficulty, targetTotalMarks, templateFile, templateMimeType, counts, subjectName, coInstructions)
    : gemini.generateQuestionsFromPrompt(promptText, count, difficulty, targetTotalMarks, templateFile, templateMimeType, counts, subjectName, coInstructions);

export const analyzeCurriculum = (curriculumText: string): Promise<string[]> =>
  getAIProvider() === 'huggingface'
    ? huggingFace.analyzeCurriculum(curriculumText)
    : gemini.analyzeCurriculum(curriculumText);

// Document understanding still requires Gemini's multimodal input.
const requireGemini = (feature: string) => {
  if (getAIProvider() === 'huggingface') {
    throw new Error(`${feature} needs the Gemini provider. Switch the AI provider back to Gemini in Settings.`);
  }
};

export const analyzePaperTemplate = (
  fileData: string,
  mimeType: string
): Promise<{ mcqCount: number; shortCount: number; longCount: number }> => {
  requireGemini('Template analysis');
  return gemini.analyzePaperTemplate(fileData, mimeType);
};

export const extractQuestionsFromFile = (
  fileData: string,
  mimeType: string,
  counts?: { mcqCount: number; shortCount: number; longCount: number },
  coInstructions?: string
): Promise<{ questions: Question[], metadata?: any }> => {
  requireGemini('Question extraction from documents');
  return gemini.extractQuestionsFromFile(fileData, mimeType, counts, coInstructions);
};
