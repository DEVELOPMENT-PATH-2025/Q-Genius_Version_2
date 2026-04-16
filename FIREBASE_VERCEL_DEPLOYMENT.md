# Firebase Vercel Deployment Guide

## 🔧 Firebase Configuration for Vercel

### **✅ Files Created:**
- `.env.vercel` - Environment variables template
- `src/firebase-vercel.ts` - Production-ready Firebase config
- `firestore.vercel.rules` - Security rules for production
- Updated `vite.config.ts` with Firebase env variables

### **🚀 Step-by-Step Deployment:**

#### **Step 1: Deploy to Vercel**
```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy from project directory
vercel
```

#### **Step 2: Set Environment Variables in Vercel Dashboard**
1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add these variables** (copy from `.env.vercel`):

```
FIREBASE_PROJECT_ID=ai-question-paper-genera-cb676
FIREBASE_APP_ID=1:294497958738:web:e1b3a03997e6ec5eda188b
FIREBASE_API_KEY=AIzaSyAQ9jLs3pU-4nTxgFnl_nk3K8y8bsxctAQ
FIREBASE_AUTH_DOMAIN=ai-question-paper-genera-cb676.firebaseapp.com
FIREBASE_DATABASE_ID=ai-studio-e9ba6653-3824-44c6-802b-a5b46de9ee86
FIREBASE_STORAGE_BUCKET=ai-question-paper-genera-cb676.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=294497958738
FIREBASE_MEASUREMENT_ID=
```

3. **Set Environment**: Production
4. **Click Save**

#### **Step 3: Update Firestore Rules**
1. **Go to Firebase Console** → Firestore Database → Rules
2. **Replace existing rules** with content from `firestore.vercel.rules`
3. **Click Publish**

#### **Step 4: Redeploy**
```bash
vercel --prod
```

### **🔍 Common Firebase Errors & Solutions:**

#### **Error: "permission-denied"**
**Solution**: Update Firestore rules in Firebase Console

#### **Error: "project-not-found"**
**Solution**: Check FIREBASE_PROJECT_ID environment variable

#### **Error: "invalid-api-key"**
**Solution**: Verify FIREBASE_API_KEY environment variable

#### **Error: "network-request-failed"**
**Solution**: Check Firebase project settings and enable Firestore

### **🔧 Firebase Console Setup:**

#### **Authentication:**
1. **Enable Email/Password** sign-in method
2. **Enable Google** sign-in method
3. **Add authorized domains** (your Vercel URL)

#### **Firestore:**
1. **Create database** (if not exists)
2. **Start in test mode** (then update rules)
3. **Apply security rules** from `firestore.vercel.rules`

#### **Storage:**
1. **Enable Firebase Storage** (for file uploads)
2. **Set security rules** for uploads

### **🎯 Testing Checklist:**

#### **Before Deployment:**
- [ ] Firebase project created and configured
- [ ] Authentication methods enabled
- [ ] Firestore database created
- [ ] Security rules applied

#### **After Deployment:**
- [ ] User registration works
- [ ] Login functionality works
- [ ] Question papers save/load
- [ ] File uploads work
- [ ] Admin approval works

### **🚨 Important Notes:**

#### **Security:**
- **Never expose** Firebase private keys
- **Use environment variables** for all sensitive data
- **Apply strict security rules**
- **Enable authentication**

#### **Performance:**
- **Use Firestore indexes** for complex queries
- **Optimize bundle size** for production
- **Enable caching** where appropriate

#### **Monitoring:**
- **Check Firebase Console** for usage
- **Monitor Vercel logs** for errors
- **Set up alerts** for high usage

### **🎉 Expected Result:**

After following these steps, your app will:
- ✅ **Deploy successfully** on Vercel
- ✅ **Connect to Firebase** in production
- ✅ **Handle user authentication**
- ✅ **Save/load question papers**
- ✅ **Work with file uploads**
- ✅ **Support admin approval system**

### **📞 Support:**

If you encounter issues:
1. **Check Vercel logs** for deployment errors
2. **Check Firebase Console** for configuration issues
3. **Verify environment variables** in Vercel dashboard
4. **Test locally** with production environment variables

Your Firebase integration is now ready for Vercel production deployment! 🚀
