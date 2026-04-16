import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  app.use(express.json());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Mock real-time stats generator
  let stats = {
    totalPapers: 1377,
    approved: 944,
    pending: 272,
    rejected: 161,
    topTopics: [
      { name: 'Data Structures', count: 482 },
      { name: 'Algorithms', count: 412 },
      { name: 'Database Systems', count: 345 },
      { name: 'Operating Systems', count: 308 },
      { name: 'Computer Networks', count: 224 },
    ],
    difficultyDistribution: [
      { name: 'Easy', value: 420 },
      { name: 'Medium', value: 650 },
      { name: 'Hard', value: 307 },
    ]
  };

  let activities: any[] = [
    { id: 1, user: 'Dr. Sarah Chen', action: 'generated a paper', topic: 'Data Structures', time: '2 mins ago', type: 'generation' },
    { id: 2, user: 'Admin Mike', action: 'approved a paper', topic: 'Algorithms', time: '5 mins ago', type: 'approval' },
    { id: 3, user: 'Prof. James Wilson', action: 'uploaded a syllabus', topic: 'Cloud Computing', time: '12 mins ago', type: 'upload' },
  ];

  const users = ['Dr. Sarah Chen', 'Prof. James Wilson', 'Dr. Robert Fox', 'Mike Admin', 'Prof. Elena Rodriguez', 'Dr. Amit Shah'];
  const topics = ['Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Computer Networks', 'Machine Learning', 'Cybersecurity'];
  const actions = [
    { text: 'generated a paper', type: 'generation' },
    { text: 'approved a paper', type: 'approval' },
    { text: 'rejected a paper', type: 'rejection' },
    { text: 'uploaded a syllabus', type: 'upload' }
  ];

  // Simulate real-time updates
  setInterval(() => {
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    // Update stats based on action
    if (randomAction.type === 'generation') {
      stats.totalPapers += 1;
      stats.pending += 1;
      // Update topic count
      const topicObj = stats.topTopics.find(t => t.name === randomTopic);
      if (topicObj) {
        topicObj.count += 1;
      } else if (stats.topTopics.length < 7) {
        stats.topTopics.push({ name: randomTopic, count: 1 });
      }
    } else if (randomAction.type === 'approval') {
      if (stats.pending > 0) {
        stats.pending -= 1;
        stats.approved += 1;
      }
    } else if (randomAction.type === 'rejection') {
      if (stats.pending > 0) {
        stats.pending -= 1;
        stats.rejected += 1;
      }
    }

    // Add to activity log
    const newActivity = {
      id: Date.now(),
      user: randomUser,
      action: randomAction.text,
      topic: randomTopic,
      time: 'Just now',
      type: randomAction.type
    };

    activities = [newActivity, ...activities.slice(0, 9)];

    io.emit("stats_update", { stats, activities });
  }, 5000);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    // Send initial stats
    socket.emit("stats_update", { stats, activities });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-welcome-email", async (req, res) => {
    const { email, firstName } = req.body;
    const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
    const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;

    const emailContent = `Welcome to Q-Genius a Sustainable AI-based Question Paper Generator for inclusive learning , ${firstName}! 👋

Hi ${firstName},

Welcome to the Q-Genius family! We're thrilled to have you.

You're all set to start our app to create Question paper within its given time period.
👉 Log in now and get started: ${process.env.APP_URL || 'https://q-genius.app'}/login

If you have any questions, just reply to this email—we're here to help!

Happy Creating!

Cheers,

The Q-Genius Team ${process.env.APP_URL || 'https://q-genius.app'}
Regards

Amritanshu Tiwari`;

    console.log(`[EMAIL SERVICE] Attempting to send welcome email to ${email}...`);
    console.log(`[EMAIL SERVICE] Using Domain: ${MAILGUN_DOMAIN}`);
    console.log(`[EMAIL SERVICE] API Key present: ${!!MAILGUN_API_KEY}`);

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.warn("⚠️ Mailgun credentials missing in environment. Simulating email send.");
      console.log("---------------- EMAIL PREVIEW ----------------");
      console.log(`To: ${email}`);
      console.log(`Subject: Welcome to Q-Genius, ${firstName}!`);
      console.log(`Body: \n${emailContent}`);
      console.log("-----------------------------------------------");
      return res.json({ success: true, simulated: true });
    }

    try {
      const formData = new URLSearchParams();
      formData.append("from", `Q-Genius <mailgun@${MAILGUN_DOMAIN}>`);
      formData.append("to", email);
      formData.append("subject", `Welcome to Q-Genius, ${firstName}!`);
      formData.append("text", emailContent);

      const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from('api:' + MAILGUN_API_KEY).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[EMAIL SERVICE] Mailgun Error Response: ${errText}`);
        
        // Handle sandbox restriction gracefully
        if (errText.includes("authorized recipients") || errText.includes("Free accounts")) {
          console.warn("⚠️ Mailgun Sandbox Restriction: Falling back to simulation.");
          console.log("---------------- EMAIL PREVIEW (SANDBOX) ----------------");
          console.log(`To: ${email}`);
          console.log(`Subject: Welcome to Q-Genius, ${firstName}!`);
          console.log(`Body: \n${emailContent}`);
          console.log("---------------------------------------------------------");
          return res.json({ success: true, simulated: true, sandbox: true });
        }
        
        throw new Error(`Mailgun API Error: ${response.status} ${response.statusText} - ${errText}`);
      }
      console.log("✅ Email sent successfully via Mailgun!");
      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ Failed to send email:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
