# Google OAuth Configuration for Production

## 🔧 Firebase Console Settings

### **1. Authorized Domains**
Add these domains to Firebase → Authentication → Settings → Authorized domains:
```
https://q-genius-luyyy8yyu-amritanshutiwari3005-gmailcoms-projects.vercel.app
https://q-genius-puce.vercel.app
localhost
```

### **2. OAuth Consent Screen**
Go to Firebase → Authentication → Settings → OAuth consent screen:
- **Application name**: Q-Genius
- **User support email**: your-email@gmail.com
- **Homepage URL**: https://q-genius-luyyy8yyu-amritanshutiwari3005-gmailcoms-projects.vercel.app
- **Privacy Policy URL**: https://q-genius-luyyy8yyu-amritanshutiwari3005-gmailcoms-projects.vercel.app/privacy
- **Terms of Service URL**: https://q-genius-luyyy8yyu-amritanshutiwari3005-gmailcoms-projects.vercel.app/terms

### **3. Test URLs**
After updating, test these URLs:
- Main: https://q-genius-luyyy8yyu-amritanshutiwari3005-gmailcoms-projects.vercel.app
- Alias: https://q-genius-puce.vercel.app

## 🚀 Steps to Fix Google Login

1. **Add authorized domains** in Firebase Console
2. **Update OAuth consent screen**
3. **Wait 5-10 minutes** for changes to propagate
4. **Test Google login** on deployed site
5. **Clear browser cache** if still not working

## 🔍 Common Issues

### **"Unauthorized domain"**
- Add Vercel URL to authorized domains
- Wait for Firebase to update

### **"redirect_uri_mismatch"**
- Check OAuth consent screen URLs
- Ensure they match Vercel domain

### **"popup_closed_by_user"**
- Check popup blockers
- Try again after clearing cache

Your Google login should work after these Firebase updates! 🎉
