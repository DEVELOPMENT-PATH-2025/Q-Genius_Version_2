import { Question, QuestionType } from '../types';

// Function to fix existing questions with placeholder alternative text
export const fixAlternativeQuestions = (questions: Question[]): Question[] => {
  return questions.map(question => {
    if (question.type === QuestionType.LONG_ANSWER && 
        (!question.alternativeText || question.alternativeText.includes('[Alternative Question Placeholder]'))) {
      
      // Generate meaningful alternatives based on common question patterns
      const alternatives: { [key: string]: string[] } = {
        'compiler': [
          'Explain the role of lexical analysis in a compiler. How does it interact with symbol table?',
          'Describe the process of constructing a predictive parsing table. Illustrate with an example.',
          'Differentiate between top-down and bottom-up parsing techniques. Provide an example for each.',
          'Explain the concept of peephole optimization. Provide suitable examples.'
        ],
        'data structure': [
          'Compare and contrast different tree traversal algorithms with their time complexities.',
          'Explain the concept of dynamic programming with suitable examples.',
          'Describe various hashing techniques and their collision resolution strategies.',
          'Analyze the performance of different sorting algorithms in best and worst cases.'
        ],
        'algorithm': [
          'Explain the divide and conquer paradigm with detailed examples.',
          'Describe greedy algorithms and their applications in problem-solving.',
          'Compare backtracking and branch-and-bound techniques.',
          'Analyze the space-time trade-offs in algorithm design.'
        ],
        'database': [
          'Explain normalization and its importance in database design.',
          'Compare different types of database joins with examples.',
          'Describe transaction management and ACID properties.',
          'Explain indexing strategies and their impact on query performance.'
        ],
        'default': [
          'Analyze the theoretical foundations of the concept discussed.',
          'Compare and contrast different approaches to solve this problem.',
          'Evaluate the practical applications and limitations of this concept.',
          'Explain the implementation details and optimization techniques.'
        ]
      };
      
      // Find relevant category based on original text
      const text = question.text.toLowerCase();
      let category = 'default';
      
      for (const [key, value] of Object.entries(alternatives)) {
        if (key !== 'default' && text.includes(key)) {
          category = key;
          break;
        }
      }
      
      // Return a random alternative from the category
      const categoryAlternatives = alternatives[category];
      const alternativeText = categoryAlternatives[Math.floor(Math.random() * categoryAlternatives.length)];
      
      return {
        ...question,
        alternativeText
      };
    }
    return question;
  });
};
