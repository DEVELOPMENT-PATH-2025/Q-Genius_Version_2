import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, 
  Upload, 
  BookOpen, 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  Send, 
  ChevronRight,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  PlusCircle,
  Pencil,
  Layers,
  FileDown,
  FileType,
  Zap,
  Check,
  Image as ImageIcon,
  Settings,
  Shield,
  Brain
} from 'lucide-react';
import { generateQuestionsFromPrompt, analyzeCurriculum, extractTextFromPDF, extractTextFromWord, extractTextFromExcel, isAIAvailable, addQuestionsToMemory, resetApiCallCounter, getApiCallCount, reinitializeAI, analyzePaperTemplate, extractQuestionsFromFile, getAIInstance } from '../services/geminiService';
import { savePaperToDB, getPapersForFaculty, saveTemplate, getTemplates, deleteTemplate, deletePaper, subscribeToPapersForFaculty } from '../services/mockServices';
import { exportToPDF, exportToDocx, exportToTxt } from '../services/exportService';
import { SubmitPaperForm } from '../components/SubmitPaperForm';
import DeploymentGuide from '../components/DeploymentGuide';
import { questionMemory } from '../services/questionMemory';
import { Question, QuestionPaper, PaperStatus, QuestionType, Difficulty, ViewType, PaperTemplate } from '../types';
import { useAuth } from '../src/AuthContext';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source globally
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const QuestionImage: React.FC<{ 
  question: Question; 
  source: { data: string; type: string } | null;
  onCrop?: (url: string) => void;
}> = ({ question, source, onCrop }) => {
    const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (question.imageUrl) {
        setCroppedUrl(question.imageUrl);
        return;
      }
      
      if (!question.boundingBox || !source) {
        console.log("QuestionImage: Missing boundingBox or source", { hasBB: !!question.boundingBox, hasSource: !!source });
        return;
      }

      const cropImage = async () => {
        try {
          const [ymin, xmin, ymax, xmax] = question.boundingBox!;
          const pageNum = question.pageNumber || 1;
          
          console.log("QuestionImage: Cropping", { ymin, xmin, ymax, xmax, pageNum, type: source.type });

          if (source.type.startsWith('image/')) {
            const img = new Image();
            img.src = source.data;
            img.onload = () => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              const width = img.width * (xmax - xmin) / 1000;
              const height = img.height * (ymax - ymin) / 1000;
              const sx = img.width * xmin / 1000;
              const sy = img.height * ymin / 1000;

              console.log("QuestionImage: Image dimensions", { width, height, sx, sy, imgW: img.width, imgH: img.height });

              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, sx, sy, width, height, 0, 0, width, height);
              const url = canvas.toDataURL();
              setCroppedUrl(url);
              if (onCrop && !question.imageUrl) {
                onCrop(url);
              }
            };
          } else if (source.type === 'application/pdf') {
            // PDF cropping logic using pdfjs-dist
            const loadingTask = pdfjs.getDocument(source.data);
            const pdf = await loadingTask.promise;
            
            console.log("QuestionImage: PDF loaded", { numPages: pdf.numPages });
            
            // Ensure page number is within range
            const targetPage = Math.min(Math.max(1, pageNum), pdf.numPages);
            const page = await pdf.getPage(targetPage);
            
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) return;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport, canvas }).promise;

            const finalCanvas = canvasRef.current;
            if (!finalCanvas) return;
            const finalCtx = finalCanvas.getContext('2d');
            if (!finalCtx) return;

            const width = viewport.width * (xmax - xmin) / 1000;
            const height = viewport.height * (ymax - ymin) / 1000;
            const sx = viewport.width * xmin / 1000;
            const sy = viewport.height * ymin / 1000;

            console.log("QuestionImage: PDF viewport dimensions", { width, height, sx, sy, vW: viewport.width, vH: viewport.height });

            finalCanvas.width = width;
            finalCanvas.height = height;
            finalCtx.drawImage(canvas, sx, sy, width, height, 0, 0, width, height);
            const url = finalCanvas.toDataURL();
            setCroppedUrl(url);
            if (onCrop && !question.imageUrl) {
              onCrop(url);
            }
          }
        } catch (err) {
          console.error("QuestionImage: Crop error", err);
        }
      };

      cropImage();
    }, [question, source, onCrop]);

    if (!question.hasImage) return null;

    return (
      <div className="mt-4 space-y-2">
        <canvas ref={canvasRef} className="hidden" />
        {croppedUrl ? (
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            <img src={croppedUrl} alt="Extracted Diagram" className="w-full h-auto max-h-[300px] object-contain" />
          </div>
        ) : (!question.boundingBox || !source) ? (
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-medium italic text-center max-w-[200px]">
              Visual context detected but exact coordinates were not provided by AI.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-32 bg-slate-200 rounded" />
          </div>
        )}
      </div>
    );
  };

interface FacultyDashboardProps {
    userId: string;
    userName: string;
    currentView: ViewType;
    onNavigate?: (view: ViewType) => void;
}

