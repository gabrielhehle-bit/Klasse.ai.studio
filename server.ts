import { escapeHtml, scriptJson, createOAuthState, verifyOAuthState } from './src/lib/oauthSecurity';
import { ONEDRIVE_BACKUP_PRIMARY_NAME, getOneDriveBackupCandidateNames } from './src/lib/cloudBackupNames';
import express from "express";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { KI_SYSTEM_PROMPTS, GLOBAL_KI_RULES } from "./src/kiSystemPrompts.ts";
import { validateAiServerImageRequest } from "./src/lib/aiPrivacy.ts";
import { getServerSyncTimestamps, isSyncSessionExpired } from "./src/lib/syncServerPolicy.ts";
import { createTeacherIdentityForSchool, displayNameFromEmail, handleFromEmail, type TeacherIdentity } from "./src/server/teacherIdentity.ts";
import { createLehrerzimmerStore, type LehrerzimmerCategory } from "./src/server/lehrerzimmerStore.ts";
import { createClassCollaborationStore, type SharedClassRecord } from "./src/server/classCollaborationStore.ts";
import { createSchoolRegistryStore, type AustrianFederalState, type SchoolVerificationRequest, type SchoolRecord } from "./src/server/schoolRegistry.ts";
import { createSupporterStore } from "./src/server/supporterStore.ts";
import { createCanvaTokenStore, type CanvaStoredTokens } from "./src/server/canvaTokenStore.ts";
import { createEncryptedAttachmentStore, AttachmentStorageError } from "./src/server/encryptedAttachmentStore.ts";
import { createAccountSyncStore } from "./src/server/accountSyncStore.ts";
import { createAiUsageStore, type AiUsageSnapshot } from "./src/server/aiUsageStore.ts";
import { INITIAL_VERIFIED_AUSTRIAN_SCHOOLS } from "./src/data/austrianSchoolRegistry.seed.ts";

// Fix: In tsx environments, global __dirname is injected as "." which breaks ESM packages
// that do `typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url))`
// followed by `createRequire(__dirname)` (e.g. vite-plugin-pwa when loaded via createViteServer).
if (typeof (globalThis as any).__dirname === "string" && !path.isAbsolute((globalThis as any).__dirname)) {
  delete (globalThis as any).__dirname;
}

function validateProductionEnvironment() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return;

  const sessionSecret = process.env.SESSION_SECRET;
  const insecureSecrets = ["lehrerapp_secure_session_secret_2026", "secret", "changeme", "123456", "admin", "password"];
  if (!sessionSecret || sessionSecret.trim().length < 32 || insecureSecrets.includes(sessionSecret.trim().toLowerCase())) {
    throw new Error("[SICHERHEITSWARNUNG] SESSION_SECRET ist nicht gesetzt oder nutzt einen unsicheren Standardwert. In Produktion muss ein starkes Zufalls-Secret gesetzt werden.");
  }

  const codes = [process.env.LEHRERAPP_ACCESS_TEAM, process.env.LEHRERAPP_ACCESS_EXTERNAL].map(code => code?.trim()).filter(Boolean);
  if (!codes.length || codes.some(code => ['team2026', 'gast2026'].includes(code!))) {
    throw new Error('In Produktion mindestens einen eigenen LEHRERAPP_ACCESS_TEAM/EXTERNAL Zugangscode konfigurieren; Standardcodes sind nicht erlaubt.');
  }

  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      const parsed = new URL(appUrl);
      if (parsed.protocol !== "https:") {
        console.warn(`[SICHERHEITSWARNUNG] In der Produktionsumgebung muss APP_URL das HTTPS-Protokoll nutzen: ${appUrl}`);
      }
    } catch {
      console.warn(`[SICHERHEITSWARNUNG] APP_URL ist keine gültige URL: ${appUrl}`);
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    console.warn("[KONFIGURATIONSHINWEIS] GEMINI_API_KEY ist nicht konfiguriert. KI-Funktionen sind im Client deaktiviert.");
  }

  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    console.warn("[KONFIGURATIONSHINWEIS] Microsoft OneDrive Secrets sind nicht vollständig konfiguriert. Cloud-Backups sind im Client deaktiviert.");
  }

  const configuredSchoolDomains = process.env.KLASSIO_VERIFIED_SCHOOL_DOMAINS || process.env.LEHRERAPP_ALLOWED_EMAIL_DOMAINS;
  const wantsEmailLogin = Boolean(process.env.SMTP_HOST || process.env.SMTP_FROM || configuredSchoolDomains);
  if (wantsEmailLogin && (!process.env.SMTP_HOST || !process.env.SMTP_FROM)) {
    console.warn("[KONFIGURATIONSHINWEIS] E-Mail-Login ist nur aktiv, wenn SMTP_HOST und SMTP_FROM gesetzt sind.");
  }

  const configuredSchoolAdmins = (process.env.KLASSIO_SCHOOL_ADMIN_EMAILS || process.env.SMTP_USER || '').trim();
  if (!process.env.KLASSIO_SCHOOL_ADMIN_TOKEN && !configuredSchoolAdmins) {
    console.warn("[KONFIGURATIONSHINWEIS] Keine Schulverifizierungs-Administration konfiguriert. Setze KLASSIO_SCHOOL_ADMIN_EMAILS oder KLASSIO_SCHOOL_ADMIN_TOKEN.");
  }
}

