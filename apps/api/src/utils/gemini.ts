import { GoogleGenerativeAI } from '@google/generative-ai';
import type { QuizQuestion, CreateQuizRequest } from '@repo/types';

// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI('AIzaSyAL4-yGFugM7umENWiIiMePh6w0-pzYFow');

// Try different models in order of preference - starting with working model
const modelNames = [
  'gemini-2.5-flash',    // Previously working model
  'gemini-1.5-flash',    // Fallback 1
  'gemini-1.5-pro',      // Fallback 2
  'gemini-pro'           // Legacy fallback
];

let model: any;
let currentModel = '';

// Function to create model with fallback
function createModel(modelName: string) {
  return genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4000,
      // Force JSON responses to simplify parsing
      responseMimeType: 'application/json',
    },
  });
}

// Utility: extract JSON from model text output robustly
function extractJsonBlock(text: string): string | null {
  // Prefer fenced code blocks with json
  const codeBlock = text.match(/```json[\s\S]*?```/i) || text.match(/```[\s\S]*?```/);
  if (codeBlock) {
    const inner = codeBlock[0].replace(/```json/i, '```').replace(/```/g, '').trim();
    return inner;
  }
  return null;
}

// Balanced extractor that respects quotes/escapes
function extractBalancedStructure(text: string): string | null {
  const openers = ['{', '['] as const;
  const closers: Record<string, string> = { '{': '}', '[': ']' };
  const startIdx = text.search(/\{|\[/);
  if (startIdx === -1) return null;
  const opener = text[startIdx] as '{' | '[';
  const closer = closers[opener];
  let depth = 0;
  let inString = false;
  let stringQuote: '"' | "'" | null = null;
  let escaped = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === stringQuote) {
        inString = false;
        stringQuote = null;
      }
      continue;
    } else {
      if (ch === '"' || ch === "'") {
        inString = true;
        stringQuote = ch as '"' | "'";
        continue;
      }
      if (ch === opener) depth++;
      if (ch === closer) depth--;
      if (depth === 0) {
        return text.slice(startIdx, i + 1);
      }
    }
  }
  return null; // not balanced
}

function sanitizeJsonString(raw: string): string {
  let s = raw.trim();
  // Replace smart quotes with standard
  s = s.replace(/[\u2018\u2019\u201A\u201B]/g, "'").replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  // Remove control chars not allowed in JSON (keep \n, \r, \t)
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  // Remove trailing commas before ] or }
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

function safeParseJson(text: string): any {
  // 1) Try fenced code block first
  let block = extractJsonBlock(text);
  // 2) Try balanced structure if needed
  if (!block) block = extractBalancedStructure(text);
  // 3) Fallback: naive first object/array
  if (!block) block = (text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/))?.[0] || null;
  if (!block) throw new Error('Failed to extract JSON from Gemini response');
  try {
    return JSON.parse(block);
  } catch {
    const cleaned = sanitizeJsonString(block);
    return JSON.parse(cleaned);
  }
}

function stripCodeFences(text: string): string {
  const m = text.match(/```(?:json)?([\s\s]*?)```/i);
  return m?.[1]?.trim() ?? text.trim();
}

// Initialize with the first available model
async function initializeModel() {
  for (const modelName of modelNames) {
    try {
      console.log(`🔍 Trying to initialize model: ${modelName}`);
      const testModel = createModel(modelName);
      
      // Test the model with a simple request
      const testResult = await testModel.generateContent("Hi");
      await testResult.response;
      
      model = testModel;
      currentModel = modelName;
      console.log(`✅ Successfully initialized model: ${modelName}`);
      return;
    } catch (error) {
      console.log(`❌ Model ${modelName} failed initialization:`, error instanceof Error ? error.message : error);
    }
  }
  
  // If all models fail, use gemini-pro as last resort without testing
  console.log('⚠️ All preferred models failed, using gemini-pro as fallback');
  model = createModel('gemini-pro');
  currentModel = 'gemini-pro';
}

// Initialize model on startup
initializeModel().catch(error => {
  console.error('❌ Failed to initialize any Gemini model:', error);
  // Still set a model so the app doesn't crash
  model = createModel('gemini-pro');
  currentModel = 'gemini-pro';
});

// Rate limiting configuration
interface RateLimiter {
  requests: number;
  windowStart: number;
  maxRequests: number;
  windowMs: number;
}

