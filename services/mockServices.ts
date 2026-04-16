import { User, UserRole, QuestionPaper, PaperStatus, DashboardStats, PaperTemplate, QuestionType } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { db, collection, addDoc, getDocs, getDoc, updateDoc, query, where, deleteDoc, doc, setDoc, handleFirestoreError, OperationType, Timestamp, onSnapshot, auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, FieldValue } from "../src/firebase-vercel";

// Helper to safely access environment variables
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
       // @ts-ignore
       return import.meta.env[`VITE_${key}`] || import.meta.env[key];
    }
  } catch (e) {
    return '';
  }
  return '';
};

// Helper to remove undefined values for Firestore
export const sanitizeForFirestore = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v));
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Timestamp) && !(obj instanceof FieldValue)) {
    const newObj: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        newObj[key] = sanitizeForFirestore(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

// --- Mailgun Service ---
export const sendWelcomeEmail = async (user: User) => {
  console.log(`[EMAIL SERVICE] Requesting welcome email for ${user.email} via server...`);

  try {
    const response = await fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: user.email,
        firstName: user.firstName
      })
    });

    const result = await response.json();
    
    if (result.success) {
      if (result.simulated) {
        console.warn("ℹ️ Email was simulated (Sandbox or missing credentials).");
        if (result.sandbox) {
          alert("Note: Mailgun is in Sandbox mode. The email was simulated because the recipient is not an 'Authorized Recipient' in Mailgun settings. Check server logs for content.");
        }
      } else {
        console.log("✅ Email sent successfully via server!");
      }
    } else {
      throw new Error(result.error || "Unknown server error");
    }
  } catch (error: any) {
    console.error("❌ Failed to send email via server:", error);
    alert("Failed to send welcome email. See console for details.");
  }
};



// --- Auth Services ---

export const signUpUser = async (email: string, password: string, userData: Partial<User>) => {
    // 1. Create Auth User
    const { user: authUser } = await createUserWithEmailAndPassword(auth, email, password);
    if (!authUser) throw new Error("No user created.");

    await updateProfile(authUser, {
        displayName: `${userData.firstName} ${userData.lastName}`
    });

    const newUser: User = {
        uid: authUser.uid,
        email: email,
        firstName: userData.firstName!,
        lastName: userData.lastName!,
        role: userData.role || UserRole.FACULTY,
        department: userData.department
    };

    // 2. Create Profile Entry
    await setDoc(doc(db, 'users', newUser.uid), sanitizeForFirestore(newUser));

    return newUser;
};

export const loginUser = async (email: string, password: string): Promise<User> => {
    const { user: authUser } = await signInWithEmailAndPassword(auth, email, password);
    if (!authUser) throw new Error("Login failed");

    // Fetch profile details
    const userDoc = await getDoc(doc(db, 'users', authUser.uid));
    
    if (!userDoc.exists()) {
        throw new Error("User profile not found");
    }

    return userDoc.data() as User;
};


// --- Paper Operations ---

export const savePaperToDB = async (paper: QuestionPaper): Promise<void> => {
    try {
        const paperDocRef = doc(db, 'questionPapers', paper.id);
        // Convert ISO string to Firestore Timestamp for createdAt if needed, 
        // but firestore.rules expects timestamp. 
        // Let's use serverTimestamp if we want, but the interface says string.
        // To satisfy firestore.rules 'is timestamp', we should convert it.
        const paperData = sanitizeForFirestore({
            ...paper,
            createdAt: Timestamp.fromDate(new Date(paper.createdAt))
        });
        await setDoc(paperDocRef, paperData);
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `questionPapers/${paper.id}`);
    }
};

export const getPapersForAdmin = async (department?: string): Promise<QuestionPaper[]> => {
    try {
        const papersRef = collection(db, 'questionPapers');
        let q = query(papersRef, where('status', '==', PaperStatus.PENDING_APPROVAL));
        
        if (department) {
            q = query(q, where('department', '==', department));
        }
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
            } as QuestionPaper;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "questionPapers");
        return [];
    }
};

export const getPapersForFaculty = async (facultyId: string): Promise<QuestionPaper[]> => {
    try {
        const papersRef = collection(db, 'questionPapers');
        const q = query(papersRef, where('facultyId', '==', facultyId));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
            } as QuestionPaper;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "questionPapers");
        return [];
    }
};

