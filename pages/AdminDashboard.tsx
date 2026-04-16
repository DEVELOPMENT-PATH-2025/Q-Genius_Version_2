import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User as UserIcon, 
  Book, 
  ChevronRight, 
  MessageSquare,
  ArrowLeft,
  FileText,
  AlertCircle,
  FileDown,
  FileType,
  Building2,
  Layers,
  Users,
  Search,
  Trash2,
  Shield
} from 'lucide-react';
import { updatePaperStatus, removeUser, getFacultyName, subscribeToPapersForAdmin, subscribeToUsers } from '../services/mockServices';
import { exportToPDF, exportToDocx } from '../services/exportService';
import { QuestionPaper, PaperStatus, ViewType, QuestionType, UserRole, User } from '../types';
import { useAuth } from '../src/AuthContext';

const AdminDashboard: React.FC<{ currentView?: ViewType }> = ({ currentView }) => {
  const { role, department: adminDept } = useAuth();
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [facultyDetails, setFacultyDetails] = useState<Record<string, { name: string; email: string }>>({});

  useEffect(() => {
    let unsubscribe: () => void;
    if (currentView === 'review_queue') {
      unsubscribe = subscribeToPapersForAdmin(role === UserRole.SUPER_ADMIN ? undefined : adminDept || undefined, (papers) => {
        setPapers(papers);
        setLoading(false);
      });
    } else if (currentView === 'users') {
      unsubscribe = subscribeToUsers(role === UserRole.SUPER_ADMIN ? undefined : adminDept || undefined, (users) => {
        setUsers(users);
        setLoading(false);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [role, adminDept, currentView]);

  useEffect(() => {
    // Reset selected paper when navigating via sidebar
    if (currentView === 'review_queue') {
      setSelectedPaper(null);
    }
  }, [currentView]);

  const handleDeleteUser = (uid: string) => {
    setUserToDelete(uid);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
        try {
            await removeUser(userToDelete);
        } catch (error) {
            console.error("Failed to delete user:", error);
        } finally {
            setUserToDelete(null);
        }
    }
  };

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDecision = async (status: PaperStatus) => {
    if (!selectedPaper) return;
    
    // Require feedback for rejection
    if (status === PaperStatus.REJECTED && (!feedback || feedback.trim() === '')) {
      alert('Please provide feedback when rejecting a paper.');
      return;
    }
    
    try {
      setLoading(true);
      await updatePaperStatus(selectedPaper.id, status, feedback);
      
      // Show success feedback
      const action = status === PaperStatus.APPROVED ? 'approved' : 'rejected';
      console.log(`Paper ${selectedPaper.id} ${action} successfully`);
      
      // Clear selection and feedback
      setSelectedPaper(null);
      setFeedback('');
      
    } catch (error) {
      console.error('Failed to update paper status:', error);
      // You could add toast notification here
      alert('Failed to update paper status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (selectedPaper) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        <button 
          onClick={() => setSelectedPaper(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Queue
        </button>

        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-100">
                  Pending Review
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-sm font-bold text-slate-500">{selectedPaper.courseCode}</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{selectedPaper.title}</h2>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <UserIcon className="w-4 h-4" />
                  {facultyDetails[selectedPaper.facultyId]?.name || selectedPaper.facultyName}
                </div>
                {facultyDetails[selectedPaper.facultyId]?.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="text-slate-300">•</span>
                    {facultyDetails[selectedPaper.facultyId]?.email}
                  </div>
                )}
                {selectedPaper.department && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Building2 className="w-4 h-4" />
                    {selectedPaper.department}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  {new Date(selectedPaper.createdAt).toLocaleDateString()}
                </div>
                {selectedPaper.format && (
                  <div className="flex items-center gap-2 text-sm text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">
                    <FileType className="w-4 h-4" />
                    {selectedPaper.format}
                  </div>
                )}
                {selectedPaper.templateId && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                    <Layers className="w-4 h-4" />
                    Template Applied
                  </div>
                )}
              </div>
            </div>
            
              <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100">
                <div className="flex gap-2 px-4 border-r border-slate-100">
                    <button 
                      onClick={() => exportToPDF(selectedPaper)}
                      className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all"
                      title="Download PDF"
                    >
                      <FileDown className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => exportToDocx(selectedPaper)}
                      className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all"
                      title="Download DOCX"
                    >
                      <FileType className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-center px-4 border-r border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Marks</p>
                  <p className="text-xl font-bold text-slate-900">{selectedPaper.totalMarks}</p>
                </div>
                <div className="text-center px-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Questions</p>
                  <p className="text-xl font-bold text-slate-900">{selectedPaper.questions.length}</p>
                </div>
              </div>
          </div>

          <div className="p-8 space-y-8">
            {selectedPaper.instructions && (
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 mb-8">
                <div className="flex items-center gap-2 mb-3 text-slate-900">
                  <AlertCircle className="w-5 h-5 text-brand-500" />
                  <h3 className="font-bold">General Instructions</h3>
                </div>
                <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedPaper.instructions}
                </p>
              </div>
            )}

            {selectedPaper.questions.map((q, i) => (
              <div key={q.id} className="relative pl-12">
                 <div className="absolute left-0 top-0 w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-black text-slate-500">
                   {i + 1}
                 </div>
                 <div className="flex items-center gap-3 mb-3">
                   <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-md">
                     {q.type}
                   </span>
                   <span className="text-xs font-bold text-slate-400">{q.marks} Marks</span>
                 </div>
                 {q.type === QuestionType.LONG_ANSWER ? (
                   <div className="space-y-4 mb-4">
                     <div className="flex items-center gap-2 text-slate-400">
                       <span className="text-[10px] font-black uppercase tracking-widest">Part a</span>
                     </div>
                     <p className="text-lg font-medium text-slate-900 leading-relaxed">{q.text}</p>
                     
                     <div className="flex items-center justify-center py-2">
                       <div className="h-px bg-slate-100 flex-1" />
                       <span className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">OR</span>
                       <div className="h-px bg-slate-100 flex-1" />
                     </div>

                     <div className="flex items-center gap-2 text-slate-400">
                       <span className="text-[10px] font-black uppercase tracking-widest">Part b</span>
                     </div>
                     <p className="text-lg font-medium text-slate-900 leading-relaxed">
                       {q.alternativeText || '[Alternative Question Placeholder]'}
                     </p>
                   </div>
                 ) : (
                   <p className="text-lg font-medium text-slate-900 leading-relaxed mb-4">{q.text}</p>
                 )}
                 
                 {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-500">
                              <span className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">
                                {String.fromCharCode(65+idx)}
                              </span>
                              {opt}
                            </div>
                        ))}
                    </div>
                 )}
              </div>
            ))}
          </div>

          <div className="p-8 bg-slate-900 text-white">
             <div className="flex items-center gap-2 mb-4">
               <MessageSquare className="w-5 h-5 text-brand-400" />
               <label className="text-sm font-bold">Reviewer Feedback</label>
             </div>
             <textarea 
               className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all mb-8 min-h-[100px] resize-none"
               placeholder="Add comments for the faculty member (optional for approval, required for rejection)..."
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
             />
             <div className="flex flex-col md:flex-row justify-end gap-4">
               <button 
                  onClick={() => handleDecision(PaperStatus.REJECTED)}
                  disabled={loading}
                  className="px-8 py-3 bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white rounded-2xl font-bold transition-all border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  {loading ? 'Processing...' : 'Reject Paper'}
               </button>
               <button 
                  onClick={() => handleDecision(PaperStatus.APPROVED)}
                  disabled={loading}
                  className="px-8 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {loading ? 'Processing...' : 'Approve & Finalize'}
               </button>
             </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (currentView === 'users') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Department Faculty</h2>
            <p className="text-slate-500 mt-1">Manage faculty members in {adminDept || 'your department'}.</p>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Faculty Members</h3>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by name or email..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Department</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold">
                          {user.firstName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                        user.role === UserRole.SUPER_ADMIN ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        user.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        'bg-slate-50 text-slate-600 border-slate-100'
                      }`}>
                        {user.role?.replace('_', ' ') || user.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-slate-500">{user.department || '-'}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => handleDeleteUser(user.uid)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Review Queue</h2>
          <p className="text-slate-500 mt-1">
            {role === UserRole.SUPER_ADMIN 
              ? 'Evaluate and approve submitted question papers across all departments.' 
              : `Evaluate and approve submitted question papers for ${adminDept || 'your department'}.`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading queue...</p>
        </div>
      ) : papers.length === 0 ? (
        <div className="bg-white rounded-[32px] p-16 text-center border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">All caught up!</h3>
            <p className="text-slate-500">There are no pending papers to review at this time.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {papers.map(paper => (
            <motion.div 
              key={paper.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:shadow-md transition-all group"
            >
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900 group-hover:text-brand-600 transition-colors">{paper.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="text-sm font-bold text-slate-400">{paper.courseCode}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <UserIcon className="w-3.5 h-3.5" />
                      {facultyDetails[paper.facultyId]?.name || paper.facultyName}
                      {facultyDetails[paper.facultyId]?.email && (
                        <span className="text-slate-300">({facultyDetails[paper.facultyId]?.email})</span>
                      )}
                    </span>
                    {paper.department && (
                      <>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Building2 className="w-3.5 h-3.5" />
                          {paper.department}
                        </span>
                      </>
                    )}
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="text-sm text-slate-500">{paper.questions.length} Questions</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-100">
                      Pending Approval
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPaper(paper)}
                className="w-full md:w-auto px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
              >
                Review Paper
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUserToDelete(null)}
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
                    <h3 className="text-2xl font-bold text-slate-900">Remove User</h3>
                    <p className="text-sm text-slate-500">This action cannot be undone.</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-8">Are you sure you want to remove this user from the system?</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setUserToDelete(null)}
                    className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDeleteUser}
                    className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20"
                  >
                    Remove User
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
