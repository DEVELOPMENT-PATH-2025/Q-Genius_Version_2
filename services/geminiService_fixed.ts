// Clean withRetry function - replace the existing one in geminiService.ts
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> => {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toLowerCase();
      const message = error?.message?.toLowerCase() || "";
      const isRateLimit = 
        message.includes('429') || 
        message.includes('resource_exhausted') || 
        message.includes('quota exceeded') ||
        error?.status === 429 || 
        error?.code === 429 ||
        errorStr.includes('429') ||
        errorStr.includes('resource_exhausted') ||
        errorStr.includes('quota exceeded');

      if (isRateLimit && retries < maxRetries) {
        retries++;
        const delay = initialDelay * Math.pow(2, retries - 1);
        console.warn(`Gemini API Rate Limit hit. Retrying in ${Math.round(delay)}ms... (Attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Log full error for debugging
      console.error("Gemini API Error:", error);
      console.error("Error details:", {
        message: error?.message || error?.toString() || 'Unknown error',
        status: error?.status,
        code: error?.code,
        retries: retries,
        errorType: typeof error,
        fullError: error
      });
      
      // For all other errors, throw to be caught by caller
      throw error;
    }
  }
};