export const getAllPapersForSemesterStats = async (): Promise<QuestionPaper[]> => {
    try {
        const papersRef = collection(db, 'questionPapers');
        const querySnapshot = await getDocs(papersRef);
        
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
            } as QuestionPaper;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "questionPapers");
        return [];
    }
};

export const subscribeToSemesterStats = (callback: (papers: QuestionPaper[]) => void, department?: string) => {
    const papersRef = collection(db, 'questionPapers');
    let q: any = papersRef;
    
    if (department) {
        q = query(papersRef, where('department', '==', department));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const papers = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
            } as QuestionPaper;
        });
        callback(papers);
    }, (error) => {
        console.error("Error in semester stats subscription:", error);
        handleFirestoreError(error, OperationType.LIST, "questionPapers");
    });
    
    return unsubscribe;
};

export const updatePaperStatus = async (id: string, status: PaperStatus, feedback?: string): Promise<void> => {
    console.log('🔄 Updating paper status:', { id, status, feedback });
    
    try {
        const paperDocRef = doc(db, 'questionPapers', id);
        console.log('📄 Document reference created:', paperDocRef.path);
        
        const updateData: any = { 
            status: status
        };
        
        if (feedback !== undefined) {
            updateData.adminFeedback = feedback;
        }
        
        console.log('📝 Update data:', updateData);
        
        await updateDoc(paperDocRef, updateData);
        console.log('✅ Paper status updated successfully');
        
    } catch (error) {
        console.error('❌ Failed to update paper status:', error);
        handleFirestoreError(error, OperationType.UPDATE, `questionPapers/${id}`);
        throw error; // Re-throw to let the calling function handle it
    }
};

export const subscribeToPapersForAdmin = (department: string | undefined, callback: (papers: QuestionPaper[]) => void) => {
    try {
        const papersRef = collection(db, 'questionPapers');
        let q = query(papersRef);
        if (department) {
            q = query(papersRef, where('department', '==', department));
        }
        
        return onSnapshot(q, (snapshot) => {
            const papers = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
                } as QuestionPaper;
            });
            callback(papers);
        }, (error) => {
            handleFirestoreError(error, OperationType.LIST, "questionPapers");
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "questionPapers");
        return () => {};
    }
};

export const subscribeToPapersForFaculty = (facultyId: string, callback: (papers: QuestionPaper[]) => void) => {
    try {
        const papersRef = collection(db, 'questionPapers');
        const q = query(papersRef, where('facultyId', '==', facultyId));
        
        return onSnapshot(q, (snapshot) => {
            const papers = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
                } as QuestionPaper;
            });
            callback(papers);
        }, (error) => {
            handleFirestoreError(error, OperationType.LIST, "questionPapers");
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "questionPapers");
        return () => {};
    }
};

export const deletePaper = async (id: string): Promise<void> => {
    try {
        const paperDocRef = doc(db, 'questionPapers', id);
        await deleteDoc(paperDocRef);
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `questionPapers/${id}`);
    }
};

// --- User Operations ---

export const subscribeToUsers = (department: string | undefined, callback: (users: User[]) => void) => {
    try {
        const usersRef = collection(db, 'users');
        let q = query(usersRef);
        if (department) {
            q = query(usersRef, where('department', '==', department));
        }
        return onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => {
                const data = doc.data() as Omit<User, 'uid'>;
                return {
                    ...data,
                    uid: doc.id
                } as User;
            });
            callback(users);
        }, (error) => {
            handleFirestoreError(error, OperationType.LIST, "users");
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "users");
        return () => {};
    }
};

export const addUser = async (user: User): Promise<void> => {
    try {
        await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore(user));
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
}

export const removeUser = async (uid: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
}

