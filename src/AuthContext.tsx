import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, googleProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, FirebaseUser, auth, db, doc, getDoc, setDoc, serverTimestamp } from './firebase';
import { UserRole } from '../types';
import { sanitizeForFirestore } from '../services/mockServices';

interface AuthContextType {
  user: FirebaseUser | any | null;
  loading: boolean;
  role: UserRole | null;
  department: string | null;
  error: string | null;
  loginAsMockUser: (role: UserRole, department?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  department: null,
  error: null,
  loginAsMockUser: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('qgenius_mock_user');
      setUser(null);
      setRole(null);
      setDepartment(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const loginAsMockUser = (selectedRole: UserRole, selectedDept: string = "Computer Science") => {
    const mockUser = {
      uid: 'mock-user-' + Math.random().toString(36).substr(2, 9),
      email: 'demo@qgenius.edu',
      displayName: 'Demo User',
      photoURL: 'https://i.pravatar.cc/150?u=demo',
      isMock: true,
      role: selectedRole,
      department: selectedDept
    };
    
    localStorage.setItem('qgenius_mock_user', JSON.stringify(mockUser));
    setUser(mockUser as any);
    setRole(selectedRole);
    setDepartment(selectedDept);
    setLoading(false);
  };

  useEffect(() => {
    // Check for mock user first
    const savedMockUser = localStorage.getItem('qgenius_mock_user');
    if (savedMockUser) {
      try {
        const parsed = JSON.parse(savedMockUser);
        setUser(parsed);
        setRole(parsed.role);
        setDepartment(parsed.department);
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('qgenius_mock_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (localStorage.getItem('qgenius_mock_user')) return;
      
      setUser(firebaseUser);
      setError(null);
      
      if (firebaseUser) {
        try {
          // Check or create user profile in Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (err: any) {
            console.error("Error getting user doc:", err);
            setError("Failed to load user profile. Please check your internet connection and try again.");
            setLoading(false);
            return;
          }

          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role as UserRole);
            setDepartment(data.department || null);
          } else {
            // Create new user profile
            const defaultRole = firebaseUser.email === "amritanshutiwari3005@gmail.com" ? UserRole.SUPER_ADMIN : UserRole.FACULTY;
            const userData: any = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: defaultRole,
              department: null, // Initialize department field
              createdAt: serverTimestamp(),
            };
            try {
              await setDoc(userDocRef, sanitizeForFirestore(userData));
              
              // Send welcome email (fire and forget, don't block UI)
              setTimeout(() => {
                fetch('/api/send-welcome-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: firebaseUser.email,
                    firstName: firebaseUser.displayName?.split(' ')[0] || 'User'
                  })
                }).catch(err => console.error("Error triggering welcome email:", err));
              }, 0);
              
            } catch (err: any) {
              console.error("Error creating user profile:", err);
              setError("Failed to create your profile. Please try again.");
              setLoading(false);
              return;
            }
            setRole(defaultRole);
            setDepartment(null);
          }
        } catch (err: any) {
          console.error("Error fetching user profile:", err);
          setError("An unexpected error occurred while setting up your account.");
          setRole(null);
        }
      } else {
        setRole(null);
        setDepartment(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role, department, error, logout, loginAsMockUser }}>
      {children}
    </AuthContext.Provider>
  );
};