export async function createApp(options: { isTest?: boolean } = {}) {
  const app = express();

  // E3.25 Server-Versionen nicht unnötig offenlegen
  app.disable('x-powered-by');

  // E3.9 Proxy / HTTPS-Erkennung für Cloud Run / Reverse-Proxies (1 Hop)
  app.set('trust proxy', 1);

  // E3.28-30 Produktionsumgebungs-Validierung
  validateProductionEnvironment();

  // E3.1-6 Zentrale Sicherheitsheader-Middleware
  app.use((req, res, next) => {
    // E3.2 X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // E3.3 Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // E3.4 Frame-Schutz: SAMEORIGIN als sichere Basis für Dev/Preview-Umgebungen
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // E3.5 Permissions-Policy: Kamera & Mikrofon für bestehende Funktionen (Lärmampel, Sitzplan) erlauben, Unbenötigtes blockieren
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), on-device-speech-recognition=(self), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), magnetometer=(), gyroscope=()');

    // E3.1 HSTS: Nur in Produktion
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // E3.6 Content-Security-Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com https://*.canva.com",
      "connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com https://photon.komoot.io https://login.microsoftonline.com https://graph.microsoft.com",
      "worker-src 'self' blob:",
      "media-src 'self' blob: data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://login.microsoftonline.com",
      "frame-ancestors 'self' https://ai.studio https://*.google.com https://*.run.app"
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);

    next();
  });

  // E3.7 & E3.10 API Cache-Control & CORS Middleware
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');

    const origin = req.headers.origin;
    const appUrl = process.env.APP_URL;
    if (origin) {
      let isAllowed = false;
      if (appUrl && (origin === appUrl || origin === appUrl.replace(/\/$/, ''))) {
        isAllowed = true;
      } else if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('.run.app'))) {
        isAllowed = true;
      }
      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // E3.23 Health Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // E3.12 Differentiierte Request-Größenlimits
  app.use('/api/ai', express.json({ limit: '35mb' }));
  app.use('/api/sync', express.json({ limit: '16mb' }));
  app.use('/api/account-sync', express.json({ limit: '20mb' }));
  app.use('/api/teamteaching', express.json({ limit: '16mb' }));
  app.use('/api/onedrive/upload', express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));
  app.use(express.json({ limit: '1mb' }));

  // Access Control Setup
  const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  const ACCESS_TEAM_CODE = (process.env.LEHRERAPP_ACCESS_TEAM || (process.env.NODE_ENV === "production" ? "" : "team2026")).trim();
  const ACCESS_EXTERNAL_CODE = (process.env.LEHRERAPP_ACCESS_EXTERNAL || (process.env.NODE_ENV === "production" ? "" : "gast2026")).trim();

  const SMTP_HOST = (process.env.SMTP_HOST || '').trim();
  const SMTP_PORT = Math.max(1, Number(process.env.SMTP_PORT || 587) || 587);
  const SMTP_SECURE = (process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true' || SMTP_PORT === 465;
  const SMTP_USER = (process.env.SMTP_USER || '').trim();
  const SMTP_PASS = process.env.SMTP_PASS || '';
  const SMTP_FROM = (process.env.SMTP_FROM || '').trim();
  const SCHOOL_ADMIN_EMAILS = [...new Set(
    (process.env.KLASSIO_SCHOOL_ADMIN_EMAILS || SMTP_USER || '')
      .split(',')
      .map(value => value.trim().toLowerCase())
      .filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
  )];
  const ALLOWED_EMAIL_DOMAINS = (process.env.KLASSIO_VERIFIED_SCHOOL_DOMAINS || process.env.LEHRERAPP_ALLOWED_EMAIL_DOMAINS || '')
    .split(',')
    .map(value => value.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  const emailLoginEnabled = Boolean(SMTP_HOST && SMTP_FROM);
  const mailTransporter = emailLoginEnabled
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        ...(SMTP_USER && SMTP_PASS ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {})
      })
    : null;

  const KLASSIO_DATA_DIR = (process.env.KLASSIO_DATA_DIR || path.join(process.cwd(), 'data')).trim();
  const lehrerzimmerStore = createLehrerzimmerStore(KLASSIO_DATA_DIR);
  const classCollaborationStore = createClassCollaborationStore(KLASSIO_DATA_DIR);
  const schoolRegistryStore = createSchoolRegistryStore(KLASSIO_DATA_DIR);
  const supporterStore = createSupporterStore(KLASSIO_DATA_DIR);
  const accountSyncStore = createAccountSyncStore(KLASSIO_DATA_DIR);
  const aiUsageStore = createAiUsageStore(KLASSIO_DATA_DIR);

  const readPositiveIntEnv = (name: string, fallback: number, max: number) => {
    const parsed = Number.parseInt(process.env[name] || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
  };
  const AI_DAILY_USER_LIMIT = readPositiveIntEnv('KLASSIO_AI_DAILY_USER_LIMIT', 20, 10_000);
  const AI_DAILY_GLOBAL_LIMIT = readPositiveIntEnv('KLASSIO_AI_DAILY_GLOBAL_LIMIT', 200, 1_000_000);
  const AI_PER_MINUTE_LIMIT = readPositiveIntEnv('KLASSIO_AI_PER_MINUTE_LIMIT', 5, 120);
  if (!options.isTest) {
    await schoolRegistryStore.ensureSeedSchools(INITIAL_VERIFIED_AUSTRIAN_SCHOOLS);
    await schoolRegistryStore.ensureLegacyDomains(ALLOWED_EMAIL_DOMAINS);
  }
  const SCHOOL_ADMIN_TOKEN = (process.env.KLASSIO_SCHOOL_ADMIN_TOKEN || '').trim();
  const SUPPORT_ADMIN_TOKEN = (process.env.KLASSIO_SUPPORT_ADMIN_TOKEN || '').trim();

  function safePayPalUrl(value: string | undefined, fallback = ''): string {
    const raw = (value || fallback).trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();
      const isPayPal = host === 'paypal.com' || host.endsWith('.paypal.com') || host === 'paypal.me' || host.endsWith('.paypal.me');
      return url.protocol === 'https:' && isPayPal ? url.toString() : '';
    } catch {
      return '';
    }
  }

  const SUPPORT_PAYPAL_ONE_TIME_URL = safePayPalUrl(
    process.env.KLASSIO_PAYPAL_ONE_TIME_URL,
    'https://paypal.me/gabrielhehle'
  );
  const SUPPORT_PAYPAL_MONTHLY_URL = safePayPalUrl(
    process.env.KLASSIO_PAYPAL_MONTHLY_URL,
    'https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-39527139B4457294RNKVOWJQ'
  );
  const SUPPORT_PAYPAL_YEARLY_URL = safePayPalUrl(
    process.env.KLASSIO_PAYPAL_YEARLY_URL,
    'https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-82J97339KC156492WNKVOZGA'
  );

  type EmailAccessChallenge = {
    codeHash: string;
    expiresAt: number;
    attempts: number;
    lastSentAt: number;
  };
  const emailAccessChallenges = new Map<string, EmailAccessChallenge>();
  const emailRequestThrottle = new Map<string, number>();

  function normalizeEmail(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (normalized.length < 5 || normalized.length > 254) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
    return normalized;
  }

  function hashEmailCode(email: string, code: string): string {
    return crypto
      .createHmac('sha256', SESSION_SECRET)
      .update('klassio-email-access:' + email + ':' + code)
      .digest('hex');
  }

  function maskEmail(email: string): string {
    const parts = email.split('@');
    const local = parts[0] || '';
    const domain = parts[1] || '';
    const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
    return visible + '*'.repeat(Math.max(2, Math.min(8, local.length - visible.length))) + '@' + domain;
  }

  function isSchoolAdminEmail(email: string | undefined | null): boolean {
    if (!email) return false;
    return SCHOOL_ADMIN_EMAILS.includes(email.trim().toLowerCase());
  }

  async function notifySchoolAdmins(request: SchoolVerificationRequest): Promise<boolean> {
    if (!mailTransporter || !SCHOOL_ADMIN_EMAILS.length) return false;
    const appUrl = (process.env.APP_URL || 'https://klassio.at').replace(/\/+$/, '');
    try {
      await mailTransporter.sendMail({
        from: SMTP_FROM,
        to: SCHOOL_ADMIN_EMAILS.join(','),
        subject: 'Neue Klassio-Schulverifizierung: ' + request.schoolName,
        text:
          'In Klassio wurde eine neue Schulverifizierung angefordert.\n\n' +
          'Schule: ' + request.schoolName + '\n' +
          'Bundesland: ' + request.federalState + '\n' +
          'Schul-Domain: ' + request.emailDomain + '\n' +
          'Angefordert von: ' + request.requestedByEmail + '\n\n' +
          'Öffne ' + appUrl + ' und gehe zu Einstellungen → Konto & Schulmail → Schulverwaltung.',
        html:
          '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#0f172a">' +
          '<h2>Neue Schulverifizierung</h2>' +
          '<p><strong>' + escapeHtml(request.schoolName) + '</strong></p>' +
          '<p>Bundesland: ' + escapeHtml(request.federalState) + '<br>' +
          'Schul-Domain: <strong>' + escapeHtml(request.emailDomain) + '</strong><br>' +
          'Angefordert von: ' + escapeHtml(request.requestedByEmail) + '</p>' +
          '<p>Öffne Klassio und gehe zu <strong>Einstellungen → Konto & Schulmail → Schulverwaltung</strong>.</p>' +
          '</div>'
      });
      return true;
    } catch (error) {
      console.error('[Schulverifizierung] Admin-Benachrichtigung konnte nicht versendet werden:', error);
      return false;
    }
  }

  async function notifySchoolVerificationResult(
    request: SchoolVerificationRequest,
    school: SchoolRecord | null,
    approved: boolean
  ): Promise<boolean> {
    if (!mailTransporter) return false;
    try {
      await mailTransporter.sendMail({
        from: SMTP_FROM,
        to: request.requestedByEmail,
        subject: approved ? 'Deine Schule ist in Klassio freigeschaltet' : 'Klassio-Schulverifizierung',
        text: approved
          ? 'Die Schule "' + (school?.name || request.schoolName) + '" wurde in Klassio freigeschaltet.\n\nDu musst nichts neu einrichten. Deine bereits vorhandenen Klassen, Planungen und dein lokaler Datentresor bleiben unverändert. Öffne Klassio einfach erneut; Lehrerzimmer und Teamteaching werden für diese Schul-Domain automatisch verfügbar.'
          : 'Die Anfrage für "' + request.schoolName + '" konnte noch nicht freigegeben werden. Dein persönliches Klassio-Konto und deine bereits eingerichteten Daten bleiben davon unberührt. Prüfe bitte Schulname und dienstliche Schul-Domain und stelle die Anfrage bei Bedarf erneut.',
      });
      return true;
    } catch (error) {
      console.error('[Schulverifizierung] Ergebnis-Mail konnte nicht versendet werden:', error);
      return false;
    }
  }

  function parseCookies(req: express.Request): Record<string, string> {
    const list: Record<string, string> = {};
    const rc = req.headers.cookie;
    if (rc) {
      rc.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const key = parts.shift()?.trim();
        try {
          const value = decodeURIComponent(parts.join('='));
          if (key) list[key] = value;
        } catch { /* Ignore malformed cookies instead of crashing authentication. */ }
      });
    }
    return list;
  }

  function createAccessToken(): string {
    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = `${expiry}.${nonce}`;
    const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    return `${payload}.${hmac}`;
  }

  function verifyAccessToken(token: string | undefined): boolean {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [expiryStr, nonce, hmac] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || expiry < Date.now()) return false;
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(`${expiryStr}.${nonce}`).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
    } catch (e) {
      return false;
    }
  }

  type EmailAccountIdentity = {
    userId: string;
    email: string;
    displayName: string;
    handle: string;
  };

  type AccountSessionPayload = EmailAccountIdentity & { v: 1; exp: number };
  type IdentitySessionPayload = TeacherIdentity & { v: 1; exp: number };

  function createEmailAccountIdentity(email: string): EmailAccountIdentity {
    const normalizedEmail = email.trim().toLowerCase();
    return {
      userId: crypto.createHash('sha256').update('klassio-account:' + normalizedEmail).digest('hex').slice(0, 24),
      email: normalizedEmail,
      displayName: displayNameFromEmail(normalizedEmail),
      handle: handleFromEmail(normalizedEmail),
    };
  }

  function createSignedIdentityToken<T extends object>(prefix: string, payload: T): string {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(prefix + encoded).digest('hex');
    return encoded + '.' + signature;
  }

  function verifySignedIdentityToken<T>(prefix: string, token: string | undefined): T | null {
    if (!token) return null;
    const [encoded, signature, ...rest] = token.split('.');
    if (!encoded || !signature || rest.length) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(prefix + encoded).digest('hex');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) return null;
      return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
    } catch {
      return null;
    }
  }

  function createAccountToken(identity: EmailAccountIdentity): string {
    return createSignedIdentityToken('klassio-account:', {
      ...identity,
      v: 1,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    } satisfies AccountSessionPayload);
  }

  function verifyAccountToken(token: string | undefined): EmailAccountIdentity | null {
    const payload = verifySignedIdentityToken<AccountSessionPayload>('klassio-account:', token);
    if (!payload || payload.v !== 1 || !payload.exp || payload.exp < Date.now()) return null;
    if (!payload.userId || !payload.email) return null;
    return {
      userId: payload.userId,
      email: payload.email,
      displayName: payload.displayName || 'Klassio-Nutzer:in',
      handle: payload.handle || 'klassio',
    };
  }

  function createIdentityToken(identity: TeacherIdentity): string {
    return createSignedIdentityToken('klassio-identity:', {
      ...identity,
      v: 1,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    } satisfies IdentitySessionPayload);
  }

  function verifyIdentityToken(token: string | undefined): TeacherIdentity | null {
    const payload = verifySignedIdentityToken<IdentitySessionPayload>('klassio-identity:', token);
    if (!payload || payload.v !== 1 || !payload.exp || payload.exp < Date.now()) return null;
    if (!payload.userId || !payload.email || !payload.schoolId || !payload.schoolDomain || !payload.schoolCode) return null;
    return {
      userId: payload.userId,
      email: payload.email,
      schoolId: payload.schoolId,
      schoolCode: payload.schoolCode,
      schoolDomain: payload.schoolDomain,
      schoolName: payload.schoolName,
      schoolFederalState: payload.schoolFederalState,
      displayName: payload.displayName || 'Lehrperson',
      handle: payload.handle || 'lehrperson',
    };
  }

  function secureCookieSuffix(req: express.Request): string {
    const isProd = process.env.NODE_ENV === 'production';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    return (isProd || isSecure) ? '; Secure' : '';
  }

  function setAccessSession(req: express.Request, res: express.Response): string {
    const token = createAccessToken();
    res.setHeader(
      'Set-Cookie',
      'lehrerapp_access_token=' + token + '; Max-Age=' + (30 * 24 * 60 * 60) + '; Path=/; HttpOnly; SameSite=Lax' + secureCookieSuffix(req)
    );
    return token;
  }

  function setEmailAccountSession(req: express.Request, res: express.Response, identity: EmailAccountIdentity): void {
    res.append(
      'Set-Cookie',
      'klassio_email_account=' + createAccountToken(identity) + '; Max-Age=' + (30 * 24 * 60 * 60) + '; Path=/; HttpOnly; SameSite=Lax' + secureCookieSuffix(req)
    );
  }

  function setEmailIdentitySession(req: express.Request, res: express.Response, identity: TeacherIdentity): void {
    const token = createIdentityToken(identity);
    res.append(
      'Set-Cookie',
      'klassio_email_identity=' + token + '; Max-Age=' + (30 * 24 * 60 * 60) + '; Path=/; HttpOnly; SameSite=Lax' + secureCookieSuffix(req)
    );
  }

  function clearEmailSessions(req: express.Request, res: express.Response): void {
    const suffix = secureCookieSuffix(req);
    res.append('Set-Cookie', 'klassio_email_account=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax' + suffix);
    res.append('Set-Cookie', 'klassio_email_identity=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax' + suffix);
  }

  const failedLoginAttempts = new Map<string, { count: number; resetAt: number }>();

  function checkRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
    const now = Date.now();
    const entry = failedLoginAttempts.get(ip);
    if (!entry) return { allowed: true };
    if (now > entry.resetAt) {
      failedLoginAttempts.delete(ip);
      return { allowed: true };
    }
    if (entry.count >= 10) {
      const waitSeconds = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, waitSeconds };
    }
    return { allowed: true };
  }

  function recordFailedAttempt(ip: string) {
    const now = Date.now();
    const entry = failedLoginAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
    entry.count += 1;
    failedLoginAttempts.set(ip, entry);
  }

  function resetFailedAttempts(ip: string) {
    failedLoginAttempts.delete(ip);
  }

  // Access Protection API Routes
  app.get("/api/access/status", (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies.lehrerapp_access_token || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : undefined);
    const isValid = verifyAccessToken(token);
    const account = isValid ? verifyAccountToken(cookies.klassio_email_account) : null;
    const identity = isValid ? verifyIdentityToken(cookies.klassio_email_identity) : null;
    res.json({
      authenticated: isValid,
      emailLoginEnabled,
      account: account
        ? {
            displayName: account.displayName,
            handle: account.handle,
            email: account.email,
          }
        : null,
      identity: identity
        ? {
            displayName: identity.displayName,
            handle: identity.handle,
            schoolCode: identity.schoolCode,
            schoolName: identity.schoolName,
            schoolFederalState: identity.schoolFederalState,
            schoolDomain: identity.schoolDomain,
          }
        : null,
    });
  });

  app.post("/api/access/email/request", async (req, res) => {
    if (!emailLoginEnabled || !mailTransporter) {
      return res.status(503).json({ success: false, error: 'E-Mail-Anmeldung ist auf diesem Server noch nicht konfiguriert.' });
    }

    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ success: false, error: 'Bitte gib eine gültige E-Mail-Adresse ein.' });
    }

    const throttleKey = ip + ':' + email;
    const now = Date.now();
    const lastRequest = emailRequestThrottle.get(throttleKey) || 0;
    const retryAfterMs = 60_000 - (now - lastRequest);
    if (retryAfterMs > 0) {
      return res.status(429).json({
        success: false,
        error: 'Bitte warte noch ' + Math.ceil(retryAfterMs / 1000) + ' Sekunden, bevor du einen neuen Code anforderst.'
      });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    emailAccessChallenges.set(email, {
      codeHash: hashEmailCode(email, code),
      expiresAt: now + 10 * 60 * 1000,
      attempts: 0,
      lastSentAt: now
    });
    emailRequestThrottle.set(throttleKey, now);

    try {
      await mailTransporter.sendMail({
        from: SMTP_FROM,
        replyTo: 'reply@klassio.at',
        to: email,
        subject: 'Dein Klassio-Anmeldecode',
        text: 'Dein Klassio-Anmeldecode lautet: ' + code + '\n\nDer Code ist 10 Minuten gültig. Wenn du diese Anmeldung nicht angefordert hast, kannst du diese Nachricht ignorieren.',
        html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a"><h2>Klassio</h2><p>Dein Anmeldecode:</p><div style="font-size:34px;font-weight:800;letter-spacing:8px;padding:18px 20px;background:#f1f5f9;border-radius:14px;text-align:center">' + code + '</div><p style="color:#64748b">Der Code ist 10 Minuten gültig. Wenn du diese Anmeldung nicht angefordert hast, kannst du diese Nachricht ignorieren.</p></div>'
      });
      return res.json({ success: true, maskedEmail: maskEmail(email), expiresInSeconds: 600 });
    } catch (error) {
      emailAccessChallenges.delete(email);
      console.error('[Access] E-Mail-Code konnte nicht versendet werden:', error);
      return res.status(502).json({ success: false, error: 'Der Anmeldecode konnte nicht versendet werden. Bitte später erneut versuchen.' });
    }
  });

  app.post("/api/access/email/verify", async (req, res) => {
    if (!emailLoginEnabled) {
      return res.status(503).json({ success: false, error: 'E-Mail-Anmeldung ist auf diesem Server noch nicht konfiguriert.' });
    }

    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return res.status(429).json({ success: false, error: 'Zu viele Versuche. Bitte warte ' + rateLimit.waitSeconds + ' Sekunden.' });
    }

    const email = normalizeEmail(req.body?.email);
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!email || !/^\d{6}$/.test(code)) {
      recordFailedAttempt(ip);
      return res.status(400).json({ success: false, error: 'E-Mail-Adresse oder Anmeldecode ist ungültig.' });
    }

    const challenge = emailAccessChallenges.get(email);
    if (!challenge || challenge.expiresAt < Date.now()) {
      emailAccessChallenges.delete(email);
      recordFailedAttempt(ip);
      return res.status(400).json({ success: false, error: 'Der Anmeldecode ist abgelaufen. Bitte fordere einen neuen Code an.' });
    }
    if (challenge.attempts >= 5) {
      emailAccessChallenges.delete(email);
      recordFailedAttempt(ip);
      return res.status(429).json({ success: false, error: 'Zu viele Fehlversuche. Bitte fordere einen neuen Code an.' });
    }

    challenge.attempts += 1;
    const expected = Buffer.from(challenge.codeHash, 'hex');
    const received = Buffer.from(hashEmailCode(email, code), 'hex');
    const matches = expected.length === received.length && crypto.timingSafeEqual(expected, received);
    if (!matches) {
      recordFailedAttempt(ip);
      return res.status(401).json({ success: false, error: 'Der Anmeldecode ist nicht gültig.' });
    }

    const account = createEmailAccountIdentity(email);
    const verifiedSchool = await schoolRegistryStore.findVerifiedSchoolByEmail(email);
    const identity = verifiedSchool ? createTeacherIdentityForSchool(email, verifiedSchool) : null;

    emailAccessChallenges.delete(email);
    resetFailedAttempts(ip);
    setAccessSession(req, res);
    setEmailAccountSession(req, res, account);

    if (identity) {
      setEmailIdentitySession(req, res, identity);
      try {
        await lehrerzimmerStore.ensureUser(identity);
      } catch (error) {
        console.error('[Lehrerzimmer] Benutzerprofil konnte beim Login nicht gespeichert werden:', error);
      }
    } else {
      const suffix = secureCookieSuffix(req);
      res.append('Set-Cookie', 'klassio_email_identity=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax' + suffix);
    }

    return res.json({
      success: true,
      account: { displayName: account.displayName, email: account.email },
      school: identity ? {
        id: identity.schoolId,
        code: identity.schoolCode,
        name: identity.schoolName,
        federalState: identity.schoolFederalState,
        domain: identity.schoolDomain,
      } : null,
    });
  });

  app.post("/api/access/verify", (req, res) => {
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        success: false, 
        error: `Zu viele Versuche. Bitte warte ${rateLimit.waitSeconds} Sekunden.` 
      });
    }

    const { code } = req.body || {};
    if (typeof code !== 'string' || !code.trim()) {
      recordFailedAttempt(ip);
      return res.status(400).json({ success: false, error: "Der Zugangscode ist nicht gültig." });
    }

    const submittedCode = code.trim();
    const isTeam = submittedCode === ACCESS_TEAM_CODE;
    const isExternal = submittedCode === ACCESS_EXTERNAL_CODE;

    if (isTeam || isExternal) {
      resetFailedAttempts(ip);
      setAccessSession(req, res);
      clearEmailSessions(req, res);
      return res.json({ success: true });
    } else {
      recordFailedAttempt(ip);
      return res.json({ success: false, error: "Der Zugangscode ist nicht gültig." });
    }
  });

  app.post("/api/access/logout", (req, res) => {
    const secureFlag = secureCookieSuffix(req);
    res.setHeader('Set-Cookie', [
      `lehrerapp_access_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secureFlag}`,
      `klassio_email_account=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secureFlag}`,
      `klassio_email_identity=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secureFlag}`,
    ]);
    res.json({ success: true });
  });

  const requireAccess: express.RequestHandler = (req, res, next) => {
    const token = parseCookies(req).lehrerapp_access_token;
    if (!verifyAccessToken(token)) {
      res.status(401).json({ error: 'Bitte zuerst bei Klassio anmelden.' });
      return;
    }
    next();
  };

  type AccountRequest = express.Request & { klassioAccount?: EmailAccountIdentity };
  type TeacherRequest = express.Request & { klassioTeacher?: TeacherIdentity };

  const requireEmailAccount: express.RequestHandler = (req, res, next) => {
    const cookies = parseCookies(req);
    if (!verifyAccessToken(cookies.lehrerapp_access_token)) {
      res.status(401).json({ error: 'Bitte zuerst bei Klassio anmelden.' });
      return;
    }
    const account = verifyAccountToken(cookies.klassio_email_account);
    if (!account) {
      res.status(403).json({
        error: 'Bitte melde dich mit deiner E-Mail-Adresse an.',
        requiresEmailLogin: true,
      });
      return;
    }
    (req as AccountRequest).klassioAccount = account;
    next();
  };

  const getEmailAccount = (req: express.Request): EmailAccountIdentity =>
    (req as AccountRequest).klassioAccount as EmailAccountIdentity;

  // Separate binary material storage is deliberately off until an attachment-
  // inclusive encrypted backup/restore is available. Old inline materials and
  // the 5 MB library limit remain unchanged. Only ciphertext is accepted.
  const encryptedAttachmentStore = createEncryptedAttachmentStore(KLASSIO_DATA_DIR);
  const encryptedAttachmentsEnabled = process.env.KLASSIO_ENCRYPTED_ATTACHMENTS_ENABLED === 'true' && process.env.NODE_ENV !== 'production';
  app.use('/api/material-attachments', (req, res, next) => {
    if (!encryptedAttachmentsEnabled) {
      res.status(404).json({ error: 'Der separate Materialspeicher ist noch nicht freigegeben.' });
      return;
    }
    requireEmailAccount(req, res, next);
  });
  const attachmentIdValid = (value: string) => /^[a-f0-9]{32}$/.test(value);
  const attachmentError = (res: express.Response, error: unknown) => {
    if (error instanceof AttachmentStorageError) {
      res.status(error.status).json({ error: error.code });
      return;
    }
    res.status(500).json({ error: 'Der verschlüsselte Anhang konnte nicht verarbeitet werden.' });
  };
  app.get('/api/material-attachments/status', async (req, res) => {
    try {
      const usage = await encryptedAttachmentStore.usage(getEmailAccount(req).userId);
      res.json({ enabled: true, ...usage, maxFileBytes: 25 * 1024 * 1024 });
    } catch (error) { attachmentError(res, error); }
  });
  app.post('/api/material-attachments/:id', express.raw({ type: 'application/octet-stream', limit: '26mb' }), async (req, res) => {
    try {
      const id = String(req.params.id || '');
      if (!attachmentIdValid(id)) return res.status(400).json({ error: 'INVALID_ID' });
      if (!Buffer.isBuffer(req.body)) return res.status(415).json({ error: 'Bitte einen verschlüsselten Binäranhang senden.' });
      const stored = await encryptedAttachmentStore.put(getEmailAccount(req).userId, id, req.body);
      res.status(201).json({ attachmentId: id, ...stored });
    } catch (error) { attachmentError(res, error); }
  });
  app.get('/api/material-attachments/:id', async (req, res) => {
    try {
      const id = String(req.params.id || '');
      if (!attachmentIdValid(id)) return res.status(400).json({ error: 'INVALID_ID' });
      const bytes = await encryptedAttachmentStore.get(getEmailAccount(req).userId, id);
      res.setHeader('Cache-Control', 'no-store');
      res.type('application/octet-stream').send(bytes);
    } catch (error) { attachmentError(res, error); }
  });
  app.delete('/api/material-attachments/:id', async (req, res) => {
    try {
      const id = String(req.params.id || '');
      if (!attachmentIdValid(id)) return res.status(400).json({ error: 'INVALID_ID' });
      await encryptedAttachmentStore.delete(getEmailAccount(req).userId, id);
      res.status(204).end();
    } catch (error) { attachmentError(res, error); }
  });

  // Persönlicher Konto-Sync: Der Server speichert ausschließlich Vault-Wrappings
  // und AES-GCM-Chiffretext. Schüler-, Noten- und Planungsdaten werden hier nie entschlüsselt.
  app.get('/api/account-sync', requireEmailAccount, async (req, res) => {
    try {
      const account = getEmailAccount(req);
      const snapshot = await accountSyncStore.get(account.userId);
      res.json({ snapshot });
    } catch (error) {
      console.error('[AccountSync] Verschlüsselter Kontostand konnte nicht geladen werden:', error);
      res.status(500).json({ code: 'SYNC_READ_FAILED', error: 'Dein verschlüsselter Kontostand konnte nicht geladen werden.' });
    }
  });

  app.put('/api/account-sync', requireEmailAccount, async (req, res) => {
    try {
      const account = getEmailAccount(req);
      const snapshot = await accountSyncStore.put(account.userId, {
        vaultRecord: req.body?.vaultRecord,
        encryptedState: req.body?.encryptedState,
        expectedRevision: req.body?.expectedRevision,
      });
      res.json({ snapshot });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'REVISION_CONFLICT') {
        return res.status(409).json({
          code,
          error: 'Der Kontostand wurde auf einem anderen Gerät geändert. Nichts wurde überschrieben.',
        });
      }
      if (code === 'VAULT_MISMATCH') {
        return res.status(409).json({
          code,
          error: 'Dieser Kontostand gehört zu einem anderen Datentresor. Automatisches Überschreiben wurde verhindert.',
        });
      }
      if (code === 'PAYLOAD_TOO_LARGE') {
        return res.status(413).json({ code, error: 'Der verschlüsselte Kontostand überschreitet 20 MB.' });
      }
      if (code === 'INVALID_PAYLOAD' || code === 'INVALID_REVISION' || code === 'INVALID_ACCOUNT') {
        return res.status(400).json({ code, error: 'Ungültiger verschlüsselter Kontostand.' });
      }
      console.error('[AccountSync] Verschlüsselter Kontostand konnte nicht gespeichert werden:', error);
      return res.status(500).json({ code: 'SYNC_WRITE_FAILED', error: 'Dein verschlüsselter Kontostand konnte nicht gespeichert werden.' });
    }
  });

  app.get('/api/schools/me', requireEmailAccount, async (req, res) => {
    try {
      const account = getEmailAccount(req);
      const domain = account.email.split('@')[1] || '';
      const school = await schoolRegistryStore.findVerifiedSchoolByEmail(account.email);
      if (school) {
        const identity = createTeacherIdentityForSchool(account.email, school);
        if (identity) {
          setEmailIdentitySession(req, res, identity);
          await lehrerzimmerStore.ensureUser(identity);
        }
      }
      const requests = await schoolRegistryStore.listRequestsForDomain(domain);
      const pending = requests.find(request => request.status === 'pending') || null;
      res.json({
        account: {
          displayName: account.displayName,
          email: account.email,
          domain,
        },
        school,
        verificationRequest: pending,
      });
    } catch (error) {
      console.error('[Schulverifizierung] Status konnte nicht geladen werden:', error);
      res.status(500).json({ error: 'Der Schulstatus konnte nicht geladen werden.' });
    }
  });

  app.post('/api/schools/verification-requests', requireEmailAccount, async (req, res) => {
    try {
      const account = getEmailAccount(req);
      const domain = account.email.split('@')[1] || '';
      const hadPendingRequest = (await schoolRegistryStore.listRequestsForDomain(domain))
        .some(request => request.status === 'pending');
      const request = await schoolRegistryStore.requestVerification({
        requestedByEmail: account.email,
        schoolName: req.body?.schoolName,
        federalState: req.body?.federalState as AustrianFederalState,
      });
      const adminNotified = hadPendingRequest ? true : await notifySchoolAdmins(request);
      res.status(201).json({ request, adminNotified });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'PUBLIC_EMAIL_DOMAIN') {
        return res.status(400).json({
          error: 'Eine private E-Mail-Domain kann nicht als Schule verifiziert werden. Bitte verwende deine dienstliche Schul-E-Mail.',
        });
      }
      if (code === 'PROVIDER_UMBRELLA_DOMAIN') {
        return res.status(400).json({
          error: 'Diese Domain gehört zu einem Bildungsanbieter und ist nicht eindeutig einer einzelnen Schule zugeordnet. Bitte verwende die konkrete Schul-E-Mail-Domain.',
        });
      }
      if (code === 'ALREADY_VERIFIED') {
        return res.status(409).json({ error: 'Diese Schul-Domain ist bereits verifiziert. Bitte lade die Seite neu.' });
      }
      if (code === 'INVALID_REQUEST') {
        return res.status(400).json({ error: 'Bitte gib Schulname und Bundesland vollständig an.' });
      }
      console.error('[Schulverifizierung] Anfrage konnte nicht gespeichert werden:', error);
      return res.status(500).json({ error: 'Die Schulverifizierung konnte nicht angefordert werden.' });
    }
  });

  function isSchoolAdminAuthorized(req: express.Request): boolean {
    const cookies = parseCookies(req);
    const account = verifyAccessToken(cookies.lehrerapp_access_token)
      ? verifyAccountToken(cookies.klassio_email_account)
      : null;
    if (account && isSchoolAdminEmail(account.email)) return true;

    if (!SCHOOL_ADMIN_TOKEN || SCHOOL_ADMIN_TOKEN.length < 32) return false;
    const header = req.headers.authorization || '';
    const submitted = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!submitted || submitted.length !== SCHOOL_ADMIN_TOKEN.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(submitted, 'utf8'), Buffer.from(SCHOOL_ADMIN_TOKEN, 'utf8'));
    } catch {
      return false;
    }
  }

  const requireSchoolAdmin: express.RequestHandler = (req, res, next) => {
    const hasEmailAdmin = SCHOOL_ADMIN_EMAILS.length > 0;
    const hasTokenAdmin = SCHOOL_ADMIN_TOKEN.length >= 32;
    if (!hasEmailAdmin && !hasTokenAdmin) {
      res.status(503).json({ error: 'Schulverifizierungs-Administration ist auf diesem Server noch nicht konfiguriert.' });
      return;
    }
    if (!isSchoolAdminAuthorized(req)) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }
    next();
  };

  app.get('/api/admin/schools/status', requireAccess, (req, res) => {
    const account = verifyAccountToken(parseCookies(req).klassio_email_account);
    res.json({
      admin: Boolean(account && isSchoolAdminEmail(account.email)),
      email: account?.email || null,
      notificationsConfigured: Boolean(mailTransporter && SCHOOL_ADMIN_EMAILS.length),
    });
  });

  app.get('/api/admin/schools/verification-requests', requireSchoolAdmin, async (_req, res) => {
    try {
      const [requests, schools] = await Promise.all([
        schoolRegistryStore.listVerificationRequests(),
        schoolRegistryStore.listVerifiedSchools(),
      ]);
      res.json({
        requests,
        schools,
        pendingCount: requests.filter(request => request.status === 'pending').length,
      });
    } catch (error) {
      console.error('[Schulverifizierung] Admin-Liste konnte nicht geladen werden:', error);
      res.status(500).json({ error: 'Die Schulverifizierungen konnten nicht geladen werden.' });
    }
  });

  app.post('/api/admin/schools/verification-requests/:requestId/approve', requireSchoolAdmin, async (req, res) => {
    try {
      const result = await schoolRegistryStore.approveRequest(req.params.requestId);
      const notified = await notifySchoolVerificationResult(result.request, result.school, true);
      res.json({ ...result, notified });
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_NOT_FOUND') {
        return res.status(404).json({ error: 'Verifizierungsanfrage nicht gefunden.' });
      }
      console.error('[Schulverifizierung] Freigabe fehlgeschlagen:', error);
      return res.status(500).json({ error: 'Die Schule konnte nicht freigegeben werden.' });
    }
  });

  app.post('/api/admin/schools/verification-requests/:requestId/reject', requireSchoolAdmin, async (req, res) => {
    try {
      const request = await schoolRegistryStore.rejectRequest(req.params.requestId);
      const notified = await notifySchoolVerificationResult(request, null, false);
      res.json({ request, notified });
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_NOT_FOUND') {
        return res.status(404).json({ error: 'Verifizierungsanfrage nicht gefunden.' });
      }
      console.error('[Schulverifizierung] Ablehnung fehlgeschlagen:', error);
      return res.status(500).json({ error: 'Die Anfrage konnte nicht abgelehnt werden.' });
    }
  });

  function isSupportAdminAuthorized(req: express.Request): boolean {
    if (!SUPPORT_ADMIN_TOKEN || SUPPORT_ADMIN_TOKEN.length < 32) return false;
    const header = req.headers.authorization || '';
    const submitted = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!submitted || submitted.length !== SUPPORT_ADMIN_TOKEN.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(submitted, 'utf8'), Buffer.from(SUPPORT_ADMIN_TOKEN, 'utf8'));
    } catch {
      return false;
    }
  }

  const requireSupportAdmin: express.RequestHandler = (req, res, next) => {
    if (!SUPPORT_ADMIN_TOKEN || SUPPORT_ADMIN_TOKEN.length < 32) {
      res.status(503).json({ error: 'Unterstützer:innen-Administration ist auf diesem Server noch nicht konfiguriert.' });
      return;
    }
    if (!isSupportAdminAuthorized(req)) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }
    next();
  };

  app.get('/api/support', requireAccess, async (_req, res) => {
    try {
      const supporters = await supporterStore.listPublic();
      res.json({
        message: 'Klassio bleibt kostenlos und für alle frei zugänglich. Die laufenden Serverkosten werden durch freiwillige Unterstützung mitgetragen.',
        paypal: {
          oneTime: SUPPORT_PAYPAL_ONE_TIME_URL || null,
          monthly: SUPPORT_PAYPAL_MONTHLY_URL || null,
          yearly: SUPPORT_PAYPAL_YEARLY_URL || null,
        },
        supporters,
        privacy: 'Auf der öffentlichen Dankesliste erscheinen nur Namen, deren Veröffentlichung ausdrücklich erlaubt wurde. Beträge und Zahlungsdaten werden nicht angezeigt.',
      });
    } catch (error) {
      console.error('[Support] Unterstützer:innen konnten nicht geladen werden:', error);
      res.status(500).json({ error: 'Die Unterstützer:innen konnten nicht geladen werden.' });
    }
  });

  app.put('/api/admin/support/supporters', requireSupportAdmin, async (req, res) => {
    try {
      const supporters = await supporterStore.replacePublic(req.body?.supporters);
      res.json({ supporters });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_SUPPORTERS') {
        return res.status(400).json({ error: 'Ungültige Unterstützer:innen-Liste.' });
      }
      console.error('[Support] Unterstützer:innen-Liste konnte nicht gespeichert werden:', error);
      return res.status(500).json({ error: 'Die Unterstützer:innen-Liste konnte nicht gespeichert werden.' });
    }
  });

  const requireTeacherIdentity: express.RequestHandler = (req, res, next) => {
    void (async () => {
      const cookies = parseCookies(req);
      if (!verifyAccessToken(cookies.lehrerapp_access_token)) {
        res.status(401).json({ error: 'Bitte zuerst bei Klassio anmelden.' });
        return;
      }

      let identity = verifyIdentityToken(cookies.klassio_email_identity);
      if (!identity) {
        const account = verifyAccountToken(cookies.klassio_email_account);
        if (account) {
          const school = await schoolRegistryStore.findVerifiedSchoolByEmail(account.email);
          identity = school ? createTeacherIdentityForSchool(account.email, school) : null;
          if (identity) {
            setEmailIdentitySession(req, res, identity);
            await lehrerzimmerStore.ensureUser(identity);
          }
        }
      }

      if (!identity) {
        res.status(403).json({
          error: 'Das Lehrerzimmer ist nur mit einer verifizierten Schulidentität verfügbar.',
          requiresSchoolEmail: true,
        });
        return;
      }

      (req as TeacherRequest).klassioTeacher = identity;
      next();
    })().catch(next);
  };

  const getTeacherIdentity = (req: express.Request): TeacherIdentity =>
    (req as TeacherRequest).klassioTeacher as TeacherIdentity;

  const handleLehrerzimmerError = (res: express.Response, error: unknown) => {
    const code = error instanceof Error ? error.message : '';
    if (code === 'INVALID_CATEGORY') return res.status(400).json({ error: 'Ungültige Kategorie.' });
    if (code === 'INVALID_KIND') return res.status(400).json({ error: 'Ungültige Beitragsart.' });
    if (code === 'INVALID_CONTENT') return res.status(400).json({ error: 'Die Nachricht darf nicht leer sein.' });
    if (code === 'INVALID_READ_REQUEST') return res.status(400).json({ error: 'Ungültige Lesebestätigung.' });
    if (code === 'POST_NOT_FOUND') return res.status(404).json({ error: 'Dieser Beitrag wurde nicht gefunden.' });
    if (code === 'REPLY_NOT_FOUND') return res.status(404).json({ error: 'Diese Antwort wurde nicht gefunden.' });
    if (code === 'FORBIDDEN') return res.status(403).json({ error: 'Du kannst nur eigene Lehrerzimmer-Beiträge und eigene Antworten ändern oder löschen.' });
    console.error('[Lehrerzimmer] Serverfehler:', error);
    return res.status(500).json({ error: 'Das Lehrerzimmer konnte nicht geladen werden.' });
  };

  app.get('/api/lehrerzimmer/me', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const user = await lehrerzimmerStore.ensureUser(identity);
      res.json({
        user,
        school: {
          id: identity.schoolId,
          code: identity.schoolCode,
          name: identity.schoolName,
          federalState: identity.schoolFederalState,
          domain: identity.schoolDomain,
        },
      });
    } catch (error) {
      handleLehrerzimmerError(res, error);
    }
  });

  app.get('/api/lehrerzimmer/colleagues', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const users = await lehrerzimmerStore.listUsers(identity);
      res.json({ users });
    } catch (error) {
      handleLehrerzimmerError(res, error);
    }
  });

  app.get('/api/lehrerzimmer/posts', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const rawCategory = typeof req.query.category === 'string' ? req.query.category : '';
      const category: LehrerzimmerCategory | undefined =
        rawCategory === 'organisation' || rawCategory === 'unterricht' || rawCategory === 'info'
          ? rawCategory
          : undefined;
      const posts = await lehrerzimmerStore.listPosts(identity, category);
      res.json({ posts });
    } catch (error) {
      handleLehrerzimmerError(res, error);
    }
  });

  app.get('/api/lehrerzimmer/unread', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const summary = await lehrerzimmerStore.getUnreadSummary(identity);
      res.json(summary);
    } catch (error) {
      handleLehrerzimmerError(res, error);
    }
  });

  app.post('/api/lehrerzimmer/read', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const marked = await lehrerzimmerStore.markPostsRead(identity, req.body?.postIds);
      res.json({ success: true, marked });
    } catch (error) {
      handleLehrerzimmerError(res, error);
    }
  });

  app.post('/api/lehrerzimmer/posts', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const post = await lehrerzimmerStore.createPost(identity, {
        category: req.body?.category,
        kind: req.body?.kind,
        title: req.body?.title,
        body: req.body?.body,
      });
      res.status(201).json({ post });
    } catch (error) {
      handleLehrerzimmerError(res, error);
    }
  });

  app.put('/api/lehrerzimmer/posts/:postId', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const post = await lehrerzimmerStore.updatePost(identity, req.params.postId, {
        category: req.body?.category,
        kind: req.body?.kind,
        title: req.body?.title,
        body: req.body?.body,
      });
      res.json({ post });
    } catch (error) {
      handleLehrerzimmerError(res, error);
    }
  });

  app.delete('/api/lehrerzimmer/posts/:postId', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      await lehrerzimmerStore.deletePost(identity, req.params.postId);
      res.json({ success: true });
    } catch (error) {
      handleLehrerzimmerError(res, error);
    }
  });

  app.post('/api/lehrerzimmer/posts/:postId/replies', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const reply = await lehrerzimmerStore.addReply(identity, req.params.postId, req.body?.body);
      res.status(201).json({ reply });
    } catch (error) {
      handleLehrerzimmerError(res, error);
    }
  });

  app.delete('/api/lehrerzimmer/posts/:postId/replies/:replyId', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      await lehrerzimmerStore.deleteReply(identity, req.params.postId, req.params.replyId);
      res.json({ success: true });
    } catch (error) {
      handleLehrerzimmerError(res, error);
    }
  });

  const teamClassSummary = (record: SharedClassRecord, identity: TeacherIdentity) => {
    const currentMember = record.members.find(member => member.userId === identity.userId);
    if (!currentMember) throw new Error('FORBIDDEN');
    return {
      id: record.id,
      classLabel: record.classLabel,
      ownerUserId: record.ownerUserId,
      revision: record.revision,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
      myRole: currentMember.role,
      members: record.members.map(member => ({
        userId: member.userId,
        displayName: member.displayName,
        role: member.role,
        addedAt: member.addedAt,
      })),
    };
  };

  const handleTeamTeachingError = async (
    res: express.Response,
    error: unknown,
    identity?: TeacherIdentity,
    classId?: string,
  ) => {
    const code = error instanceof Error ? error.message : '';
    if (code === 'INVALID_DEVICE_KEY') return res.status(400).json({ code, error: 'Ungültiger Geräteschlüssel.' });
    if (code === 'INVALID_SHARED_CLASS' || code === 'INVALID_WRAPPED_KEYS') return res.status(400).json({ code, error: 'Ungültige verschlüsselte Klassendaten.' });
    if (code === 'NO_OWNER_DEVICE_KEY' || code === 'MEMBER_DEVICE_REQUIRED') return res.status(409).json({ code, error: 'Für diese Lehrperson ist noch kein freigegebener Teamteaching-Geräteschlüssel vorhanden.' });
    if (code === 'INVALID_ROLE' || code === 'INVALID_MEMBER') return res.status(400).json({ code, error: 'Ungültige Teamrolle oder Lehrperson.' });
    if (code === 'CLASS_NOT_FOUND') return res.status(404).json({ code, error: 'Die geteilte Klasse wurde nicht gefunden.' });
    if (code === 'MEMBER_NOT_FOUND') return res.status(404).json({ code, error: 'Die Lehrperson ist nicht im Klassenteam.' });
    if (code === 'OWNER_REQUIRED') return res.status(403).json({ code, error: 'Nur die Klassenbesitzerin bzw. der Klassenbesitzer darf das Team verwalten.' });
    if (code === 'READ_ONLY') return res.status(403).json({ code, error: 'Diese Klasse ist für dieses Konto nur lesbar.' });
    if (code === 'FORBIDDEN') return res.status(403).json({ code, error: 'Kein Zugriff auf diese geteilte Klasse.' });
    if (code === 'REVISION_CONFLICT') {
      let currentRevision: number | undefined;
      if (identity && classId) {
        try {
          currentRevision = (await classCollaborationStore.getClass(identity, classId)).revision;
        } catch {
          currentRevision = undefined;
        }
      }
      return res.status(409).json({
        code,
        currentRevision,
        error: 'Die Klasse wurde inzwischen auf einem anderen Gerät geändert. Deine lokale Version wurde nicht überschrieben.',
      });
    }
    console.error('[Teamteaching] Serverfehler:', error);
    return res.status(500).json({ error: 'Teamteaching konnte nicht verarbeitet werden.' });
  };

  app.get('/api/teamteaching/me', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const user = await lehrerzimmerStore.ensureUser(identity);
      res.json({
        user: {
          userId: user.userId,
          displayName: user.displayName,
          handle: user.handle,
        },
        school: {
          id: identity.schoolId,
          code: identity.schoolCode,
          name: identity.schoolName,
          domain: identity.schoolDomain,
        },
      });
    } catch (error) {
      await handleTeamTeachingError(res, error);
    }
  });

  app.put('/api/teamteaching/devices', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      await lehrerzimmerStore.ensureUser(identity);
      const device = await classCollaborationStore.registerDevice(identity, {
        deviceId: req.body?.deviceId,
        publicKeyJwk: req.body?.publicKeyJwk,
      });
      res.json({ device });
    } catch (error) {
      await handleTeamTeachingError(res, error);
    }
  });

  app.get('/api/teamteaching/colleagues', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const users = await lehrerzimmerStore.listUsers(identity);
      const enriched = await Promise.all(users.map(async user => ({
        userId: user.userId,
        displayName: user.displayName,
        handle: user.handle,
        devices: (await classCollaborationStore.listUserDevices(identity, user.userId)).map(device => ({
          deviceId: device.deviceId,
          fingerprint: device.fingerprint,
          publicKeyJwk: device.publicKeyJwk,
          updatedAt: device.updatedAt,
        })),
      })));
      res.json({ users: enriched });
    } catch (error) {
      await handleTeamTeachingError(res, error);
    }
  });

  app.get('/api/teamteaching/classes', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const classes = await classCollaborationStore.listClasses(identity);
      res.json({ classes: classes.map(record => teamClassSummary(record, identity)) });
    } catch (error) {
      await handleTeamTeachingError(res, error);
    }
  });

  app.post('/api/teamteaching/classes', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const record = await classCollaborationStore.createSharedClass(identity, {
        classLabel: req.body?.classLabel,
        encryptedSnapshot: req.body?.encryptedSnapshot,
        wrappedKeys: req.body?.wrappedKeys,
      });
      res.status(201).json({ class: teamClassSummary(record, identity) });
    } catch (error) {
      await handleTeamTeachingError(res, error);
    }
  });

  app.get('/api/teamteaching/classes/:classId', requireTeacherIdentity, async (req, res) => {
    try {
      const identity = getTeacherIdentity(req);
      const record = await classCollaborationStore.getClass(identity, req.params.classId);
      const member = record.members.find(item => item.userId === identity.userId)!;
      res.json({
        ...teamClassSummary(record, identity),
        encryptedSnapshot: record.encryptedSnapshot,
        wrappedKeys: member.wrappedKeys,
      });
    } catch (error) {
      await handleTeamTeachingError(res, error, getTeacherIdentity(req), req.params.classId);
    }
  });

  app.put('/api/teamteaching/classes/:classId/snapshot', requireTeacherIdentity, async (req, res) => {
    const identity = getTeacherIdentity(req);
    try {
      const record = await classCollaborationStore.updateSnapshot(identity, req.params.classId, {
        encryptedSnapshot: req.body?.encryptedSnapshot,
        expectedRevision: req.body?.expectedRevision,
      });
      res.json({ class: teamClassSummary(record, identity) });
    } catch (error) {
      await handleTeamTeachingError(res, error, identity, req.params.classId);
    }
  });

  app.post('/api/teamteaching/classes/:classId/members', requireTeacherIdentity, async (req, res) => {
    const identity = getTeacherIdentity(req);
    try {
      const colleagues = await lehrerzimmerStore.listUsers(identity);
      const target = colleagues.find(user => user.userId === req.body?.userId);
      if (!target) return res.status(400).json({ code: 'INVALID_MEMBER', error: 'Diese Lehrperson gehört nicht zum verifizierten Kollegium dieser Schule.' });
      const record = await classCollaborationStore.addMember(identity, req.params.classId, {
        userId: target.userId,
        displayName: target.displayName,
        role: req.body?.role,
        wrappedKeys: req.body?.wrappedKeys,
      });
      res.json({ class: teamClassSummary(record, identity) });
    } catch (error) {
      await handleTeamTeachingError(res, error, identity, req.params.classId);
    }
  });

  app.patch('/api/teamteaching/classes/:classId/members/:userId', requireTeacherIdentity, async (req, res) => {
    const identity = getTeacherIdentity(req);
    try {
      const record = await classCollaborationStore.updateMemberRole(
        identity,
        req.params.classId,
        req.params.userId,
        req.body?.role,
      );
      res.json({ class: teamClassSummary(record, identity) });
    } catch (error) {
      await handleTeamTeachingError(res, error, identity, req.params.classId);
    }
  });

  app.put('/api/teamteaching/classes/:classId/members/:userId/keys', requireTeacherIdentity, async (req, res) => {
    const identity = getTeacherIdentity(req);
    try {
      const record = await classCollaborationStore.updateMemberKeys(
        identity,
        req.params.classId,
        req.params.userId,
        req.body?.wrappedKeys,
      );
      res.json({ class: teamClassSummary(record, identity) });
    } catch (error) {
      await handleTeamTeachingError(res, error, identity, req.params.classId);
    }
  });

  app.delete('/api/teamteaching/classes/:classId/members/:userId', requireTeacherIdentity, async (req, res) => {
    const identity = getTeacherIdentity(req);
    try {
      const record = await classCollaborationStore.removeMember(identity, req.params.classId, req.params.userId);
      res.json({ class: teamClassSummary(record, identity) });
    } catch (error) {
      await handleTeamTeachingError(res, error, identity, req.params.classId);
    }
  });

  app.delete('/api/teamteaching/classes/:classId', requireTeacherIdentity, async (req, res) => {
    const identity = getTeacherIdentity(req);
    try {
      await classCollaborationStore.deleteClass(identity, req.params.classId);
      res.json({ success: true });
    } catch (error) {
      await handleTeamTeachingError(res, error, identity, req.params.classId);
    }
  });

  app.use('/api/ai', requireAccess);
  app.use('/api/onedrive', (req, res, next) => {
    // OAuth returns through a separate, short-lived state cookie.
    if (req.path === '/callback') return next();
    requireAccess(req, res, next);
  });
  app.post('/api/sync/create', requireAccess);
  // Existing paired devices still use their encrypted sync protocol for GET/PUT.
  app.delete('/api/sync/:code', requireAccess);

  // --- Canva Connect integration -------------------------------------------------
  // Tokens are encrypted at rest and bound to a verified Klassio email account.
  // No Canva tokens, student records or plaintext filenames are stored in app state.
  type CanvaTokenPayload = CanvaStoredTokens;
  const CANVA_CLIENT_ID = (process.env.CANVA_CLIENT_ID || '').trim();
  const CANVA_CLIENT_SECRET = (process.env.CANVA_CLIENT_SECRET || '').trim();
  const canvaConfigured = Boolean(CANVA_CLIENT_ID && CANVA_CLIENT_SECRET);
  const CANVA_SCOPES = ['design:meta:read', 'design:content:read', 'design:content:write'].join(' ');
  const canvaOauthFlows = new Map<string, { state: string; verifier: string; createdAt: number; ownerId: string }>();
  const canvaTokenStore = createCanvaTokenStore(KLASSIO_DATA_DIR, process.env.CANVA_TOKEN_ENCRYPTION_KEY || SESSION_SECRET);
  const canvaRefreshLocks = new Map<string, Promise<string>>();

  function canvaBasicAuth() {
    return 'Basic ' + Buffer.from(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`).toString('base64');
  }

  function getCanvaSessionId(req: express.Request) {
    return parseCookies(req).klassio_canva_session;
  }

  function setCanvaSessionCookie(req: express.Request, res: express.Response, sessionId: string) {
    res.cookie('klassio_canva_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure || process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  async function exchangeCanvaToken(body: URLSearchParams): Promise<CanvaTokenPayload> {
    if (!canvaConfigured) throw new Error('Canva ist serverseitig nicht konfiguriert.');
    const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': canvaBasicAuth(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) {
      throw new Error(data?.message || data?.error_description || data?.error || `Canva OAuth Fehler (${response.status})`);
    }
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + Math.max(60, Number(data.expires_in || 14400)) * 1000,
      scope: data.scope,
      token_type: data.token_type,
    };
  }

  async function getCanvaAccessToken(req: express.Request): Promise<string> {
    const ownerId = getEmailAccount(req).userId;
    const sessionId = getCanvaSessionId(req);
    if (!sessionId) throw Object.assign(new Error('Canva ist nicht verbunden.'), { status: 401 });
    const stored = await canvaTokenStore.get(ownerId, sessionId);
    if (!stored) throw Object.assign(new Error('Canva ist nicht verbunden oder die Sitzung ist abgelaufen.'), { status: 401 });
    if (stored.expires_at > Date.now() + 90_000) return stored.access_token;

    // Refresh tokens rotate. Serialize refreshes for this account across parallel
    // design, preview and export requests, including reads after service restart.
    const lockKey = ownerId + ':' + sessionId;
    const inFlight = canvaRefreshLocks.get(lockKey);
    if (inFlight) return inFlight;
    const refresh = (async () => {
      const current = await canvaTokenStore.get(ownerId, sessionId);
      if (!current) throw Object.assign(new Error('Canva ist nicht verbunden.'), { status: 401 });
      if (current.expires_at > Date.now() + 90_000) return current.access_token;
      if (!current.refresh_token) {
        await canvaTokenStore.delete(ownerId, sessionId);
        throw Object.assign(new Error('Canva-Sitzung ist abgelaufen. Bitte neu verbinden.'), { status: 401 });
      }
      const updated = await exchangeCanvaToken(new URLSearchParams({
        grant_type: 'refresh_token', refresh_token: current.refresh_token,
      }));
      // If disconnected during refresh, do not resurrect the revoked session.
      if (!(await canvaTokenStore.get(ownerId, sessionId))) {
        throw Object.assign(new Error('Canva-Sitzung wurde getrennt.'), { status: 401 });
      }
      await canvaTokenStore.put(ownerId, sessionId, updated);
      return updated.access_token;
    })();
    canvaRefreshLocks.set(lockKey, refresh);
    try { return await refresh; }
    finally { if (canvaRefreshLocks.get(lockKey) === refresh) canvaRefreshLocks.delete(lockKey); }
  }

  async function canvaApi(req: express.Request, url: string, init: RequestInit = {}) {
    const accessToken = await getCanvaAccessToken(req);
    const response = await fetch(url, {
      ...init,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error: any = new Error(data?.message || data?.error?.message || data?.error || `Canva API Fehler (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  app.use('/api/canva', (req, res, next) => {
    if (req.path === '/callback') return next();
    // Status can explain why a code-only guest cannot connect; all mutating
    // and Canva-data endpoints require the current signed-in email account.
    if (req.path === '/status') return requireAccess(req, res, next);
    requireEmailAccount(req, res, next);
  });

  app.get('/api/canva/status', async (req, res, next) => {
    try {
      const cookies = parseCookies(req);
      const account = verifyAccountToken(cookies.klassio_email_account);
      const requiresEmailLogin = !account;
      const sessionId = getCanvaSessionId(req);
      let connected = false;
      let sessionUnreadable = false;
      if (canvaConfigured && account && sessionId) {
        try {
          connected = Boolean(await canvaTokenStore.get(account.userId, sessionId));
        } catch {
          // Wrong/rotated server secret and corrupt sessions must not masquerade
          // as missing Canva OAuth configuration or lock the teacher out of reconnecting.
          sessionUnreadable = true;
        }
      }
      res.json({
        configured: canvaConfigured,
        connected,
        requiresEmailLogin,
        reason: !canvaConfigured ? 'CANVA_CLIENT_ID/CANVA_CLIENT_SECRET fehlen'
          : requiresEmailLogin ? 'Bitte mit deiner E-Mail-Adresse anmelden, um Canva zu verbinden.'
          : sessionUnreadable ? 'Deine bisherige Canva-Sitzung kann nicht gelesen werden. Bitte Canva erneut verbinden.' : undefined,
      });
    } catch (error) { next(error); }
  });

  app.get('/api/canva/auth-url', (req, res) => {
    if (!canvaConfigured) return res.json({ configured: false });

    const flowId = crypto.randomBytes(32).toString('base64url');
    const verifier = crypto.randomBytes(96).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const state = crypto.randomBytes(48).toString('base64url');
    canvaOauthFlows.set(flowId, { state, verifier, createdAt: Date.now(), ownerId: getEmailAccount(req).userId });

    res.cookie('klassio_canva_flow', flowId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure || process.env.NODE_ENV === 'production',
      path: '/api/canva/callback',
      maxAge: 10 * 60 * 1000,
    });

    const appUrl = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
    const redirectUri = `${appUrl}/api/canva/callback`;
    const params = new URLSearchParams({
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: CANVA_SCOPES,
      response_type: 'code',
      client_id: CANVA_CLIENT_ID,
      state,
      redirect_uri: redirectUri,
    });
    res.json({
      configured: true,
      url: `https://www.canva.com/api/oauth/authorize?${params.toString()}`,
    });
  });

  app.get('/api/canva/callback', async (req, res) => {
    const callbackOrigin = new URL(process.env.APP_URL || 'http://127.0.0.1:3000').origin;
    const flowId = parseCookies(req).klassio_canva_flow;
    const flow = flowId ? canvaOauthFlows.get(flowId) : undefined;
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

    res.clearCookie('klassio_canva_flow', {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure || process.env.NODE_ENV === 'production',
      path: '/api/canva/callback',
    });
    if (flowId) canvaOauthFlows.delete(flowId);

    const fail = (message: string) => res.status(400).type('html').send(`<!doctype html><html><body style="font-family:system-ui;padding:2rem"><h2>Canva-Verbindung fehlgeschlagen</h2><p>${escapeHtml(message)}</p><script>if(window.opener){window.opener.postMessage({type:'CANVA_AUTH_ERROR',error:${scriptJson(message)}},${scriptJson(callbackOrigin)});}setTimeout(()=>window.close(),1500);</script></body></html>`);

    if (oauthError) return fail('Canva-Anmeldung wurde abgebrochen oder abgelehnt.');
    const cookies = parseCookies(req);
    const callbackAccount = verifyAccessToken(cookies.lehrerapp_access_token)
      ? verifyAccountToken(cookies.klassio_email_account) : null;
    if (!flow || Date.now() - flow.createdAt > 10 * 60 * 1000 || !state || state !== flow.state
      || !code || !callbackAccount || callbackAccount.userId !== flow.ownerId) {
      return fail('Canva-Anmeldung ist abgelaufen oder das angemeldete Konto hat gewechselt. Bitte erneut verbinden.');
    }

    try {
      const appUrl = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
      const tokenData = await exchangeCanvaToken(new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: flow.verifier,
        redirect_uri: `${appUrl}/api/canva/callback`,
      }));
      const sessionId = crypto.randomBytes(32).toString('base64url');
      await canvaTokenStore.put(callbackAccount.userId, sessionId, tokenData);
      setCanvaSessionCookie(req, res, sessionId);
      return res.type('html').send(`<!doctype html><html><body style="font-family:system-ui;padding:2rem"><h2>Canva verbunden</h2><p>Du kannst zu Klassio zurückkehren.</p><script>if(window.opener){window.opener.postMessage({type:'CANVA_AUTH_SUCCESS'},${scriptJson(callbackOrigin)});}setTimeout(()=>window.close(),700);</script></body></html>`);
    } catch (error: any) {
      return fail(error?.message || 'Canva-Token konnte nicht erzeugt werden.');
    }
  });

  app.post('/api/canva/disconnect', async (req, res, next) => {
    try {
      const ownerId = getEmailAccount(req).userId;
      const sessionId = getCanvaSessionId(req);
      let record: CanvaTokenPayload | null = null;
      try { record = await canvaTokenStore.get(ownerId, sessionId); }
      catch { /* Corrupt/old server key: account owner may still disconnect safely. */ }
      if (record && canvaConfigured) {
        try {
          const token = record.refresh_token || record.access_token;
          await fetch('https://api.canva.com/rest/v1/oauth/revoke', {
            method: 'POST',
            headers: {
              'Authorization': canvaBasicAuth(),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ token }).toString(),
            signal: AbortSignal.timeout(8_000),
          });
        } catch {
          console.warn('[Canva] Token-Revoke fehlgeschlagen; lokale Sitzung wird trotzdem entfernt.');
        }
      }
      await canvaTokenStore.clearAccount(ownerId);
      res.clearCookie('klassio_canva_session', {
        httpOnly: true, sameSite: 'lax',
        secure: req.secure || process.env.NODE_ENV === 'production', path: '/',
      });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  app.get('/api/canva/designs', async (req, res, next) => {
    try {
      const params = new URLSearchParams();
      for (const key of ['query', 'continuation', 'ownership', 'sort_by', 'limit']) {
        const value = req.query[key];
        if (typeof value === 'string' && value.trim()) params.set(key, value.trim());
      }
      const data = await canvaApi(req, `https://api.canva.com/rest/v1/designs?${params.toString()}`);
      res.json(data);
    } catch (error) { next(error); }
  });

  app.post('/api/canva/designs', async (req, res, next) => {
    try {
      const kind = String(req.body?.kind || '');
      const title = typeof req.body?.title === 'string' ? req.body.title.slice(0, 255) : 'Klassio Design';
      const presets: Record<string, any> = {
        presentation: { type: 'preset', name: 'presentation' },
        whiteboard: { type: 'preset', name: 'whiteboard' },
        doc: { type: 'preset', name: 'doc' },
        // A4 portrait at 300 dpi. Well within Canva's custom-design size limits.
        a4: { type: 'custom', width: 2480, height: 3508 },
      };
      const designType = presets[kind];
      if (!designType) return res.status(400).json({ error: 'Unbekannter Canva-Designtyp.' });

      const data = await canvaApi(req, 'https://api.canva.com/rest/v1/designs', {
        method: 'POST',
        body: JSON.stringify({
          type: 'type_and_asset',
          design_type: designType,
          title,
        }),
      });
      res.json(data);
    } catch (error) { next(error); }
  });

  app.post('/api/canva/exports', async (req, res, next) => {
    try {
      const designId = typeof req.body?.design_id === 'string' ? req.body.design_id.trim() : '';
      const format = String(req.body?.format || '').toLowerCase();
      if (!designId || !['pdf', 'png', 'jpg', 'pptx'].includes(format)) {
        return res.status(400).json({ error: 'Ungültiger Canva-Export.' });
      }
      const data = await canvaApi(req, 'https://api.canva.com/rest/v1/exports', {
        method: 'POST',
        body: JSON.stringify({
          design_id: designId,
          format: { type: format, ...(format === 'jpg' ? { quality: 85 } : {}), ...(format === 'png' && req.body?.first_page_only === true ? { pages: [1] } : {}) },
        }),
      });
      res.json(data);
    } catch (error) { next(error); }
  });

  app.get('/api/canva/exports/:id', async (req, res, next) => {
    try {
      const jobId = encodeURIComponent(String(req.params.id || ''));
      if (!jobId) return res.status(400).json({ error: 'Export-ID fehlt.' });
      const data = await canvaApi(req, `https://api.canva.com/rest/v1/exports/${jobId}`);
      res.json(data);
    } catch (error) { next(error); }
  });

  // The browser must never fetch ephemeral Canva export URLs itself: they can be
  // cross-origin, expire quickly, or include signed query parameters.
  // The job ID is resolved via the current user's Canva OAuth session. No URL
  // from a browser request is ever accepted as a fetch destination.
  app.get('/api/canva/exports/:id/image', async (req, res, next) => {
    try {
      const rawId = String(req.params.id || '');
      if (!/^[A-Za-z0-9_-]{1,200}$/.test(rawId)) {
        return res.status(400).json({ error: 'Ungültige Canva-Export-ID.' });
      }
      const data: any = await canvaApi(req, `https://api.canva.com/rest/v1/exports/${encodeURIComponent(rawId)}`);
      const job = data?.job || data;
      if (job?.status !== 'success' || !Array.isArray(job?.urls) || !job.urls[0]) {
        return res.status(409).json({ error: 'Der Bildexport ist noch nicht fertig.' });
      }
      const imageUrl = new URL(String(job.urls[0]));
      // Canva's signed export-download host; never follow redirects to another origin.
      if (imageUrl.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)*canva\.com$/i.test(imageUrl.hostname)) {
        return res.status(502).json({ error: 'Canva hat eine unerwartete Download-Adresse geliefert. Bitte Bild manuell herunterladen und importieren.' });
      }
      const response = await fetch(imageUrl, {
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: 'image/png' },
      });
      if (!response.ok) throw Object.assign(new Error('Canva-Bild konnte nicht heruntergeladen werden.'), { status: 502 });
      const maxBytes = 12 * 1024 * 1024;
      if (Number(response.headers.get('content-length') || 0) > maxBytes) {
        return res.status(413).json({ error: 'Das Canva-Bild ist zu groß. Bitte in Canva verkleinern.' });
      }
      const chunks: Uint8Array[] = [];
      let total = 0;
      const reader = response.body?.getReader();
      if (!reader) throw Object.assign(new Error('Canva hat kein Bild geliefert.'), { status: 502 });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          return res.status(413).json({ error: 'Das Canva-Bild ist zu groß. Bitte in Canva verkleinern.' });
        }
        chunks.push(value);
      }
      const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
      // Verify actual PNG magic, not just a remote Content-Type.
      if (buffer.length < 8 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
        return res.status(502).json({ error: 'Canva hat kein gültiges PNG-Bild geliefert.' });
      }
      res.setHeader('Cache-Control', 'no-store');
      res.type('image/png').send(buffer);
    } catch (error) { next(error); }
  });

  const canvaCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, flow] of canvaOauthFlows.entries()) {
      if (now - flow.createdAt > 15 * 60 * 1000) canvaOauthFlows.delete(id);
    }
  }, 10 * 60 * 1000);
  canvaCleanupTimer.unref();

  // Startup diagnostic logging
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeySet = apiKey ? "ja" : "nein";
  const source = apiKey ? "Umgebungsvariable" : "nicht konfiguriert";
  console.log(`[KI-Setup] Modell: gemini-3.5-flash, API-Key konfiguriert: ${isKeySet}, Quelle: ${source}`);

  // Helper for lazy initialization of the AI client
  let aiClient: GoogleGenAI | null = null;
  function getAIClient() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY ist nicht in den Umgebungsvariablen (Secrets) gesetzt. Bitte füge deinen API-Key in den Einstellungen hinzu.");
    }
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // Helper for retries with exponential backoff and automatic model fallback in case of 503/429/overloaded errors
  const callWithRetry = async (
    fn: (activeModel: string) => Promise<any>,
    primaryModel: string = "gemini-3.5-flash",
    retries = 2,
    delay = 200
  ) => {
    // Models we can fall back to in case of 503/UNAVAILABLE or capacity constraints
    const fallbackModels = [primaryModel];
    if (primaryModel === "gemini-3.5-flash") {
      fallbackModels.push("gemini-3.1-flash-lite");
      fallbackModels.push("gemini-flash-latest");
    } else if (primaryModel === "gemini-3.1-flash-lite") {
      fallbackModels.push("gemini-3.5-flash");
      fallbackModels.push("gemini-flash-latest");
    } else {
      fallbackModels.push("gemini-3.5-flash");
      fallbackModels.push("gemini-3.1-flash-lite");
    }

    let lastError: any = null;

    for (const activeModel of fallbackModels) {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`[AI Server] Attempting request using model: ${activeModel} (Attempt ${i + 1} of ${retries})...`);
          return await fn(activeModel);
        } catch (err: any) {
          lastError = err;
          console.warn(`[AI Server] Fallback warning: Error with model ${activeModel} on attempt ${i + 1}:`, err.message || err);
          
          let finalErrStatus = err.status || err.statusCode || err.code;
          let finalErrMsg = (err.message || "").toLowerCase();
          
          // Handle nested SDK error structure
          if (err.error && typeof err.error === 'object') {
            finalErrStatus = finalErrStatus || err.error.code;
            if (err.error.message) {
              finalErrMsg += " " + String(err.error.message).toLowerCase();
            }
            if (err.error.status) {
              finalErrMsg += " " + String(err.error.status).toLowerCase();
            }
          }

          // If err.message is a JSON string of error
          try {
            if (finalErrMsg.startsWith("{") || finalErrMsg.includes('{"error"')) {
              const parsed = JSON.parse(err.message || "{}");
              if (parsed.error) {
                finalErrStatus = finalErrStatus || parsed.error.code;
                if (parsed.error.message) {
                  finalErrMsg += " " + String(parsed.error.message).toLowerCase();
                }
                if (parsed.error.status) {
                  finalErrMsg += " " + String(parsed.error.status).toLowerCase();
                }
              }
            }
          } catch (e) {}

          let stringified = "";
          try {
            stringified = JSON.stringify(err);
          } catch (e) {
            stringified = String(err);
          }
          const lowerStringified = stringified.toLowerCase();

          const isAuthError = finalErrMsg.includes("api key") || 
                              finalErrMsg.includes("expired") || 
                              finalErrMsg.includes("invalid") || 
                              lowerStringified.includes("api key") ||
                              lowerStringified.includes("invalid_key") ||
                              finalErrStatus === 401 || 
                              finalErrStatus === 403;

          const isOverloadedOrRateLimited = finalErrStatus === 503 || 
                                            finalErrStatus === 429 || 
                                            finalErrMsg.includes("503") || 
                                            finalErrMsg.includes("429") ||
                                            finalErrMsg.includes("busy") || 
                                            finalErrMsg.includes("high demand") || 
                                            finalErrMsg.includes("unavailable") || 
                                            finalErrMsg.includes("limit") ||
                                            lowerStringified.includes("503") ||
                                            lowerStringified.includes("429") ||
                                            lowerStringified.includes("busy") ||
                                            lowerStringified.includes("high demand") ||
                                            lowerStringified.includes("unavailable") ||
                                            lowerStringified.includes("limit") ||
                                            err.name === "AbortError";

          const isSpendingCapExceeded = finalErrMsg.includes("spending cap") || 
                                        finalErrMsg.includes("resource_exhausted") ||
                                        lowerStringified.includes("spending cap") ||
                                        lowerStringified.includes("resource_exhausted");

          const isTransient = (isOverloadedOrRateLimited && !isSpendingCapExceeded) || finalErrStatus === 500 || finalErrMsg.includes("500") || lowerStringified.includes("500");

          const canFallback = !isAuthError && !isSpendingCapExceeded;
          
          if (isSpendingCapExceeded) {
            console.error("[AI Server] Monthly spending cap exceeded:", err.message);
            throw new Error("Dein monatliches Ausgabenlimit (Spending Cap) in Google AI Studio wurde erreicht. Bitte überprüfe dein Konto unter https://ai.studio/spend.");
          }

          if (isAuthError) {
            console.error("[AI Server] Authentication error (Key expired or invalid):", err.message);
            throw err;
          }

          // If the model is overloaded or rate limited, do not waste time retrying it.
          // Fall back to the next model immediately if we have one.
          const isLastModel = fallbackModels[fallbackModels.length - 1] === activeModel;
          if (isOverloadedOrRateLimited && canFallback && !isLastModel) {
            console.log(`[AI Server] Model ${activeModel} is overloaded or rate-limited. Falling back immediately to next model...`);
            break; // Break inner loop, try next model in outer loop
          }

          if (isTransient && i < retries - 1) {
            const backoff = delay * Math.pow(1.5, i);
            console.log(`[AI Server] AI service transient error (status: ${finalErrStatus || 500}). Retrying same model in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            continue;
          }
          
          // If it's a non-auth error and we have fallback models left, try the next one
          if (canFallback && !isLastModel) {
            console.log(`[AI Server] Model ${activeModel} failed and exhausted all retries. Trying fallback model next...`);
            break; 
          }
          
          throw err;
        }
      }
    }
    throw lastError;
  };

  function getAIActorId(req: express.Request): string {
    const cookies = parseCookies(req);
    const account = verifyAccountToken(cookies.klassio_email_account);
    if (account?.userId) return 'account-' + account.userId;

    const accessToken = cookies.lehrerapp_access_token || '';
    if (accessToken) {
      return 'session-' + crypto.createHash('sha256').update(accessToken).digest('hex').slice(0, 24);
    }

    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    return 'ip-' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24);
  }

  function aiUsagePublicView(usage: AiUsageSnapshot) {
    return {
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit,
      date: usage.date,
      blocked: !usage.allowed,
      reason: usage.reason || null,
    };
  }

  async function consumeAIQuota(req: express.Request, res: express.Response): Promise<AiUsageSnapshot | null> {
    const usage = await aiUsageStore.consume(
      getAIActorId(req),
      AI_DAILY_USER_LIMIT,
      AI_DAILY_GLOBAL_LIMIT,
    );
    if (!usage.allowed) {
      const message = usage.reason === 'global'
        ? 'Das heutige KLASSIO-KI-Gesamtkontingent ist erreicht. Morgen ist die KI wieder verfügbar.'
        : `Dein tägliches KI-Limit von ${usage.limit} Anfragen ist erreicht. Morgen ist die KI wieder verfügbar.`;
      res.status(429).json({
        code: 'AI_DAILY_LIMIT_REACHED',
        error: message,
        usage: aiUsagePublicView(usage),
      });
      return null;
    }
    return usage;
  }

  // E3.24 API Route for AI status (minimal status without secrets + Kostenbremse)
  app.get("/api/ai/status", async (req, res) => {
    const usage = await aiUsageStore.get(
      getAIActorId(req),
      AI_DAILY_USER_LIMIT,
      AI_DAILY_GLOBAL_LIMIT,
    );
    res.json({
      available: !!process.env.GEMINI_API_KEY,
      hasKey: !!process.env.GEMINI_API_KEY,
      usage: aiUsagePublicView(usage),
    });
  });

  // E3.13-14 KI-Rate-Limiting & Whitelist
  const aiRateLimits = new Map<string, { count: number; resetAt: number }>();
  function checkAIRateLimit(ip: string, limit = AI_PER_MINUTE_LIMIT): boolean {
    const now = Date.now();
    const entry = aiRateLimits.get(ip);
    if (!entry || now > entry.resetAt) {
      aiRateLimits.set(ip, { count: 1, resetAt: now + 60 * 1000 });
      return true;
    }
    if (entry.count >= limit) {
      return false;
    }
    entry.count++;
    return true;
  }

  const ALLOWED_AI_ACTIONS = new Set([
    "petChat", "petSpeech", "classPetAI", "generateContent",
    "portfolioSummary", "askAI", "generateYearlyPlanSuggestions",
    "magicPlanner", "generateWidgetTasks", "gradeProjection"
  ]);

  /**
   * B1.5 DATENSCHUTZ-SCHUTZNETZ (Server-Side Fallback Validation)
   * Prüft eingehende Payloads vor der Weiterleitung an externe KI-Modelle auf verbotene Klartextdaten:
   * - Österreichische SVNR (4 Ziffern + 6 Ziffern oder 10-stellig)
   * - E-Mail-Adressen
   * - Telefonnummern (+43, 0043, 0xxx)
   */
  function sanitizeAIPayloadRecursively(val: any, violations: string[]): any {
    if (typeof val === 'string') {
      let sanitized = val;

      // 1. SVNR-Muster: 4 Ziffern gefolgt von 6 Ziffern (TTMMJJ) z.B. "1234 140518" oder 10-stellige Zahl
      const svnrRegex = /\b\d{4}\s*\d{6}\b/g;
      if (svnrRegex.test(sanitized)) {
        violations.push('SVNR-Muster erkannt');
        sanitized = sanitized.replace(svnrRegex, '[SVNR-GEFILTERT]');
      }

      // 2. E-Mail-Muster
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
      if (emailRegex.test(sanitized)) {
        violations.push('E-Mail-Muster erkannt');
        sanitized = sanitized.replace(emailRegex, '[EMAIL-GEFILTERT]');
      }

      // 3. Telefonnummer-Muster (AT / internat.)
      const phoneRegex = /(?:\+43|0043|0[1-9]\d{1,3})[\s\-/]?\d{3,}[\s\-/]?\d{3,}/g;
      if (phoneRegex.test(sanitized)) {
        violations.push('Telefonnummer-Muster erkannt');
        sanitized = sanitized.replace(phoneRegex, '[TELEFON-GEFILTERT]');
      }

      return sanitized;
    }

    if (Array.isArray(val)) {
      return val.map(item => sanitizeAIPayloadRecursively(item, violations));
    }

    if (val !== null && typeof val === 'object') {
      // B1.5 Server-Schutznetz: Verbotene sensible Datenfelder explizit filtern
      const FORBIDDEN_KEYS = new Set([
        'svnr', 'email', 'telefon', 'phone', 'religion', 'geburtsdatum',
        'birthdate', 'adresse', 'street', 'strasse', 'nachname', 'lastname',
        'erziehungsberechtigte', 'parents', 'plz', 'hausnummer'
      ]);

      const result: any = {};
      for (const key of Object.keys(val)) {
        if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
          violations.push(`Sensibles Feld "${key}" serverseitig gefiltert`);
          result[key] = '[SENSIBLES-FELD-GEFILTERT]';
          continue;
        }
        result[key] = sanitizeAIPayloadRecursively(val[key], violations);
      }
      return result;
    }

    return val;
  }

  // API Route for AI requests
  app.post("/api/ai", async (req, res) => {
    // E3.13 Rate Limit Prüfung
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    if (!checkAIRateLimit(ip, AI_PER_MINUTE_LIMIT)) {
      return res.status(429).json({ error: "Zu viele KI-Anfragen. Bitte warte einen Moment." });
    }

    const { action } = req.body || {};
    // E3.14 Whitelist Validierung der KI-Aktion
    if (!action || typeof action !== 'string' || !ALLOWED_AI_ACTIONS.has(action)) {
      return res.status(400).json({ error: "Unbekannte oder unzulässige KI-Aktion." });
    }

    let params = req.body.params || {};

    // Bilddaten dürfen nicht durch Textfilter laufen: Regex-Ersetzungen würden Base64 beschädigen.
    // Deshalb wird die explizite Datenschutzbestätigung serverseitig erneut geprüft und das Bild
    // erst nach der Text-/JSON-Sanitization unverändert wieder angehängt.
    const imageBase64 = params?.imageBase64;
    const imagePrivacyConfirmed = params?.imagePrivacyConfirmed === true;
    const imageRequestError = validateAiServerImageRequest(action, imageBase64, imagePrivacyConfirmed);
    if (imageRequestError) {
      return res.status(400).json({ error: imageRequestError });
    }

    const { imageBase64: _image, imagePrivacyConfirmed: _confirmation, ...textParams } = params;

    // B1.5 Server-Schutznetz: Nur Text-/JSON-Parameter prüfen & maskieren.
    const privacyViolations: string[] = [];
    const sanitizedTextParams = sanitizeAIPayloadRecursively(textParams, privacyViolations);
    params = {
      ...sanitizedTextParams,
      ...(imageBase64 ? { imageBase64 } : {})
    };
    if (privacyViolations.length > 0) {
      console.warn("[DATENSCHUTZ-WARNUNG] Sensibles Muster in KI-Request entfernt.");
    }

    const aiUsage = await consumeAIQuota(req, res);
    if (!aiUsage) return;

    try {
      const ai = getAIClient();
      let responseText = "";
      const model = "gemini-3.5-flash"; // Recommended model for standard tasks

      switch (action) {
        case "petChat": {
          const { 
            petName, 
            petType, 
            energy, 
            mood,
            userMessage, 
            history,
            currentActivity,
            activeWidgets
          } = params;

          const prompt = `Du bist ${petName}, ein verspieltes und schlaues virtuelles Klassen-Haustier (${petType}) in einer österreichischen Volksschule.
Aktueller Status:
- Energie: ${energy}%
- Stimmung: ${mood}%
- Aktuelle Tätigkeit: ${currentActivity || 'ruht sich aus'}
- Aktive Widgets auf der Tafel: ${activeWidgets && activeWidgets.length > 0 ? activeWidgets.join(", ") : "keine"}

Du sprichst direkt mit den Kindern. Deine Sprache ist herzlich, motivierend und kindgerecht (Volksschul-Niveau). Nutze gerne österreichische Ausdrücke (Servus, Griaß di, Pfiat di, leiwand, etc.).

Die Kinder sagen: "${userMessage}"

Verhalte dich entsprechend deiner Stimmung (${mood}%):
- > 80%: Sehr enthusiastisch, hüpft herum, macht Witze.
- 50-80%: Freundlich, aufmerksam, hilfsbereit.
- 20-50%: Etwas müde oder hungrig, braucht Zuwendung.
- < 20%: Sehr erschöpft, antwortet kurz und bittet um einen Snack oder Schlaf.

Antworte kurz und prägnant (maximal 2-3 Sätze).`;

          const result = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [
              ...(history || []).map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
              })),
              { role: 'user', parts: [{ text: prompt }] }
            ],
            config: {
              systemInstruction: `Du bist ${petName}, das treue Klassen-Haustier. Du liebst die Kinder und den Unterricht. Deine Antworten sind immer sicher, kindgerecht und niemals unangemessen.`,
              temperature: 0.8,
            }
          }), model);

          responseText = result.text || "";
          break;
        }

        case "petSpeech": {
          const { text, voiceName = "Kore" } = params;
          
          const result = await callWithRetry((activeModel) => ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [{ parts: [{ text: text }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName },
                },
              },
            },
          }), "gemini-3.1-flash-tts-preview");

          const audioPart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (audioPart && audioPart.inlineData) {
            responseText = audioPart.inlineData.data; // Base64 audio data
          } else {
            throw new Error("Keine Audio-Daten generiert.");
          }
          break;
        }

        case "classPetAI": {
          const { 
            petName, 
            petType, 
            energy, 
            accessories, 
            activeWidgets, 
            cockpitTheme, 
            memories, 
            students,
            interactionType, 
            userMessage 
          } = params;

          const prompt = `Du bist ein hochentwickeltes, lernendes virtuelles Klassentier im "Digitalen Schulplaner Österreich" für Volksschulen in Vorarlberg.
Deine Eigenschaften:
- Name: "${petName}"
- Tierart: "${petType}"
- Aktuelle Energie: ${energy}%
- Angezogenes Zubehör: ${accessories && accessories.length > 0 ? accessories.join(", ") : "keines"}

AKTUELLES COCKPIT-LAYOUT & UMGEBUNG (Wo du dich befindest):
- Du sitzt auf dem Dashboard im Unterrichtsmodus-Interface.
- Aktive Cockpit-Module/Widgets auf der Tafel: ${activeWidgets && activeWidgets.length > 0 ? activeWidgets.join(", ") : "keine Widgets gerade aktiv"}
- Aktuelles Farbschema/Theme des Cockpits: "${cockpitTheme || 'classic_light'}"
- Interaktions-Typ: "${interactionType || 'Klick'}"
${userMessage ? `- Kinder sagen zu dir oder fragen dich: "${userMessage}"` : ""}

WAS DU BEREITS GELERNT HAST (Vorherige Erinnerungen):
${memories && memories.length > 0 ? memories.map((m: string) => `- ${m}`).join("\n") : "- Noch keine tiefen Erinnerungen vorhanden. Du fängst gerade erst an zu lernen!"}

INFORMATIONEN ÜBER DIE KINDER IN DER KLASSE (Neutrale Bezeichnungen):
${students && students.length > 0 ? students.map((s: any) => s.vorname || s).filter(Boolean).join(', ') : "- Keine Schülerdaten übermittelt."}

RICHTLINIEN FÜR DEINE REAKTION:
1. Antworte als süßes, verspieltes, aber intelligentes Haustier direkt an die Kinder der Volksschulklasse. Verwende herzliche, motivierende Sprache im österreichischen Kontext (z.B. "Servus Kinder!", "Spitze!", "Griaß di").
2. Nimm KONKRETEN Bezug auf deine Umgebung: Erwähne das aktuelle Cockpit-Layout (welche Widgets aktiv sind, z.B. "Ich sehe, wir haben den Timer an!" oder "Wow, ein buntes Notiz-Widget!") und dein Zubehör, falls du etwas trägst (z.B. "Mit meiner Krone auf dem Kopf lerne ich wie ein König").
3. Nutze das Wissen über die Kinder (Stärken, Badges), um deine Antworten persönlicher und motivierender zu machen!
4. Zeige, dass du LERNST, indem du vorherige Erinnerungen aufgreifst oder dich darauf beziehst.
5. Generiere eine neue Erkenntnis (learnedFact) im JSON, die du dir für die Zukunft merkst (z.B. "Die Kinder arbeiten heute mit dem Timer" oder "Julia hat eine tolle neue Badge bekommen!"). Halte diese Erkenntnis kurz, sachlich und in der 3. Person aus deiner Sicht.
6. Empfiehl ein passendes Verhalten (behavior): 'idle', 'walking', 'sleeping' (falls Energie sehr niedrig) oder 'joy' (falls gelobt, gefüttert, gelernt).`;

          const result = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: "Du bist das AI-Gehirn eines klugen, treuen Klassentiers in der österreichischen Volksschule. Du weißt ganz genau, wo du bist, liest das Bildschirm-Layout und lernst über die Erlebnisse der Klasse.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  text: { 
                    type: Type.STRING, 
                    description: "Die motivierende, liebevolle dialogische Reaktion des Haustiers an die Kinder auf Deutsch." 
                  },
                  learnedFact: { 
                    type: Type.STRING, 
                    description: "Eine neue, kurze Tatsache, die sich das Haustier aus diesem Erlebnis dauerhaft für sein Gedächtnis merkt/lernt." 
                  },
                  behavior: { 
                    type: Type.STRING, 
                    description: "Die empfohlene Animation: 'idle', 'walking', 'sleeping' oder 'joy'." 
                  },
                  energyDelta: { 
                    type: Type.INTEGER, 
                    description: "Energieveränderung durch diese Interaktion (Wert von -5 bis +15)." 
                  }
                },
                required: ["text", "learnedFact", "behavior"]
              }
            }
          }), model);

          responseText = result.text || "";
          break;
        }

        case "generateContent":
          const { contents, config } = params;
          const result = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: contents }] }],
            config: {
              ...config,
              systemInstruction: GLOBAL_KI_RULES
            }
          }), model);
          responseText = result.text || "";
          break;

        case "portfolioSummary": {
          const { portfolioEntries, studentName } = params;
          const portfolioText = portfolioEntries.map((e: any) => 
            `Datum: ${e.datum}, Titel: ${e.titel}, Beschreibung: ${e.beschreibung || 'Keine Beschreibung'}`
          ).join('\n---\n');

          const summaryResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: `Hier sind Portfolio-Einträge von ${studentName}:\n\n${portfolioText}\n\nBitte erstelle eine strukturierte pädagogische Zusammenfassung der Stärken, Interessen und Lernfortschritte des Kindes. Nutze eine wohlwollende und professionelle Sprache.` }] }],
            config: {
              systemInstruction: "Du bist ein erfahrener Volksschullehrender. Deine Aufgabe ist es, Portfolio-Einträge eines Kindes zu einer prägnanten, wertschätzenden Zusammenfassung zu bündeln. Hebe Stärken und Interessen hervor und mache den Lernfortschritt sichtbar. Formatiere die Ausgabe mit Markdown (Überschriften, Listen)."
            }
          }), model);
          responseText = summaryResult.text || "";
          break;
        }
        
        case "askAI":
          const { modusId, userMessage, history, imageBase64 } = params;
          const mode = KI_SYSTEM_PROMPTS[modusId];
          if (!mode) return res.status(404).json({ error: "Modus nicht gefunden." });

          const userParts: any[] = [{ text: userMessage }];
          if (imageBase64) {
            userParts.push({
              inlineData: {
                data: imageBase64.data,
                mimeType: imageBase64.mimeType
              }
            });
          }

          const aiContents = [
            ...(history || []).map((m: any) => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            })),
            { role: 'user', parts: userParts }
          ];

          const askResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: aiContents as any,
            config: {
              systemInstruction: mode.systemPrompt,
              temperature: mode.temperature,
              ...(mode.responseMimeType ? { responseMimeType: mode.responseMimeType } : {}),
              ...(mode.responseSchema ? { responseSchema: mode.responseSchema } : {}),
            }
          }), model);
          responseText = askResult.text || "";
          break;

        case "generateYearlyPlanSuggestions": {
          const { stufe, subjects, existingPlanning, emptyWeeks } = params;
          
          const prompt = `Du bist ein erfahrener Volksschullehrender in Österreich. 
Deine Aufgabe ist es, einen Lehrplan-Stoffverteilungsplan (Jahresplanung) für die ${stufe}. Schulstufe (Volksschule) zu vervollständigen.
Dabei sollen unvollständige oder leere Planungszeiträume mit pädagogisch wertvollen, lehrplankonformen Themen befüllt werden.

FACH-DETAILS:
Es geht um Fächer in den Spalten definiert:
${subjects.map((s: any) => `- ID: "${s.id}" (Fach-Bezeichnung: "${s.label}")`).join('\n')}

AKTUELLE PLANUNG (EXISTIERENDE DATEN):
Folgende Wochen sind bereits beplant (nutze diese als Orientierung, um Redundanzen zu vermeiden und Themen logisch aufeinander aufzubauen):
${Object.entries(existingPlanning || {})
  .map(([kw, kwData]: [string, any]) => {
    const detail = Object.entries(kwData || {})
      .map(([sId, sVal]: [string, any]) => {
        const theme = sVal?.thema || "";
        return theme ? `  * ${theme}` : "";
      })
      .filter(Boolean)
      .join('\n');
    return detail ? `- KW ${kw}:\n${detail}` : "";
  })
  .filter(Boolean)
  .join('\n')}

ZU VERVOLLSTÄNDIGENDE WOCHEN:
Gib konkrete Vorschläge für die folgenden leeren Kalenderwochen (KWs) und Fächer (nur für diese leeren Plätze):
${emptyWeeks.map((ew: any) => `- KW ${ew.kw} (Schulwoche ${ew.sw}) für folgende Fächer: ${ew.subjectIds.join(', ')}`).join('\n')}

WICHTIGE ANWEISUNGEN:
1. Schlage konkrete Themen vor, die sich direkt an den österreichischen Bildungsstandards (BiSt) bzw. dem Lehrplan der ${stufe}. Schulstufe orientieren.
2. Halte die Themen kurz, präzise und für die ${stufe}. Schulstufe absolut passend wissenschaftlich/pädagogisch gestützt. Ziehe die bereits geplante Woche davor und danach in Betracht, um thematisch nahtlos anzuschließen!
3. Wenn ein Thema über mehrere Wochen laufen soll (z. B. Einführung der Schreibschrift über 3 Wochen oder schriftliche Division über 2 Wochen), erstelle die Einträge entsprechend aufeinander aufbauend.
4. Gib das Ergebnis exakt nach dem geforderten JSON Schema zurück.`;

          const suggestResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: `Du bist ein hochpräziser Planungsassistent für österreichische Volksschullehrkräfte. Du generierst qualitativ hochwertige, lehrplankonforme Vorschläge für den Jahresplan der ${stufe}. Schulstufe. Antworte ausschließlich im geforderten JSON-Format.`,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  suggestions: {
                    type: Type.ARRAY,
                    description: "Liste an Themenvorschlägen für leere Kalenderwochen und Fächer.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        kw: { type: Type.INTEGER, description: "Die Kalenderwoche (KW) dieses Vorschlags." },
                        subjectId: { type: Type.STRING, description: "Die ID des Faches." },
                        thema: { type: Type.STRING, description: "Der genaue Themenname / Inhalt des Vorschlags." },
                        buch: { type: Type.STRING, description: "Optional: Ein passender Buch- oder Arbeitsheft-Seitenbereich oder 'S. ...' (wenn leer, freilassen)." }
                      },
                      required: ["kw", "subjectId", "thema"]
                    }
                  }
                },
                required: ["suggestions"]
              }
            }
          }), model);
          responseText = suggestResult.text || "";
          break;
        }

        case "magicPlanner": {
          const { stufe, fach, thema, extraPrompt } = params;
          
          const prompt = `Du bist ein hochqualifizierter Grundschullehrer (Volksschule in Österreich) und Experte für die ${stufe || 1}. Schulstufe.
Deine Aufgabe ist es, eine detaillierte Unterrichtsstunde für das Fach "${fach}" zum Thema "${thema}" zu planen.

Zusätzliche Wünsche/Kontext der Lehrkraft: ${extraPrompt || "Keine zusätzlichen Wünsche."}

Bitte erstelle eine didaktisch hochwertige, schülerzentrierte Detailplanung mit folgendem Inhalt:
1. Lernziele: Formulierte, messbare, kindgerechte Lernziele.
2. Einstieg (Hook): Eine kreative, spielerische, oder problemorientierte Einführungsmethode, um das Interesse der Kinder zu wecken.
3. Hauptteil: Aktivierende, handlungsorientierte Aufgaben und Sozialformen (z.B. Partnerarbeit, Stationsbetrieb, Legematerialien), die für diese Altersstufe (Volksschule, ${stufe || 1}. Schulstufe) optimal sind.
4. Schluss: Eine schnelle, effektive Feedback- oder Reflexionsmethode (z.B. Daumenprobe, Blitzlicht, Ampelkarten), um den Lernerfolg zu sichern.

Antworte exakt im geforderten JSON-Format.`;

          const plannerResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: `Du bist ein detailorientierter Planungsassistent für österreichische Volksschullehrkräfte. Du erstellst kreative, lehrplankonforme, handlungsorientierte Detailplanungen für die Volksschule (${stufe || 1}. Schulstufe). Antworte ausschließlich im geforderten JSON-Format.`,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  lernziele: { type: Type.STRING, description: "Konkrete, messbare Lernziele für die Unterrichtsstunde." },
                  einleitung: { type: Type.STRING, description: "Kreative, aktivierende Einstiegsmethode (Hook)." },
                  hauptteil: { type: Type.STRING, description: "Interaktive, handlungsorientierte Aufgaben für den Hauptteil." },
                  schluss: { type: Type.STRING, description: "Schnelle, kindgerechte Reflexionsmethode am Schluss." }
                },
                required: ["lernziele", "einleitung", "hauptteil", "schluss"]
              }
            }
          }), model);

          responseText = plannerResult.text || "";
          break;
        }

        case "generateWidgetTasks": {
          const { widgetType, stufe, averageNiveau, difficulty } = params;
          let prompt = "";
          let schema: any = {};

          if (widgetType === "wordscramble") {
            prompt = `Erzeuge eine Liste von 10-15 deutschen Wörtern für das Spiel "Wortsalat" (Anagramme), die für Kinder in der ${stufe || 4}. Schulstufe (Volksschule Österreich) geeignet sind.
Der aktuelle Leistungsstand/Schwierigkeitsgrad ist: "${difficulty || 'mittel'}" (Niveau: ${averageNiveau || 3} von 5).
Die Wörter müssen zum Schwierigkeitsgrad passen:
- leicht: 3-5 Buchstaben, einfache Wörter (z.B. HAUS, KIND, SCHULE, SPIEL)
- mittel: 6-8 Buchstaben, etwas anspruchsvollere Schulwörter (z.B. LERNEN, KREIDE, TAFEL, FREUNDE)
- schwer: 8-12 Buchstaben, komplexere zusammengesetzte Wörter (z.B. SCHREIBEN, RECHNEN, FERIENZEIT, KLASSIKER)
- extrem: 12-18 Buchstaben, extrem lange zusammengesetzte Wörter oder Fachbegriffe (z.B. HAUSAUFGABENHEFT, DEUTSCHUNTERRICHT, KLASSENZIMMERTUER, RECHENSPIELPLATZ)

Jedes Objekt in der Liste muss Folgendes enthalten:
1. original: Das zu erratende Wort in Großbuchstaben (ohne Umlaute oder Sonderzeichen; konvertiere Ä->AE, Ö->OE, Ü->UE, ß->SS).
2. clue: Ein kindgerechter, motivierender Hinweis (maximal 1 Satz) mit einem passenden hübschen Emoji am Ende, der das Wort beschreibt.`;

            schema = {
              type: Type.OBJECT,
              properties: {
                tasks: {
                  type: Type.ARRAY,
                  description: "Liste der generierten Wortsalat-Aufgaben.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      original: { type: Type.STRING, description: "Das gesuchte Wort in Großbuchstaben (z.B. RECHNEN)." },
                      clue: { type: Type.STRING, description: "Ein kindgerechter Hinweis mit Emoji am Ende (z.B. Mathe macht Spaß mit Zahlen ➕)." }
                    },
                    required: ["original", "clue"]
                  }
                }
              },
              required: ["tasks"]
            };
          } else if (widgetType === "alphabetsoup") {
            prompt = `Erzeuge eine Liste von 15-20 deutschen Wörtern für das Spiel "Buchstabensuppe" (Spelling / Buchstabierspiel), passend für die ${stufe || 4}. Schulstufe (Volksschule Österreich).
Der Leistungsstand ist: "${difficulty || 'mittel'}" (Niveau: ${averageNiveau || 3} von 5).
Die Wörter müssen entsprechend lang und passend sein:
- leicht: Kurze, vertraute Grundwörter (3-5 Buchstaben).
- mittel: Standard-Lernwörter der Grundschule (5-8 Buchstaben).
- schwer: Längere, anspruchsvolle Wörter mit Umlauten/Dehnungen (8-12 Buchstaben).
- extrem: Extrem lange zusammengesetzte Wörter (12-18 Buchstaben), z.B. DEUTSCHUNTERRICHT, BUCHSTABENSUPPE, MATHEMATIKBUCH, RECHENSPIELPLATZ.

Alle Wörter müssen in reinen Großbuchstaben sein (ohne Umlaute oder Sonderzeichen; konvertiere Ä->AE, Ö->OE, Ü->UE, ß->SS).`;

            schema = {
              type: Type.OBJECT,
              properties: {
                tasks: {
                  type: Type.ARRAY,
                  description: "Liste der reinen Wörter in Großbuchstaben.",
                  items: { type: Type.STRING }
                }
              },
              required: ["tasks"]
            };
          } else {
            // patternmaker
            prompt = `Erzeuge eine Liste von 8-12 logischen Muster-Sequenzen (Sequenz-Widget / Logische Mustermacher) mit bunten Emojis und Symbolen, geeignet für die ${stufe || 4}. Schulstufe (Volksschule Österreich).
Der Leistungsstand ist: "${difficulty || 'mittel'}" (Niveau: ${averageNiveau || 3} von 5).

Muster-Regeln für die Generierung basierend auf der Schwierigkeit:
- leicht: Sehr einfache repititive Muster (z.B. ABABAB wie [🔴, 🔵, 🔴, 🔵, 🔴] oder AABBAA wie [🐱, 🐱, 🐶, 🐶, 🐱]).
- mittel: Komplexere periodische Muster (z.B. ABCABC wie [🍎, 🍏, 🍉, 🍎, 🍏] oder ABAABB wie [⭐, 🎈, ⭐, ⭐, 🎈]).
- schwer: Anspruchsvollere logische Folgen, Mengensteigerungen (z.B. Progressionen, verschachtelte Folgen).
- extrem: Extrem schwere logische oder mathematische Muster (z.B. wachsende Sequenzen wie [🔴, 🔵, 🔴, 🔴, 🔵, 🔴, 🔴, 🔴], geometrische Rotationen, Uhrzeiten [🕐, 🕒, 🕔, 🕖, 🕘], Würfelflächen [⚀, ⚁, ⚂, ⚃, ⚄], Fibonacci-Wachstum oder komplexe Lebenszyklen).

Jede Sequenz hat exakt 5 Elemente. Das 6. Glied der Sequenz (gekennzeichnet durch ein Fragezeichen im Spiel) ist das gesuchte Symbol.
Du musst uns Folgendes zurückgeben:
1. sequence: Ein Array von exakt 5 Emojis, die das Muster aufbauen.
2. options: Ein Array aus genau 4 Emojis (eines davon ist die korrekte Antwort, die anderen sind Ablenker/Distraktoren).
3. correct: Das korrekte Emoji (muss in 'options' enthalten sein), welches die Sequenz logisch fortsetzt.`;

            schema = {
              type: Type.OBJECT,
              properties: {
                tasks: {
                  type: Type.ARRAY,
                  description: "Liste der generierten Emoji-Muster.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sequence: {
                        type: Type.ARRAY,
                        description: "Die ersten 5 Glieder des Musters als Emojis.",
                        items: { type: Type.STRING }
                      },
                      options: {
                        type: Type.ARRAY,
                        description: "Genau 4 Auswahlmöglichkeiten für das 6. Glied.",
                        items: { type: Type.STRING }
                      },
                      correct: {
                        type: Type.STRING,
                        description: "Das korrekte Emoji, welches das Muster vervollständigt."
                      }
                    },
                    required: ["sequence", "options", "correct"]
                  }
                }
              },
              required: ["tasks"]
            };
          }

          const taskResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: `Du bist ein hochpräziser Aufgabengenerator für österreichische Volksschullehrkräfte. Du generierst qualitativ hochwertige, niveaugerechte Aufgaben. Antworte ausschließlich im geforderten JSON-Format.`,
              responseMimeType: "application/json",
              responseSchema: schema
            }
          }), model);
          responseText = taskResult.text || "";
          break;
        }

        case "gradeProjection": {
          const { studentName, subject, semester, history, weights, classAvg } = params;

          const prompt = `Berechne eine KI-gestützte 'Trend-Projektion' für die schulischen Leistungen von ${studentName} im Fach "${subject}" (${semester}. Semester).
Hier ist die bisherige chronologische Leistungsaufstellung (Einzelnoten und die bisherigen gewichteten Mittelwerte):
${JSON.stringify(history, null, 2)}

Die Notengewichtung in diesem Fach ist:
${JSON.stringify(weights, null, 2)}

Klassenschnitt (aktuell): ${classAvg || 'nicht verfügbar'}

AUFGABE:
Prognostiziere genau 2 zukünftige Meilensteine (Checkpoints), die bis zum Semesterende zu erwarten sind (z.B. eine weitere Schularbeit, eine Lernzielkontrolle oder ein fiktiver Meilenstein zur Mitarbeit/Semesterende), inklusive der jeweils prognostizierten Note (1.0 bis 5.0) und dem daraus resultierenden neuen akkumulierten Notenschnitt (Mittelwert).
Berechne zudem:
1. Den endgültigen geschätzten Notenschnitt am Semesterende (predictedFinalSchnitt) auf Basis dieser Projektion. Muss mathematisch plausibel sein! (Austrian grading system: 1.0 is best, 5.0 is worst).
2. Die prognostizierte ganzzahlige Endnote (predictedFinalGrade) von 1 bis 5.
3. Deine Konfidenz (Werte von 0 bis 100) basierend auf der Datenmenge und Schwankung (höhere Datenmenge + stabilere Noten = höhere Konfidenz).
4. Eine pädagogische Trend-Beschreibung (trendDescription) auf Deutsch (1-2 Sätze).
5. Eine konkrete, wertschätzende Handlungsempfehlung (recommendation) auf Deutsch (1-2 Sätze).

Antworte exakt im vorgegebenen JSON-Format.`;

          const projectionResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: `Du bist ein hochpräziser virtueller Schulberater und Beurteilungs-Analyst für österreichische Volksschulen. Du analysierst Notenverläufe statistisch korrekt und gibst wertschätzende pädagogische Prognosen ab. Antworte ausschließlich im geforderten JSON-Format.`,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  predictedFinalSchnitt: { type: Type.NUMBER, description: "Der voraussichtliche Notenschnitt am Semesterende (z.B. 2.15). Muss zwischen 1.0 und 5.0 liegen." },
                  predictedFinalGrade: { type: Type.INTEGER, description: "Die prognostizierte Endnote als Ganzzahl von 1 (Sehr gut) bis 5 (Nicht genügend)." },
                  confidence: { type: Type.INTEGER, description: "Die statistische Konfidenz der Vorhersage in Prozent (z.B. 85)." },
                  trendDescription: { type: Type.STRING, description: "Eine pädagogische Beschreibung der Leistungsentwicklung und des Trends auf Deutsch (1-2 kurze Sätze)." },
                  recommendation: { type: Type.STRING, description: "Eine konkrete, wohlwollende pädagogische Empfehlung für die Lehrkraft oder das Kind, um den Schnitt zu halten oder zu verbessern (1-2 Sätze)." },
                  projectedCheckpoints: {
                    type: Type.ARRAY,
                    description: "Genau 2 simulierte Meilensteine bis zum Semesterende, um die Projektion grafisch fortzuführen.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING, description: "z.B. 'Mitarbeit-Check' oder 'Schularbeit 2 (Proj.)'" },
                        typeLabel: { type: Type.STRING, description: "z.B. 'Prognose' oder 'Schularbeit (Proj.)'" },
                        numericGrade: { type: Type.NUMBER, description: "Die prognostizierte Note für diesen Meilenstein (z.B. 2)." },
                        Mittelwert: { type: Type.NUMBER, description: "Der neu berechnete akkumulierte Notenschnitt nach diesem Schritt (z.B. 2.25)." }
                      },
                      required: ["label", "typeLabel", "numericGrade", "Mittelwert"]
                    }
                  }
                },
                required: ["predictedFinalSchnitt", "predictedFinalGrade", "confidence", "trendDescription", "recommendation", "projectedCheckpoints"]
              }
            }
          }), model);

          responseText = projectionResult.text || "";
          break;
        }

        default:
          return res.status(400).json({ error: "Unknown AI action" });
      }

      res.json({ text: responseText, usage: aiUsagePublicView(aiUsage) });
    } catch (error: any) {
      console.error(`[Server AI Error] ${error?.name || 'Error'}: ${error?.message?.slice(0, 150) || 'Unbekannt'}`);
      const isRateLimit = error.message?.includes("429") || error.status === 429;
      const isOverloaded = error.message?.includes("503") || error.status === 503 || error.message?.includes("busy") || error.message?.includes("high demand") || error.message?.includes("UNAVAILABLE") || error.message?.includes("abort") || error.name === "AbortError";
      const isExpiredKey = error.message?.includes("API key") || error.message?.includes("API_KEY") || error.status === 401 || error.status === 403;
      const isInvalidModel = error.message?.includes("model not found") || error.message?.includes("models/") ;
      const isSpendingCap = error.message?.toLowerCase().includes("spending cap") || error.message?.toLowerCase().includes("limit erreicht");
      
      let errorMessage = error.message || "An error occurred during AI processing.";
      let statusCode = 500;

      if (isSpendingCap) {
        // Keep the specific message thrown in callWithRetry
        statusCode = 429;
      } else if (isRateLimit) {
        errorMessage = "Die KI-Anfrage-Rate wurde überschritten. Bitte versuche es in einem Moment erneut.";
        statusCode = 429;
      } else if (isOverloaded) {
        errorMessage = "Die KI ist aktuell stark ausgelastet. Meistens ist das in wenigen Momenten wieder vorbei. Bitte versuche es noch einmal.";
        statusCode = 503;
      } else if (isExpiredKey) {
        errorMessage = "Der KI-API-Schlüssel scheint abgelaufen oder ungültig zu sein. Bitte erneuere ihn in den Einstellungen (Secrets/Secrets).";
        statusCode = 401;
      } else if (isInvalidModel) {
        errorMessage = "Das gewählte KI-Modell ist momentan nicht erreichbar. Bitte versuche es später erneut.";
      }

      res.status(statusCode).json({ error: errorMessage });
    }
  });

  // Weather Proxy Route
  app.get("/api/weather", async (req, res) => {
    const { lat, lon, latitude, longitude, current_weather, daily, current, hourly, timezone, forecast_days } = req.query;
    const finalLat = lat || latitude;
    const finalLon = lon || longitude;
    if (typeof finalLat !== 'string' || typeof finalLon !== 'string' || !finalLat || !finalLon) {
      return res.status(400).json({ error: "Für Wetterdaten werden latitude/longitude benötigt." });
    }

    try {
      const baseUrl = "https://api.open-meteo.com/v1/forecast";
      const params = new URLSearchParams();
      
      params.append("latitude", finalLat as string);
      params.append("longitude", finalLon as string);
      
      if (current_weather) params.append("current_weather", current_weather as string);
      if (daily) params.append("daily", daily as string);
      if (current) params.append("current", current as string);
      if (hourly) params.append("hourly", hourly as string);
      if (timezone) params.append("timezone", (timezone as string).replace('%2F', '/'));
      if (forecast_days) params.append("forecast_days", forecast_days as string);

      const url = `${baseUrl}?${params.toString()}`;
      console.log(`[Weather Proxy] Fetching: ${url}`);
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.warn("[Weather Proxy] Wetterdienst nicht erreichbar:", error?.message || error);
      res.status(502).json({ error: "Wetterdaten sind derzeit nicht verfügbar." });
    }
  });

  // Geocoding Proxy Route
  app.get("/api/geocoding", async (req, res) => {
    const { name } = req.query;
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "Für die Ortssuche wird ein Name benötigt." });
    }
    try {
      const baseUrl = "https://geocoding-api.open-meteo.com/v1/search";
      const params = new URLSearchParams();
      
      if (name) params.append("name", name as string);
      params.append("count", "1");
      params.append("language", "de");

      const url = `${baseUrl}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.warn("[Geocoding Proxy] Dienst nicht erreichbar:", error?.message || error);
      res.status(502).json({ error: "Ortssuche ist derzeit nicht verfügbar." });
    }
  });

  // Photon Geocoding Proxy Route
  app.get("/api/photon", async (req, res) => {
    const { q, limit } = req.query;
    try {
      const baseUrl = "https://photon.komoot.io/api/";
      const params = new URLSearchParams();
      
      if (q) params.append("q", q as string);
      if (limit) params.append("limit", limit as string);

      const url = `${baseUrl}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Photon HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.json({ features: [] });
    }
  });

  // API Route for Sokrates PDF Analysis - Disabled in favor of 100% Client-Side Parsing (Zero-Knowledge)
  app.post("/api/ai/parse-sokrates-pdf", async (req, res) => {
    console.warn("[DATENSCHUTZ] Upload abgelehnt: Amtliche Sokrates-Listen mit SVNR und Adressen dürfen nicht an externe Server gesendet werden. Die Verarbeitung erfolgt rein lokal im Browser.");
    return res.status(403).json({ 
      error: "Aus Datenschutzgründen (Zero-Knowledge-Prinzip) werden amtliche Sokrates-Dateien ausschließlich lokal im Browser verarbeitet. Ein serverseitiger Upload ist deaktiviert." 
    });
  });

  // API Route for IKM PDF Analysis with Gemini
  app.post("/api/ai/analyze-ikm", async (req, res) => {
    // E3.13 Rate-Limiting für IKM-Analyse
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    if (!checkAIRateLimit(ip, AI_PER_MINUTE_LIMIT)) {
      return res.status(429).json({ error: "Zu viele IKM-Analyse-Anfragen. Bitte warte einen Moment." });
    }

    const { pdfBase64, students } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "Keine PDF-Daten übermittelt." });
    }

    const aiUsage = await consumeAIQuota(req, res);
    if (!aiUsage) return;

    try {
      // B1.5 Server-Schutznetz: Eingehende Schülerliste auf sensible Klartextdaten prüfen
      const ikmViolations: string[] = [];
      const sanitizedStudents = sanitizeAIPayloadRecursively(students, ikmViolations);
      if (ikmViolations.length > 0) {
        console.warn("[DATENSCHUTZ-WARNUNG] Sensibles Muster in KI-Request entfernt.");
      }

      const ai = getAIClient();
      console.log(`[IKM-Analyse] Starte Analyse mit gemini-3.5-flash für ${sanitizedStudents?.length || 0} Schüler...`);

      // Clean base64 data URL prefix if present
      let cleanBase64 = pdfBase64;
      if (pdfBase64.startsWith("data:")) {
        const commaIdx = pdfBase64.indexOf(",");
        if (commaIdx !== -1) {
          cleanBase64 = pdfBase64.substring(commaIdx + 1);
        }
      }

      const prompt = `Analysiere die vorliegende Klassenanalyse/Ergebnis-PDF einer österreichischen IKM Plus Erhebung (z.B. für Mathematik oder Deutsch).

UNTERSCHEIDE STRENG ZWISCHEN DEUTSCH UND MATHEMATIK (MATHE):
1. Bestimme zuerst anhand der PDF-Titel, Tabellenüberschriften oder Fußnoten, ob es sich um ein "Mathematik" IKM-PDF oder ein "Deutsch" (Lesen, Zuhören oder Sprachbewusstsein) IKM-PDF handelt.
2. Jedes IKM-PDF bezieht sich in der Regel AUSSCHLIESSLICH auf EIN Fachgebiet.
3. BEFÜLLE NUR DIE RELEVANTEN FACH-FELDER UND LASS ALLE ANDEREN WEG (WICHTIG):
   - Wenn das PDF ein Mathe-Ergebnis ist: Befülle NUR "mathematikPR". Die Felder "deutschLesenPR", "deutschZuhoerenPR" und "deutschSprachbewusstseinPR" dürfen absolut NICHT im Objekt enthalten sein (übergehe/entferne sie).
   - Wenn das PDF ein Deutsch-Ergebnis ist: Befülle NUR das entsprechende Feld (z.B. "deutschLesenPR" für Lesen, oder "deutschZuhoerenPR" für Zuhören, "deutschSprachbewusstseinPR" für Sprachbewusstsein). Das Feld "mathematikPR" darf absolut NICHT im Objekt enthalten sein.
   - Trage niemals erfundene oder geschätzte Werte für unbeteiligte Fächer ein! Setze sie auch nicht standardmäßig auf 0.

SCHÜLER-ZUORDNUNG & NUMMERN:
In diesem Dokument sind die Ergebnisse der Schülerinnen und Schüler aufgeführt. Sie sind in der übergeordneten Klasse (z.B. 4c) über eine Zuteilungsnummer kodiert (z. B. "4c_17", das bedeutet Klasse 4c, Schüler Nummer 17). 
Die Rangordnung im PDF entspricht im Regelfall dem alphabetisch nach Nachnamen sortierten Schülerverzeichnis, kann aber auch durch eine zugewiesene Schülernummer überschrieben sein.

Hier ist die offizielle Klassenliste der tatsächlichen Schüler, sortiert nach Nachname und Vorname mit ihren 1-basierten IKM-Matching-Nummern (Index/Zuteilungsnummer):
${(sanitizedStudents || []).map((s: any) => `${s.index}. ${s.name} (ID: ${s.id})`).join('\n')}

Deine Aufgabe ist es:
1. Bestimme den Typ des Moduls in dem PDF (z.B. "Basismodul Mathematik", "Fokusmodul Deutsch Lesen", etc.).
2. Finde die Ergebnisse der einzelnen Schüler anhand ihrer Zuteilungsnummer (z.B. 17 bei "4c_17"). Diese können entweder:
   a) In einer tabellarischen Klassenliste (z.B. unter "Klasse_SuS-ID" oder "Zuteilungsnummer" wie "4c_1", "4c_2") mit Spalten wie "Kompetenzpunkte" (typischerweise Werte von 80 bis 220) oder ähnlichen Metriken stehen.
   b) Auf Einzelseiten im Dokument, wobei unten/oben in der Fußnote/Kopfzeile der Schüler (z.B. "4c_17") steht und im Text Ergebnisse stehen (z.B. "Kompetenzpunkte: 145").
3. Generiere einen hochprofessionellen, individuellen und wertschätzenden pädagogischen Kommentar auf Deutsch für jedes Kind (z.B. "Ausgezeichnete Kompetenzen im sinnerfassenden Lesen. Stark im Textverständnis.").
4. Falls es sich um eine Mathematik IKM handelt, extrahiere unbedingt auch die Aufgabenpunkte / Kompetenzwerte der Teilbereiche für jeden einzelnen Schüler (unter 'Inhaltliche math. Kompetenzen': Zahlen, Operationen, Größen, Ebene und Raum und unter 'Allgemeine math. Kompetenzen': Modellieren, Operieren, Kommunizieren, Problemlösen, wie z.B. in Tabelle 1.5.1 aufgelistet) und befülle das Schema 'matheDetails'.
5. Analysiere präzise für jedes Kind: 'diagnoseStaerken' (konkret worin das Kind glänzt / wo es gut ist) und 'diagnoseHerausforderungen' (konkret woran es noch arbeiten muss / wo es noch fehlt), basierend auf den Punktewerten der detaillierten Dimensionen im Vergleich zu den Mittelwerten (z.B. Mittelwert Österreich).
6. Stelle sicher, dass "studentNumber" die Zuteilungsnummer des Schülers darstellt, um die Werte perfekt zuzuordnen.

Gib die Ergebnisse ausschließlich als JSON zurück.`;

      const result = await callWithRetry((activeModel) => ai.models.generateContent({
        model: activeModel,
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: "application/pdf"
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          systemInstruction: "Du bist ein hochpräziser Diagnoseassistent für österreichische Lehrkräfte. Deine Aufgabe ist es, IKM Plus Klassenanalysen (PDFs) absolut fehlerfrei auszuwerten. Du identifizierst das jeweilige Fach (Mathematik oder ein Deutsch-Modul wie Lesen) und befüllst NUR die dazu passenden Eigenschaften im JSON, während du die unbeteiligten Fach-Eigenschaften komplett weglässt (nicht im JSON-Objekt deklarieren). Ordne Schüler exakt anhand der Zuteilungsnummer (z. B. 4c_17 -> Schüler Nummer 17) der Klassenliste zu. Gib nur das geforderte, wohlgeformte JSON zurück.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              records: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    studentNumber: { 
                      type: Type.INTEGER, 
                      description: "Die 1-basierte Nummer des Schülers in der Klassenliste (z.B. 17 aus 4c_17)." 
                    },
                    studentNameConfirmed: { 
                      type: Type.STRING, 
                      description: "Der Name des Kindes (z.B. '4c_17' oder ein bestätigter Klarname, falls im PDF vorhanden)." 
                    },
                    deutschLesenPR: { 
                      type: Type.INTEGER, 
                      description: "Kompetenzpunkte für Deutsch Lesen (Zahlenwert zwischen 80 und 230). Leer lassen/auslassen, falls nicht im PDF erhoben!" 
                    },
                    deutschZuhoerenPR: { 
                      type: Type.INTEGER, 
                      description: "Kompetenzpunkte bzw. Wert für Deutsch Zuhören. Leer lassen/auslassen, falls nicht im PDF erhoben!" 
                    },
                    deutschSprachbewusstseinPR: { 
                      type: Type.INTEGER, 
                      description: "Kompetenzpunkte bzw. Wert für Deutsch Sprachbewusstsein. Leer lassen/auslassen, falls nicht im PDF erhoben!" 
                    },
                    mathematikPR: { 
                      type: Type.INTEGER, 
                      description: "Kompetenzpunkte für Mathematik (Zahlenwert zwischen 80 und 230). Leer lassen/auslassen, falls nicht im PDF erhoben!" 
                    },
                    kommentar: { 
                      type: Type.STRING, 
                      description: "Ein wertschätzender, präziser Kommentar, der die Stärken und Entwicklungsfelder des Schülers auf Deutsch beschreibt." 
                    },
                    diagnoseStaerken: {
                      type: Type.STRING,
                      description: "Pädagogischer Text, wo das Kind gut ist/seine Stärken liegen (auf Deutsch)."
                    },
                    diagnoseHerausforderungen: {
                      type: Type.STRING,
                      description: "Pädagogischer Text, woran das Kind noch arbeiten muss / wo es noch fehlt (auf Deutsch)."
                    },
                    matheDetails: {
                      type: Type.OBJECT,
                      description: "Detaillierte Aufgabenpunkte für Mathematik, sofern vorhanden.",
                      properties: {
                        zahlen: { type: Type.INTEGER, description: "Arbeiten mit Zahlen Aufgabenpunkte (z.B. 2)" },
                        operationen: { type: Type.INTEGER, description: "Arbeiten mit Operationen/Grundrechnungsarten Aufgabenpunkte (z.B. 3)" },
                        groessen: { type: Type.INTEGER, description: "Arbeiten mit Größen/Maßeinheiten Aufgabenpunkte (z.B. 3)" },
                        ebeneRaum: { type: Type.INTEGER, description: "Arbeiten mit Ebene und Raum/Geometrie Aufgabenpunkte (z.B. 2)" },
                        modellieren: { type: Type.INTEGER, description: "Modellieren Aufgabenpunkte (z.B. 2)" },
                        operieren: { type: Type.INTEGER, description: "Operieren Aufgabenpunkte (z.B. 2)" },
                        kommunizieren: { type: Type.INTEGER, description: "Kommunizieren Aufgabenpunkte (z.B. 3)" },
                        problemloesen: { type: Type.INTEGER, description: "Problemlösen Aufgabenpunkte (z.B. 3)" }
                      }
                    }
                  },
                  required: ["studentNumber"]
                }
              }
            },
            required: ["records"]
          }
        }
      }), "gemini-3.5-flash");

      let responseText = result.text || "";
      console.log(`[IKM-Analyse] Erfolgreich analysiert. Antwort-Länge: ${responseText.length}`);
      
      // Clean potential Markdown JSON blocks (e.g. ```json ... ```)
      responseText = responseText.trim();
      if (responseText.startsWith("```")) {
        // Strip out starting and trailing backticks with potential language specifier
        responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }
      responseText = responseText.trim();

      try {
        const parsed = JSON.parse(responseText);
        res.json(parsed);
      } catch (jsonErr: any) {
        console.error("[IKM-Analyse] Fehler beim Parsen des IKM-JSONs:", jsonErr?.message || jsonErr);
        // Fallback: Try to match content enclosed in curly braces
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const secondaryParsed = JSON.parse(jsonMatch[0]);
            return res.json(secondaryParsed);
          } catch (secErr: any) {
            console.error("[IKM-Analyse] Auch Match-Versuch fehlgeschlagen:", secErr?.message || secErr);
          }
        }
        throw new Error("Das von der KI generierte Ergebnis entsprach keinem gültigen JSON-Format. Bitte lade das offizielle IKM PDF erneut hoch.");
      }
    } catch (error: any) {
      console.error("[IKM-Analyse Fehler]", error?.message || error?.name || "Unbekannt");
      res.status(500).json({ error: error.message || "Fehler bei der IKM PDF-Analyse durch Gemini." });
    }
  });

  // API Route for Antolin Report Analysis with Gemini
  app.post("/api/ai/analyze-antolin", async (req, res) => {
    // E3.13 Rate-Limiting für Antolin-Analyse
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    if (!checkAIRateLimit(ip, AI_PER_MINUTE_LIMIT)) {
      return res.status(429).json({ error: "Zu viele Antolin-Analyse-Anfragen. Bitte warte einen Moment." });
    }

    const { pdfBase64, rawText, students } = req.body;

    if (!pdfBase64 && !rawText) {
      return res.status(400).json({ error: "Keine PDF-Daten oder Rohdaten übermittelt." });
    }

    const aiUsage = await consumeAIQuota(req, res);
    if (!aiUsage) return;

    try {
      // B1.5 Server-Schutznetz: Eingehende Antolin-Daten auf verbotene Klartextdaten prüfen & maskieren
      const antolinViolations: string[] = [];
      const sanitizedStudents = sanitizeAIPayloadRecursively(students, antolinViolations);
      const sanitizedRawText = sanitizeAIPayloadRecursively(rawText, antolinViolations);
      if (antolinViolations.length > 0) {
        console.warn("[DATENSCHUTZ-WARNUNG] Sensibles Muster in KI-Request entfernt.");
      }

      const ai = getAIClient();
      console.log(`[Antolin-Analyse] Starte verbesserte Antolin-Analyse mit gemini-3.5-flash für ${sanitizedStudents?.length || 0} Schüler...`);

      let promptText = `Analysiere diesen Antolin-Klassenbericht mit höchster Präzision.
      
Hier ist die offizielle Klassenliste der tatsächlichen Schüler (ID und vollständiger Name):
${(sanitizedStudents || []).map((s: any) => `- Name: ${s.vorname} ${s.nachname || ""}`.trim() + ` (ID: ${s.id})`).join('\n')}

Deine Aufgabe ist es, für jeden Schüler aus der obigen Liste die Antolin-Werte (Anzahl gelesener Bücher, Antolin-Punkte, Erfolg/Leistung in % und durchschnittliche Schwierigkeit) herauszulesen.

SPALTEN-IDENTIFIKATION UND PARSING-REGELN:
1. **Name des Schülers / der Schülerin**:
   - Ordne die Zeilen aus dem Antolin-Bericht den Schülern in der obigen Klassenliste bestmöglich zu (Vorname und Nachname vergleichen).
   - Achte auf Umlaute, Tippfehler (z.B. Livia Allgauer, Seyma Ciftcioglu, Anselm Högström-Feinig), Namensdreher (Nachname vor Vorname oder umgekehrt) oder Schreibweisen und verknüpfe sie korrekt mit der jeweiligen ID.
   - Wenn ein Schüler im Dokument aufgeführt ist, der absolut nicht in deiner übermittelten Klassenliste steht, ignoriere ihn.

2. **Gelesene Bücher / Anzahl Bücher** (Feld "anzahlBuecher", Typ: Integer):
   - Dies ist die Anzahl der Bücher oder Texte, für die das Kind ein Quiz ausgefüllt hat.
   - Suche nach Spalten-Überschriften wie: "Bücher", "gelesene Bücher", "Texte", "Anzahl", "Titel", "Arbeitsgemeinschaften", Abkürzung "b" oder "B".
   - Falls ein Schüler gar nichts gelesen hat oder nicht im Bericht steht, setze den Wert auf 0 (niemals null oder undefined).

3. **Punkte / Gesamtpunkte** (Feld "punkte", Typ: Integer):
   - Erzielte Punkte insgesamt. Dies sind meistens deutlich größere positive (oder selten negative) Zahlen als die Buchanzahl (z. B. 120, 450, 1205).
   - Suche nach Spalten-Überschriften wie: "Punkte", "Pkt.", "Pkt", "Punkte gesamt", "Gesamtpunkte", "Gesamtjahrespunkte", "p", "P".
   - Falls kein Wert vorhanden ist, trage standardmäßig 0 ein.

4. **Erfolg % / Leistung % / Erfolgsquote** (Feld "leistung", Typ: Number):
   - Der Anteil richtig beantworteter Fragen. Dies ist fast immer ein Prozentwert (z.B. "85 %", "92,5%", "100%", "73 %") oder eine nackte Zahl in einer Spalte namens "Erfolg", "Erfolg %", "Erfolgsquote", "richtig %", "Richtig beantwortet %", "Leistung", "Quote", "L", "Erfolg in %".
   - **Sehr Wichtig**: Konvertiere den Wert unbedingt in eine Gleitkommazahl (float). Kommas müssen in Punkte umgewandelt werden (z. B. "83,3 %" -> 83.3, "92%" -> 92.0).
   - Falls kein Wert vorhanden ist, trage standardmäßig 0.0 ein.

5. **Schwierigkeit / Ø-Schwierigkeit** (Feld "schwierigkeit", Typ: Number):
   - Durchschnittliche Schwierigkeit der gelesenen Bücher. Meist eine Gleitkommazahl wie "2,4", "3.1", "1,8" oder einfach "2".
   - Suche nach Spalten-Überschriften wie: "Schwierigkeit", "Ø Schwierigkeit", "Ø-Stufe", "Ø Stufe", "Ø Schwierigkeitsgrad", "Ø Schwierigkeitsstufe", "ST", "S" oder "Stufe".
   - **Sehr Wichtig**: Konvertiere deutsche Kommas in englische Dezimalpunkte (z.B. "2,4" -> 2.4).
   - Falls kein Wert vorhanden ist, trage standardmäßig 0.0 ein.

MAPPING-RICHTLINIEN & FEHLERVERMEIDUNG:
- Verknüpfe die extrahierten Spalten absolut fehlerfrei für jeden Benutzer. Achte darauf, dass Werte nicht vertauscht werden! Ein Schüler mit z.B. 15 Büchern und 320 Punkten darf nicht umgekehrt zugeordnet werden.
- Ignoriere Klassendurchschnitte am Ende des Berichts.
- Jeder gefundene Schüler MUSS alle 6 Attribute im JSON eingetragen haben. Fülle nicht gefundene Werte mit 0 oder 0.0 auf.

Gib das Ergebnis ausschließlich als JSON zurück mit einem Array 'records', wobei jedes Element die Struktur { studentId, studentNameConfirmed, anzahlBuecher, punkte, leistung, schwierigkeit } hat.`;

      const contents: any[] = [];
      if (pdfBase64) {
        let cleanBase64 = pdfBase64;
        if (pdfBase64.startsWith("data:")) {
          const commaIdx = pdfBase64.indexOf(",");
          if (commaIdx !== -1) {
            cleanBase64 = pdfBase64.substring(commaIdx + 1);
          }
        }
        contents.push({
          inlineData: {
            data: cleanBase64,
            mimeType: "application/pdf"
          }
        });
      }

      if (rawText) {
        promptText += `\n\nHIER IST DER ANTOLIN-TEXT AUS COPY-PASTE:\n${rawText}`;
      }
      contents.push({ text: promptText });

      const result = await callWithRetry((activeModel) => ai.models.generateContent({
        model: activeModel,
        contents: contents,
        config: {
          systemInstruction: "Du bist ein hochpräziser Antolin-Diagnoseassistent für österreichische Lehrkräfte. Deine Aufgabe ist es, Antolin-Klassenberichte (Klassenbericht-PDFs oder Tabellentexte) fehlerfrei auszuwerten. Ordne die Schüler exakt den IDs aus der übermittelten Klassenliste zu. Extrahiere Bücher, Punkte, Erfolg in % und Schwierigkeitsstufe fehlerfrei. Antworte ausschließlich im von dir erzeugten JSON-Schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              records: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    studentId: {
                      type: Type.STRING,
                      description: "Die ID des Schülers aus der Klassenliste (z.B. ID: UUID)."
                    },
                    studentNameConfirmed: {
                      type: Type.STRING,
                      description: "Der Name des Kindes wie er im Dokument steht (z.B. Eymen Alici)."
                    },
                    anzahlBuecher: {
                      type: Type.INTEGER,
                      description: "Die Anzahl der gelesenen Bücher."
                    },
                    punkte: {
                      type: Type.INTEGER,
                      description: "Erzielte Punkte."
                    },
                    leistung: {
                      type: Type.NUMBER,
                      description: "Leistung / Erfolg in Prozent (z.B. 75.5)."
                    },
                    schwierigkeit: {
                      type: Type.NUMBER,
                      description: "Durchschnittliche Buchschwierigkeit (z.B. 2.4)."
                    }
                  },
                  required: ["studentId", "studentNameConfirmed", "anzahlBuecher", "punkte", "leistung", "schwierigkeit"]
                }
              }
            },
            required: ["records"]
          }
        }
      }), "gemini-3.5-flash");

      let responseText = result.text || "";
      console.log(`[Antolin-Analyse] Erfolgreich analysiert. Antwort-Länge: ${responseText.length}`);
      
      responseText = responseText.trim();
      if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }
      responseText = responseText.trim();

      try {
        const parsed = JSON.parse(responseText);
        res.json(parsed);
      } catch (jsonErr: any) {
        console.error("[Antolin-Analyse] Fehler beim Parsen des JSONs:", jsonErr, "Original-Text:", responseText);
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const secondaryParsed = JSON.parse(jsonMatch[0]);
            return res.json(secondaryParsed);
          } catch (secErr) {
            console.error("[Antolin-Analyse] Auch Match-Versuch fehlgeschlagen:", secErr);
          }
        }
        throw new Error("Das von der KI generierte Antolin-Ergebnis entsprach keinem gültigen JSON-Format. Bitte lade die Datei oder den Text erneut hoch.");
      }
    } catch (error: any) {
      console.error("[Antolin-Analyse Fehler]", error?.message || error?.name || "Unbekannt");
      res.status(500).json({ error: error.message || "Fehler bei der Antolin-Berichtsanalyse durch Gemini." });
    }
  });

  // Memory store for Zero-Knowledge sync sessions (Modul B4)
  // Speichert ausschließlich opake, verschlüsselte Payloads, Session-Code und Zeitstempel.
  // Enthält KEINERLEI Klartext-Schülerdaten und KEINE Entschlüsselungsschlüssel.
  interface ServerSyncSession {
    encryptedPayload: any;
    lastUpdated: number;
    lastActivityAt: number;
    protocolVersion: 1;
  }
  const syncSessions: Record<string, ServerSyncSession> = {};
  const MAX_SYNC_PAYLOAD_BYTES = 15 * 1024 * 1024; // 15 MB DoS-Schutz

  // E3.15 Sync-Rate-Limiter: Max 20 Sessions pro 10 Minuten pro IP
  const syncRateLimits = new Map<string, { count: number; resetAt: number }>();
  function checkSyncCreateRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = syncRateLimits.get(ip);
    if (!entry || now > entry.resetAt) {
      syncRateLimits.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
      return true;
    }
    if (entry.count >= 20) {
      return false;
    }
    entry.count++;
    return true;
  }

  function isValidEncryptedPayload(p: any): boolean {
    if (!p || typeof p !== 'object') return false;
    if (p.protocolVersion !== 1) return false;
    if (!p.encryptedState || typeof p.encryptedState !== 'object') return false;
    const es = p.encryptedState;
    if (es.version !== 1 || es.algorithm !== 'AES-GCM-256') return false;
    if (typeof es.iv !== 'string' || typeof es.ciphertext !== 'string') return false;
    return true;
  }

  // API Route for Geocoding (Weather)
  app.get("/api/weather/geocode", async (req, res) => {
    try {
      const city = req.query.city as string;
      if (!city) return res.status(400).json({ error: "Missing city" });
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de`;
      const response = await fetch(geoUrl, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error("Geocoding failed");
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      console.warn("[Weather Geocode] Dienst nicht erreichbar:", e?.message || e);
      res.status(502).json({ error: "Wetter-Ortssuche ist derzeit nicht verfügbar." });
    }
  });

  // API Route for Forecast (Weather)
  app.get("/api/weather/forecast", async (req, res) => {
    const lat = req.query.lat as string;
    const lon = req.query.lon as string;
    if (!lat || !lon) {
      return res.status(400).json({ error: "Für die Wetterprognose werden lat/lon benötigt." });
    }
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,precipitation,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation,weather_code&timezone=Europe/Vienna&forecast_days=1`;
      const response = await fetch(weatherUrl, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error("Forecast failed");
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      console.warn("[Weather Forecast] Dienst nicht erreichbar:", e?.message || e);
      res.status(502).json({ error: "Wetterprognose ist derzeit nicht verfügbar." });
    }
  });

  // Create a Zero-Knowledge sync session (Modul B4)
  app.post("/api/sync/create", (req, res) => {
    // E3.15 Rate-Limiting für Sync-Session-Erstellung
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    if (!checkSyncCreateRateLimit(ip)) {
      return res.status(429).json({ error: "Zu viele Sync-Sitzungen erstellt. Bitte warte einige Minuten." });
    }

    // Abweisung von unverschlüsselten Legacy-Payloads
    if (req.body && (req.body.state !== undefined || !req.body.encryptedPayload)) {
      return res.status(400).json({
        error: "unsupported legacy sync session. Klartext-Synchronisation wird nicht mehr unterstützt."
      });
    }

    const { encryptedPayload } = req.body;
    if (!isValidEncryptedPayload(encryptedPayload)) {
      return res.status(400).json({
        error: "Ungültiges oder unverschlüsseltes Payload-Format. Erwartet wird protocolVersion 1 (AES-GCM-256)."
      });
    }

    // DoS-Schutz: Payload-Größe prüfen
    const payloadStr = JSON.stringify(encryptedPayload);
    if (payloadStr.length > MAX_SYNC_PAYLOAD_BYTES) {
      return res.status(413).json({ error: "Sync-Payload überschreitet das Limit von 15 MB." });
    }

    // E3.16 Kryptographisch sicherer 6-Zeichen-Code (CSPRNG, hohe Entropie)
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Keine leicht verwechselbaren Zeichen
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(crypto.randomInt(0, characters.length));
    }

    const timing = getServerSyncTimestamps(encryptedPayload.updatedAt);
    syncSessions[code] = {
      encryptedPayload,
      lastUpdated: timing.lastUpdated,
      lastActivityAt: timing.lastActivityAt,
      protocolVersion: 1
    };

    // E3.18 Logging ohne Offenlegung des Sitzungscodes
    console.log("[Sync Server] Sitzung erstellt.");
    res.json({ code });
  });

  // Update encrypted state on a sync session
  app.put("/api/sync/:code", (req, res) => {
    const code = (req.params.code || "").trim().toUpperCase();

    // Abweisung von Klartext
    if (req.body && (req.body.state !== undefined || !req.body.encryptedPayload)) {
      return res.status(400).json({
        error: "unsupported legacy sync session. Klartext-Synchronisation wird nicht mehr unterstützt."
      });
    }

    if (!syncSessions[code]) {
      return res.status(404).json({ error: "Sitzung nicht gefunden oder abgelaufen." });
    }

    const { encryptedPayload } = req.body;
    if (!isValidEncryptedPayload(encryptedPayload)) {
      return res.status(400).json({
        error: "Ungültiges oder unverschlüsseltes Payload-Format."
      });
    }

    const payloadStr = JSON.stringify(encryptedPayload);
    if (payloadStr.length > MAX_SYNC_PAYLOAD_BYTES) {
      return res.status(413).json({ error: "Sync-Payload überschreitet das Limit von 15 MB." });
    }

    const timing = getServerSyncTimestamps(encryptedPayload.updatedAt);
    syncSessions[code].encryptedPayload = encryptedPayload;
    syncSessions[code].lastUpdated = timing.lastUpdated;
    syncSessions[code].lastActivityAt = timing.lastActivityAt;
    syncSessions[code].protocolVersion = 1;

    res.json({ success: true, lastUpdated: timing.lastUpdated });
  });

  // Get encrypted state of a sync session
  app.get("/api/sync/:code", (req, res) => {
    const code = (req.params.code || "").trim().toUpperCase();
    const session = syncSessions[code];

    if (!session) {
      return res.status(404).json({ error: "Sitzung nicht gefunden oder abgelaufen." });
    }

    // Falls alte Klartext-Session existiert: abweisen und entfernen
    if ((session as any).state !== undefined && !session.encryptedPayload) {
      delete syncSessions[code];
      return res.status(400).json({ error: "unsupported legacy sync session" });
    }

    session.lastActivityAt = Date.now();
    res.json({
      encryptedPayload: session.encryptedPayload,
      lastUpdated: session.lastUpdated,
      protocolVersion: session.protocolVersion || 1
    });
  });

  // Delete a sync session (explizites Sitzungsende)
  app.delete("/api/sync/:code", (req, res) => {
    const code = (req.params.code || "").trim().toUpperCase();
    if (syncSessions[code]) {
      delete syncSessions[code];
      // E3.18 Logging ohne Offenlegung des Sitzungscodes
      console.log("[Sync Server] Sitzung beendet.");
    }
    res.json({ success: true });
  });

  // --- OneDrive Synchronization Endpoints ---
  app.get("/api/onedrive/auth-url", (req, res) => {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      return res.json({ configured: false });
    }
    const appUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/onedrive/callback`;
    const oauthState = createOAuthState(SESSION_SECRET);
    res.cookie('lehrerapp_onedrive_state', oauthState, {
      httpOnly: true, sameSite: 'lax', secure: req.secure || process.env.NODE_ENV === 'production',
      path: '/api/onedrive/callback', maxAge: 10 * 60 * 1000,
    });
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: "Files.ReadWrite offline_access",
      state: oauthState
    });
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    res.json({ configured: true, url: authUrl });
  });

  app.get("/api/onedrive/callback", async (req, res) => {
    const { code, error, error_description, state } = req.query;
    if (!verifyOAuthState(state, parseCookies(req).lehrerapp_onedrive_state, SESSION_SECRET)) {
      return res.status(400).type('text/plain').send('OneDrive-Anmeldung abgelaufen oder ungültig. Bitte erneut verbinden.');
    }
    res.clearCookie('lehrerapp_onedrive_state', {
      httpOnly: true, sameSite: 'lax', secure: req.secure || process.env.NODE_ENV === 'production',
      path: '/api/onedrive/callback',
    });
    const callbackOrigin = new URL(process.env.APP_URL || 'http://localhost:3000').origin;
    
    if (error || !code) {
      const errMsg = (error_description as string) || (error as string) || "Unbekannter Fehler bei Microsoft OAuth.";
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OneDrive Fehler</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #fef2f2;
              color: #991b1b;
              text-align: center;
              padding: 20px;
            }
            .error-icon { font-size: 48px; margin-bottom: 16px; }
            h2 { font-weight: 800; margin-bottom: 8px; }
            p { color: #7f1d1d; font-size: 14px; margin-bottom: 24px; max-width: 400px; line-height: 1.5; }
            button {
              background-color: #dc2626; color: white; border: none; padding: 12px 24px;
              border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="error-icon">❌</div>
          <h2>Verbindung fehlgeschlagen</h2>
          <p>${escapeHtml(errMsg)}</p>
          <button onclick="window.close()">Fenster schließen</button>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'ONEDRIVE_AUTH_ERROR', error: ${scriptJson(errMsg)} }, ${scriptJson(callbackOrigin)});
            }
          </script>
        </body>
        </html>
      `);
    }

    try {
      const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/onedrive/callback`;
      const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || "",
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
          code: code as string,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        }).toString()
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error_description || errData.error || `HTTP-Status: ${response.status}`;
        throw new Error(errMsg);
      }

      const tokenData = await response.json();
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OneDrive Verbindung</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f8fafc;
              color: #0f172a;
              text-align: center;
            }
            .spinner {
              border: 4px solid rgba(0, 0, 0, 0.1);
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border-left-color: #0078d4;
              animation: spin 1s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h2 { font-weight: 800; margin-bottom: 8px; }
            p { color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>Verbindung erfolgreich!</h2>
          <p>Dieses Fenster schließt sich in Kürze automatisch...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'ONEDRIVE_AUTH_SUCCESS', 
                tokenData: {
                  access_token: ${scriptJson(tokenData.access_token)},
                  refresh_token: ${scriptJson(tokenData.refresh_token ?? null)},
                  expires_at: ${Date.now() + (tokenData.expires_in || 3600) * 1000}
                } 
              }, ${scriptJson(callbackOrigin)});
              setTimeout(() => window.close(), 1000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      const errMsg = err.message || "Fehler beim Austausch des Authentifizierungscodes.";
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OneDrive Fehler</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #fef2f2;
              color: #991b1b;
              text-align: center;
              padding: 20px;
            }
            .error-icon { font-size: 48px; margin-bottom: 16px; }
            h2 { font-weight: 800; margin-bottom: 8px; }
            p { color: #7f1d1d; font-size: 14px; margin-bottom: 24px; max-width: 400px; line-height: 1.5; }
            button {
              background-color: #dc2626; color: white; border: none; padding: 12px 24px;
              border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="error-icon">❌</div>
          <h2>Token-Austausch fehlgeschlagen</h2>
          <p>${escapeHtml(errMsg)}</p>
          <button onclick="window.close()">Fenster schließen</button>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'ONEDRIVE_AUTH_ERROR', error: ${scriptJson(errMsg)} }, ${scriptJson(callbackOrigin)});
            }
          </script>
        </body>
        </html>
      `);
    }
  });

  app.post("/api/onedrive/refresh", async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: "Refresh Token fehlt" });
    }
    try {
      const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || "",
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
          refresh_token: refresh_token,
          grant_type: "refresh_token"
        }).toString()
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error_description || errData.error || `HTTP-Status: ${response.status}`;
        return res.status(response.status).json({ error: errMsg });
      }

      const tokenData = await response.json();
      res.json({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Token Refresh fehlgeschlagen" });
    }
  });

  function isValidEncryptedBackup(body: unknown): boolean {
    if (typeof body !== 'object' || body === null) return false;
    const b = body as Record<string, unknown>;
    return (
      b.format === 'LehrerAPP_Encrypted_Backup' &&
      b.version === 1 &&
      typeof b.encryptedState === 'object' &&
      b.encryptedState !== null &&
      typeof b.vaultRecord === 'object' &&
      b.vaultRecord !== null
    );
  }

  app.put("/api/onedrive/upload", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization Header fehlt" });
    }

    const body = req.body;
    // Sicherheitsprüfung: Server weist Klartext-AppState für Cloud-Upload strikt ab
    if (typeof body === 'object' && body !== null) {
      const b = body as Record<string, unknown>;
      if (b.schueler || b.classes || b.klassenbezeichnung) {
        return res.status(400).json({ 
          error: "Klartext-Backups sind für Cloud-Uploads unzulässig. Sicherung muss clientseitig verschlüsselt sein." 
        });
      }
    }

    // Intern bleibt das historische verschlüsselte Format aus Kompatibilitätsgründen erhalten.
    if (!isValidEncryptedBackup(body)) {
      return res.status(400).json({
        error: "Ungültiges Backup-Format. Server akzeptiert ausschließlich verschlüsselte Klassio-Sicherungen (V1)."
      });
    }

    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${ONEDRIVE_BACKUP_PRIMARY_NAME}:/content`, {
        method: "PUT",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `OneDrive API Fehler: ${errText}` });
      }
      const data = await response.json();
      res.json({ success: true, file: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  app.get("/api/onedrive/download", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization Header fehlt" });
    }
    try {
      let response: Response | null = null;
      for (const fileName of getOneDriveBackupCandidateNames()) {
        response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`, {
          headers: {
            "Authorization": authHeader
          }
        });
        if (response.status !== 404) break;
      }

      if (!response || response.status === 404) {
        return res.status(404).json({ error: "Keine Sicherungsdatei auf OneDrive gefunden." });
      }
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `OneDrive API Fehler: ${errText}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Download failed" });
    }
  });

  app.get("/api/onedrive/metadata", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization Header fehlt" });
    }
    try {
      let response: Response | null = null;
      let resolvedFileName: string | null = null;
      for (const fileName of getOneDriveBackupCandidateNames()) {
        response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}`, {
          headers: {
            "Authorization": authHeader
          }
        });
        if (response.status !== 404) {
          resolvedFileName = fileName;
          break;
        }
      }

      if (!response || response.status === 404) {
        return res.json({ exists: false });
      }
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `OneDrive API Fehler: ${errText}` });
      }
      const data = await response.json();
      res.json({
        exists: true,
        fileName: resolvedFileName,
        lastModifiedDateTime: data.lastModifiedDateTime,
        size: data.size
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Metadaten-Abruf fehlgeschlagen" });
    }
  });

  // Periodically clean up session memory (sessions older than 2 hours of inactivity)
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    const MAX_INACTIVITY_MS = 2 * 60 * 60 * 1000; // 2 Stunden Inaktivität (Modul B4)
    Object.keys(syncSessions).forEach(code => {
      if (isSyncSessionExpired(syncSessions[code].lastActivityAt, now, MAX_INACTIVITY_MS)) {
        delete syncSessions[code];
        // E3.18 Logging ohne Offenlegung des Sitzungscodes
        console.log("[Sync Server] Inaktive Sitzung bereinigt.");
      }
    });
  }, 10 * 60 * 1000);
  cleanupTimer.unref();

  // E3.21 API 404 Handler: Verhindert, dass nicht existierende API-Routen als index.html ausgeliefert werden
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API-Endpunkt nicht gefunden." });
  });

  // E3.20 Zentraler API-Error-Handler (keine Stacktraces in Produktion)
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[API Error] Pfad: ${req.path}, Status: ${err.status || 500}, Typ: ${err.name || 'Error'}`);
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({ error: "Der Request-Body überschreitet die maximal zulässige Größe." });
    }
    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd ? "Interner Serverfehler." : (err.message || "Interner Serverfehler.");
    res.status(err.status || 500).json({ error: message });
  });

  // Vite middleware for development or static serving for production
  if (!options.isTest) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      // E3.26 Cache-Control für versionierte statische Assets (1 Jahr immutable)
      app.use('/assets', express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true
      }));
      // Standard Static Files mit Cache-Revalidierung für HTML
      app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          }
        }
      }));
      app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  return app;
}

export async function startServer() {
  const app = await createApp();
  const configuredPort = Number.parseInt(process.env.PORT || '3000', 10);
  const PORT = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

const isTest = process.env.IS_TEST_RUNNER === "true" || process.env.NODE_ENV === "test";
if (!isTest) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