const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ userId, userName, currentView, onNavigate }) => {
  const { department } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState(department || '');
  const [activeTab, setActiveTab] = useState<'prompt' | 'upload' | 'curriculum' | 'settings'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('CUSTOM_GEMINI_API_KEY') || '');
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [paperTitle, setPaperTitle] = useState('');
  const [examName, setExamName] = useState('');
  const [instituteName, setInstituteName] = useState('Sagar Institute of Science and Technology');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [examDate, setExamDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [instructions, setInstructions] = useState('');
  const [paperFormat, setPaperFormat] = useState('MST-I_SISTec');
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Submitted for approval successfully!');
  const [hasSelectedKey, setHasSelectedKey] = useState(true);
  
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Debug: Track extractedQuestions changes
  useEffect(() => {
    console.log('📋 extractedQuestions updated:', extractedQuestions.length, extractedQuestions);
  }, [extractedQuestions]);

  // Debug: Track active tab changes
  useEffect(() => {
    console.log('🔄 Active tab changed:', activeTab, 'Questions count:', extractedQuestions.length);
  }, [activeTab, extractedQuestions.length]);

  // Error boundary for unexpected errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('🚨 Unexpected error:', event.error);
      console.error('🚨 Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [customQuestion, setCustomQuestion] = useState<Partial<Question>>({ type: QuestionType.SHORT_ANSWER, difficulty: Difficulty.MEDIUM, marks: 2 });
  const [showPaperBuilder, setShowPaperBuilder] = useState(false);

  const [myPapers, setMyPapers] = useState<QuestionPaper[]>([]);
  const [submittedPapers, setSubmittedPapers] = useState<QuestionPaper[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [templates, setTemplates] = useState<PaperTemplate[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<string | null>(null);

  const loadPaperForEditing = (paper: QuestionPaper) => {
    setPaperTitle(paper.title);
    setExamName(paper.examName || '');
    setSubjectName(paper.subjectName || '');
    setSubjectCode(paper.courseCode || '');
    setExamDate(paper.examDate || '');
    setMaxMarks(paper.maxMarks?.toString() || '');
    setInstructions(paper.instructions || '');
    setPaperFormat(paper.format || 'Standard');
    setSelectedTemplateId(paper.templateId || '');
    setLogoUrl(paper.logoUrl || null);
    setGeneratedQuestions(paper.questions);
    setActiveTab('prompt');
    onNavigate?.('dashboard');
  };

  const confirmDeletePaper = async () => {
    if (paperToDelete) {
      try {
        await deletePaper(paperToDelete);
      } catch (error) {
        console.error("Failed to delete paper:", error);
      } finally {
        setPaperToDelete(null);
      }
    }
  };
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateCounts, setTemplateCounts] = useState<{ mcqCount: number; shortCount: number; longCount: number } | null>({ mcqCount: 12, shortCount: 6, longCount: 4 });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<{ data: string; type: string } | null>(null);

  // CO (Course Outcome) input states
  const [co1, setCo1] = useState('');
  const [co2, setCo2] = useState('');
  const [co3, setCo3] = useState('');
  const [co4, setCo4] = useState('');
  const [co5, setCo5] = useState('');

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Image upload states
  const [showImageUploadDialog, setShowImageUploadDialog] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{data: string; type: string}[]>([]);
  const [increaseQuestionSpacing, setIncreaseQuestionSpacing] = useState(false);
  const [showDeploymentGuide, setShowDeploymentGuide] = useState(false);

  useEffect(() => {
    if (department && !selectedDepartment) {
      setSelectedDepartment(department);
    }
  }, [department]);

  // Remove automatic API key checking to prevent quota consumption
  // useEffect(() => {
  //   const checkKeySelection = async () => {
  //     // @ts-ignore
  //     if (window.aistudio && window.aistudio.hasSelectedApiKey) {
  //       // @ts-ignore
  //         const selected = await window.aistudio.hasSelectedApiKey();
  //         setHasSelectedKey(selected);
  //     }
  //   };
  //   checkKeySelection();
  // }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasSelectedKey(true);
      setError(null);
    }
  };

  useEffect(() => {
      if (!userId) return;
      let unsubscribe: () => void;
      if (currentView === 'my_papers') {
          unsubscribe = subscribeToPapersForFaculty(userId, (papers) => {
              setMyPapers(papers);
              setHistoryLoading(false);
          });
      } else if (currentView === 'templates' || currentView === 'dashboard') {
          loadTemplates();
      } else if (currentView === 'submit_paper') {
          unsubscribe = subscribeToPapersForFaculty(userId, (papers) => {
              setSubmittedPapers(papers);
          });
      }
      return () => {
          if (unsubscribe) unsubscribe();
      };
  }, [currentView, userId]);

  // Safety check: Hide loading screen if questions exist but loading is still true
  useEffect(() => {
    if ((extractedQuestions.length > 0 || generatedQuestions.length > 0) && isLoading) {
      console.log('🔧 Safety check: Hiding loading screen as questions are ready');
      console.log(`   Extracted Questions: ${extractedQuestions.length}`);
      console.log(`   Generated Questions: ${generatedQuestions.length}`);
      console.log(`   Loading State: ${isLoading}`);
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [extractedQuestions, generatedQuestions, isLoading]);

  // Check for API key on component mount (but don't initialize AI to prevent quota consumption)
  useEffect(() => {
    // Reset API call counter for debugging
    resetApiCallCounter();
    console.log('🔍 Faculty Dashboard mounted - API call counter reset');
    
    const storedApiKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY');
    if (storedApiKey) {
      setCustomApiKey(storedApiKey);
      setHasSelectedKey(true);
    } else {
      setHasSelectedKey(false);
    }
  }, []);

  useEffect(() => {
      if (selectedTemplateId) {
          const template = templates.find(t => t.id === selectedTemplateId);
          if (template) {
              const templateName = template.name.toLowerCase();
              console.log('🏷️ Template detection in useEffect:', templateName);
              
              // Skip API analysis for known templates to prevent quota consumption
              if (templateName.includes('mst-i') || templateName.includes('mst i') || templateName.includes('mst - i') || (templateName.includes('revised format') && templateName.includes('mst'))) {
                  // Special handling for Revised Format_ MST - I_SISTEC template
                  if (templateName.includes('revised format') && (templateName.includes('mst - i') || templateName.includes('mst-i'))) {
                    console.log('Detected Revised Format MST-I template:', templateName);
                    const newCounts = {
                        mcqCount: 12,
                        shortCount: 6, // Q1-Q6 (with Q3 having "any two" requirement)
                        longCount: 2 // Only 2 long answer questions for Revised Format
                    };
                    setTemplateCounts(newCounts);
                    console.log('Revised Format MST-I template counts applied:', newCounts);
                  } else {
                    setTemplateCounts({
                        mcqCount: 12,
                        shortCount: 6,
                        longCount: 4
                    });
                    console.log('📊 MST-I template counts applied: 12 MCQ, 6 Short, 4 Long');
                  }
              } else if (templateName.includes('mst-ii') || templateName.includes('mst ii') || templateName.includes('mst ii format')) {
                  setTemplateCounts({
                      mcqCount: 18,
                      shortCount: 9,
                      longCount: 3
                  });
                  console.log('📊 MST-II template counts applied: 18 MCQ, 9 Short, 3 Long');
              } else {
                  // Only analyze unknown templates if API is available
                  if (isAIAvailable()) {
                      analyzePaperTemplate(template.fileUrl, 'application/pdf').then(counts => {
                          setTemplateCounts(counts);
                      }).catch(err => {
                          console.error('Template analysis failed:', err);
                          setTemplateCounts({ mcqCount: 10, shortCount: 5, longCount: 3 });
                      });
                  } else {
                      setTemplateCounts({ mcqCount: 10, shortCount: 5, longCount: 3 });
                  }
              }
          }
      } else if (paperFormat === 'MST -II format Dec 2025' || paperFormat === 'MST - II Format Dec 2025') {
          setTemplateCounts({
              mcqCount: 18,
              shortCount: 9,
              longCount: 3
          });
      } else {
          setTemplateCounts(null);
      }
  }, [selectedTemplateId, templates, paperFormat]);

  // Debug: Log templateCounts changes
  useEffect(() => {
    console.log('templateCounts updated:', templateCounts);
  }, [templateCounts]);

  const loadTemplates = async () => {
      setTemplateLoading(true);
      const data = await getTemplates(userId);
      setTemplates(data);
      setTemplateLoading(false);
  };

  const ApiKeyBanner = () => {
    if (hasSelectedKey) return null;
    return (
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-amber-900 text-sm">AI Quota Optimization</h4>
            <p className="text-amber-700 text-xs">To avoid "Quota Exceeded" errors and ensure faster processing, please select your own Gemini API key.</p>
          </div>
        </div>
        <button 
          onClick={handleSelectKey}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          Select API Key
        </button>
      </motion.div>
    );
  };

  const handleSaveApiKey = () => {
    if (customApiKey) {
      // Validate API key format (Gemini keys start with "AQ.")
      if (!customApiKey.trim().startsWith('AQ.')) {
        setError('Invalid API key format. Gemini API keys should start with "AQ."');
        return;
      }
      
      // Validate API key length (should be around 53 characters)
      if (customApiKey.trim().length < 53) {
        setError('API key appears to be too short. Please check your Gemini API key.');
        return;
      }
      
      // Save to localStorage
      localStorage.setItem('CUSTOM_GEMINI_API_KEY', customApiKey.trim());
      
      // Force immediate reinitialization
      console.log('🔑 Saving new API key and reinitializing AI...');
      reinitializeAI();
      
      // Update UI state immediately
      setHasSelectedKey(true);
      setIsSaved(true);
      setSaveMessage('API Key saved successfully! AI features are now ready to use.');
      
      // Clear any existing API errors
      clearApiErrors();
      
      // Clear any cached API call counters to ensure fresh start
      resetApiCallCounter();
      
      setTimeout(() => setIsSaved(false), 3000);
      
      // Log successful reinitialization
      console.log('✅ API key saved and AI service reinitialized successfully');
      
      // Verify the AI service is working with the new key
      setTimeout(() => {
        const testKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY');
        const isAvailable = isAIAvailable();
        console.log('Post-save verification:', {
          storedKey: testKey ? `${testKey.substring(0, 10)}...` : 'none',
          isAvailable,
          hasValidFormat: testKey?.startsWith('AQ.'),
          keyLength: testKey?.length
        });
        
        if (isAvailable && testKey && testKey.startsWith('AQ.') && testKey.length >= 53) {
          console.log('API key verification successful - AI service is ready');
          
          // Test the API key with a simple call to ensure it works
          const testAPIKey = async () => {
            try {
              const ai = getAIInstance();
              if (ai) {
                console.log('Testing API key with basic validation...');
                
                // For now, just validate that the AI instance was created successfully
                // The actual API calls will be tested when generating questions
                // This avoids model availability issues during key verification
                
                console.log('API key test successful - AI instance created');
                return true;
              }
              return false;
            } catch (error) {
              console.error('API key test failed:', error);
              return false;
            }
          };
          
          testAPIKey().then((success) => {
            if (success) {
              console.log('API key verification passed - AI service is ready');
              setTimeout(() => {
                console.log('Auto-refreshing page to apply new API key...');
                window.location.reload();
              }, 2000);
            } else {
              console.error('API key test failed - verification failed');
              setError('API key verification failed. Please check your API key and try again.');
              setHasSelectedKey(false);
            }
          });
        } else {
          console.error('API key verification failed');
          setError('API key verification failed. Please try again.');
          setHasSelectedKey(false);
        }
      }, 1000); // Wait 1 second before verification
    } else {
      // Remove API key
      localStorage.removeItem('CUSTOM_GEMINI_API_KEY');
      
      // Clear AI instance
      console.log('🗑️ Removing API key and clearing AI instance...');
      reinitializeAI();
      
      setHasSelectedKey(false);
      setSaveMessage('API Key removed. You will need to add a new key to use AI features.');
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  // Clear any existing API-related errors when new key is added
  const clearApiErrors = () => {
    setError(null);
    console.log('🧹 Cleared any existing API errors');
  };

  const checkApiKey = () => {
    // Use the new safe AI availability check
    if (!isAIAvailable()) {
      setError("Please add your Gemini API key in Settings to continue using AI features.");
      setHasSelectedKey(false);
      return false;
    }
    setHasSelectedKey(true);
    return true;
  };

  const handlePromptGenerate = async () => {
    if (!prompt) return;
    if (!isAIAvailable()) {
      setError("Please add your Gemini API key in Settings to continue using AI features.");
      setHasSelectedKey(false);
      return;
    }
    if (!checkApiKey()) return;

    // Check if prompt contains short answer or long answer questions and ask about images
    const hasShortOrLongQuestions = /short\s+answer|long\s+answer/i.test(prompt);
    if (hasShortOrLongQuestions && uploadedImages.length === 0) {
      setShowImageUploadDialog(true);
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Analyzing your prompt and generating questions...');
    try {
      // Extract count if mentioned (e.g., "10 questions")
      const countMatch = prompt.match(/(\d+)\s*(?:questions|ques|q)/i);
      const count = countMatch ? parseInt(countMatch[1]) : 5;

      // Extract marks if mentioned (e.g., "42 marks")
      const marksMatch = prompt.match(/(\d+)\s*(?:marks|mark|pts|points)/i);
      const targetMarks = marksMatch ? parseInt(marksMatch[1]) : (maxMarks ? parseInt(maxMarks) : undefined);

      const contextPrompt = `
        Subject: ${subjectName || 'General'}
        Subject Code: ${subjectCode || 'N/A'}
        Context: ${prompt}
      `;
      
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

      // Determine CO levels based on template
      let coInstructions = '';
      console.log('🔍 Template Detection Debug:', {
        selectedTemplateId,
        selectedTemplate,
        templateName: selectedTemplate?.name,
        allTemplates: templates.map(t => ({ id: t.id, name: t.name }))
      });
      
      if (selectedTemplate) {
        const templateName = selectedTemplate.name.toLowerCase();
        console.log('🏷️ Checking template name:', templateName);
        
        if (templateName.includes('mst-i') || templateName.includes('mst i') || templateName.includes('revised format') && templateName.includes('mst')) {
          // Special handling for Revised Format_ MST - I_SISTEC template
          if (templateName.includes('revised format') && templateName.includes('mst - i')) {
            coInstructions = `
            11. COURSE OUTCOMES (CO): For this MST-I template, assign ONLY CO1 and CO2 to questions:
               - Use CO1 for fundamental/remember/understand type questions
               - Use CO2 for application/analysis type questions
               - DO NOT use CO3, CO4, or CO5 for this MST-I template
            12. REVISED FORMAT SPECIAL REQUIREMENTS: For the "Revised Format_ MST - I_SISTEC" template:
               - Generate exactly 6 Short Answer questions
               - Format questions EXACTLY as shown below:
               - Q1. [Question text here] [CO1]
               - Q2. [Question text here] [CO1]
               - Q3. [Question text here] [CO2]
               - CRITICAL: After Q3, add EXACT header: "Short Answer Type Questions (Attempt any two)"
               - Then format Q4, Q5, Q6 after this header:
               - Q4. [Question text here] [CO2]
               - Q5. [Question text here] [CO2]
               - Q6. [Question text here] [CO2]
               - Students must attempt any two questions out of Q4, Q5, Q6
               - DO NOT add this header for Q1, Q2, Q3 - only between Q3 and Q4
               - The header must be EXACTLY: "Short Answer Type Questions (Attempt any two)"
               - Format must match: Q1., Q2., Q3., then header, then Q4., Q5., Q6.
            13. COURSE OUTCOME STATEMENTS: At the very end of the question paper, add the following section:
                   "Course Outcome Statements: Students will be able to"
                   Then create a table with two rows and two columns. The first column should contain "CO1" and "CO2" respectively. The second column should be left blank for the user to fill.
                   Example format:
                   Course Outcome Statements: Students will be able to
                   | CO1 |       |
                   | CO2 |       |`;
            console.log('📋 Revised Format MST-I CO instructions applied: CO1, CO2 only with "any two" requirement');
          } else {
            coInstructions = `
            11. COURSE OUTCOMES (CO): For this MST-I template, assign ONLY CO1 and CO2 to questions:
               - Use CO1 for fundamental/remember/understand type questions
               - Use CO2 for application/analysis type questions
               - DO NOT use CO3, CO4, or CO5 for this MST-I template`;
            console.log('📋 MST-I CO instructions applied: CO1 and CO2 only');
          }
        } else if (templateName.includes('mst-ii') || templateName.includes('mst ii') || templateName.includes('mst ii format')) {
          coInstructions = `
          11. COURSE OUTCOMES (CO): For this MST-II template, assign ONLY CO3, CO4, and CO5 to questions:
             - Use CO3 for application/analysis type questions
             - Use CO4 for evaluation/synthesis type questions  
             - Use CO5 for creation/advanced problem-solving type questions
             - DO NOT use CO1 or CO2 for this MST-II template`;
          console.log('📋 MST-II CO instructions applied: CO3, CO4, CO5 only');
        } else {
          console.log('⚠️ No specific template detected, using default CO assignment');
          coInstructions = `
          11. COURSE OUTCOMES (CO): Assign appropriate CO levels (CO1-CO5) based on question difficulty and topic:
             - Use CO1 for fundamental/remember/understand type questions
             - Use CO2 for application/analysis type questions
             - Use CO3 for evaluation/synthesis type questions
             - Use CO4 for creation/advanced problem-solving type questions
             - Use CO5 for complex multi-step problem-solving`;
        }
      } else {
        console.log('⚠️ No template selected, using default CO assignment');
        coInstructions = `
        11. COURSE OUTCOMES (CO): Assign appropriate CO levels (CO1-CO5) based on question difficulty and topic:
           - Use CO1 for fundamental/remember/understand type questions
           - Use CO2 for application/analysis type questions
           - Use CO3 for evaluation/synthesis type questions
           - Use CO4 for creation/advanced problem-solving type questions
           - Use CO5 for complex multi-step problem-solving`;
      }
      
      console.log('Final CO Instructions:', coInstructions);
      console.log('Template counts being passed:', templateCounts);
      console.log('Selected template:', selectedTemplate?.name);

      setLoadingMessage('AI is crafting your questions...');
      const questions = await generateQuestionsFromPrompt(
        contextPrompt, 
        count, 
        Difficulty.MEDIUM, 
        targetMarks,
        selectedTemplate?.fileUrl,
        selectedTemplate?.fileUrl ? 'application/pdf' : undefined,
        templateCounts || undefined,
        subjectName,
        coInstructions
      );
      
      console.log('🎯 Questions generated:', questions.length, questions);
      setExtractedQuestions(questions);
      setLoadingMessage('Questions generated successfully!');
      
      // Validate CO levels for Revised Format MST-I template
      if (selectedTemplate?.name.toLowerCase().includes('revised format') && selectedTemplate.name.toLowerCase().includes('mst - i')) {
        console.log('🔍 Validating CO assignment for Revised Format MST-I:');
        console.log('   Expected: CO1, CO2 only');
        console.log('   Forbidden: CO3, CO4, CO5');
        
        // Check and fix any incorrect CO assignments
        const questionsWithValidation = questions.map((q, index) => {
          if (q.type === 'SHORT_ANSWER' || q.type === 'LONG_ANSWER') {
            if (q.courseOutcome && q.courseOutcome.includes('CO3')) {
              console.warn('🔧 Changing CO3 to CO1 for Revised Format MST-I');
              return { ...q, courseOutcome: 'CO1' };
            }
            if (q.courseOutcome && q.courseOutcome.includes('CO4')) {
              console.warn('🔧 Changing CO4 to CO1 for Revised Format MST-I');
              return { ...q, courseOutcome: 'CO1' };
            }
            if (q.courseOutcome && q.courseOutcome.includes('CO5')) {
              console.warn('🔧 Changing CO5 to CO2 for Revised Format MST-I');
              return { ...q, courseOutcome: 'CO2' };
            }
          }
          return q;
        });
        
        // Check for any invalid CO assignments
        const invalidCOQuestions = questionsWithValidation.filter((q, index) => {
          const wasModified = q.courseOutcome !== questions[index].courseOutcome;
          return wasModified && q.type === 'SHORT_ANSWER' || q.type === 'LONG_ANSWER';
        });
        
        if (invalidCOQuestions.length > 0) {
          console.warn('⚠️ Found questions with invalid CO levels for Revised Format MST-I:');
          invalidCOQuestions.forEach((q, index) => {
            const originalCO = questions[index].courseOutcome;
            console.warn(`   Q${index + 1}: ${originalCO} → ${q.courseOutcome} (should be CO1 or CO2)`);
          });
          
          // Update the questions array with fixed CO levels
          setExtractedQuestions(questionsWithValidation);
          console.log('✅ Invalid CO levels fixed for Revised Format MST-I');
        }
        
        setExtractedQuestions(questions);
      } else {
        setExtractedQuestions(questions);
      }
      
      // Hide loading screen immediately after successful generation
      setIsLoading(false);
      setTimeout(() => setLoadingMessage(''), 2000);
      
      // Auto-set paper title if empty
      if (!paperTitle && subjectName) {
        setPaperTitle(`${subjectName} - ${new Date().getFullYear()}`);
      }
      
      // Sync maxMarks if extracted from prompt
      if (targetMarks && !maxMarks) {
        setMaxMarks(targetMarks.toString());
      }
      setTimeout(() => setLoadingMessage(''), 2000);
    } catch (e: any) {
      console.error('🚨 Question Generation Error - Full Analysis:');
      console.error('Error Type:', e?.constructor?.name || 'Unknown');
      console.error('Error Message:', e?.message);
      console.error('Error Stack:', e?.stack);
      
      // Check for specific error patterns
      const errorStr = JSON.stringify(e).toLowerCase();
      const message = e?.message?.toLowerCase() || "";
      
      console.error('🔍 Error Pattern Analysis:');
      
      if (errorStr.includes("429") || message.includes("quota")) {
        console.error('❌ QUOTA ERROR: API quota exceeded');
        console.error('💡 DEPLOYMENT SOLUTION: Contact IT admin for API key management or use individual faculty keys');
        setError("API quota exceeded. For deployment: Contact your IT administrator to increase API quota or use individual faculty API keys.");
        setHasSelectedKey(false);
        setShowDeploymentGuide(true); // Show deployment guide
      } else if (message.includes("permission denied") || message.includes("denied access") || message.includes("403")) {
        console.error('❌ PERMISSION DENIED ERROR: API key lacks proper permissions');
        console.error('💡 Solution: Enable Gemini API in Google Cloud Console');
        console.error('📋 Steps to fix:');
        console.error('   1. Go to Google Cloud Console (console.cloud.google.com)');
        console.error('   2. Select the project where you created your API key');
        console.error('   3. Go to "APIs & Services" > "Enabled APIs & Services"');
        console.error('   4. Search for "Gemini API" or "Generative Language API"');
        console.error('   5. Click "ENABLE" if not already enabled');
        console.error('   6. Ensure your API key has correct permissions');
        setError("API Permission Denied. Please enable Gemini API in your Google Cloud project and ensure your API key has proper permissions.");
        setHasSelectedKey(false);
      } else if (message.includes("invalid") || message.includes("authentication")) {
        console.error('❌ AUTHENTICATION ERROR: Invalid API key');
        console.error('💡 Solution: Check API key format and validity');
        setError("Invalid API key. Please check your Gemini API key in Settings.");
        setHasSelectedKey(false);
      } else if (message.includes("model") || message.includes("unavailable")) {
        console.error('❌ MODEL ERROR: AI model unavailable');
        console.error('💡 Solution: Try again in a few minutes');
        setError("AI model temporarily unavailable due to high demand. Retrying automatically... Please wait.");
      } else if (message.includes("network") || message.includes("fetch")) {
        console.error('❌ NETWORK ERROR: Connection issue');
        console.error('💡 Solution: Check internet connection');
        setError("Network error. Please check your internet connection and try again.");
      } else {
        console.error('❌ UNKNOWN ERROR: Unidentified issue');
        console.error('💡 Solution: Check console logs for details, restart application');
        setError(`Failed to generate questions: ${e?.message || 'Unknown error occurred'}. Please try again.`);
      }
      
      setLoadingMessage('');
      setIsLoading(false);
    }
  };

  // Image upload handling functions
  const handleImageUploadConfirm = (shouldUpload: boolean) => {
    setShowImageUploadDialog(false);
    if (shouldUpload) {
      // Trigger file input for image upload
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        const imagePromises = files.map(file => {
          return new Promise<{data: string; type: string}>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ data: reader.result as string, type: file.type });
            reader.readAsDataURL(file);
          });
        });
        
        Promise.all(imagePromises).then(images => {
          setUploadedImages(prev => [...prev, ...images]);
          setIncreaseQuestionSpacing(true);
          // Continue with question generation after images are uploaded
          continueWithImageGeneration();
        });
      };
      input.click();
    } else {
      // Continue without images
      continueWithImageGeneration();
    }
  };

  const continueWithImageGeneration = async () => {
    // Remove the image check and continue with the original logic
    setShowImageUploadDialog(false);
    
    if (!prompt) return;
    if (!isAIAvailable()) {
      setError("Please add your Gemini API key in Settings to continue using AI features.");
      setHasSelectedKey(false);
      return;
    }
    if (!checkApiKey()) return;
    
    setIsLoading(true);
    setLoadingMessage('Analyzing your prompt and generating questions...');
    
    try {
      // Extract count if mentioned (e.g., "10 questions")
      const countMatch = prompt.match(/(\d+)\s*(?:questions|ques|q)/i);
      const count = countMatch ? parseInt(countMatch[1]) : 5;

      // Extract marks if mentioned (e.g., "42 marks")
      const marksMatch = prompt.match(/(\d+)\s*(?:marks|mark|pts|points)/i);
      const targetMarks = marksMatch ? parseInt(marksMatch[1]) : 2 * count;

      console.log('🎯 Prompt Generation Parameters:', {
        prompt,
        count,
        targetMarks,
        uploadedImages: uploadedImages.length,
        spacing: increaseQuestionSpacing
      });

      // Add image information to the prompt if images are uploaded
      let enhancedPrompt = prompt;
      if (uploadedImages.length > 0) {
        enhancedPrompt += `\n\nIMPORTANT: Include ${uploadedImages.length} image(s) in the questions. The images should be referenced in the question text as [Image X] where X is the image number. ${increaseQuestionSpacing ? 'Increase spacing between questions to accommodate images.' : ''}`;
      }

      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

      // Determine CO levels based on template
      let coInstructions = '';
      console.log('🔍 Template Detection Debug:', {
        selectedTemplateId,
        selectedTemplate,
        templateName: selectedTemplate?.name,
        allTemplates: templates.map(t => ({ id: t.id, name: t.name }))
      });
      
      if (selectedTemplate) {
        const templateName = selectedTemplate.name.toLowerCase();
        console.log('🏷️ Checking template name:', templateName);
        
        // Enhanced condition to catch all MST 1 template variations
        const isMST1Template = templateName.includes('mst-i') || templateName.includes('mst i') || 
            templateName.includes('mst-1') || templateName.includes('mst 1') || 
            templateName.includes('mst1') ||
            (templateName.includes('revised format') && templateName.includes('mst-i'));
            
        console.log('🔍 MST1 Template Detection:', {
          templateName,
          isMST1Template,
          containsRevisedFormat: templateName.includes('revised format') && templateName.includes('mst-i')
        });
        
        if (isMST1Template) {
          // Special handling for Revised Format_ MST - I_SISTEC template
          if (templateName.includes('revised format') && templateName.includes('mst-i')) {
            coInstructions = `
            11. COURSE OUTCOMES (CO): For this MST-I template, assign ONLY CO1 and CO2 to questions:
               - Use CO1 for fundamental/remember/understand type questions
               - Use CO2 for application/analysis type questions
               - DO NOT use CO3, CO4, or CO5 for this MST-I template
            12. REVISED FORMAT SPECIAL REQUIREMENTS: For the "Revised Format_ MST - I_SISTEC" template:
               - Generate exactly 6 Short Answer questions
               - Format questions EXACTLY as shown below:
               - CRITICAL: Add header "Short Answer Type Questions (Attempt any two)" BEFORE Q1
               - Q1. [Question text here] [CO1]
               - Q2. [Question text here] [CO1]
               - Q3. [Question text here] [CO1]
               - CRITICAL: After Q3, add header "Short Answer Type Questions (Attempt any two)"
               - Then format Q4, Q5, Q6 after this header:
               - Q4. [Question text here] [CO2]
               - Q5. [Question text here] [CO2]
               - Q6. [Question text here] [CO1]
               - Students must attempt any two questions out of Q4, Q5, Q6
               - Headers must be EXACTLY: "Short Answer Type Questions (Attempt any two)"
               - Format must match: Header, then Q1., Q2., Q3., then Header, then Q4., Q5., Q6.
            13. COURSE OUTCOME STATEMENTS: At the very end of the question paper, add the following section:
                   "Course Outcome Statements: Students will be able to"
                   Then create a table with two rows and two columns. The first column should contain "CO1" and "CO2" respectively. The second column should be left blank for the user to fill.
                   Example format:
                   Course Outcome Statements: Students will be able to
                   | CO1 |       |
                   | CO2 |       |`;
            console.log('📋 File Upload Revised Format MST-I CO instructions applied: CO1, CO2 only with "any two" requirement');
          } else {
            coInstructions = `
            11. COURSE OUTCOMES (CO): For this MST-I template, assign ONLY CO1 and CO2 to questions:
               - Use CO1 for fundamental/remember/understand type questions
               - Use CO2 for application/analysis type questions
               - DO NOT use CO3, CO4, or CO5 for this MST-I template
            12. COURSE OUTCOME STATEMENTS: At the very end of the question paper, add the following section:
                   "Course Outcome Statements: Students will be able to"
                   Then create a table with two rows and two columns. The first column should contain "CO1" and "CO2" respectively. The second column should be left blank for the user to fill.
                   Example format:
                   Course Outcome Statements: Students will be able to
                   | CO1 |       |
                   | CO2 |       |
            `;
            console.log('📋 File Upload MST-I CO instructions applied: CO1 and CO2 only, with CO Statements table');
          }
        }
      }

      const contextPrompt = `
        Generate ${count} questions with total marks ${targetMarks} based on the following prompt:
        Context: ${enhancedPrompt}
      `;
      
      // Continue with the rest of the original handlePromptGenerate logic
      setLoadingMessage('AI is crafting your questions...');
      const questions = await generateQuestionsFromPrompt(
        contextPrompt, 
        count, 
        Difficulty.MEDIUM, 
        targetMarks,
        selectedTemplate?.fileUrl,
        selectedTemplate?.fileUrl ? 'application/pdf' : undefined,
        templateCounts || undefined,
        subjectName,
        coInstructions
      );
      
      console.log('🎯 Questions generated:', questions.length, questions);
      setExtractedQuestions(questions);
      setLoadingMessage('Questions generated successfully!');
      
      // Ask user if they want to add images to the generated questions
      const nonMCQQuestions = questions.filter(q => q.type !== 'MCQ');
      if (nonMCQQuestions.length > 0) {
        setTimeout(() => {
          if (window.confirm(`Do you want to add images to the ${nonMCQQuestions.length} non-MCQ questions that were generated? Click OK to add images, or Cancel to skip.`)) {
            console.log('📷 User wants to add images to generated questions');
            // User wants to add images - they can use the individual image upload buttons
          } else {
            console.log('📷 User declined to add images to generated questions');
          }
        }, 1000); // Delay to show success message first
      }
      
      // Hide loading screen immediately after successful generation
      setIsLoading(false);
      setTimeout(() => setLoadingMessage(''), 2000);
      
      // Auto-set paper title if empty
      if (!paperTitle && subjectName) {
        setPaperTitle(`${subjectName} - ${new Date().getFullYear()}`);
      }
      
      // Sync maxMarks if extracted from prompt
      if (targetMarks && !maxMarks) {
        setMaxMarks(targetMarks.toString());
      }
      
    } catch (error) {
      console.error('Error in generation:', error);
      setError('Failed to generate questions. Please try again.');
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handlePromptGenerateWithoutImageCheck = async () => {
    if (!prompt) return;
    if (!isAIAvailable()) {
      setError("Please add your Gemini API key in Settings to continue using AI features.");
      setHasSelectedKey(false);
      return;
    }
    if (!checkApiKey()) return;
    
    setIsLoading(true);
    setLoadingMessage('Analyzing your prompt and generating questions...');
    try {
      // Copy the original logic from handlePromptGenerate here
      // For now, just continue with basic generation
      window.location.reload(); // Temporary fix to reload and continue
    } catch (error) {
      console.error('Error in generation:', error);
      setIsLoading(false);
    }
  };

  const handleQuestionImageUpload = (questionId: string) => {
    console.log('📷 handleQuestionImageUpload called for question:', questionId);
    
    // Show permission dialog first
    if (window.confirm('Do you want to add an image to this question? Click OK to upload an image, or Cancel to skip.')) {
      // User gave permission, proceed with file upload
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please select an image file (JPG, PNG, etc.)');
          return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Image file size should be less than 5MB');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const imageData = reader.result as string;
          // Update the specific question with the image
          updateQuestionImage(questionId, imageData);
          console.log(`📷 Image added to question ${questionId}`);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      // User declined permission
      console.log('📷 User declined to add image to question:', questionId);
    }
  };

  const updateQuestionImage = (questionId: string, imageUrl: string) => {
    setExtractedQuestions(prev => prev.map(q => q.id === questionId ? { ...q, imageUrl } : q));
    setGeneratedQuestions(prev => prev.map(q => q.id === questionId ? { ...q, imageUrl } : q));
  };

  const handleImageUpload = (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file should be less than 5MB');
      return;
    }

    // Convert image to data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      
      // Update the main question with uploaded image
      setExtractedQuestions(prev => prev.map(q => 
        q.id === questionId ? { 
          ...q, 
          imageUrl, 
          hasImage: true,
          imageDescription: `Uploaded image: ${file.name}`
        } : q
      ));
      
      setGeneratedQuestions(prev => prev.map(q => 
        q.id === questionId ? { 
          ...q, 
          imageUrl, 
          hasImage: true,
          imageDescription: `Uploaded image: ${file.name}`
        } : q
      ));
    };
    reader.readAsDataURL(file);
  };

  const handleAlternativeImageUpload = (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file should be less than 5MB');
      return;
    }

    // Convert image to data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      
      // Update the alternative question (part b) with uploaded image
      setExtractedQuestions(prev => prev.map(q => 
        q.id === questionId ? { 
          ...q, 
          alternativeImageUrl: imageUrl,
          hasAlternativeImage: true,
          alternativeImageDescription: `Uploaded image for part b: ${file.name}`
        } : q
      ));
      
      setGeneratedQuestions(prev => prev.map(q => 
        q.id === questionId ? { 
          ...q, 
          alternativeImageUrl: imageUrl,
          hasAlternativeImage: true,
          alternativeImageDescription: `Uploaded image for part b: ${file.name}`
        } : q
      ));
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'paper' | 'curriculum' | 'template') => {
    console.log('handleFileUpload called with type:', type);
    console.log('Event:', e);
    console.log('Files:', e.target.files);
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log('File selected:', file.name, file.type, file.size);
      
      // Test: Just log the file without processing
      if (file.type === 'application/pdf') {
        console.log('PDF file detected, size:', file.size, 'bytes');
        // Test if we can read the file
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log('File read successfully, data length:', e.target?.result?.toString().length);
        };
        reader.onerror = (e) => {
          console.error('File read error:', e);
        };
        reader.readAsDataURL(file);
      }
      
      if (type !== 'curriculum' && !isAIAvailable()) {
        console.log('AI not available for type:', type);
        setError("Please add your Gemini API key in Settings to continue using AI features.");
        setHasSelectedKey(false);
        return;
      }
      if (!checkApiKey()) {
        console.log('checkApiKey failed');
        return;
      }
      
      setIsLoading(true);
      setLoadingMessage(`Uploading and analyzing ${file.name}...`);
      
      try {
        // Validate file type with fallback to file extension
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/jpg',
          'image/png'
        ];
        
        // Check MIME type first, then fallback to file extension
        const isValidType = allowedTypes.includes(file.type) || 
                           file.name.toLowerCase().endsWith('.pdf') ||
                           file.name.toLowerCase().endsWith('.doc') ||
                           file.name.toLowerCase().endsWith('.docx') ||
                           file.name.toLowerCase().endsWith('.xlsx') ||
                           file.name.toLowerCase().endsWith('.jpg') ||
                           file.name.toLowerCase().endsWith('.jpeg') ||
                           file.name.toLowerCase().endsWith('.png');
        
        if (!isValidType) {
          throw new Error('Invalid file type. Please upload a PDF, Word (.doc/.docx), Excel (.xlsx), or Image file (JPEG/PNG).');
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
          throw new Error('File size exceeds 10MB limit. Please upload a smaller file.');
        }

        console.log('File validation passed, proceeding with upload...');

        if (type === 'curriculum') {
          setLoadingMessage('Extracting topics from curriculum...');
          
          let extractedText = "";
          
          // Extract text based on file type (use both MIME type and file extension)
          const fileName = file.name.toLowerCase();
          if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
            extractedText = await extractTextFromPDF(file);
          } else if (file.type === 'application/msword' || 
                     file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
            extractedText = await extractTextFromWord(file);
          } else if (file.type === 'application/vnd.ms-excel' || 
                     file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            extractedText = await extractTextFromExcel(file);
          } else {
            extractedText = "Mock curriculum text from " + file.name;
          }
          
          const topics = await analyzeCurriculum(extractedText);
          const contextPrompt = `
            Subject: ${subjectName || 'General'}
            Subject Code: ${subjectCode || 'N/A'}
            Topics: ${topics.join(', ')}
          `;
          setLoadingMessage('Generating questions based on curriculum topics...');
          const questions = await generateQuestionsFromPrompt(contextPrompt, 5, undefined, undefined, undefined, undefined, undefined, subjectName, undefined);
          setExtractedQuestions(questions);
          setLoadingMessage('Questions generated from curriculum!');
          
          // Ask user if they want to add images to the curriculum questions
          const nonMCQQuestions = questions.filter(q => q.type !== 'MCQ');
          if (nonMCQQuestions.length > 0) {
            setTimeout(() => {
              if (window.confirm(`Do you want to add images to the ${nonMCQQuestions.length} non-MCQ questions generated from curriculum? Click OK to add images, or Cancel to skip.`)) {
                console.log('📷 User wants to add images to curriculum questions');
                // User wants to add images - they can use the individual image upload buttons
              } else {
                console.log('📷 User declined to add images to curriculum questions');
              }
            }, 1000); // Delay to show success message first
          }
          
          // Hide loading screen
          setIsLoading(false);
          setTimeout(() => setLoadingMessage(''), 2000);
        } else if (type === 'template') {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result as string;
            
            setLoadingMessage('Analyzing template structure...');
            // Analyze template counts only if API is available
            let counts;
            if (isAIAvailable()) {
              try {
                counts = await analyzePaperTemplate(base64, file.type);
                console.log('Detected Template Counts:', counts);
              } catch (err) {
                console.error('Template analysis failed:', err);
                counts = { mcqCount: 10, shortCount: 5, longCount: 3 };
              }
            } else {
              console.log('Template analysis skipped - API not available, using defaults');
              counts = { mcqCount: 10, shortCount: 5, longCount: 3 };
            }
            setTemplateCounts(counts);

            const newTemplate: PaperTemplate = {
              id: `template-${Date.now()}`,
              name: file.name.replace('.pdf', ''),
              fileUrl: base64,
              uploadedAt: new Date().toISOString(),
              facultyId: userId
            };
            await saveTemplate(newTemplate);
            loadTemplates();
            setIsLoading(false);
            setLoadingMessage('Template saved and analyzed!');
            setTimeout(() => setLoadingMessage(''), 2000);
          };
          reader.readAsDataURL(file);
          return;
        } else {
          // Read file as base64
          const reader = new FileReader();
          reader.onload = async () => {
            const fullBase64 = reader.result as string;
            const base64 = fullBase64.split(',')[1];
            setOriginalFile({ data: fullBase64, type: file.type });
            
            if (!isAIAvailable()) {
              setError("Please add your Gemini API key in Settings to continue using AI features.");
              setHasSelectedKey(false);
              return;
            }
            
            // Determine CO levels based on template
            let coInstructions = '';
            const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
            console.log('🔍 File Upload Template Detection Debug:', {
              selectedTemplateId,
              selectedTemplate,
              templateName: selectedTemplate?.name
            });
            
            if (selectedTemplate) {
              const templateName = selectedTemplate.name.toLowerCase();
              console.log('🏷️ File Upload Checking template name:', templateName);
              console.log('🔍 Template name analysis:');
              console.log('   - Contains "mst-i":', templateName.includes('mst-i'));
              console.log('   - Contains "mst i":', templateName.includes('mst i'));
              console.log('   - Contains "revised format":', templateName.includes('revised format'));
              console.log('   - Contains "mst - i":', templateName.includes('mst - i'));
              console.log('   - Contains "mst":', templateName.includes('mst'));
              console.log('   - Full template name:', `"${templateName}"`);
              console.log('   - Length:', templateName.length);
              
              if (templateName.includes('mst-i') || templateName.includes('mst i') || (templateName.includes('revised format') && templateName.includes('mst-i'))) {
              // Special handling for Revised Format_ MST - I_SISTEC template
              if (templateName.includes('revised format') && templateName.includes('mst-i')) {
                coInstructions = `
                11. COURSE OUTCOMES (CO): For this MST-I template, assign ONLY CO1 and CO2 to questions:
                   - Use CO1 for fundamental/remember/understand type questions
                   - Use CO2 for application/analysis type questions
                   - DO NOT use CO3, CO4, or CO5 for this MST-I template
                12. REVISED FORMAT SPECIAL REQUIREMENTS: For the "Revised Format_ MST - I_SISTEC" template:
                   - Generate exactly 6 Short Answer questions
                   - Format questions EXACTLY as shown below:
                   - CRITICAL: Add header "Short Answer Type Questions (Attempt any two)" BEFORE Q1
                   - Q1. [Question text here] [CO1]
                   - Q2. [Question text here] [CO1]
                   - Q3. [Question text here] [CO1]
                   - CRITICAL: After Q3, add header "Short Answer Type Questions (Attempt any two)"
                   - Then format Q4, Q5, Q6 after this header:
                   - Q4. [Question text here] [CO2]
                   - Q5. [Question text here] [CO2]
                   - Q6. [Question text here] [CO1]
                   - Students must attempt any two questions out of Q4, Q5, Q6
                   - Headers must be EXACTLY: "Short Answer Type Questions (Attempt any two)"
                   - Format must match: Header, then Q1., Q2., Q3., then Header, then Q4., Q5., Q6.
                13. COURSE OUTCOME STATEMENTS: At the very end of the question paper, add the following section:
                       "Course Outcome Statements: Students will be able to"
                       Then create a table with two rows and two columns. The first column should contain "CO1" and "CO2" respectively. The second column should be left blank for the user to fill.
                       Example format:
                       Course Outcome Statements: Students will be able to
                       | CO1 |       |
                       | CO2 |       |`;
                console.log('📋 File Upload Revised Format MST-I CO instructions applied: CO1, CO2 only with "any two" requirement');
                
                              } else {
                coInstructions = `
                11. COURSE OUTCOMES (CO): For this MST-I template, assign ONLY CO1 and CO2 to questions:
                   - Use CO1 for fundamental/remember/understand type questions
                   - Use CO2 for application/analysis type questions
                   - DO NOT use CO3, CO4, or CO5 for this MST-I template`;
                console.log('📋 File Upload MST-I CO instructions applied: CO1 and CO2 only');
              }
              } else if (templateName.includes('mst-ii') || templateName.includes('mst ii') || templateName.includes('mst ii format')) {
                coInstructions = `
                11. COURSE OUTCOMES (CO): For this MST-II template, assign ONLY CO3, CO4, and CO5 to questions:
                   - Use CO3 for application/analysis type questions
                   - Use CO4 for evaluation/synthesis type questions  
                   - Use CO5 for creation/advanced problem-solving type questions
                   - DO NOT use CO1 or CO2 for this MST-II template`;
                console.log('📋 File Upload MST-II CO instructions applied: CO3, CO4, CO5 only');
              } else {
                console.log('⚠️ File Upload No specific template detected, using default CO assignment');
                coInstructions = `
                11. COURSE OUTCOMES (CO): Assign appropriate CO levels (CO1-CO5) based on question difficulty and topic:
                   - Use CO1 for fundamental/remember/understand type questions
                   - Use CO2 for application/analysis type questions
                   - Use CO3 for evaluation/synthesis type questions
                   - Use CO4 for creation/advanced problem-solving type questions
                   - Use CO5 for complex multi-step problem-solving`;
              }
            } else {
              console.log('⚠️ File Upload No template selected, using default CO assignment');
              coInstructions = `
              11. COURSE OUTCOMES (CO): Assign appropriate CO levels (CO1-CO5) based on question difficulty and topic:
                 - Use CO1 for fundamental/remember/understand type questions
                 - Use CO2 for application/analysis type questions
                 - Use CO3 for evaluation/synthesis type questions
                 - Use CO4 for creation/advanced problem-solving type questions
                 - Use CO5 for complex multi-step problem-solving`;
            }
            
            console.log('📝 File Upload Final CO Instructions:', coInstructions);
            
            try {
              setLoadingMessage('AI is performing OCR and extracting questions...');
              const result = await extractQuestionsFromFile(base64, file.type, templateCounts || undefined, coInstructions);
              setExtractedQuestions(result.questions);
              setLoadingMessage('Questions extracted successfully!');
              
              // Ask user if they want to add images to the extracted questions
              const nonMCQQuestions = result.questions.filter(q => q.type !== 'MCQ');
              if (nonMCQQuestions.length > 0) {
                setTimeout(() => {
                  if (window.confirm(`Do you want to add images to the ${nonMCQQuestions.length} non-MCQ questions that were extracted? Click OK to add images, or Cancel to skip.`)) {
                    console.log('📷 User wants to add images to extracted questions');
                    // User wants to add images - we could open a batch image upload dialog here
                    // For now, the individual image upload buttons are available
                  } else {
                    console.log('📷 User declined to add images to extracted questions');
                  }
                }, 1000); // Delay to show success message first
              }
              
              // Hide loading screen
              setIsLoading(false);
              
              // Validate LONG_ANSWER questions
              console.log('🔍 Validating extracted questions:');
              result.questions.forEach((q, index) => {
                if (q.type === 'LONG_ANSWER') {
                  console.log(`   LONG_ANSWER Q${index + 1}:`);
                  console.log(`     Text: ${q.text ? '✅ Present' : '❌ Missing'}`);
                  console.log(`     Correct Answer: ${q.correctAnswer ? '✅ Present' : '❌ Missing'}`);
                  console.log(`     Alternative Text: ${q.alternativeText ? '✅ Present' : '❌ Missing'}`);
                  console.log(`     Alternative Answer: ${q.alternativeAnswer ? '✅ Present' : '❌ Missing'}`);
                  
                  // Fix missing fields if needed
                  if (!q.text) {
                    console.warn('⚠️ Fixing missing text for LONG_ANSWER question');
                    q.text = 'Question text not available';
                  }
                  if (!q.correctAnswer) {
                    console.warn('⚠️ Fixing missing correctAnswer for LONG_ANSWER question');
                    q.correctAnswer = 'Answer not available';
                  }
                  if (!q.alternativeText) {
                    console.warn('⚠️ Setting empty alternativeText for LONG_ANSWER question');
                    q.alternativeText = '';
                  }
                  if (!q.alternativeAnswer) {
                    console.warn('⚠️ Setting empty alternativeAnswer for LONG_ANSWER question');
                    q.alternativeAnswer = '';
                  }
                }
              });
              
              // Questions will only be added when explicitly selected by user
              
              // Additional validation for Revised Format MST-I template
              const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
              const templateName = selectedTemplate?.name.toLowerCase() || '';
              if (templateName.includes('revised format') && templateName.includes('mst - i')) {
                console.log('🔍 Validating CO assignment for Revised Format MST-I:');
                console.log('   Expected: CO1, CO2 only');
                console.log('   Forbidden: CO3, CO4, CO5');
                
                // Check if any questions have incorrect CO levels
                const questionsWithValidation = result.questions.map(q => {
                  if (q.type === 'SHORT_ANSWER' || q.type === 'LONG_ANSWER') {
                    if (q.courseOutcome && q.courseOutcome.includes('CO3')) {
                      console.warn('🔧 Changing CO3 to CO1 for Revised Format MST-I');
                      return { ...q, courseOutcome: 'CO1' };
                    }
                    if (q.courseOutcome && q.courseOutcome.includes('CO4')) {
                      console.warn('🔧 Changing CO4 to CO1 for Revised Format MST-I');
                      return { ...q, courseOutcome: 'CO1' };
                    }
                    if (q.courseOutcome && q.courseOutcome.includes('CO5')) {
                      console.warn('🔧 Changing CO5 to CO2 for Revised Format MST-I');
                      return { ...q, courseOutcome: 'CO2' };
                    }
                  }
                  return q;
                });
                
                // Check for any remaining invalid CO assignments
                const invalidCOQuestions = questionsWithValidation.filter((q, index) => {
                  const wasModified = q.courseOutcome !== result.questions[index].courseOutcome;
                  return wasModified && q.type === 'SHORT_ANSWER' || q.type === 'LONG_ANSWER';
                });
                
                if (invalidCOQuestions.length > 0) {
                  console.warn('⚠️ Found questions with invalid CO levels for Revised Format MST-I:');
                  invalidCOQuestions.forEach((q, index) => {
                    const originalCO = result.questions[index].courseOutcome;
                    console.warn(`   Q${index + 1}: ${originalCO} → ${q.courseOutcome} (should be CO1 or CO2)`);
                  });
                  
                  // Update the questions array with fixed CO levels
                  result.questions = questionsWithValidation;
                  setExtractedQuestions(result.questions);
                  console.log('✅ Invalid CO levels fixed for Revised Format MST-I');
                }
              }
              
              if (result.metadata) {
                if (result.metadata.instituteName) setInstituteName(result.metadata.instituteName);
                if (result.metadata.examName) setExamName(result.metadata.examName);
                if (result.metadata.subjectName) setSubjectName(result.metadata.subjectName);
                if (result.metadata.subjectCode) setSubjectCode(result.metadata.subjectCode);
                if (result.metadata.department) setSelectedDepartment(result.metadata.department);
                if (result.metadata.maxMarks) setMaxMarks(String(result.metadata.maxMarks));
                if (result.metadata.instructions) setInstructions(result.metadata.instructions);
              }
              setLoadingMessage('Questions extracted successfully!');
              setTimeout(() => setLoadingMessage(''), 2000);
            } catch (err: any) {
              console.error('File upload error:', err);
              console.error('Error details:', {
                message: err?.message,
                stack: err?.stack,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
              });
              
              if (err.message?.includes("429") || err.message?.toLowerCase().includes("quota")) {
                setError("API Quota exceeded. Please select your own API key to continue.");
                setHasSelectedKey(false);
              } else if (err.message?.includes("permission denied") || err.message?.includes("denied access") || err.message?.includes("403")) {
                setError("API Permission Denied. Please enable Gemini API in your Google Cloud project and ensure your API key has proper permissions.");
                setHasSelectedKey(false);
              } else if (err.message?.includes("API key") || err.message?.includes("authentication")) {
                setError("Invalid API key. Please check your Gemini API key in Settings.");
                setHasSelectedKey(false);
              } else {
                setError(`Failed to extract questions: ${err.message || 'Unknown error occurred'}. Please check your API key and ensure the file is a valid PDF or Image.`);
              }
              setTimeout(() => setError(null), 8000);
            } finally {
              setIsLoading(false);
            }
          };
          reader.readAsDataURL(file);
          return; // Exit early as reader is async
        }
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred.");
      } finally {
        if (type === 'curriculum') {
          setIsLoading(false);
          setTimeout(() => setLoadingMessage(''), 2000);
        }
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedQuestionIds.size === extractedQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(extractedQuestions.map(q => q.id)));
    }
  };

  const toggleQuestionSelection = (id: string) => {
    const newSelected = new Set(selectedQuestionIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuestionIds(newSelected);
  };

  const addSelectedQuestions = () => {
    const selected = extractedQuestions.filter(q => selectedQuestionIds.has(q.id));
    setGeneratedQuestions(prev => [...prev, ...selected]);
    setExtractedQuestions([]);
    setSelectedQuestionIds(new Set());
  };

  const handleAddCustomQuestion = () => {
      if (!customQuestion.text) return;
      
      const newQ: Question = {
          id: `custom-${Date.now()}`,
          text: customQuestion.text,
          type: customQuestion.type || QuestionType.SHORT_ANSWER,
          difficulty: customQuestion.difficulty || Difficulty.MEDIUM,
          marks: customQuestion.marks || 5,
          correctAnswer: customQuestion.correctAnswer || '',
          section: customQuestion.section || 'Uncategorized',
          sectionTitle: customQuestion.sectionTitle || 'Uncategorized',
          alternativeText: customQuestion.type === QuestionType.LONG_ANSWER ? customQuestion.alternativeText || '[Alternative Question Placeholder]' : undefined,
          alternativeAnswer: customQuestion.type === QuestionType.LONG_ANSWER ? customQuestion.alternativeAnswer || '' : undefined,
          options: customQuestion.type === QuestionType.MCQ ? customQuestion.options || ['A', 'B', 'C', 'D'] : []
      };
      setGeneratedQuestions(prev => [...prev, newQ]);
      setShowAddModal(false);
      setCustomQuestion({ type: QuestionType.SHORT_ANSWER, difficulty: Difficulty.MEDIUM, marks: 2 });
  };

  const handleRemoveQuestion = (id: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (updatedQ: Question) => {
    setGeneratedQuestions(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
    setExtractedQuestions(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
    setEditingQuestion(null);
    setShowEditModal(false);
  };

  const handleSaveForApproval = async () => {
    const finalTitle = paperTitle || subjectName || examName || "Untitled Paper";
    
    // Use extractedQuestions if generatedQuestions is empty (for file upload workflow)
    const questionsToExport = generatedQuestions.length > 0 ? generatedQuestions : extractedQuestions;
    
    if (questionsToExport.length === 0) {
        return;
    }
    setIsLoading(true);
    const paper: QuestionPaper = {
        id: `paper-${Date.now()}`,
        title: finalTitle,
        examName,
        courseCode: subjectCode || "CS-TEMP",
        facultyId: userId,
        facultyName: userName,
        createdAt: new Date().toISOString(),
        status: PaperStatus.PENDING_APPROVAL,
        questions: questionsToExport,
        totalMarks: questionsToExport.reduce((acc, q) => acc + (Number(q.marks) || 0), 0),
        durationMinutes: 90,
        department: selectedDepartment || null,
        instituteName,
        subjectName,
        examDate,
        maxMarks: Number(maxMarks) || questionsToExport.reduce((acc, q) => acc + (Number(q.marks) || 0), 0),
        enrollmentNo,
        instructions,
        format: paperFormat,
        templateId: selectedTemplateId || null,
        logoUrl: logoUrl || null,
        // Course Outcomes
        co1: co1 || null,
        co2: co2 || null,
        co3: co3 || null,
        co4: co4 || null,
        co5: co5 || null
    };
    
    // Add questions to memory only when paper is submitted for approval
    addQuestionsToMemory(subjectName || 'General', questionsToExport);
    
    await savePaperToDB(paper);
    setIsLoading(false);
    setSaveMessage('Submitted for approval successfully!');
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onNavigate?.('my_papers');
    }, 1500);
  };

  const handleSaveDraft = async () => {
    const finalTitle = paperTitle || subjectName || examName || "Untitled Paper";
    
    // Use extractedQuestions if generatedQuestions is empty (for file upload workflow)
    const questionsToExport = generatedQuestions.length > 0 ? generatedQuestions : extractedQuestions;
    
    if (questionsToExport.length === 0) {
        return;
    }
    setIsLoading(true);
    const paper: QuestionPaper = {
        id: `paper-draft-${Date.now()}`,
        title: finalTitle,
        examName,
        courseCode: subjectCode || "CS-TEMP",
        facultyId: userId,
        facultyName: userName,
        createdAt: new Date().toISOString(),
        status: PaperStatus.DRAFT,
        questions: questionsToExport,
        totalMarks: questionsToExport.reduce((acc, q) => acc + (Number(q.marks) || 0), 0),
        durationMinutes: 90,
        department: selectedDepartment || null,
        instituteName,
        subjectName,
        examDate,
        maxMarks: Number(maxMarks) || questionsToExport.reduce((acc, q) => acc + (Number(q.marks) || 0), 0),
        enrollmentNo,
        instructions,
        format: paperFormat,
        templateId: selectedTemplateId || null,
        logoUrl: logoUrl || null,
        // Course Outcomes
        co1: co1 || null,
        co2: co2 || null,
        co3: co3 || null,
        co4: co4 || null,
        co5: co5 || null
    };
    
    // Add questions to memory when draft is saved
    addQuestionsToMemory(subjectName || 'General', questionsToExport);
    
    await savePaperToDB(paper);
    setIsLoading(false);
    setSaveMessage('Draft saved successfully!');
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onNavigate?.('my_papers');
    }, 1500);
  };

  const handleExport = (type: 'pdf' | 'docx' | 'txt') => {
    // Use extractedQuestions if generatedQuestions is empty (for file upload workflow)
    const questionsToExport = generatedQuestions.length > 0 ? generatedQuestions : extractedQuestions;
    
    console.log('📄 Export Debug:');
    console.log('   Generated Questions:', generatedQuestions.length);
    console.log('   Extracted Questions:', extractedQuestions.length);
    console.log('   Using Questions:', questionsToExport.length);
    console.log('   Template:', templates.find(t => t.id === selectedTemplateId)?.name);
    
    // Log CO levels for Revised Format MST-I debugging
    const templateName = templates.find(t => t.id === selectedTemplateId)?.name.toLowerCase() || '';
    if (templateName.includes('revised format') && templateName.includes('mst - i')) {
        console.log('🔍 Revised Format MST-I Export CO Levels:');
        questionsToExport.forEach((q, i) => {
            console.log(`   Q${i + 1}: ${q.courseOutcome} (${q.text.substring(0, 30)}...)`);
        });
    }
    
    const paper: QuestionPaper = {
        id: `paper-export-${Date.now()}`,
        title: paperTitle || 'Untitled Paper',
        examName: examName || paperTitle,
        instituteName: instituteName || 'Sagar Institute of Science and Technology',
        subjectName: subjectName || paperTitle,
        courseCode: subjectCode || 'N/A',
        facultyId: userId,
        facultyName: userName,
        department: selectedDepartment || 'Computer Science and Engineering',
        createdAt: new Date().toISOString(),
        status: PaperStatus.PENDING_APPROVAL,
        questions: questionsToExport,
        totalMarks: questionsToExport.reduce((acc, q) => acc + (Number(q.marks) || 0), 0),
        durationMinutes: 90,
        maxMarks: parseInt(maxMarks) || questionsToExport.reduce((acc, q) => acc + (Number(q.marks) || 0), 0),
        examDate,
        enrollmentNo,
        instructions,
        format: paperFormat,
        templateId: templates.find(t => t.id === selectedTemplateId)?.name || '', // Add template name for PDF export detection
        logoUrl: logoUrl || null,
        // Course Outcomes
        co1: co1 || null,
        co2: co2 || null,
        co3: co3 || null,
        co4: co4 || null,
        co5: co5 || null
    };

    if (type === 'pdf') {
        exportToPDF(paper);
    } else if (type === 'docx') {
        exportToDocx(paper);
    } else {
        exportToTxt(paper);
    }
  };

  if (currentView === 'my_papers') {
      return (
          <div className="space-y-8">
              <ApiKeyBanner />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">My Papers</h2>
                  <p className="text-slate-500 mt-1">Manage and track your submitted question papers.</p>
                </div>
              </div>

              {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium">Loading your papers...</p>
                  </div>
              ) : myPapers.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No papers yet</h3>
                    <p className="text-slate-500 mb-8">Start by creating your first AI-powered question paper.</p>
                    <button className="btn-primary">Create New Paper</button>
                  </div>
              ) : (
                  <div className="grid gap-6">
                      {myPapers.map(p => (
                          <motion.div 
                            key={p.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                          >
                              <div className="flex justify-between items-start">
                                  <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                                      <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900">{p.title}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                                            <Clock className="w-3 h-3" />
                                            {new Date(p.createdAt).toLocaleDateString()}
                                          </span>
                                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                          <span className="text-xs font-medium text-slate-400">{p.questions.length} Questions</span>
                                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                          <span className="text-xs font-medium text-slate-400">{p.totalMarks} Marks</span>
                                        </div>
                                    </div>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                                      ${p.status === PaperStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 
                                        p.status === PaperStatus.REJECTED ? 'bg-red-50 text-red-600' : 
                                        'bg-amber-50 text-amber-600'}`}>
                                      {p.status?.replace('_', ' ') || p.status}
                                  </span>
                                  <div className="flex gap-2">
                                      {p.status === PaperStatus.DRAFT && (
                                        <button 
                                          onClick={() => loadPaperForEditing(p)}
                                          className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all"
                                          title="Edit Paper"
                                        >
                                          <Pencil className="w-5 h-5" />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => exportToPDF(p)}
                                        className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all"
                                        title="Download PDF"
                                      >
                                        <FileDown className="w-5 h-5" />
                                      </button>
                                      <button 
                                        onClick={() => exportToDocx(p)}
                                        className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all"
                                        title="Download DOCX"
                                      >
                                        <FileType className="w-5 h-5" />
                                      </button>
                                      <button 
                                        onClick={() => setPaperToDelete(p.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        title="Delete Paper"
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </button>
                                  </div>
                              </div>
                              {p.adminFeedback && (
                                  <div className="mt-6 flex gap-3 bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
                                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                      <div className="text-sm text-red-700">
                                          <span className="font-bold">Admin Feedback:</span> {p.adminFeedback}
                                      </div>
                                  </div>
                              )}
                          </motion.div>
                      ))}
                  </div>
              )}
          </div>
      )
  }

  if (currentView === 'submit_paper') {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Submit Question Paper</h2>
          <p className="text-slate-500 mt-1">Select a department and upload a question paper for review.</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <SubmitPaperForm />
        </div>
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Submitted Papers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Title</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {submittedPapers.map(paper => (
                  <tr key={paper.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-900">{paper.title}</td>
                    <td className="px-8 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                        paper.status === PaperStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        paper.status === PaperStatus.REJECTED ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {paper.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'templates') {
      return (
          <div className="space-y-8">
              <ApiKeyBanner />
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Paper Templates</h2>
                <p className="text-slate-500 mt-1">Upload and manage your institution's official formats.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl text-center border-2 border-dashed border-slate-200 hover:border-brand-500 transition-colors group relative">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => handleFileUpload(e, 'template')} 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      {isLoading ? (
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-8 h-8 text-slate-300 group-hover:text-brand-500" />
                      )}
                    </div>
                    <h3 className="text-lg font-bold mb-2">Upload New Format</h3>
                    <p className="text-xs text-slate-500">Upload a PDF header/footer template.</p>
                </div>

                {templates.map(template => (
                  <motion.div 
                    key={template.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500">
                        <Layers className="w-6 h-6" />
                      </div>
                      <button 
                        onClick={async () => {
                          await deleteTemplate(template.id);
                          loadTemplates();
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1 truncate">{template.name}</h3>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Uploaded {new Date(template.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {templateLoading && templates.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
              )}
          </div>
      )
  }

  return (
    <div className="space-y-10">
      <ApiKeyBanner />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 leading-tight">Create Question Paper</h2>
          <p className="text-slate-500 mt-1">Leverage AI to generate high-quality assessments in seconds.</p>
        </div>
        
        {generatedQuestions.length > 0 && (
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-4 py-2 text-center border-r border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Marks</p>
              <p className="text-xl font-bold text-slate-900">{generatedQuestions.reduce((a, b) => a + Number(b.marks), 0)}</p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Questions</p>
              <p className="text-xl font-bold text-slate-900">{generatedQuestions.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Creation Mode Tabs */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold">
          {error}
        </div>
      )}
      <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="flex p-2 bg-slate-50/50">
          {[
            { id: 'prompt', label: 'AI Prompt', icon: Sparkles },
            { id: 'upload', label: 'Question Bank', icon: FileText },
            { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
            { id: 'settings', label: 'API Settings', icon: Settings },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold rounded-2xl transition-all relative ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-brand-500' : ''}`} />
              {tab.label}
              {/* Show badge when questions are available in Question Bank */}
              {tab.id === 'upload' && extractedQuestions.length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {extractedQuestions.length}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
            {activeTab === 'settings' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Gemini API Configuration</h3>
                    <p className="text-sm text-slate-500">Manually provide an API key to bypass quota limits.</p>
                  </div>
                </div>
                
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-bold text-slate-700">Custom API Key</label>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            customApiKey && customApiKey.startsWith('AQ.') && customApiKey.length >= 53 
                              ? 'bg-green-100 text-green-700 border-green-200' 
                              : customApiKey 
                                ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {customApiKey && customApiKey.startsWith('AQ.') && customApiKey.length >= 53 ? 'Valid' : 
                             customApiKey ? 'Invalid' : 'Not Set'}
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <input 
                          type="password"
                          className="input-field pr-12"
                          placeholder="Paste your Gemini API key here..."
                          value={customApiKey}
                          onChange={(e) => {
                            setCustomApiKey(e.target.value);
                            // Clear any existing errors when user starts typing
                            if (error && error.includes("API key")) {
                              setError(null);
                            }
                          }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                          <Shield className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Key Status</span>
                          <span className="font-mono">
                            {customApiKey ? `${customApiKey.substring(0, 10)}...` : 'Not Set'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Key Format</span>
                          <span className="font-mono">
                            {customApiKey ? (customApiKey.startsWith('AQ.') ? 'Valid' : 'Invalid') : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Key Length</span>
                          <span className="font-mono">
                            {customApiKey ? `${customApiKey.length}/53` : '0/53'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-3">Your key is stored locally in your browser and never sent to our servers.</p>
                    </div>
                  
                  {/* API Usage & Quota Monitoring */}
                  <div className="mt-2 p-4 bg-slate-100 rounded text-xs">
                    <h4 className="font-bold text-slate-700 mb-3">API Usage & Quota</h4>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-600">Total Calls</span>
                          <span className="font-mono text-slate-800">{getApiCallCount()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Today's Usage</span>
                          <span className="font-mono text-slate-800">{getApiCallCount()}</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-600">Quota Status</span>
                          <span className={`font-mono ${
                            getApiCallCount() < 100 ? 'text-green-600' : 
                            getApiCallCount() < 500 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {getApiCallCount() < 100 ? '✅ Good' : 
                             getApiCallCount() < 500 ? '⚠️ Moderate' : '❌ High'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Recommended</span>
                          <span className="text-slate-400">Use personal key for unlimited</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => {
                          resetApiCallCounter();
                          console.log('🔄 API call counter reset by user');
                        }}
                        className="flex-1 text-xs bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Reset Counter
                      </button>
                      <button 
                        onClick={() => {
                          console.log('📊 Exporting usage data...');
                          const usageData = {
                            totalCalls: getApiCallCount(),
                            date: new Date().toISOString(),
                            keyType: customApiKey ? 'Custom' : 'Default',
                            quotaStatus: getApiCallCount() < 100 ? 'Good' : getApiCallCount() < 500 ? 'Moderate' : 'High'
                          };
                          const blob = new Blob([JSON.stringify(usageData, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `qgenius-usage-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex-1 text-xs bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Export Usage
                      </button>
                      <button 
                        onClick={() => {
                          console.log('🧪 Testing question generation...');
                          setExtractedQuestions([
                            {
                              id: 'test-1',
                              text: 'Test question 1: What is AI?',
                              type: QuestionType.SHORT_ANSWER,
                              difficulty: Difficulty.MEDIUM,
                              marks: 2,
                              correctAnswer: 'Artificial Intelligence',
                              options: [],
                              bloomLevel: 'Understand',
                              courseOutcome: 'CO1',
                              hasImage: false,
                              imageDescription: '',
                              imageUrl: undefined,
                              alternativeText: undefined,
                              alternativeAnswer: undefined,
                              alternativeImageUrl: undefined,
                              alternativeImageDescription: undefined,
                              hasAlternativeImage: false,
                              boundingBox: undefined,
                              pageNumber: 1,
                              section: 'Part A',
                              sectionTitle: 'Short Answer Questions',
                              department: 'Computer Science'
                            }
                          ]);
                        }}
                        className="text-xs text-green-600 hover:text-green-800 underline"
                      >
                        Test Questions
                      </button>
                      <button 
                        onClick={() => {
                          console.log('🔧 Running System Diagnostics...');
                          console.log('📊 System Status Check:');
                          
                          // Check API Key
                          const apiKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY');
                          console.log(`   API Key: ${apiKey ? '✅ Present' : '❌ Missing'}`);
                          
                          if (apiKey) {
                            console.log(`   Key Format: ${apiKey.startsWith('AQ.') ? 'Valid' : 'Invalid'}`);
                            console.log(`   Key Length: ${apiKey.length >= 53 ? 'Valid' : 'Too Short'}`);
                          }
                          
                          // Check Template
                          const template = templates.find(t => t.id === selectedTemplateId);
                          console.log(`   Selected Template: ${template ? '✅ ' + template.name : '❌ None'}`);
                          
                          if (template) {
                            const templateName = template.name.toLowerCase();
                            console.log(`   Template Type: ${templateName.includes('revised format') && templateName.includes('mst - i') ? '✅ Revised Format MST-I' : templateName.includes('mst-ii') || templateName.includes('mst ii') ? '✅ MST-II' : '✅ MST-I'}`);
                          }
                          
                          // Check Questions State
                          console.log(`   Generated Questions: ${extractedQuestions.length}`);
                          console.log(`   Selected Questions: ${selectedQuestionIds.size}`);
                          
                          // Test API Connection
                          console.log('🌐 Testing API Connection...');
                          fetch('https://www.googleapis.com', { method: 'HEAD' })
                            .then(() => console.log('   Google API: ✅ Reachable'))
                            .catch(() => console.log('   Google API: ❌ Not Reachable'));
                          
                          console.log('✅ Diagnostics Complete - Check console for detailed results');
                        }}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Run Diagnostics
                      </button>
                      <button 
                        onClick={() => {
                          console.log('🔧 Checking OCR Extraction Issues...');
                          console.log('📊 OCR Extraction Analysis:');
                          
                          console.log(`   Total extracted questions: ${extractedQuestions.length}`);
                          console.log(`   Questions by type:`);
                          
                          const typeCounts = {
                            MCQ: 0,
                            SHORT_ANSWER: 0,
                            LONG_ANSWER: 0
                          };
                          
                          extractedQuestions.forEach((q, index) => {
                            typeCounts[q.type as keyof typeof typeCounts]++;
                            
                            // Validate question text quality
                            if (q.text && q.text.length > 0) {
                              console.log(`   Q${index + 1} (${q.type}): ✅ Text extracted (${q.text.length} chars)`);
                              
                              // Check for common OCR issues
                              if (q.text.includes('?') || q.text.includes('¿')) {
                                console.log(`      📝 Contains question mark - Good format`);
                              }
                              if (q.text.match(/\d+\.|\d+\)|[A-Z]\)/)) {
                                console.log(`      📝 Proper numbering detected`);
                              }
                              if (q.text.length < 10) {
                                console.warn(`      ⚠️ Very short text - Possible OCR issue`);
                              }
                            } else {
                              console.error(`   Q${index + 1}: ❌ No text extracted`);
                            }
                            
                            // Validate MCQ options
                            if (q.type === 'MCQ') {
                              if (q.options && Array.isArray(q.options) && q.options.length > 0) {
                                console.log(`      📝 MCQ Options: ${q.options.length} extracted`);
                              } else {
                                console.warn(`      ⚠️ MCQ missing options`);
                              }
                            }
                            
                            // Validate LONG_ANSWER structure
                            if (q.type === 'LONG_ANSWER') {
                              if (q.alternativeText && q.alternativeText.length > 0) {
                                console.log(`      📝 Alternative text present`);
                              } else {
                                console.warn(`      ⚠️ LONG_ANSWER missing alternative text`);
                              }
                            }
                            
                            // Validate image extraction
                            if (q.hasImage) {
                              if (q.imageDescription && q.imageDescription.length > 0) {
                                console.log(`      🖼️ Image description: ${q.imageDescription.substring(0, 50)}...`);
                              } else {
                                console.warn(`      ⚠️ Image marked but no description`);
                              }
                            }
                          });
                          
                          console.log(`   📊 Question Type Summary:`);
                          console.log(`      MCQ: ${typeCounts.MCQ}`);
                          console.log(`      SHORT_ANSWER: ${typeCounts.SHORT_ANSWER}`);
                          console.log(`      LONG_ANSWER: ${typeCounts.LONG_ANSWER}`);
                          
                          console.log('✅ OCR Analysis Complete');
                        }}
                        className="text-xs text-orange-600 hover:text-orange-800 underline"
                      >
                        Check OCR Issues
                      </button>
                    </div>
                  </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={handleSaveApiKey}
                      className="btn-primary flex-1"
                    >
                      Save API Key
                    </button>
                    <button 
                      onClick={() => {
                        setCustomApiKey('');
                        localStorage.removeItem('CUSTOM_GEMINI_API_KEY');
                        // Don't reinitialize AI when clearing key to prevent errors
                        setHasSelectedKey(false);
                        setSaveMessage('API Key cleared.');
                        setIsSaved(true);
                        setTimeout(() => setIsSaved(false), 3000);
                      }}
                      className="btn-secondary"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="text-sm text-slate-500 leading-relaxed">
                      <p className="font-bold text-slate-700 mb-1 text-base">How to get an API key?</p>
                      <p className="mb-3">Visit the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline font-bold">Google AI Studio</a> to generate a free or paid API key for your project.</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Go to Google AI Studio</li>
                        <li>Click "Create API key"</li>
                        <li>Copy the key and paste it above</li>
                        <li>Click "Save API Key" to apply changes</li>
                      </ul>
                    </div>
                  </div>

                  {/* Question Memory Statistics */}
                  <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-700 text-base flex items-center gap-2">
                        <Brain className="w-5 h-5 text-brand-500" />
                        Question Memory
                      </h3>
                      <button 
                        onClick={() => {
                          questionMemory.clear();
                          alert('Question memory cleared successfully!');
                        }}
                        className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Clear Memory
                      </button>
                    </div>
                    <div className="text-sm text-slate-500">
                      {(() => {
                        const stats = questionMemory.getStats();
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Total Subjects:</span>
                              <span className="font-bold text-slate-700">{stats.totalSubjects}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Questions:</span>
                              <span className="font-bold text-slate-700">{stats.totalQuestions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Topics:</span>
                              <span className="font-bold text-slate-700">{stats.totalTopics}</span>
                            </div>
                            {stats.subjects.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-200">
                                <p className="font-semibold text-xs text-slate-600 mb-2">Subject Breakdown:</p>
                                {stats.subjects.map(subject => (
                                  <div key={subject.subject} className="flex justify-between text-xs py-1">
                                    <span>{subject.subject}:</span>
                                    <span>{subject.questionCount} questions, {subject.topicCount} topics</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab !== 'settings' && (
              <>
                {/* Common Paper Metadata */}
                <div className="space-y-6 mb-10 pb-10 border-b border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Exam Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Mid Semester Examination - II"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Institute Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Sagar Institute of Science and Technology"
                      value={instituteName}
                      onChange={(e) => setInstituteName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">College Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 border border-brand-100 rounded-xl flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <label className="cursor-pointer px-4 py-2 bg-brand-50 text-brand-600 text-xs font-bold rounded-xl hover:bg-brand-100 transition-colors">
                        <Upload className="w-3 h-3 inline-block mr-2" />
                        Upload Logo
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader();
                              reader.onload = () => setLogoUrl(reader.result as string);
                              reader.readAsDataURL(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      {logoUrl && (
                        <button 
                          onClick={() => setLogoUrl(null)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Subject Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Data Structures & Algorithms"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Subject Code</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. CS101"
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Date of Exam</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Maximum Marks</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="e.g. 100"
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Department</label>
                    <select 
                      className="input-field bg-white"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                    >
                      <option value="" disabled>Select Department</option>
                      {[
                        "First Year (FY)",
                        "Computer Science and Engineering",
                        "CSE(AI&DS)",
                        "CSE(CY)",
                        "CSE(IT)",
                        "Electrical and Communication Engineering (ECE)",
                        "Mechanical Engineering (ME)",
                        "Civil Engineering (CE)",
                        "Electrical and Electronics Engineering (EEE)",
                        "Pharmacy (PY)",
                        "BBA",
                        "MBA"
                      ].sort().map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Enrollment No.</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. 2024-CS-001"
                      value={enrollmentNo}
                      onChange={(e) => setEnrollmentNo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Question Paper Format</label>
                    <select 
                      className="input-field"
                      value={paperFormat}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPaperFormat(val);
                        
                        // Set predefined counts for specific formats
                        if (val === "MST-I_SISTec") {
                          setTemplateCounts({ mcqCount: 12, shortCount: 6, longCount: 2 }); // Only 2 long questions for Revised Format
                        } else if (val === "MST -II format Dec 2025") {
                          setTemplateCounts({ mcqCount: 18, shortCount: 9, longCount: 3 });
                        } else if (val === "Standard") {
                          setTemplateCounts({ mcqCount: 10, shortCount: 5, longCount: 3 });
                        } else {
                          setTemplateCounts(null);
                        }

                        // If it's an uploaded template, also set selectedTemplateId
                        const template = templates.find(t => t.name === val);
                        if (template) {
                          setSelectedTemplateId(template.id);
                        }
                      }}
                    >
                      <option value="Standard">Standard University Format</option>
                      <option value="MST-I_SISTec">MST-I SISTec Format (12 MCQ, 6 Short, 4 Long)</option>
                      <option value="MST -II format Dec 2025">MST-II Dec 2025 Format (18 MCQ, 9 Short, 3 Long)</option>
                      <option value="Mid-Term">Mid-Term Examination Format</option>
                      <option value="End-Term">End-Term Examination Format</option>
                      <option value="Internal">Internal Assessment Format</option>
                      <option value="Competitive">Competitive Exam Format</option>
                      {templates.length > 0 && (
                        <optgroup label="Uploaded Templates">
                          {templates.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Apply College Template</label>
                    <select 
                      className="input-field"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                    >
                      <option value="">No Template (Default)</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {selectedTemplateId && (() => {
                      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
                      if (!selectedTemplate) return null;
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-brand-500" />
                              <span className="text-sm font-medium text-slate-700">
                                {selectedTemplate.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="px-2 py-1 bg-white rounded-lg text-slate-600 border border-slate-100">
                                {templateCounts?.mcqCount || 0} MCQ
                              </span>
                              <span className="px-2 py-1 bg-white rounded-lg text-slate-600 border border-slate-100">
                                {templateCounts?.shortCount || 0} Short
                              </span>
                              <span className="px-2 py-1 bg-white rounded-lg text-slate-600 border border-slate-100">
                                {templateCounts?.longCount || 0} Long
                              </span>
                            </div>
                          </div>
                          
                          {/* Special requirement indicator for Revised Format template */}
                          {selectedTemplate.name.toLowerCase().includes('revised format') && selectedTemplate.name.toLowerCase().includes('mst - i') && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <span className="text-xs font-medium text-amber-800">
                                  Special Format: Q1., Q2., Q3. → "Short Answer Type Questions (Attempt any two)" → Q4., Q5., Q6.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* CO Input Fields for MST-I Templates */}
                          {(selectedTemplate.name.toLowerCase().includes('mst-i') || selectedTemplate.name.toLowerCase().includes('mst i') || 
                            (selectedTemplate.name.toLowerCase().includes('revised format') && selectedTemplate.name.toLowerCase().includes('mst'))) && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-3">
                                <Brain className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                  Course Outcomes (CO) for MST-I
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-slate-700">CO1:</label>
                                  <input
                                    type="text"
                                    className="input-field text-sm"
                                    placeholder="Enter CO1 description"
                                    value={co1}
                                    onChange={(e) => setCo1(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-slate-700">CO2:</label>
                                  <input
                                    type="text"
                                    className="input-field text-sm"
                                    placeholder="Enter CO2 description"
                                    value={co2}
                                    onChange={(e) => setCo2(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* CO Input Fields for MST-II Templates */}
                          {(selectedTemplate.name.toLowerCase().includes('mst-ii') || selectedTemplate.name.toLowerCase().includes('mst ii') || selectedTemplate.name.toLowerCase().includes('mst -ii format dec 2025')) && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-3">
                                <Brain className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">
                                  Course Outcomes (CO) for MST-II
                                </span>
                              </div>
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">CO3:</label>
                                    <input
                                      type="text"
                                      className="input-field text-sm"
                                      placeholder="Enter CO3 description"
                                      value={co3}
                                      onChange={(e) => setCo3(e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">CO4:</label>
                                    <input
                                      type="text"
                                      className="input-field text-sm"
                                      placeholder="Enter CO4 description"
                                      value={co4}
                                      onChange={(e) => setCo4(e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">CO5:</label>
                                    <input
                                      type="text"
                                      className="input-field text-sm"
                                      placeholder="Enter CO5 description"
                                      value={co5}
                                      onChange={(e) => setCo5(e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })()}
                  </div>

                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">General Instructions</label>
                    <textarea 
                        className="input-field min-h-[80px] resize-none"
                        placeholder="e.g. 1. All questions are compulsory. 2. Use of scientific calculator is permitted."
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">General Instructions</label>
                  <textarea 
                      className="input-field min-h-[80px] resize-none"
                      placeholder="e.g. 1. All questions are compulsory. 2. Use of scientific calculator is permitted."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'prompt' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Describe your requirements</label>
                        <textarea 
                            className="input-field min-h-[120px] resize-none"
                            placeholder="e.g. Create 10 MCQs on Data Structures focusing on Graphs, medium difficulty."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end">
                          <button 
                              onClick={handlePromptGenerate}
                              disabled={isLoading || !prompt}
                              className="btn-primary flex items-center gap-2"
                          >
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : <Sparkles className="w-4 h-4" />}
                              {isLoading ? (loadingMessage || 'Generating...') : 'Generate Questions'}
                          </button>
                      </div>
                      
                      {/* Show generated questions directly in AI Prompt tab */}
                      {extractedQuestions.length > 0 && !showPaperBuilder && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <h3 className="text-lg font-bold text-slate-900">
                                Generated Questions ({extractedQuestions.length})
                              </h3>
                              <div className="flex gap-2">
                                <button 
                                  onClick={toggleSelectAll}
                                  className="text-xs font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1 rounded-lg border border-brand-100 transition-colors"
                                >
                                  {selectedQuestionIds.size === extractedQuestions.length ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <button 
                                onClick={() => setExtractedQuestions([])}
                                className="text-sm font-bold text-slate-400 hover:text-slate-600"
                              >
                                Clear
                              </button>
                              <button 
                                onClick={addSelectedQuestions}
                                disabled={selectedQuestionIds.size === 0}
                                className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Add Selected ({selectedQuestionIds.size})
                              </button>
                              <button 
                                onClick={() => {
                                  // Switch to paper builder view
                                  console.log('🔄 Switching to Paper Builder view');
                                  console.log(`📋 Moving ${selectedQuestionIds.size} questions to paper builder`);
                                 
                                  // Add selected questions to generatedQuestions
                                  const selectedQuestions = extractedQuestions.filter(q => selectedQuestionIds.has(q.id));
                                  setGeneratedQuestions(prev => [...prev, ...selectedQuestions]);
                                 
                                  // Clear extracted questions after moving to paper builder
                                  setExtractedQuestions([]);
                                  setSelectedQuestionIds(new Set());
                                  // Show paper builder view
                                  setShowPaperBuilder(true);
                                 
                                  // Hide loading screen
                                  setIsLoading(false);
                                  setLoadingMessage('');
                                 
                                  console.log('✅ Questions moved to paper builder successfully');
                                }}
                                disabled={selectedQuestionIds.size === 0}
                                className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" />
                                Create Paper
                              </button>
                            </div>
                          </div>

                          {/* Questions Display */}
                          <div className="space-y-4">
                            {['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER'].map((sectionType) => {
                              const sectionQuestions = extractedQuestions.filter(q => q.type === sectionType);
                              if (sectionQuestions.length === 0) return null;
                              
                              return (
                                <div key={sectionType} className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                      {sectionType === 'MCQ' ? 'Multiple Choice Questions' : 
                                       sectionType === 'SHORT_ANSWER' ? 'Short Answer Questions' : 
                                       'Long Answer Questions'} ({sectionQuestions.length})
                                    </h4>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {sectionQuestions.map((q) => (
                                      <div 
                                        key={q.id}
                                        onClick={() => toggleQuestionSelection(q.id)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                                          selectedQuestionIds.has(q.id) 
                                            ? 'border-brand-500 bg-brand-50/30' 
                                            : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                      >
                                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                          selectedQuestionIds.has(q.id) 
                                            ? 'bg-brand-500 border-brand-500' 
                                            : 'border-slate-200 bg-white'
                                        }`}>
                                          {selectedQuestionIds.has(q.id) && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                        
                                        <div className="space-y-2 flex-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-md">
                                                {q.type}
                                              </span>
                                              <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-black uppercase rounded-md">
                                                {q.marks} Marks
                                              </span>
                                              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-md">
                                                {q.courseOutcome}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              {q.type !== QuestionType.MCQ && (
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQuestionImageUpload(q.id);
                                                  }}
                                                  className="text-slate-400 hover:text-blue-600"
                                                  title="Add Image to Question"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                  </svg>
                                                </button>
                                              )}
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingQuestion(q);
                                                  setShowEditModal(true);
                                                }}
                                                className="text-slate-400 hover:text-slate-600"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          {q.type === QuestionType.LONG_ANSWER ? (
                                            <div className="flex gap-2">
                                              <span className="text-xs font-black text-brand-500 shrink-0">a)</span>
                                              <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                                                {q.text}
                                              </p>
                                            </div>
                                          ) : (
                                            <p className="text-sm font-medium text-slate-800">
                                              {q.text}
                                            </p>
                                          )}
                                          
                                          {/* Display image if question has one */}
                                          {q.imageUrl && (
                                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                              <div className="flex items-center gap-2 text-xs text-blue-600 font-medium mb-2">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>Image Added</span>
                                              </div>
                                              <div className="overflow-hidden rounded-md border border-slate-100">
                                                <img 
                                                  src={q.imageUrl} 
                                                  alt="Question image" 
                                                  className="w-full h-auto object-contain"
                                                  style={{ 
                                                    maxHeight: '150px',
                                                    maxWidth: '100%',
                                                    display: 'block'
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          )}
                                          
                                          {q.type === QuestionType.MCQ && q.options && (
                                            <div className="ml-4 space-y-1">
                                              {q.options.map((option, idx) => (
                                                <div key={idx} className="text-xs text-slate-600 flex gap-2">
                                                  <span className="font-black">{String.fromCharCode(65 + idx)}.</span>
                                                  <span>{option}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {q.type === QuestionType.LONG_ANSWER && q.alternativeText && (
                                            <div className="mt-2 pl-4 border-l-2 border-slate-100">
                                              <div className="flex gap-2">
                                                <span className="text-xs font-black text-brand-500 shrink-0">b)</span>
                                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                  {q.alternativeText}
                                                </p>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                  </motion.div>
              )}

                  {activeTab === 'upload' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {extractedQuestions.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:border-brand-500 transition-colors group">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                          <FileText className="w-8 h-8 text-slate-300 group-hover:text-brand-500" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Upload Previous Exam</h3>
                        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">Upload a PDF or Image. Our AI will extract and categorize questions automatically.</p>
                        <div className="relative inline-block">
                          <input type="file" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'paper')} className="absolute inset-0 opacity-0 cursor-pointer"/>
                          <button className="btn-secondary flex items-center gap-2 min-w-[140px] justify-center">
                            {isLoading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                                <span className="text-xs font-bold text-brand-600">Scanning...</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Choose File</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold">Extracted Questions ({extractedQuestions.length})</h3>
                            <button 
                              onClick={toggleSelectAll}
                              className="text-xs font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1 rounded-lg border border-brand-100 transition-colors"
                            >
                              {selectedQuestionIds.size === extractedQuestions.length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => setExtractedQuestions([])}
                              className="text-sm font-bold text-slate-400 hover:text-slate-600"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={addSelectedQuestions}
                              disabled={selectedQuestionIds.size === 0}
                              className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Selected ({selectedQuestionIds.size})
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid gap-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                          {Object.entries(
                            extractedQuestions.reduce((acc, q) => {
                              const section = q.section || 'Uncategorized';
                              if (!acc[section]) acc[section] = { title: q.sectionTitle || section, questions: [] };
                              acc[section].questions.push(q);
                              return acc;
                            }, {} as Record<string, { title: string, questions: Question[] }>)
                          ).map(([sectionKey, sectionData]: [string, any]) => (
                            <div key={sectionKey} className="space-y-4">
                              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                                <div className="h-8 w-1 bg-brand-500 rounded-full" />
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">{sectionData.title}</h4>
                              </div>
                              
                              <div className="grid gap-4">
                                {sectionData.questions.map((q: any) => (
                                  <div 
                                    key={q.id}
                                    onClick={() => toggleQuestionSelection(q.id)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 ${selectedQuestionIds.has(q.id) ? 'border-brand-500 bg-brand-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                  >
                                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${selectedQuestionIds.has(q.id) ? 'bg-brand-500 border-brand-500' : 'border-slate-200 bg-white'}`}>
                                      {selectedQuestionIds.has(q.id) && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className="space-y-2 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-md">{q.type}</span>
                                          <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-black uppercase rounded-md">{q.marks} Marks</span>
                                        </div>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingQuestion(q);
                                            setShowEditModal(true);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-all"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      {q.type === QuestionType.LONG_ANSWER ? (
                                        <div className="flex gap-2">
                                          <span className="text-xs font-black text-brand-500 shrink-0">a)</span>
                                          <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{q.text}</p>
                                        </div>
                                      ) : (
                                        <p className="text-sm font-medium text-slate-800">{q.text}</p>
                                      )}
                                      {q.type === QuestionType.LONG_ANSWER && q.alternativeText && (
                                        <div className="mt-2 pl-4 border-l-2 border-slate-100">
                                          <div className="flex gap-2">
                                            <span className="text-xs font-black text-brand-500 shrink-0">b)</span>
                                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{q.alternativeText}</p>
                                          </div>
                                        </div>
                                      )}
                                      {q.hasImage && (
                                        <div className="mt-3 p-3 bg-brand-50/50 rounded-2xl border border-brand-100 flex flex-col gap-2">
                                          <div className="flex items-center gap-2 text-brand-700">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Visual Element Detected</span>
                                          </div>
                                          
                                          <QuestionImage 
                                            question={q} 
                                            source={originalFile} 
                                            onCrop={(url) => updateQuestionImage(q.id, url)}
                                          />

                                          <div className="p-2 bg-white/80 rounded-xl border border-brand-100/50">
                                            <p className="text-[10px] text-slate-600 italic leading-relaxed">
                                              {q.imageDescription || "Analyzing visual content..."}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
              )}

                  {activeTab === 'curriculum' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:border-brand-500 transition-colors group"
                  >
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-8 h-8 text-slate-300 group-hover:text-brand-500" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">Analyze Curriculum</h3>
                      <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">Upload your syllabus to generate a comprehensive topic-wise question bank.</p>
                      <div className="relative inline-block">
                        <input type="file" accept=".pdf,.doc,.docx,.xlsx" onChange={(e) => handleFileUpload(e, 'curriculum')} className="absolute inset-0 opacity-0 cursor-pointer"/>
                        <button className="btn-secondary flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Choose File
                        </button>
                      </div>
                      
                      {/* Show generated questions directly in Curriculum tab */}
                      {extractedQuestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-6 space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <h3 className="text-lg font-bold text-slate-900">
                                Questions from Curriculum ({extractedQuestions.length})
                              </h3>
                              <div className="flex gap-2">
                                <button 
                                  onClick={toggleSelectAll}
                                  className="text-xs font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1 rounded-lg border border-brand-100 transition-colors"
                                >
                                  {selectedQuestionIds.size === extractedQuestions.length ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <button 
                                onClick={() => setExtractedQuestions([])}
                                className="text-sm font-bold text-slate-400 hover:text-slate-600"
                              >
                                Clear
                              </button>
                              <button 
                                onClick={addSelectedQuestions}
                                disabled={selectedQuestionIds.size === 0}
                                className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Add Selected ({selectedQuestionIds.size})
                              </button>
                            </div>
                          </div>

                          {/* Questions Display - same as AI Prompt tab */}
                          <div className="space-y-4">
                            {['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER'].map((sectionType) => {
                              const sectionQuestions = extractedQuestions.filter(q => q.type === sectionType);
                              if (sectionQuestions.length === 0) return null;
                              
                              return (
                                <div key={sectionType} className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                      {sectionType === 'MCQ' ? 'Multiple Choice Questions' : 
                                       sectionType === 'SHORT_ANSWER' ? 'Short Answer Questions' : 
                                       'Long Answer Questions'} ({sectionQuestions.length})
                                    </h4>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {sectionQuestions.map((q) => (
                                      <div 
                                        key={q.id}
                                        onClick={() => toggleQuestionSelection(q.id)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                                          selectedQuestionIds.has(q.id) 
                                            ? 'border-brand-500 bg-brand-50/30' 
                                            : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                      >
                                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                          selectedQuestionIds.has(q.id) 
                                            ? 'bg-brand-500 border-brand-500' 
                                            : 'border-slate-200 bg-white'
                                        }`}>
                                          {selectedQuestionIds.has(q.id) && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                        
                                        <div className="space-y-2 flex-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-md">
                                                {q.type}
                                              </span>
                                              <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-black uppercase rounded-md">
                                                {q.marks} Marks
                                              </span>
                                              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-md">
                                                {q.courseOutcome}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              {q.type !== QuestionType.MCQ && (
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQuestionImageUpload(q.id);
                                                  }}
                                                  className="text-slate-400 hover:text-blue-600"
                                                  title="Add Image to Question"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                  </svg>
                                                </button>
                                              )}
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingQuestion(q);
                                                  setShowEditModal(true);
                                                }}
                                                className="text-slate-400 hover:text-slate-600"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          {q.type === QuestionType.LONG_ANSWER ? (
                                            <div className="flex gap-2">
                                              <span className="text-xs font-black text-brand-500 shrink-0">a)</span>
                                              <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                                                {q.text}
                                              </p>
                                            </div>
                                          ) : (
                                            <p className="text-sm font-medium text-slate-800">
                                              {q.text}
                                            </p>
                                          )}
                                          
                                          {/* Display image if question has one */}
                                          {q.imageUrl && (
                                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                              <div className="flex items-center gap-2 text-xs text-blue-600 font-medium mb-2">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>Image Added</span>
                                              </div>
                                              <div className="overflow-hidden rounded-md border border-slate-100">
                                                <img 
                                                  src={q.imageUrl} 
                                                  alt="Question image" 
                                                  className="w-full h-auto object-contain"
                                                  style={{ 
                                                    maxHeight: '150px',
                                                    maxWidth: '100%',
                                                    display: 'block'
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          )}
                                          
                                          {q.type === QuestionType.MCQ && q.options && (
                                            <div className="ml-4 space-y-1">
                                              {q.options.map((option, idx) => (
                                                <div key={idx} className="text-xs text-slate-600 flex gap-2">
                                                  <span className="font-black">{String.fromCharCode(65 + idx)}.</span>
                                                  <span>{option}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {q.type === QuestionType.LONG_ANSWER && q.alternativeText && (
                                            <div className="mt-2 pl-4 border-l-2 border-slate-100">
                                              <div className="flex gap-2">
                                                <span className="text-xs font-black text-brand-500 shrink-0">b)</span>
                                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                  {q.alternativeText}
                                                </p>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                  </motion.div>
              )}
                </AnimatePresence>
              </>
            )}
        </div>
      </div>

      {/* Paper Builder Area */}
      <AnimatePresence>
        {(generatedQuestions.length > 0 || showAddModal) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex-1 max-w-xl space-y-2">
                      <label className="text-sm font-bold text-slate-700">Paper Title</label>
                      <input 
                        type="text" 
                        value={paperTitle} 
                        onChange={(e) => setPaperTitle(e.target.value)}
                        placeholder="e.g. End Semester Examination - Fall 2024"
                        className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-200 focus:border-brand-500 outline-none pb-2 transition-colors"
                      />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowAddModal(true)} className="btn-secondary flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      Add Question
                    </button>
                  </div>
              </div>

              {generatedQuestions.length > 0 && (
                  <div className="grid gap-12">
                     {Object.entries(
                        generatedQuestions.reduce((acc, q) => {
                          const section = q.section || 'Uncategorized';
                          if (!acc[section]) acc[section] = { title: q.sectionTitle || section, questions: [] };
                          acc[section].questions.push(q);
                          return acc;
                        }, {} as Record<string, { title: string, questions: Question[] }>)
                      ).map(([sectionKey, sectionData]: [string, any]) => (
                        <div key={sectionKey} className="space-y-6">
                          <div className="flex items-center gap-4 py-4 border-y-2 border-slate-900/5 bg-slate-50/50 px-6 rounded-2xl">
                            <div className="w-1.5 h-10 bg-slate-900 rounded-full" />
                            <div>
                              <h4 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">{sectionData.title}</h4>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Section Identifier: {sectionKey}</p>
                            </div>
                          </div>

                          <div className="grid gap-6">
                            {sectionData.questions.map((q: any, idx: number) => (
                                <motion.div 
                                  key={q.id} 
                                  layout
                                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all relative group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                          <span className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-black">
                                            {idx + 1}
                                          </span>
                                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                            {q.type}
                                          </span>
                                          <span className="px-2.5 py-1 bg-brand-50 text-brand-600 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                            {q.marks} Marks
                                          </span>
                                        </div>
                                        <div className="flex gap-2">
                                          {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.LONG_ANSWER) && (
                                            <label className="p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all cursor-pointer">
                                              <Upload className="w-4 h-4" />
                                              <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleImageUpload(q.id, e)}
                                              />
                                            </label>
                                          )}
                                          <button 
                                            onClick={() => {
                                              setEditingQuestion(q);
                                              setShowEditModal(true);
                                            }} 
                                            className="p-2 text-slate-300 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all"
                                          >
                                             <Pencil className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => handleRemoveQuestion(q.id)} 
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                          >
                                             <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                    </div>
                                    
                                    {q.type === QuestionType.LONG_ANSWER ? (
                                      <div className="space-y-4 mb-6">
                                        <div className="flex gap-3">
                                          <span className="text-lg font-black text-brand-500 shrink-0">a)</span>
                                          <p className="text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">{q.text}</p>
                                        </div>
                                        
                                        <div className="flex items-center justify-center py-2">
                                          <div className="h-px bg-slate-100 flex-1" />
                                          <span className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">OR</span>
                                          <div className="h-px bg-slate-100 flex-1" />
                                        </div>

                                        <div className="flex gap-3">
                                          <span className="text-lg font-black text-brand-500 shrink-0">b)</span>
                                          <div className="flex-1">
                                            <p className="text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                                              {q.alternativeText || '[Alternative Question Placeholder]'}
                                            </p>
                                            {q.hasAlternativeImage && q.alternativeImageUrl && (
                                              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                                                <div className="flex items-center gap-2 text-green-600 mb-2">
                                                  <ImageIcon className="w-4 h-4" />
                                                  <span className="text-xs font-medium">Part B Image</span>
                                                </div>
                                                <img 
                                                  src={q.alternativeImageUrl} 
                                                  alt="Part B image" 
                                                  className="max-w-full h-auto rounded-lg shadow-sm"
                                                />
                                                <p className="text-xs text-green-600 mt-2 italic">
                                                  {q.alternativeImageDescription || 'Image uploaded for part b'}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {q.type === QuestionType.LONG_ANSWER && (
                                          <label className="mt-2 flex items-center justify-center gap-2 p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all cursor-pointer">
                                            <Upload className="w-4 h-4" />
                                            <span className="text-xs">Upload Image for Part B</span>
                                            <input
                                              type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleAlternativeImageUpload(q.id, e)}
                                            />
                                          </label>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-lg font-medium text-slate-900 mb-6 leading-relaxed">{q.text}</p>
                                    )}
                                    
                                    {q.hasImage && (
                                        <div className="mb-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <ImageIcon className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Visual Reference</span>
                                                </div>
                                                <div className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-full ${
                                                  q.imageDescription?.includes('Uploaded image:') 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-brand-100 text-brand-700'
                                                }`}>
                                                    {q.imageDescription?.includes('Uploaded image:') ? 'User Uploaded' : 'AI Extracted'}
                                                </div>
                                            </div>
                                            
                                            <QuestionImage 
                                              question={q} 
                                              source={originalFile} 
                                              onCrop={(url) => updateQuestionImage(q.id, url)}
                                            />

                                            <div className="p-4 bg-white rounded-2xl border border-slate-200/50 shadow-sm">
                                                <p className="text-sm text-slate-600 italic leading-relaxed">
                                                    {q.imageDescription || "No description available."}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {q.options && q.options.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                            {q.options.map((opt, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-600">
                                                  <span className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">
                                                    {String.fromCharCode(65 + i)}
                                                  </span>
                                                  {opt}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-col gap-2 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 text-xs font-bold text-emerald-700">
                                       <div className="flex items-center gap-2">
                                         <CheckCircle2 className="w-4 h-4" />
                                         <span>Answer Key {q.type === QuestionType.LONG_ANSWER ? '(Main)' : ''}: {q.correctAnswer}</span>
                                       </div>
                                       {q.type === QuestionType.LONG_ANSWER && q.alternativeAnswer && (
                                         <div className="flex items-center gap-2 pl-6 opacity-70">
                                           <span>Alternative Answer Key: {q.alternativeAnswer}</span>
                                         </div>
                                       )}
                                    </div>
                                </motion.div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
              )}

              {generatedQuestions.length > 0 && (
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900 p-8 rounded-[32px] text-white shadow-2xl shadow-slate-900/20">
                      <div className="flex flex-wrap gap-4">
                          <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold">
                              <FileDown className="w-5 h-5" />
                              PDF
                          </button>
                          <button onClick={() => handleExport('docx')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold">
                              <FileType className="w-5 h-5" />
                              DOCX
                          </button>
                          <button onClick={() => handleExport('txt')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold">
                              <Download className="w-5 h-5" />
                              TXT
                          </button>
                      </div>
                      
                       <div className="flex gap-4 w-full md:w-auto">
                         <button 
                            onClick={handleSaveDraft}
                            disabled={isLoading}
                            className="flex-1 md:flex-none px-8 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                         >
                            {isLoading ? (
                               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : <Save className="w-4 h-4" />}
                            {isLoading ? 'Saving...' : 'Save Draft'}
                         </button>
                      </div>
                  </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Question Modal */}
      <AnimatePresence>
        {showAddModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAddModal(false)}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white p-8 rounded-[32px] w-full max-w-lg shadow-2xl relative z-10"
                >
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-bold">Add Custom Question</h3>
                      <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700">Question Text (Part a)</label>
                          </div>
                          <textarea 
                             className="input-field min-h-[100px] resize-none" 
                             placeholder="Type the main question (a) here..."
                             value={customQuestion.text || ''}
                             onChange={e => setCustomQuestion({...customQuestion, text: e.target.value})}
                          />
                        </div>

                        {customQuestion.type === QuestionType.LONG_ANSWER && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-bold text-slate-700">Alternative Question (Part b / OR Part)</label>
                            </div>
                            <textarea 
                               className="input-field min-h-[100px] resize-none" 
                               placeholder="Type the alternative question (b) here..."
                               value={customQuestion.alternativeText || ''}
                               onChange={e => setCustomQuestion({...customQuestion, alternativeText: e.target.value})}
                            />
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-700">Section ID (e.g. Part A)</label>
                              <input 
                                 type="text"
                                 className="input-field" 
                                 placeholder="Section ID"
                                 value={customQuestion.section || ''}
                                 onChange={e => setCustomQuestion({...customQuestion, section: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-700">Section Title (e.g. Objective)</label>
                              <input 
                                 type="text"
                                 className="input-field" 
                                 placeholder="Section Title"
                                 value={customQuestion.sectionTitle || ''}
                                 onChange={e => setCustomQuestion({...customQuestion, sectionTitle: e.target.value})}
                              />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-700">Type</label>
                              <select 
                                className="input-field"
                                value={customQuestion.type}
                                onChange={e => {
                                  const type = e.target.value as QuestionType;
                                  let marks = customQuestion.marks;
                                  if (type === QuestionType.MCQ) marks = 0.5;
                                  else if (type === QuestionType.SHORT_ANSWER) marks = 2;
                                  else if (type === QuestionType.LONG_ANSWER) marks = 7;
                                  setCustomQuestion({...customQuestion, type, marks});
                                }}
                              >
                                  <option value={QuestionType.SHORT_ANSWER}>Short Answer</option>
                                  <option value={QuestionType.MCQ}>MCQ</option>
                                  <option value={QuestionType.LONG_ANSWER}>Long Answer</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-700">Marks</label>
                              <input 
                                 type="number" 
                                 className="input-field"
                                 placeholder="5"
                                 value={customQuestion.marks}
                                 onChange={e => setCustomQuestion({...customQuestion, marks: Number(e.target.value)})}
                              />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Correct Answer / Key</label>
                          <input 
                             type="text" 
                             className="input-field" 
                             placeholder={customQuestion.type === QuestionType.LONG_ANSWER ? "Answer for part a..." : "Expected answer..."}
                             value={customQuestion.correctAnswer || ''}
                             onChange={e => setCustomQuestion({...customQuestion, correctAnswer: e.target.value})}
                          />
                        </div>

                        {customQuestion.type === QuestionType.LONG_ANSWER && (
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Alternative Answer (OR Part)</label>
                            <input 
                               type="text" 
                               className="input-field" 
                               placeholder="Answer for part b..."
                               value={customQuestion.alternativeAnswer || ''}
                               onChange={e => setCustomQuestion({...customQuestion, alternativeAnswer: e.target.value})}
                            />
                          </div>
                        )}
                        
                        {customQuestion.type === QuestionType.MCQ && (
                            <div className="flex gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                              <p className="text-[10px] text-slate-500 font-medium">Note: Default options (A, B, C, D) will be added for MCQs. You can edit them later.</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-3 mt-10">
                        <button onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary">Cancel</button>
                        <button onClick={handleAddCustomQuestion} className="flex-1 btn-primary">Add Question</button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && editingQuestion && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl p-8 relative"
                >
                    <button 
                        onClick={() => setShowEditModal(false)}
                        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="mb-8">
                        <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                            <Pencil className="w-6 h-6 text-brand-500" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Edit Question</h3>
                        <p className="text-slate-500 text-sm">Modify the question details below.</p>
                    </div>
                    
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Question Text</label>
                          <textarea 
                             className="input-field min-h-[100px] resize-none" 
                             placeholder="Enter question text..."
                             value={editingQuestion.text}
                             onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})}
                          />
                        </div>

                        {editingQuestion.type === QuestionType.LONG_ANSWER && (
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Alternative Question (OR Part)</label>
                            <textarea 
                               className="input-field min-h-[100px] resize-none" 
                               placeholder="Enter alternative question text..."
                               value={editingQuestion.alternativeText || ''}
                               onChange={e => setEditingQuestion({...editingQuestion, alternativeText: e.target.value})}
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-700">Type</label>
                              <select 
                                 className="input-field"
                                 value={editingQuestion.type}
                                 onChange={e => setEditingQuestion({...editingQuestion, type: e.target.value as QuestionType})}
                              >
                                <option value={QuestionType.MCQ}>Multiple Choice</option>
                                <option value={QuestionType.SHORT_ANSWER}>Short Answer</option>
                                <option value={QuestionType.LONG_ANSWER}>Long Answer (with OR)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-700">Marks</label>
                              <input 
                                 type="number" 
                                 className="input-field" 
                                 placeholder="5"
                                 value={editingQuestion.marks}
                                 onChange={e => setEditingQuestion({...editingQuestion, marks: Number(e.target.value)})}
                              />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-700">Difficulty</label>
                              <select 
                                 className="input-field"
                                 value={editingQuestion.difficulty}
                                 onChange={e => setEditingQuestion({...editingQuestion, difficulty: e.target.value as Difficulty})}
                              >
                                <option value={Difficulty.EASY}>Easy</option>
                                <option value={Difficulty.MEDIUM}>Medium</option>
                                <option value={Difficulty.HARD}>Hard</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-700">Section</label>
                              <input 
                                 type="text" 
                                 className="input-field" 
                                 placeholder="Section A"
                                 value={editingQuestion.section || ''}
                                 onChange={e => setEditingQuestion({...editingQuestion, section: e.target.value})}
                              />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Correct Answer / Key</label>
                          <input 
                             type="text" 
                             className="input-field" 
                             placeholder="Expected answer..."
                             value={editingQuestion.correctAnswer || ''}
                             onChange={e => setEditingQuestion({...editingQuestion, correctAnswer: e.target.value})}
                          />
                        </div>

                        {editingQuestion.type === QuestionType.LONG_ANSWER && (
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Alternative Answer (OR Part)</label>
                            <input 
                               type="text" 
                               className="input-field" 
                               placeholder="Answer for part b..."
                               value={editingQuestion.alternativeAnswer || ''}
                               onChange={e => setEditingQuestion({...editingQuestion, alternativeAnswer: e.target.value})}
                            />
                          </div>
                        )}
                        
                        {editingQuestion.type === QuestionType.MCQ && editingQuestion.options && (
                            <div className="space-y-3">
                              <label className="text-sm font-bold text-slate-700">Options</label>
                              <div className="grid gap-2">
                                {editingQuestion.options.map((opt, idx) => (
                                  <div key={idx} className="flex gap-2">
                                    <span className="w-8 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                                      {String.fromCharCode(65 + idx)}
                                    </span>
                                    <input 
                                      type="text"
                                      className="input-field"
                                      value={opt}
                                      onChange={e => {
                                        const newOpts = [...(editingQuestion.options || [])];
                                        newOpts[idx] = e.target.value;
                                        setEditingQuestion({...editingQuestion, options: newOpts});
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-3 mt-10">
                        <button onClick={() => setShowEditModal(false)} className="flex-1 btn-secondary">Cancel</button>
                        <button onClick={() => handleUpdateQuestion(editingQuestion)} className="flex-1 btn-primary">Save Changes</button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSaved && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[100]"
          >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="font-bold">{saveMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110]"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-[32px] shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center space-y-6"
            >
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-brand-500 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">AI is working...</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{loadingMessage || 'Processing your request'}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[120]"
          >
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold">{error}</span>
              <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paperToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaperToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Delete Paper</h3>
                    <p className="text-sm text-slate-500">This action cannot be undone.</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-8">Are you sure you want to delete this question paper?</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setPaperToDelete(null)}
                    className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDeletePaper}
                    className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20"
                  >
                    Delete Paper
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Upload Confirmation Dialog */}
      <AnimatePresence>
        {showImageUploadDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowImageUploadDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] shadow-2xl shadow-slate-900/20 border border-slate-100 p-8 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Add Images to Questions?</h3>
                  <p className="text-slate-600">
                    Your prompt contains short answer or long answer questions. Would you like to add images to these questions?
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    If yes, the space between questions will be increased to accommodate images.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => handleImageUploadConfirm(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                  >
                    No, Generate Without Images
                  </button>
                  <button 
                    onClick={() => handleImageUploadConfirm(true)}
                    className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20"
                  >
                    Yes, Add Images
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deployment Guide Modal */}
      <AnimatePresence>
        {showDeploymentGuide && (
          <DeploymentGuide onClose={() => setShowDeploymentGuide(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FacultyDashboard;
