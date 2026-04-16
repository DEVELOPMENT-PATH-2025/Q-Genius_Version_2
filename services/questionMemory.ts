import { Question, QuestionType } from '../types';

// Store to track previously generated questions across subjects
interface QuestionHistory {
  subject: string;
  questions: string[];
  topics: string[];
  lastGenerated: string;
}

class QuestionMemoryManager {
  private history: Map<string, QuestionHistory> = new Map();
  
  // Add questions to memory
  addQuestions(subject: string, questions: Question[]) {
    const existing = this.history.get(subject) || {
      subject,
      questions: [],
      topics: [],
      lastGenerated: new Date().toISOString()
    };
    
    // Extract question texts and topics
    const questionTexts = questions.map(q => q.text.toLowerCase());
    const topics = this.extractTopics(questions);
    
    // Update history
    existing.questions = [...existing.questions, ...questionTexts];
    existing.topics = Array.from(new Set([...existing.topics, ...topics]));
    existing.lastGenerated = new Date().toISOString();
    
    this.history.set(subject, existing);
    console.log(`📚 Added ${questions.length} questions to memory for subject: ${subject}`);
  }
  
  // Get context for avoiding repetition
  getAvoidanceContext(currentSubject: string): string {
    const allPreviousQuestions: string[] = [];
    const allPreviousTopics: string[] = [];
    
    // Collect all questions from all subjects except current
    this.history.forEach((history, subject) => {
      if (subject !== currentSubject) {
        allPreviousQuestions.push(...history.questions);
        allPreviousTopics.push(...history.topics);
      }
    });
    
    if (allPreviousQuestions.length === 0) {
      return "";
    }
    
    // Create context string for AI
    const context = `
PREVIOUSLY GENERATED QUESTIONS (TO AVOID REPETITION):
The following questions have already been generated for other subjects. DO NOT repeat similar questions or topics:

Recent Questions from Other Subjects:
${allPreviousQuestions.slice(-20).map((q, i) => `${i + 1}. ${q}`).join('\n')}

Topics Already Covered:
${allPreviousTopics.slice(-10).join(', ')}

CRITICAL: Generate UNIQUE questions that cover different concepts, examples, and approaches than those listed above.
    `.trim();
    
    console.log(`🧠 Generated avoidance context with ${allPreviousQuestions.length} previous questions`);
    return context;
  }
  
  // Extract topics from questions
  private extractTopics(questions: Question[]): string[] {
    const topics: string[] = [];
    
    questions.forEach(q => {
      const text = q.text.toLowerCase();
      
      // Common technical topics to extract
      const topicPatterns = [
        /(\w+\s+algorithm|algorithm\s+\w+)/g,
        /(\w+\s+data\s+structure|data\s+structure\s+\w+)/g,
        /(\w+\s+tree|tree\s+\w+)/g,
        /(\w+\s+sort|sort\s+\w+)/g,
        /(\w+\s+search|search\s+\w+)/g,
        /(\w+\s+graph|graph\s+\w+)/g,
        /(\w+\s+database|database\s+\w+)/g,
        /(\w+\s+compiler|compiler\s+\w+)/g,
        /(\w+\s+network|network\s+\w+)/g,
        /(\w+\s+optimization|optimization\s+\w+)/g
      ];
      
      topicPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          topics.push(...matches.map(m => m.trim()));
        }
      });
    });
    
    return Array.from(new Set(topics));
  }
  
  // Get memory statistics
  getStats() {
    const stats = {
      totalSubjects: this.history.size,
      totalQuestions: 0,
      totalTopics: 0,
      subjects: [] as { subject: string; questionCount: number; topicCount: number }[]
    };
    
    this.history.forEach((history, subject) => {
      stats.totalQuestions += history.questions.length;
      stats.totalTopics += history.topics.length;
      stats.subjects.push({
        subject,
        questionCount: history.questions.length,
        topicCount: history.topics.length
      });
    });
    
    return stats;
  }
  
  // Clear memory (for testing)
  clear() {
    this.history.clear();
    console.log("🗑️ Question memory cleared");
  }
}

// Singleton instance
export const questionMemory = new QuestionMemoryManager();
