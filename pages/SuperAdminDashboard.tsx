import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';
import { 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  MoreVertical, 
  UserPlus, 
  Trash2, 
  Shield, 
  BarChart3, 
  PieChart as PieChartIcon,
  TrendingUp,
  Activity,
  XCircle,
  Mail,
  User as UserIcon,
  Building2,
  Radio,
  BookOpen,
  Brain,
  Layers,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { subscribeToSuperAdminStats, subscribeToUsers, addUser, removeUser, getAllPapersForSemesterStats, subscribeToSemesterStats } from '../services/mockServices';
import { DashboardStats, User, UserRole, ViewType, QuestionPaper } from '../types';
import { useAuth } from '../src/AuthContext';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const SuperAdminDashboard: React.FC<{ currentView: ViewType }> = ({ currentView }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allPapers, setAllPapers] = useState<QuestionPaper[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.FACULTY });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<{ loading?: boolean; success?: boolean; error?: string }>();

  // Function to extract semester from subject code
  const getSemesterFromSubjectCode = (subjectCode: string): number | null => {
    if (!subjectCode || typeof subjectCode !== 'string') return null;
    
    // Extract the first digit from the subject code
    const match = subjectCode.match(/\b(\d)/);
    if (match) {
      const semester = parseInt(match[1]);
      // Validate semester range (1-8)
      if (semester >= 1 && semester <= 8) {
        return semester;
      }
    }
    return null;
  };

  // Calculate semester-wise statistics
  const getSemesterStats = () => {
    const semesterPapers: { [key: number]: number } = {};
    
    // Count papers from all users
    allPapers.forEach(paper => {
      const semester = getSemesterFromSubjectCode(paper.courseCode || '');
      if (semester) {
        semesterPapers[semester] = (semesterPapers[semester] || 0) + 1;
      }
    });
    
    return semesterPapers;
  };

  const { department } = useAuth();

  // Load all papers for semester statistics (real-time)
  useEffect(() => {
    const filterDept = department ? department : undefined;
    
    const unsubscribe = subscribeToSemesterStats((papers) => {
      setAllPapers(papers);
    }, filterDept);
    
    return () => {
      unsubscribe();
    };
  }, [department]);

  useEffect(() => {
    const filterDept = department ? department : undefined;
    
    if (currentView === 'reports') {
        setIsLive(true);
        const unsubscribe = subscribeToSuperAdminStats(filterDept, (data) => {
            setStats(data.stats);
            setActivities(data.activities);
        });
        return () => {
            setIsLive(false);
            unsubscribe();
        };
    } else if (currentView === 'users') {
        const unsubscribe = subscribeToUsers(filterDept, (users) => {
            setUsers(users);
        });
        return () => unsubscribe();
    }
  }, [currentView, department]);


  const handleAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newUser.email || !newUser.firstName) return;
      await addUser({
          uid: `new-${Date.now()}`,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName || '',
          role: newUser.role || UserRole.FACULTY,
          department: newUser.department
      } as User);
      setShowUserModal(false);
      setNewUser({ role: UserRole.FACULTY });
  }

  const handleDeleteUser = (uid: string) => {
      setUserToDelete(uid);
  }

  const confirmDeleteUser = async () => {
      if (userToDelete) {
          try {
              await removeUser(userToDelete);
          } catch (error) {
              console.error("Failed to delete user:", error);
              // Optionally show a toast or error message here
          } finally {
              setUserToDelete(null);
          }
      }
  }

  const handleSendTestEmail = async () => {
    const email = window.prompt("Enter the email to send a test welcome message to (must be an Authorized Recipient in Mailgun):");
    if (!email) return;

    setTestEmailStatus({ loading: true });
    try {
      const response = await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: 'Test User' })
      });
      const result = await response.json();
      if (result.success) {
        setTestEmailStatus({ loading: false, success: true });
        alert("Test email sent! Check your inbox (and spam folder).");
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (err: any) {
      setTestEmailStatus({ loading: false, error: err.message });
      alert(`Failed to send test email: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentView === 'users') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">User Management</h2>
            <p className="text-slate-500 mt-1">Manage system access and roles for faculty and admins.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSendTestEmail}
              disabled={testEmailStatus?.loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
              {testEmailStatus?.loading ? 'Sending...' : 'Send Test Email'}
            </button>
            <button 
              onClick={() => setShowUserModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-500/20 active:scale-95"
            >
              <UserPlus className="w-5 h-5" />
              Add New User
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">System Users</h3>
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

        <AnimatePresence>
          {showUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowUserModal(false)}
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
                    <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">Add User</h3>
                      <p className="text-sm text-slate-500">Create a new system account.</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">First Name</label>
                        <input 
                          required
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                          placeholder="John"
                          onChange={e => setNewUser({...newUser, firstName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Last Name</label>
                        <input 
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                          placeholder="Doe"
                          onChange={e => setNewUser({...newUser, lastName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Email Address</label>
                      <input 
                        required
                        type="email"
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                        placeholder="john@university.edu"
                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Department</label>
                      <select 
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer"
                        value={newUser.department || ''}
                        onChange={e => setNewUser({...newUser, department: e.target.value})}
                      >
                        <option value="">Select Department</option>
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
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">System Role</label>
                      <select 
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all appearance-none"
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                      >
                        <option value={UserRole.FACULTY}>Faculty Member</option>
                        <option value={UserRole.ADMIN}>Department Admin</option>
                        <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setShowUserModal(false)}
                        className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-500/20"
                      >
                        Create User
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
  }

  if (!stats) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
      <p className="text-slate-500 font-medium">Loading analytics...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">System Overview</h2>
          <p className="text-slate-500 mt-1">Platform-wide statistics and performance metrics.</p>
        </div>
        
        {isLive && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Live Updates</span>
          </div>
        )}
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Papers', value: stats.totalPapers, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending', value: stats.pending, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Semester-wise Statistics */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Semester-wise Paper Statistics</h3>
              <p className="text-sm text-slate-500">
                {department ? `Real-time data for ${department}` : 'Real-time data for all departments'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Live</span>
              </div>
            )}
            <span className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-lg">
              First digit of subject code
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(() => {
            const semesterStats = getSemesterStats();
            const totalPapers = Object.values(semesterStats).reduce((sum, count) => sum + count, 0);
            const semesterCount = Object.keys(semesterStats).length;
            const entries = Object.entries(semesterStats);
            const mostActiveSemester = entries.length > 0 ? 
              entries.reduce((max, curr) => curr[1] > max[1] ? curr : max)[0] : null;
            
            return [
              {
                label: 'Total Papers',
                value: totalPapers,
                icon: FileText,
                color: 'text-blue-600',
                bg: 'bg-blue-50'
              },
              {
                label: 'Semesters Covered',
                value: semesterCount,
                icon: Layers,
                color: 'text-green-600',
                bg: 'bg-green-50'
              },
              {
                label: 'Most Active Semester',
                value: mostActiveSemester ? `${mostActiveSemester}th` : 'N/A',
                icon: Zap,
                color: 'text-purple-600',
                bg: 'bg-purple-50'
              },
              {
                label: 'Average per Semester',
                value: semesterCount > 0 ? (totalPapers / semesterCount).toFixed(1) : '0',
                icon: Brain,
                color: 'text-amber-600',
                bg: 'bg-amber-50'
              }
            ].map((kpi, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-100"
              >
                <div className={`w-10 h-10 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center mb-3`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{kpi.value}</p>
              </motion.div>
            ));
          })()}
        </div>

        {/* Semester Distribution Chart */}
        {Object.keys(getSemesterStats()).length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-slate-700">Semester Distribution</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {Object.entries(getSemesterStats())
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([semester, count]) => {
                  const total = Object.values(getSemesterStats()).reduce((sum, c) => sum + c, 0);
                  const percentage = total > 0 ? (count / total * 100).toFixed(0) : '0';
                  return (
                    <div key={semester} className="text-center">
                      <div className="relative">
                        <div className="w-full h-24 bg-slate-100 rounded-xl overflow-hidden">
                          <div 
                            className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-500"
                            style={{ height: `${percentage}%` }}
                          />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-white drop-shadow-lg">{count}</span>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-2">
                        {semester === '1' ? '1st' : 
                         semester === '2' ? '2nd' : 
                         semester === '3' ? '3rd' : 
                         semester === '4' ? '4th' : 
                         semester === '5' ? '5th' : 
                         semester === '6' ? '6th' : 
                         semester === '7' ? '7th' : 
                         semester === '8' ? '8th' : `${semester}th`} Sem
                      </p>
                    </div>
                  );
                })}
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-sm text-amber-700">
                <strong>Recognition Pattern:</strong> CS602 → 6th Semester, BT205 → 2nd Semester, ME304 → 3rd Semester
              </p>
            </div>
          </div>
        )}
        
        {Object.keys(getSemesterStats()).length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-lg font-bold text-slate-700 mb-2">No Semester Data Available</h4>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {department 
                ? `No papers with valid subject codes found in ${department}. Subject codes should start with a digit (1-8) followed by text.`
                : 'No papers with valid subject codes found. Subject codes should start with a digit (1-8) followed by text.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Most Frequent Topics</h3>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topTopics} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Recent System Activity</h3>
            </div>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {activities.map((activity) => (
                  <motion.div 
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      activity.type === 'generation' ? 'bg-indigo-100 text-indigo-600' :
                      activity.type === 'approval' ? 'bg-emerald-100 text-emerald-600' :
                      activity.type === 'rejection' ? 'bg-red-100 text-red-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {activity.type === 'generation' ? <Plus className="w-4 h-4" /> :
                       activity.type === 'approval' ? <CheckCircle2 className="w-4 h-4" /> :
                       activity.type === 'rejection' ? <XCircle className="w-4 h-4" /> :
                       <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        <span className="font-bold">{activity.user}</span> {activity.action}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{activity.topic}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className="text-[10px] font-medium text-slate-400">{activity.time}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {activities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Activity className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm font-medium">Waiting for activity...</p>
                </div>
              )}
            </div>
         </div>
      </div>

      {/* Question Distribution Pie Chart */}
      <div className="grid grid-cols-1 gap-8 mt-8">
         <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500">
                <PieChartIcon className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Question Type Distribution</h3>
            </div>
            <div className="h-[350px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.questionDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.questionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
