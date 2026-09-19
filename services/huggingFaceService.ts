import { Question, Difficulty } from "../types";
import { questionMemory } from './questionMemory';
import { SYSTEM_INSTRUCTION, cleanJsonString, generateImageFromDescription } from './geminiService';
import { getHuggingFaceModel, getHuggingFaceToken } from './aiProvider';

// Hugging Face Inference Providers exposes an OpenAI-compatible chat completions API.
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_PROXY_URL = '/api/hf/chat';
const SERVER_TOKEN_CACHE_KEY = 'HUGGINGFACE_SERVER_TOKEN_AVAILABLE';

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

const isServerTokenCached = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SERVER_TOKEN_CACHE_KEY) === 'true';
};

export const isHuggingFaceAvailable = (): boolean => {
  return !!getHuggingFaceToken() || isServerTokenCached();
};

// Asks the backend whether an HF_TOKEN is configured server-side, so users do not
// have to paste a personal token. Result is cached for the synchronous availability check.
export const probeHuggingFaceServerToken = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/hf/status');
    if (!response.ok) return false;
    const data = await response.json();
    const configured = !!data.configured;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SERVER_TOKEN_CACHE_KEY, configured ? 'true' : 'false');
    }
    return configured;
  } catch (error) {
    console.warn('Hugging Face status probe failed:', error);
    return false;
  }
};

const chatCompletion = async (messages: ChatMessage[], maxTokens = 8192): Promise<string> => {
  const token = getHuggingFaceToken();
  const payload = {
    model: getHuggingFaceModel(),
    messages,
    max_tokens: maxTokens,
    temperature: 0.7
  };

  // A token pasted in Settings is used directly from the browser; otherwise the
  // request goes through the backend proxy, which holds the HF_TOKEN.
  const response = token
    ? await fetch(HF_ROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    : await fetch(HF_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

  if (!response.ok) {
    const details = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Hugging Face token. Check your token in Settings.');
    }
    if (response.status === 429) {
      throw new Error('Hugging Face rate limit or credits exhausted. Try again later or switch model.');
    }
    if (response.status === 501) {
      throw new Error('Hugging Face is not configured. Add a token in Settings or set HF_TOKEN on the server.');
    }
    throw new Error(`Hugging Face request failed (${response.status}): ${details}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Hugging Face returned an empty response.');
  return content;
};

const QUESTION_JSON_CONTRACT = `
Return ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "questions": [
    {
      "text": string,
      "type": "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "options": string[],
      "correctAnswer": string,
      "marks": number,
      "bloomLevel": string,
      "courseOutcome": string,
      "alternativeText": string,
      "alternativeAnswer": string,
      "section": string,
      "sectionTitle": string,
      "hasImage": boolean,
      "imageDescription": string
    }
  ]
}
"options" must be empty for non-MCQ questions. "alternativeText" and "alternativeAnswer" are required for LONG_ANSWER questions.
`;

export const generateQuestionsFromPrompt = async (
  promptText: string,
  count: number = 5,
  difficulty: Difficulty = Difficulty.MEDIUM,
  targetTotalMarks?: number,
  _templateFile?: string,
  _templateMimeType?: string,
  counts?: { mcqCount: number; shortCount: number; longCount: number },
  subjectName?: string,
  coInstructions?: string
): Promise<Question[]> => {
  if (!isHuggingFaceAvailable()) {
    throw new Error('Hugging Face is not configured. Add a token in Settings or set HF_TOKEN on the server.');
  }

  if (_templateFile) {
    console.warn('Template documents are not sent to Hugging Face text models; only textual instructions are used.');
  }

  const avoidanceContext = questionMemory.getAvoidanceContext(subjectName || promptText);

  const userPrompt = `
Generate a high-quality college-level examination paper.

TOPIC/CONTEXT: "${promptText}"
DIFFICULTY: ${difficulty}
SUBJECT: ${subjectName || 'General'}

${counts
  ? `You MUST generate exactly:
- ${counts.mcqCount} Multiple Choice Questions (MCQ)
- ${counts.shortCount} Short Answer Questions
- ${counts.longCount} Long Answer Questions`
  : `TOTAL QUESTIONS: ${count}`}

${avoidanceContext}

CONSTRAINTS:
1. Marks: ${targetTotalMarks
    ? `The sum of marks for all questions MUST be exactly ${targetTotalMarks}.`
    : 'MCQ = 0.5 marks, SHORT_ANSWER = 2 marks, LONG_ANSWER = 7 marks.'}
2. Order the "questions" array by type: all MCQ first, then SHORT_ANSWER, then LONG_ANSWER.
3. Every question needs a correct answer, a Bloom's Taxonomy level and a Course Outcome (CO1..CO5).
4. For LONG_ANSWER questions, "alternativeText" is the 'OR' variant and must never be empty.
5. Mark at least 2 questions with "hasImage": true and give a specific "imageDescription" for a diagram, graph, circuit or table.
${coInstructions ? coInstructions : ''}

${QUESTION_JSON_CONTRACT}
`;

  const rawContent = await chatCompletion([
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user', content: userPrompt }
  ], 16384);

  let data: any;
  try {
    data = JSON.parse(cleanJsonString(rawContent));
  } catch (error) {
    console.error('Failed to parse Hugging Face response:', rawContent);
    throw new Error('Invalid response from the Hugging Face model. Please try again or pick another model.');
  }

  const rawQuestions = (data.questions || []).filter((q: any) => q && q.text && q.type);

  return Promise.all(rawQuestions.map(async (q: any, index: number) => {
    let imageUrl = q.imageUrl;
    if (q.hasImage && q.imageDescription && !imageUrl) {
      try {
        imageUrl = await generateImageFromDescription(q.imageDescription);
      } catch (error) {
        console.error('Failed to generate image for question:', error);
        imageUrl = null;
      }
    }

    return {
      ...q,
      id: `hf-${Date.now()}-${index}`,
      options: q.options || [],
      imageUrl
    };
  }));
};

export const analyzeCurriculum = async (curriculumText: string): Promise<string[]> => {
  if (!isHuggingFaceAvailable()) {
    return ["Introduction to AI", "Neural Networks", "Ethics in Computing"];
  }

  try {
    const content = await chatCompletion([
      { role: 'system', content: 'You extract exam-relevant topics from curriculum text.' },
      {
        role: 'user',
        content: `Extract the main 5 topics from this curriculum text and return ONLY JSON of the form {"topics": string[]}.\n\n${curriculumText.substring(0, 2000)}`
      }
    ], 1024);

    const data = JSON.parse(cleanJsonString(content));
    return data.topics || [];
  } catch (error) {
    console.error('Hugging Face topic extraction failed:', error);
    return ["Introduction to AI", "Neural Networks", "Ethics in Computing"];
  }
};
