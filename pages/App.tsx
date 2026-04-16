import React, { useState, useEffect } from 'react';
import { User, UserRole, ViewType } from '../types';
import Landing from './Landing';
import Auth from './Auth';
import Layout from '../components/Layout';
import FacultyDashboard from './FacultyDashboard';
import AdminDashboard from './AdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import { AuthProvider, useAuth } from '../src/AuthContext';
import { signOut, auth } from '../src/firebase';
import { Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user: firebaseUser, loading, role, department, error, logout } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'app'>('landing');
  const [hasSelectedKey, setHasSelectedKey] = useState(true);
  const [showKeyBanner, setShowKeyBanner] = useState(false);
  
  // Dashboard internal navigation state
  const [currentDashView, setCurrentDashView] = useState<ViewType>('dashboard');

  useEffect(() => {
    const checkKeySelection = async () => {
      const fallbackKey = "AIzaSyAus49kyg3oDkmmWQQ3uvbcx20aI7Cu9S8";
      // @ts-ignore
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        const hasKey = selected || !!fallbackKey;
        setHasSelectedKey(hasKey);
        setShowKeyBanner(!hasKey);
      } else {
        setHasSelectedKey(!!fallbackKey);
        setShowKeyBanner(!fallbackKey);
      }
    };
    checkKeySelection();
  }, []);

  const handleGetStarted = () => {
    setView('auth');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setView('landing');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavigate = (newView: ViewType) => {
    setCurrentDashView(newView);
  };

  // --- Routing Logic ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-brand-500/30 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Error</h2>
          <p className="text-slate-600 mb-8">{error}</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-200"
            >
              Retry Connection
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'landing' && !firebaseUser) {
    return <Landing onGetStarted={handleGetStarted} />;
  }

  if (view === 'auth' && !firebaseUser) {
    return <Auth />;
  }

  // Authenticated but role not yet loaded (and no error yet)
  if (firebaseUser && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-brand-500/30 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // Authenticated View
  const user: User | null = firebaseUser ? {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
    lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
    role: role as UserRole,
    department: department || undefined
  } : null;

  return (
    <div className="relative">
      <AnimatePresence>
        {showKeyBanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-brand-600 text-white overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-200" />
                <p className="text-xs font-medium">To avoid "Quota Exceeded" errors and ensure faster AI processing, please select your own Gemini API key.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    // @ts-ignore
                    if (window.aistudio && window.aistudio.openSelectKey) {
                      window.aistudio.openSelectKey();
                      setHasSelectedKey(true);
                      setShowKeyBanner(false);
                    }
                  }}
                  className="px-3 py-1 bg-white text-brand-600 text-[10px] font-bold rounded-lg hover:bg-brand-50 transition-colors"
                >
                  Select API Key
                </button>
                <button 
                  onClick={() => setShowKeyBanner(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Layout user={user} currentView={currentDashView} onNavigate={handleNavigate} onLogout={handleLogout}>
        {user?.role === UserRole.FACULTY && (
          <FacultyDashboard userId={user.uid} userName={`${user.firstName} ${user.lastName}`} currentView={currentDashView} onNavigate={handleNavigate} />
        )}
        {user?.role === UserRole.ADMIN && (
          <AdminDashboard currentView={currentDashView} />
        )}
        {user?.role === UserRole.SUPER_ADMIN && (
          <SuperAdminDashboard currentView={currentDashView} />
        )}
      </Layout>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
