import React from 'react';
import { User, UserRole, ViewType } from '../types';
import { 
  LayoutDashboard, 
  FileText, 
  Layers, 
  ClipboardList, 
  BarChart3, 
  Users, 
  LogOut, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, currentView, onNavigate, onLogout }) => {
  if (!user) return <>{children}</>;

  const NavButton = ({ view, label, icon: Icon }: { view: ViewType; label: string; icon: any }) => (
    <button 
      onClick={() => onNavigate(view)}
      className={`group flex items-center justify-between w-full px-4 py-3 text-sm font-bold rounded-xl transition-all ${
        currentView === view 
          ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${currentView === view ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-900'}`} />
        {label}
      </div>
      {currentView === view && <ChevronRight className="w-4 h-4 text-slate-400" />}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col z-20">
        <div className="p-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Q-Genius</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <div className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
            {user.role?.replace('_', ' ') || 'User'} Menu
          </div>
          
          {user.role === UserRole.FACULTY && (
             <>
               <NavButton view="dashboard" label="Create Paper" icon={LayoutDashboard} />
               <NavButton view="my_papers" label="My Papers" icon={FileText} />
               <NavButton view="templates" label="Templates" icon={Layers} />
               <NavButton view="submit_paper" label="Submit Question Paper" icon={FileText} />
             </>
          )}

           {user.role === UserRole.ADMIN && (
             <>
               <NavButton view="review_queue" label="Review Queue" icon={ClipboardList} />
               <NavButton view="users" label="Faculty" icon={Users} />
             </>
          )}
          
          {user.role === UserRole.SUPER_ADMIN && (
             <>
                <NavButton view="reports" label="Reports & Stats" icon={BarChart3} />
                <NavButton view="users" label="User Management" icon={Users} />
             </>
          )}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold shadow-lg shadow-slate-200">
                {user.firstName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto p-8 md:p-12">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