// Adjust rate limits based on model - more lenient for better user experience
function getModelRateLimit(modelName: string): number {
  if (modelName.includes('2.5-flash')) return 20; // More lenient for 2.5 Flash
  if (modelName.includes('1.5-pro')) return 5;   // More lenient for 1.5 Pro
  if (modelName.includes('1.5-flash')) return 25; // More lenient for 1.5 Flash
  return 10; // More lenient default
}

const rateLimiter: RateLimiter = {
  requests: 0,
  windowStart: Date.now(),
  maxRequests: getModelRateLimit(currentModel),
  windowMs: 60000, // 1 minute
};

// Function to check and enforce rate limits
function checkRateLimit(): boolean {
  const now = Date.now();
  
  // Reset window if it has passed
  if (now - rateLimiter.windowStart >= rateLimiter.windowMs) {
    rateLimiter.requests = 0;
    rateLimiter.windowStart = now;
  }
  
  // Check if we're within limits
  if (rateLimiter.requests >= rateLimiter.maxRequests) {
    return false;
  }
  
  rateLimiter.requests++;
  return true;
}

// Function to wait until rate limit resets
function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const waitTime = rateLimiter.windowMs - (now - rateLimiter.windowStart);
  
  if (waitTime > 0) {
    console.log(`⏳ Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
    return new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  return Promise.resolve();
}

// Exponential backoff for retries with model fallback - more patient approach
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 5): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limit before making request
      if (!checkRateLimit()) {
        await waitForRateLimit();
      }
      
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`❌ API call failed (attempt ${attempt}/${maxRetries}):`, error);
      
      // If it's a model-specific error and we can try a fallback model
      if (attempt === 1 && currentModel !== 'gemini-pro' && 
          (error instanceof Error && (error.message.includes('503') || error.message.includes('unavailable')))) {
        console.log(`🔄 Trying fallback model: gemini-pro`);
        try {
          model = createModel('gemini-pro');
          currentModel = 'gemini-pro';
          rateLimiter.maxRequests = getModelRateLimit(currentModel);
          console.log(`✅ Switched to fallback model: ${currentModel}`);
          // Don't increment attempt counter for model switch
          attempt--;
          continue;
        } catch (fallbackError) {
          console.log(`❌ Fallback model also failed:`, fallbackError);
        }
      }
      
      // If it's a rate limit error, wait and retry
      if (error instanceof Error && error.message.includes('429')) {
        const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`🔄 Rate limited, retrying in ${backoffTime}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        continue;
      }
      
      // If it's not a rate limit error and we're not on the last attempt, retry with longer backoff
      if (attempt < maxRetries) {
        const backoffTime = Math.min(Math.pow(2, attempt) * 2000, 30000); // Max 30 seconds backoff
        console.log(`🔄 Request failed, retrying in ${Math.ceil(backoffTime/1000)}s (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError!;
}

// Model initialization status
let isGeminiAvailable = true;

export interface GeminiQuizResponse {
  questions: QuizQuestion[];
}

export interface GeminiTutorResponse {
  response: string;
  suggestions?: string[];
}

/**
 * Generate quiz questions using Gemini AI
 */
export async function generateQuiz(request: CreateQuizRequest): Promise<GeminiQuizResponse> {
  try {
    console.log(`🎯 Generating quiz with model: ${currentModel}`);
    
    // Safety check - ensure model is initialized
    if (!model) {
      console.log('⚠️ Model not initialized, attempting to initialize...');
      await initializeModel();
      if (!model) {
        throw new Error('Failed to initialize Gemini model');
      }
    }
    const { subject, title, description, difficulty = 'medium', questionCount = 10, topics = [] } = request;
    
    const basePrompt = `
Generate ${questionCount} multiple-choice quiz questions for the following specifications:

Subject: ${subject}
Title: ${title}
${description ? `Description: ${description}` : ''}
Difficulty Level: ${difficulty}
${topics.length > 0 ? `Topics to focus on: ${topics.join(', ')}` : ''}

Requirements:
1. Each question must have exactly 4 options (A, B, C, D)
2. Questions should be at ${difficulty} difficulty level
3. Include a mix of conceptual and practical questions
4. Make sure the correct answer is clearly identifiable
5. Options should be plausible but only one should be correct
6. Questions should be educational and relevant to ${subject}

Please respond with a JSON object in this exact format:
{
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["London", "Berlin", "Paris", "Madrid"],
      "correctAnswer": 2,
      "difficulty": "${difficulty}"
    }
  ]
}

The correctAnswer field should be the index (0-based) of the correct option in the options array.
Ensure the JSON is valid and properly formatted.
`;

    // Helper to call the model and robustly parse
    const callAndParse = async (promptText: string) => {
      const result = await withRetry(() => model.generateContent(promptText)) as any;
      const response = await result.response;
      const text = response.text();
      let parsed: any;
      try {
        parsed = safeParseJson(text);
      } catch (e) {
        console.warn('⚠️ Gemini quiz raw output (first 400 chars):', text.slice(0, 400));
        // Try a last-ditch sanitization and parse
        const cleaned = sanitizeJsonString(text);
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          // As an extra fallback, try to slice between first { and last }
          const s = text.indexOf('{');
          const eIdx = text.lastIndexOf('}');
          if (s !== -1 && eIdx !== -1 && eIdx > s) {
            const slice = text.slice(s, eIdx + 1);
            parsed = JSON.parse(sanitizeJsonString(slice));
          } else {
            throw new Error('Failed to extract JSON from Gemini response');
          }
        }
      }
      return parsed;
    };

    // Attempt 1
    let parsedResponse: any;
    try {
      parsedResponse = await callAndParse(basePrompt);
    } catch (firstErr) {
      // Attempt 2: reinforce JSON-only minimal prompt
      const strictPrompt = `${basePrompt}\n\nReturn ONLY valid JSON with the exact key \"questions\". No prose, no markdown, no comments.`;
      try {
        parsedResponse = await callAndParse(strictPrompt);
      } catch (secondErr) {
        // Final fallback: synthesize a simple quiz to avoid 500s
        const fallbackQuestions: QuizQuestion[] = Array.from({ length: Math.max(3, Math.min(20, questionCount)) }).map((_, i) => ({
          question: `${subject}: Sample question ${i + 1}`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          difficulty: difficulty,
        }));
        console.warn('⚠️ Using fallback quiz generator due to repeated JSON parse failures');
        return { questions: fallbackQuestions };
      }
    }
    
    // Validate the response structure
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error('Invalid response structure from Gemini');
    }

    // Validate each question
    const validatedQuestions: QuizQuestion[] = parsedResponse.questions.map((q: any, index: number) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
          typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= 4) {
        throw new Error(`Invalid question structure at index ${index}`);
      }

      return {
        question: q.question.trim(),
        options: q.options.map((opt: string) => opt.trim()),
        correctAnswer: q.correctAnswer,
        difficulty: difficulty
      };
    });

    return { questions: validatedQuestions };
  } catch (error) {
    console.error('Error generating quiz with Gemini:', error);
    throw new Error(`Failed to generate quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get tutor response using Gemini AI
 */
export async function getTutorResponse(message: string, context?: string[]): Promise<GeminiTutorResponse> {
  try {
    console.log(`💬 Getting tutor response with model: ${currentModel}`);
    
    // Safety check - ensure model is initialized
    if (!model) {
      console.log('⚠️ Model not initialized, attempting to initialize...');
      await initializeModel();
      if (!model) {
        throw new Error('Failed to initialize Gemini model');
      }
    }
    
    // Skip quick test - let the actual request handle timeouts
    const contextPrompt = context && context.length > 0 
      ? `\n\nPrevious conversation context:\n${context.join('\n')}\n\n`
      : '';

    const prompt = `
You are an AI tutor helping students learn. You should:
1. Provide clear, educational explanations
2. Break down complex concepts into simpler parts
3. Use examples when helpful
4. Encourage critical thinking
5. Be supportive and patient
6. Ask follow-up questions to check understanding
7. Suggest related topics for further learning

${contextPrompt}Student question: ${message}

STRICT OUTPUT FORMAT REQUIREMENTS:
- Output ONLY a single JSON object.
- Do NOT include any Markdown, backticks, code fences, or prose outside the JSON.
- Keys must be exactly: "response" (string) and "suggestions" (array of strings).
- Always include both keys. If you have no suggestions, return an empty array [].
- The JSON must be valid and parseable by JSON.parse with no trailing commas.

Example of the ONLY allowed output shape:
{"response": "...", "suggestions": ["...", "..."]}
`;

    const result = await withRetry(() => model.generateContent(prompt)) as any;
    const response = await result.response;
    const text = response.text();
    
    try {
      const parsedResponse = safeParseJson(text);
      if (!parsedResponse.response) {
        throw new Error('Invalid response structure from Gemini');
      }
      return {
        response: parsedResponse.response.trim(),
        suggestions: parsedResponse.suggestions || []
      };
    } catch (parseErr) {
      console.warn('⚠️ Falling back to raw text due to JSON parse error:', (parseErr as Error).message);
      const raw = stripCodeFences(text);
      return {
        response: raw || "I'm sorry, I couldn't parse the AI response this time.",
        suggestions: []
      };
    }
  } catch (error) {
    console.error('Error getting tutor response from Gemini:', error);
    
    // Provide intelligent fallback responses based on message content
    const lowerMessage = message.toLowerCase();
    let fallbackResponse = "I'm sorry, I'm having trouble connecting to my AI service right now. Please try asking your question again in a moment.";
    let suggestions = ["Try asking again later", "Contact your teacher", "Check your internet connection"];
    
    // Basic keyword-based responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      fallbackResponse = "Hello! I'm your AI tutor, but I'm experiencing some connection issues right now. Please try again in a moment, and I'll be happy to help you learn!";
      suggestions = ["Ask a specific subject question", "Try again in a moment", "Contact your teacher if problems persist"];
    } else if (lowerMessage.includes('math') || lowerMessage.includes('equation') || lowerMessage.includes('calculate')) {
      fallbackResponse = "I'd love to help you with math! Unfortunately, I'm having connection issues right now. In the meantime, try breaking down your problem into smaller steps, and feel free to ask again shortly.";
      suggestions = ["Break the problem into steps", "Try again in a few minutes", "Ask your teacher for help"];
    } else if (lowerMessage.includes('science') || lowerMessage.includes('physics') || lowerMessage.includes('chemistry') || lowerMessage.includes('biology')) {
      fallbackResponse = "Science questions are my specialty! I'm having some technical difficulties right now, but please try asking again in a moment. I'll be happy to explain scientific concepts clearly.";
      suggestions = ["Try your question again soon", "Look up the topic in your textbook", "Ask a classmate or teacher"];
    } else if (lowerMessage.includes('history') || lowerMessage.includes('when') || lowerMessage.includes('war') || lowerMessage.includes('ancient')) {
      fallbackResponse = "History is fascinating! I'm experiencing connection issues at the moment, but please try your question again soon. I love helping students understand historical events and their significance.";
      suggestions = ["Try again in a moment", "Check your history textbook", "Ask your teacher"];
    } else if (lowerMessage.includes('english') || lowerMessage.includes('grammar') || lowerMessage.includes('writing') || lowerMessage.includes('essay')) {
      fallbackResponse = "I'd be happy to help with English and writing! I'm having some technical difficulties right now, but please try asking again shortly. Good writing takes practice, so keep working on it!";
      suggestions = ["Try your question again soon", "Review grammar rules", "Ask your English teacher"];
    }
    
    return {
      response: fallbackResponse,
      suggestions: suggestions
    };
  }
}

/**
 * Analyze quiz performance and identify weak topics
 */
export async function analyzeWeakTopics(quizData: {
  subject: string;
  incorrectAnswers: { question: string; correctAnswer: string; userAnswer: string; }[];
}): Promise<string[]> {
  try {
    const { subject, incorrectAnswers } = quizData;
    
    if (incorrectAnswers.length === 0) {
      return [];
    }

    const prompt = `
Analyze the following quiz performance data and identify the key weak topics/concepts that the student needs to work on.

Subject: ${subject}

Incorrect Answers:
${incorrectAnswers.map((item, index) => `
${index + 1}. Question: ${item.question}
   Correct Answer: ${item.correctAnswer}
   Student's Answer: ${item.userAnswer}
`).join('')}

Based on this data, identify 3-5 specific topics or concepts that the student should focus on to improve their understanding. 
Be specific and educational - focus on the underlying concepts rather than just the individual questions.

Respond with a JSON array of topic strings:
["Topic 1", "Topic 2", "Topic 3"]
`;

    const result = await withRetry(() => model.generateContent(prompt)) as any;
    const response = await result.response;
    const text = response.text();
    
    const parsed = safeParseJson(text);
    
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid response structure from Gemini');
    }

    return parsed.filter(topic => typeof topic === 'string' && topic.trim().length > 0);
  } catch (error) {
    console.error('Error analyzing weak topics with Gemini:', error);
    return ['Review fundamentals', 'Practice more problems', 'Study core concepts'];
  }
}
