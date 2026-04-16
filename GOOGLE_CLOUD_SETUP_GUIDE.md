# Google Cloud Setup Guide for Faculty Users

## 🚨 Problem: Faculty Users Without Google Cloud Projects

Many faculty users encounter `403 PERMISSION_DENIED` errors when using personal Gemini API keys because they haven't created Google Cloud projects or enabled the Gemini API.

## 📋 Solutions (Choose One)

### **Option 1: Create Google Cloud Project (Recommended)**

#### **Step-by-Step Guide:**

1. **Create Google Cloud Account**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Sign in with your Gmail account
   - Accept terms of service

2. **Create New Project**
   - Click project dropdown (top left)
   - Click "NEW PROJECT"
   - Enter project name: `Q-Genius-Faculty-[YourName]`
   - Click "CREATE"

3. **Enable Gemini API**
   - Go to "APIs & Services" → "Enabled APIs & Services"
   - Click "+ ENABLE APIS AND SERVICES"
   - Search for "Gemini API" or "Generative Language API"
   - Select "Generative Language API"
   - Click "ENABLE"

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "CREATE CREDENTIALS" → "API key"
   - Give it a name: `Q-Genius-Faculty-Key`
   - Copy the generated API key
   - **Important**: Keep this key secure and private

5. **Configure API Key**
   - Paste the key in Q-Genius Settings
   - The key should start with "AIza"
   - Test the key by generating a sample question

### **Option 2: Use Institution API Key**

If your institution has provided a shared API key:

1. **Contact Your IT Administrator**
   - Request the institutional Gemini API key
   - Explain you need it for Q-Genius faculty dashboard
   - Get permission to use the key

2. **Use Shared Key**
   - Paste the institutional key in Settings
   - Follow any additional configuration instructions provided

### **Option 3: Department-Level API Management**

For institutions without individual API keys:

1. **Request Department Access**
   - Contact your department head
   - Request API access for educational purposes
   - Explain the need for AI-powered question generation

2. **Alternative Solutions**
   - Use the built-in curriculum-based generation (no API key needed)
   - Use manual question entry
   - Contact IT for centralized API key management

## 🔧 Troubleshooting

### **Common Issues & Solutions:**

| Issue | Solution |
|--------|----------|
| `403 PERMISSION_DENIED` | Enable Gemini API in Google Cloud Console |
| `INVALID_API_KEY` | Check key format (should start with "AIza") |
| `QUOTA_EXCEEDED` | Use personal key or wait for quota reset |
| `NETWORK_ERROR` | Check internet connection |

### **Quick Setup Checklist:**

- [ ] Google Cloud account created
- [ ] New project created
- [ ] Gemini API enabled
- [ ] API key generated and copied
- [ ] Key tested in Q-Genius
- [ ] Questions generated successfully

## 📞 Support Resources

### **Getting Help:**
- **Google Cloud Documentation**: [cloud.google.com/docs](https://cloud.google.com/docs)
- **Gemini API Guide**: [ai.google.dev/gemini-api](https://ai.google.dev/gemini-api)
- **Q-Genius Support**: Contact your institution's IT department

### **Security Notes:**
- Never share your API key publicly
- Store API keys securely
- Use different keys for different projects
- Regularly rotate API keys for security

## 🎯 Expected Outcome

After following these steps:
1. ✅ API key should work without permission errors
2. ✅ Faculty can generate questions using AI
3. ✅ No more `403 PERMISSION_DENIED` errors
4. ✅ Full access to Q-Genius features

---

**Last Updated**: April 11, 2024  
**Version**: 1.0  
**For**: Q-Genius Faculty Users