export const getFacultyName = async (facultyId: string): Promise<{ name: string; email: string } | null> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', facultyId));
        if (userDoc.exists()) {
            const data = userDoc.data() as User;
            return {
                name: `${data.firstName} ${data.lastName}`,
                email: data.email
            };
        }
        return null;
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${facultyId}`);
        return null;
    }
};

// --- Template Operations ---

export const saveTemplate = async (template: PaperTemplate): Promise<void> => {
    try {
        await setDoc(doc(db, "templates", template.id), sanitizeForFirestore({
            id: template.id,
            name: template.name,
            fileUrl: template.fileUrl,
            uploadedAt: Timestamp.fromDate(new Date(template.uploadedAt)),
            authorId: template.facultyId
        }));
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `templates/${template.id}`);
    }
};

export const getTemplates = async (facultyId?: string): Promise<PaperTemplate[]> => {
    try {
        const templatesRef = collection(db, "templates");
        let q;
        if (facultyId) {
            q = query(templatesRef, where("authorId", "==", facultyId));
        } else {
            q = query(templatesRef);
        }
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as any;
            return {
                id: data.id,
                name: data.name,
                fileUrl: data.fileUrl,
                uploadedAt: data.uploadedAt instanceof Timestamp ? data.uploadedAt.toDate().toISOString() : data.uploadedAt,
                facultyId: data.authorId
            } as PaperTemplate;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "templates");
        return [];
    }
};

export const deleteTemplate = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, "templates", id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `templates/${id}`);
    }
};

// --- Stats ---

export const subscribeToSuperAdminStats = (department: string | undefined | null, callback: (data: { stats: DashboardStats, activities: any[] }) => void) => {
    try {
        const papersRef = collection(db, 'questionPapers');
        let q: any = query(papersRef);
        if (department) {
            q = query(papersRef, where('department', '==', department));
        }
        return onSnapshot(q, (snapshot) => {
            let totalPapers = 0;
            let approved = 0;
            let rejected = 0;
            let pending = 0;
            
            let mcqCount = 0;
            let shortCount = 0;
            let longCount = 0;
            
            const topicCounts: Record<string, number> = {};
            const activities: any[] = [];
            
            snapshot.docs.forEach(doc => {
                const data = doc.data() as QuestionPaper;
                totalPapers++;
                if (data.status === PaperStatus.APPROVED) approved++;
                else if (data.status === PaperStatus.REJECTED) rejected++;
                else if (data.status === PaperStatus.PENDING_APPROVAL) pending++;
                
                // Topic counts
                if (data.courseCode) {
                    topicCounts[data.courseCode] = (topicCounts[data.courseCode] || 0) + 1;
                }
                
                // Question counts
                if (data.questions && Array.isArray(data.questions)) {
                    data.questions.forEach(q => {
                        if (q.type === QuestionType.MCQ) mcqCount++;
                        else if (q.type === QuestionType.SHORT_ANSWER) shortCount++;
                        else if (q.type === QuestionType.LONG_ANSWER) longCount++;
                    });
                }
                
                // Generate activities from papers
                let action = 'generated a paper';
                let type = 'generation';
                if (data.status === PaperStatus.APPROVED) {
                    action = 'approved a paper';
                    type = 'approval';
                } else if (data.status === PaperStatus.REJECTED) {
                    action = 'rejected a paper';
                    type = 'rejection';
                }
                
                let timestamp = Date.now();
                const rawCreatedAt = (data as any).createdAt;
                if (rawCreatedAt) {
                  if (typeof rawCreatedAt === 'object' && 'toMillis' in rawCreatedAt) {
                    timestamp = rawCreatedAt.toMillis();
                  } else {
                    timestamp = new Date(rawCreatedAt).getTime();
                  }
                }
                
                activities.push({
                    id: doc.id,
                    user: data.facultyName || 'Unknown',
                    action: action,
                    topic: data.courseCode || 'Unknown',
                    time: new Date(timestamp).toLocaleString(),
                    type: type,
                    timestamp: timestamp
                });
            });
            
            const topTopics = Object.entries(topicCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
                
            activities.sort((a, b) => b.timestamp - a.timestamp);
            
            const stats: DashboardStats = {
                totalPapers,
                approved,
                rejected,
                pending,
                topTopics: topTopics.length > 0 ? topTopics : [
                    { name: 'Data Structures', count: 0 },
                    { name: 'Algorithms', count: 0 },
                    { name: 'Database Systems', count: 0 },
                    { name: 'Operating Systems', count: 0 },
                    { name: 'Computer Networks', count: 0 },
                ],
                difficultyDistribution: [
                    { name: 'Easy', value: 30 },
                    { name: 'Medium', value: 50 },
                    { name: 'Hard', value: 20 },
                ],
                questionDistribution: [
                    { name: 'MCQs', value: mcqCount },
                    { name: 'Short Answers', value: shortCount },
                    { name: 'Long Answers', value: longCount },
                ]
            };
            
            callback({ stats, activities: activities.slice(0, 10) });
        }, (error) => {
            handleFirestoreError(error, OperationType.LIST, "questionPapers");
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "questionPapers");
        return () => {};
    }
};

