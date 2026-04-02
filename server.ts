import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieSession from "cookie-session";
import multer from "multer";
import dotenv from "dotenv";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      session: any;
      file?: any;
    }
  }
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Multer for CV upload (in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Session management (SameSite=none, Secure=true for iframe)
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'dev-secret'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: true,
  sameSite: 'none',
  httpOnly: true
}));

app.use(express.json());

// Helper to get OAuth client with dynamic redirect URI
const getOAuth2Client = (req: Request) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const redirectUri = `${protocol}://${host}/auth/callback`;
  
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

// ── AUTH ROUTES ──────────────────────────────────────────────────────────────

app.get('/api/auth/google/url', (req, res) => {
  const client = getOAuth2Client(req);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent'
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code provided');
  
  const client = getOAuth2Client(req);
  
  try {
    const { tokens } = await client.getToken(code as string);
    req.session!.tokens = tokens;
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentification réussie ! Cette fenêtre va se fermer.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('OAuth error details:', error.response?.data || error.message);
    res.status(500).send(`Erreur d'authentification: ${error.message}`);
  }
});

app.get('/api/auth/status', (req, res) => {
  res.json({ connected: !!req.session?.tokens });
});

app.post('/api/auth/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// ── CV UPLOAD ───────────────────────────────────────────────────────────────

app.post('/api/upload-cv', upload.single('cv'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  // Store CV in session (base64) - Warning: session size limit is ~4KB for cookies
  // Better: store in memory or temporary storage if file is large.
  // For simplicity in this demo, we'll store it in a simple memory map keyed by sessionId
  // But for now, let's just use a global map (not production ready, but works for demo)
  const sessionId = req.session?.id || 'default';
  (global as any).cvStorage = (global as any).cvStorage || {};
  (global as any).cvStorage[sessionId] = {
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype
  };
  
  res.json({ success: true, filename: req.file.originalname });
});

// ── EMAIL SENDING ───────────────────────────────────────────────────────────

app.post('/api/send-application', async (req, res) => {
  if (!req.session?.tokens) return res.status(401).json({ error: 'Not connected to Gmail' });
  
  const { to, subject, body } = req.body;
  const sessionId = req.session?.id || 'default';
  const cv = (global as any).cvStorage?.[sessionId];

  try {
    const client = getOAuth2Client(req);
    client.setCredentials(req.session.tokens);
    const gmail = google.gmail({ version: 'v1', auth: client });

    const boundary = 'foo_bar_baz';
    const nl = '\n';
    
    let email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: multipart/mixed; boundary=' + boundary,
      '',
      '--' + boundary,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      body,
      ''
    ].join(nl);

    if (cv) {
      email += [
        '--' + boundary,
        `Content-Type: ${cv.mimetype}; name="${cv.originalname}"`,
        'Content-Disposition: attachment; filename="' + cv.originalname + '"',
        'Content-Transfer-Encoding: base64',
        '',
        cv.buffer.toString('base64'),
        ''
      ].join(nl);
    }

    email += '--' + boundary + '--';

    const base64SafeEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64SafeEmail
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Gmail send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── VITE MIDDLEWARE ─────────────────────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
