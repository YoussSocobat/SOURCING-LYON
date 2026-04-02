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

// Trust proxy is required for Cloud Run to handle https correctly
app.set('trust proxy', 1);

// Multer for CV upload (in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Session management (Using cookie-session for persistence across Cloud Run restarts)
app.use(cookieSession({
  name: 'cv_gen_session',
  keys: [process.env.SESSION_SECRET || 'cv-generator-secret-key'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: true,
  sameSite: 'none',
  httpOnly: true
}));

app.use(express.json());

// Helper to get OAuth client
const getOAuth2Client = (redirectUri: string) => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

const getRedirectUri = (req: Request) => {
  // On Cloud Run, x-forwarded-host is the external domain
  const host = req.get('x-forwarded-host') || req.get('host') || '';
  const hostname = host.split(':')[0]; // Remove port
  return `https://${hostname}/auth/callback`;
};

// ── AUTH ROUTES ──────────────────────────────────────────────────────────────

app.get('/api/auth/google/url', (req, res) => {
  const redirectUri = getRedirectUri(req);
  console.log('[OAuth] Step 1: Generating URL. RedirectURI:', redirectUri);
  
  const client = getOAuth2Client(redirectUri);
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
  
  const redirectUri = getRedirectUri(req);
  console.log('[OAuth] Step 2: Callback received. Using RedirectURI:', redirectUri);

  const client = getOAuth2Client(redirectUri);
  
  try {
    const { tokens } = await client.getToken(code as string);
    // Store ONLY the essential tokens to keep cookie size small (max 4KB for cookie-session)
    req.session.tokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    };
    
    // Also store a flag to help debugging
    req.session.isAuth = true;
    
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
          <p>Authentification réussie ! Redirection en cours...</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error('[OAuth] Error during token exchange:', errorData);
    res.status(500).send(`
      <h3>Erreur d'authentification</h3>
      <p>Détails: ${JSON.stringify(errorData)}</p>
      <p>URI utilisée par le serveur: <b>${redirectUri}</b></p>
      <p>Vérifiez que cette URI exacte est bien dans votre Console Google Cloud.</p>
    `);
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
  
  // Store CV in global storage (since it's a single-user dev environment for now)
  (global as any).userCV = {
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype
  };
  
  res.json({ success: true, filename: req.file.originalname });
});

app.get('/api/cv-status', (req, res) => {
  res.json({ filename: (global as any).userCV?.originalname || null });
});

// ── EMAIL SENDING ───────────────────────────────────────────────────────────

app.post('/api/send-application', async (req, res) => {
  if (!req.session?.tokens) {
    console.error('Session tokens missing for send-application. Session ID:', req.session?.id);
    return res.status(401).json({ error: 'Not connected to Gmail' });
  }
  
  const { to, subject, body } = req.body;
  const cv = (global as any).userCV;

  try {
    const fallbackRedirectUri = `https://${req.get('host')}/auth/callback`;
    const redirectUri = req.session?.redirectUri || fallbackRedirectUri;
    console.log('Sending application with redirectUri:', redirectUri);
    const client = getOAuth2Client(redirectUri);
    client.setCredentials(req.session.tokens);
    const gmail = google.gmail({ version: 'v1', auth: client });

    const boundary = 'foo_bar_baz';
    const nl = '\r\n'; // RFC 2822 uses CRLF
    
    // Helper to encode subject for non-ASCII characters
    const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

    let emailParts = [
      `MIME-Version: 1.0`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      '--' + boundary,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      body,
      ''
    ];

    if (cv) {
      emailParts.push('--' + boundary);
      emailParts.push(`Content-Type: ${cv.mimetype}; name="${cv.originalname}"`);
      emailParts.push(`Content-Disposition: attachment; filename="${cv.originalname}"`);
      emailParts.push('Content-Transfer-Encoding: base64');
      emailParts.push('');
      emailParts.push(cv.buffer.toString('base64'));
      emailParts.push('');
    }

    emailParts.push('--' + boundary + '--');

    const email = emailParts.join(nl);

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
