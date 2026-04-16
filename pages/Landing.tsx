import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, FileText, BarChart3, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

const Landing: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-brand-100 selection:text-brand-900">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">Q-Genius</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">How it works</a>
            <button 
              onClick={onGetStarted}
              className="text-sm font-semibold px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wider mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Academic Excellence
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-6xl md:text-8xl font-bold tracking-tight leading-[0.9] mb-8"
            >
              Craft Exams with <span className="text-brand-500">Intelligence</span>.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-slate-500 leading-relaxed mb-10 max-w-2xl"
            >
              The modern standard for academic assessment. Generate curriculum-aligned question papers, manage approvals, and analyze performance with Gemini AI.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <button 
                onClick={onGetStarted}
                className="group px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2 shadow-2xl shadow-slate-200"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95">
                View Demo
              </button>
            </motion.div>
          </div>
        </div>
        
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-gradient-to-l from-brand-50/50 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-200/20 blur-3xl rounded-full" />
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Sparkles className="w-6 h-6 text-brand-500" />}
              title="Gemini AI Engine"
              description="Harness the power of Google's most capable AI to generate high-quality, diverse questions instantly."
            />
            <FeatureCard 
              icon={<FileText className="w-6 h-6 text-brand-500" />}
              title="OCR & Document Parsing"
              description="Upload existing syllabus or old papers. Our AI extracts and categorizes questions automatically."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-6 h-6 text-brand-500" />}
              title="Advanced Analytics"
              description="Track difficulty distribution, topic coverage, and faculty productivity with intuitive dashboards."
            />
          </div>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-12">Trusted by leading institutions</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale">
            <div className="text-2xl font-bold">OXFORD</div>
            <div className="text-2xl font-bold">STANFORD</div>
            <div className="text-2xl font-bold">MIT</div>
            <div className="text-2xl font-bold">HARVARD</div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-slate-900" />
            <span className="font-bold">Q-Genius</span>
          </div>
          <p className="text-sm text-slate-400">© 2024 Q-Genius. Sustainable AI for inclusive learning.</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-slate-400 hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#" className="text-sm text-slate-400 hover:text-slate-900 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all"
  >
    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-slate-500 leading-relaxed">{description}</p>
    <ul className="mt-6 space-y-2">
      {['Instant Generation', 'Role-based Access', 'Export to PDF'].map((item) => (
        <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-brand-500" />
          {item}
        </li>
      ))}
    </ul>
  </motion.div>
);

export default Landing;
