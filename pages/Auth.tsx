import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types';
import { sanitizeForFirestore } from '../services/mockServices';
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight, School, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail,
  db,
  doc,
  setDoc,
  serverTimestamp
} from '../src/firebase';
import { useAuth } from '../src/AuthContext';
import { isSupabaseConfigured } from '../services/supabaseClient';

const Auth: React.FC = () => {
  const { loginAsMockUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.FACULTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent. Please check your inbox.");
    } catch (err: any) {
      console.error("Password Reset Error:", err);
      setError(err.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  const generateStrongPassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0; i < 12; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(retVal);
  };

  const departments = [
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
  ].sort();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // AuthContext will handle the user state update and Firestore profile creation
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("The sign-in popup was closed before completion. Please try again and keep the window open until sign-in is finished.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("The sign-in popup was blocked by your browser. Please allow popups for this site and try again.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError("Sign-in request was cancelled. Please try again.");
      } else {
        setError(err.message || "Google authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
          // Check for mock credentials first if in mock mode
          if (!isSupabaseConfigured && email === 'admin@example.com' && password === 'password') {
            loginAsMockUser(UserRole.SUPER_ADMIN);
            return;
          }
          await signInWithEmailAndPassword(auth, email, password);
      } else {
          // Create user in Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          // Update profile with name
          const displayName = `${firstName} ${lastName}`.trim();
          await updateProfile(user, { displayName });

          // Create user profile in Firestore with the selected role
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, sanitizeForFirestore({
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            role: role, // Store the full UserRole enum value (e.g., 'FACULTY', 'ADMIN', 'SUPER_ADMIN')
            department: department,
            createdAt: serverTimestamp(),
          }));
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let friendlyMessage = "Authentication failed. Please check your credentials.";
      
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = "This email is already registered. Please try signing in instead.";
      } else if (err.code === 'auth/operation-not-allowed') {
        friendlyMessage = "Email/Password login is not enabled in your Firebase project. Please enable it in the Firebase Console under Authentication > Sign-in method.";
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        friendlyMessage = "Invalid email or password. Please check your credentials or reset your password if you've forgotten it.";
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = "Please enter a valid email address.";
      } else if (err.message && !err.message.includes('auth/')) {
        friendlyMessage = err.message;
      }
      
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left Side - Visual */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Q-Genius</span>
          </div>
          
          <h2 className="text-5xl font-bold text-white leading-tight mb-6">
            The future of <br />
            <span className="text-brand-400">academic assessment</span> <br />
            is here.
          </h2>
          <p className="text-slate-400 text-lg max-w-md">
            Join thousands of educators streamlining their workflow with AI-powered question generation.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-3">
            {[1,2,3,4].map(i => (
              <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-10 h-10 rounded-full border-2 border-slate-900" alt="User" referrerPolicy="no-referrer" />
            ))}
          </div>
          <p className="text-sm text-slate-400 font-medium">Trusted by 500+ institutions</p>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-500/10 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-brand-400/5 blur-3xl rounded-full" />
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h1 className="text-3xl font-bold mb-2">{isLogin ? 'Welcome back' : 'Create an account'}</h1>
            <p className="text-slate-500">
              {isLogin ? "Enter your credentials to access your dashboard" : "Start your journey with AI-powered exams"}
            </p>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign Up
            </button>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full mb-6 flex items-center justify-center gap-3 h-12 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors text-sm font-bold text-slate-700 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-400 font-medium">Or continue with email</span>
            </div>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
                <p className="text-slate-500">Enter your email address to receive a password reset link.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field pl-11"
                    placeholder="name@institution.edu"
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-100"
                >
                  <span>{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-100"
                >
                  <span>{success}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 h-12"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-sm text-slate-500 hover:text-slate-900 font-medium"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">First Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="input-field pl-11"
                        placeholder="John"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="input-field"
                      placeholder="Doe"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="name@institution.edu"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"}
                  required 
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-11 pr-20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-600 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {!isLogin && (
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-600 transition-colors"
                    title="Suggest strong password"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isLogin && (
                <button 
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-brand-600 font-medium hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Department</label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    required
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="input-field pl-11 bg-white"
                  >
                    <option value="" disabled>Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Select your role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPER_ADMIN].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`text-[10px] font-bold py-2.5 rounded-xl border transition-all ${role === r ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-100"
              >
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 h-12"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            {isLogin && !isForgotPassword && (
              <p className="text-center text-sm text-slate-600 mt-4">
                Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setIsLogin(false)}
                  className="text-brand-600 font-bold hover:underline"
                >
                  Sign up
                </button>
              </p>
            )}
          </form>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
