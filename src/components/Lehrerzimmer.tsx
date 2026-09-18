import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AtSign,
  BookOpen,
  ClipboardList,
  HelpCircle,
  Info,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Badge, Button, Input, Select, Textarea } from './ui';
import { markLehrerzimmerPostsRead } from '../lib/lehrerzimmerNotifications';

type Category = 'organisation' | 'unterricht' | 'info';
type Kind = 'beitrag' | 'frage';

type LehrerzimmerUser = {
  userId: string;
  displayName: string;
  handle: string;
  mentionAliases?: string[];
  schoolId: string;
  joinedAt: string;
  lastSeenAt: string;
};

type LehrerzimmerReply = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  mentions: string[];
  createdAt: string;
};

type LehrerzimmerPost = {
  id: string;
  quick?: boolean;
  unread?: boolean;
  category: Category;
  kind: Kind;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  replies: LehrerzimmerReply[];
};

type MeResponse = {
  user: LehrerzimmerUser;
  school: {
    id: string;
    code: string;
    name?: string;
    federalState?: string;
    domain: string;
  };
};

type SchoolStatusResponse = {
  account: {
    displayName: string;
    email: string;
    domain: string;
  };
  school: {
    id: string;
    code: string;
    name: string;
    federalState: string;
    domains: string[];
  } | null;
  verificationRequest: {
    id: string;
    schoolName: string;
    federalState: string;
    status: 'pending' | 'verified' | 'rejected';
  } | null;
};

const AUSTRIAN_FEDERAL_STATES = [
  'Burgenland',
  'Kärnten',
  'Niederösterreich',
  'Oberösterreich',
  'Salzburg',
  'Steiermark',
  'Tirol',
  'Vorarlberg',
  'Wien',
] as const;

const CATEGORY_META: Record<Category, { label: string; icon: React.ReactNode; badge: 'accent' | 'info' | 'warning' }> = {
  organisation: { label: 'Organisation', icon: <ClipboardList size={15} />, badge: 'warning' },
  unterricht: { label: 'Unterricht', icon: <BookOpen size={15} />, badge: 'accent' },
  info: { label: 'Info', icon: <Info size={15} />, badge: 'info' },
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@[^\s@,!?;:]{2,64})/gu);
  return (
    <>
      {parts.map((part, index) =>
        /^@[^\s@,!?;:]{2,64}$/u.test(part) ? (
          <span key={index} className="font-bold text-[var(--accent)]">
            {part}
          </span>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || 'Die Anfrage konnte nicht ausgeführt werden.') as Error & {
      status?: number;
      requiresSchoolEmail?: boolean;
      requiresEmailLogin?: boolean;
    };
    error.status = response.status;
    error.requiresSchoolEmail = data?.requiresSchoolEmail === true;
    error.requiresEmailLogin = data?.requiresEmailLogin === true;
    throw error;
  }
  return data;
}

export default function Lehrerzimmer() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [posts, setPosts] = useState<LehrerzimmerPost[]>([]);
  const [colleagues, setColleagues] = useState<LehrerzimmerUser[]>([]);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [loading, setLoading] = useState(true);
  const [requiresSchoolEmail, setRequiresSchoolEmail] = useState(false);
  const [schoolStatus, setSchoolStatus] = useState<SchoolStatusResponse | null>(null);
  const [schoolStatusLoading, setSchoolStatusLoading] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolFederalState, setSchoolFederalState] = useState<(typeof AUSTRIAN_FEDERAL_STATES)[number]>('Vorarlberg');
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingPostId, setReplyingPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<Category>('organisation');
  const [editKind, setEditKind] = useState<Kind>('beitrag');
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const loadSchoolStatus = useCallback(async () => {
    setSchoolStatusLoading(true);
    try {
      const response = await fetch('/api/schools/me', { cache: 'no-store' });
      const data = await readJson(response) as SchoolStatusResponse;
      setSchoolStatus(data);
      if (data.verificationRequest?.schoolName) setSchoolName(data.verificationRequest.schoolName);
      if (AUSTRIAN_FEDERAL_STATES.includes(data.verificationRequest?.federalState as any)) {
        setSchoolFederalState(data.verificationRequest!.federalState as (typeof AUSTRIAN_FEDERAL_STATES)[number]);
      }
      return data;
    } catch {
      setSchoolStatus(null);
      return null;
    } finally {
      setSchoolStatusLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = filter === 'all' ? '' : '?category=' + encodeURIComponent(filter);
      const [meData, postsData, colleaguesData] = await Promise.all([
        fetch('/api/lehrerzimmer/me', { cache: 'no-store' }).then(readJson),
        fetch('/api/lehrerzimmer/posts' + query, { cache: 'no-store' }).then(readJson),
        fetch('/api/lehrerzimmer/colleagues', { cache: 'no-store' }).then(readJson),
      ]);
      const loadedPosts = (postsData.posts || []) as LehrerzimmerPost[];
      setMe(meData);
      setPosts(loadedPosts);
      setColleagues(colleaguesData.users || []);
      setRequiresSchoolEmail(false);

      const unreadIds = loadedPosts.filter(post => post.unread).map(post => post.id);
      if (unreadIds.length) {
        window.setTimeout(() => {
          void markLehrerzimmerPostsRead(unreadIds);
        }, 500);
      }
    } catch (cause: any) {
      if (cause?.requiresSchoolEmail || cause?.status === 403) {
        setRequiresSchoolEmail(true);
        setMe(null);
        setPosts([]);
        setColleagues([]);
        await loadSchoolStatus();
      } else {
        setError(cause instanceof Error ? cause.message : 'Das Lehrerzimmer konnte nicht geladen werden.');
      }
    } finally {
      setLoading(false);
    }
  }, [filter, loadSchoolStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = useMemo(
    () => posts.filter(post => post.unread).length,
    [posts],
  );

  const insertMention = (handle: string) => {
    const token = '@' + handle;
    setBody(previous => {
      const spacer = previous && !previous.endsWith(' ') && !previous.endsWith('\n') ? ' ' : '';
      return previous + spacer + token + ' ';
    });
  };

  const submitPost = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = body.trim();
    if (!message || posting) return;

    setPosting(true);
    setError(null);
    try {
      await fetch('/api/lehrerzimmer/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: message }),
      }).then(readJson);
      setBody('');
      if (filter !== 'all') {
        setFilter('all');
      } else {
        await load();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Nachricht konnte nicht gespeichert werden.');
    } finally {
      setPosting(false);
    }
  };

  const submitReply = async (postId: string) => {
    const draft = replyDrafts[postId]?.trim();
    if (!draft || replyingPostId) return;

    setReplyingPostId(postId);
    setError(null);
    try {
      await fetch('/api/lehrerzimmer/posts/' + encodeURIComponent(postId) + '/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      }).then(readJson);
      setReplyDrafts(previous => ({ ...previous, [postId]: '' }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Antwort konnte nicht gespeichert werden.');
    } finally {
      setReplyingPostId(null);
    }
  };

  const startEditingPost = (post: LehrerzimmerPost) => {
    setEditingPostId(post.id);
    setEditCategory(post.category);
    setEditKind(post.kind);
    setEditTitle(post.title);
    setEditBody(post.body);
    setError(null);
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditTitle('');
    setEditBody('');
  };

  const saveEditedPost = async (postId: string) => {
    if (!editTitle.trim() || !editBody.trim() || mutatingId) return;
    setMutatingId('post:' + postId);
    setError(null);
    try {
      await fetch('/api/lehrerzimmer/posts/' + encodeURIComponent(postId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editCategory,
          kind: editKind,
          title: editTitle.trim(),
          body: editBody.trim(),
        }),
      }).then(readJson);
      cancelEditingPost();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Beitrag konnte nicht geändert werden.');
    } finally {
      setMutatingId(null);
    }
  };

  const deleteOwnPost = async (postId: string) => {
    if (mutatingId || !window.confirm('Diesen Lehrerzimmer-Beitrag wirklich löschen? Antworten auf diesen Beitrag werden ebenfalls gelöscht.')) return;
    setMutatingId('post:' + postId);
    setError(null);
    try {
      await fetch('/api/lehrerzimmer/posts/' + encodeURIComponent(postId), {
        method: 'DELETE',
      }).then(readJson);
      if (editingPostId === postId) cancelEditingPost();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Beitrag konnte nicht gelöscht werden.');
    } finally {
      setMutatingId(null);
    }
  };

  const deleteOwnReply = async (postId: string, replyId: string) => {
    if (mutatingId || !window.confirm('Diese Antwort wirklich löschen?')) return;
    setMutatingId('reply:' + replyId);
    setError(null);
    try {
      await fetch(
        '/api/lehrerzimmer/posts/' + encodeURIComponent(postId) + '/replies/' + encodeURIComponent(replyId),
        { method: 'DELETE' },
      ).then(readJson);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Antwort konnte nicht gelöscht werden.');
    } finally {
      setMutatingId(null);
    }
  };

  const submitSchoolVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolName.trim() || verificationSubmitting) return;
    setVerificationSubmitting(true);
    setVerificationNotice(null);
    setError(null);
    try {
      const response = await fetch('/api/schools/verification-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: schoolName.trim(),
          federalState: schoolFederalState,
        }),
      });
      const data = await readJson(response);
      setVerificationNotice('Anfrage gespeichert. Nach einmaliger Prüfung ist diese Schul-Domain für alle Kolleg:innen dieser Schule freigeschaltet.');
      await loadSchoolStatus();
      return data;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Schulverifizierung konnte nicht angefordert werden.');
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const reloginWithSchoolEmail = async () => {
    try {
      await fetch('/api/access/logout', { method: 'POST' });
    } finally {
      window.location.reload();
    }
  };

  if (loading && !me && !requiresSchoolEmail) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[420px]">
        <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={26} className="animate-spin text-[var(--accent)]" />
          <span className="text-sm font-semibold">Lehrerzimmer wird geladen …</span>
        </div>
      </div>
    );
  }

  if (requiresSchoolEmail) {
    const pending = schoolStatus?.verificationRequest?.status === 'pending';

    return (
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-7 sm:p-9 shadow-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto">
              <LockKeyhole size={26} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Lehrerzimmer braucht eine verifizierte Schule</h2>
            <p className="text-sm leading-6 text-[var(--text-secondary)] max-w-xl mx-auto">
              Dein persönliches Klassio-Konto funktioniert unabhängig davon. Für das schulinterne Lehrerzimmer muss zusätzlich die konkrete Schule bestätigt sein.
            </p>
          </div>

          {schoolStatusLoading ? (
            <div className="flex items-center justify-center gap-2 py-5 text-sm text-[var(--text-muted)]">
              <Loader2 size={18} className="animate-spin" /> Schulstatus wird geprüft …
            </div>
          ) : schoolStatus?.account ? (
            <div className="space-y-5">
              <div className="rounded-xl bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-subtle,var(--border))] p-4">
                <div className="text-xs text-[var(--text-muted)]">Angemeldetes Konto</div>
                <div className="mt-1 text-sm font-bold">{schoolStatus.account.email}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  Schul-Domain: <span className="font-semibold text-[var(--text-secondary)]">{schoolStatus.account.domain}</span>
                </div>
              </div>

              {pending ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-5 text-center">
                  <h3 className="font-bold">Schulverifizierung wurde angefordert</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {schoolStatus.verificationRequest?.schoolName} · {schoolStatus.verificationRequest?.federalState}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                    Nach der einmaligen Freigabe gilt die konkrete Schul-Domain für alle Kolleg:innen dieser Schule. Andere Schulen – auch beim selben Bildungsserver – bleiben getrennt.
                  </p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>
                    Status aktualisieren
                  </Button>
                </div>
              ) : (
                <form onSubmit={submitSchoolVerification} className="space-y-4">
                  <div>
                    <h3 className="font-bold">Schule zur Verifizierung melden</h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      Das funktioniert österreichweit und ist nicht an VOBS gebunden. Die genaue E-Mail-Domain deiner Schule wird nach Prüfung dieser Schule zugeordnet.
                    </p>
                  </div>

                  <Input
                    label="Name der Schule"
                    value={schoolName}
                    onChange={event => setSchoolName(event.target.value)}
                    placeholder="z. B. Volksschule Musterstadt"
                    maxLength={160}
                  />

                  <Select
                    label="Bundesland"
                    value={schoolFederalState}
                    onChange={event => setSchoolFederalState(event.target.value as (typeof AUSTRIAN_FEDERAL_STATES)[number])}
                    options={AUSTRIAN_FEDERAL_STATES.map(state => ({ value: state, label: state }))}
                  />

                  {error && (
                    <div className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-text)]">
                      {error}
                    </div>
                  )}
                  {verificationNotice && (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm">
                      {verificationNotice}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={!schoolName.trim() || verificationSubmitting}
                    isLoading={verificationSubmitting}
                  >
                    Schulverifizierung anfordern
                  </Button>
                </form>
              )}

              <div className="pt-4 border-t border-[var(--border-subtle,var(--border))] text-center">
                <button type="button" onClick={reloginWithSchoolEmail} className="text-xs font-bold text-[var(--accent)] hover:underline">
                  Mit einer anderen E-Mail-Adresse anmelden
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Du bist aktuell über einen Zugangscode angemeldet. Für eine Schulverifizierung brauchst du zuerst ein persönliches E-Mail-Konto.
              </p>
              <Button variant="primary" size="lg" onClick={reloginWithSchoolEmail}>
                Mit E-Mail anmelden
              </Button>
            </div>
          )}

          <p className="text-xs text-center text-[var(--text-muted)]">
            Persönliche Klassen- und Schülerdaten bleiben davon getrennt im lokalen verschlüsselten Datentresor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1180px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <section className="rounded-2xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] text-[var(--accent-text,#fff)] flex items-center justify-center shrink-0">
              <MessageCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-[-0.025em]">Lehrerzimmer</h1>
                {unreadCount > 0 && <Badge variant="accent">{unreadCount} neu</Badge>}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {me?.school.name || me?.school.code?.toUpperCase()} · {me?.school.federalState ? me.school.federalState + ' · ' : ''}{me?.school.domain}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Sichtbar nur für verifizierte Kolleg:innen derselben Schul-E-Mail-Gruppe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success" icon={<ShieldCheck size={13} />}>Schule verifiziert</Badge>
            <Button variant="secondary" size="sm" onClick={() => void load()} leftIcon={<RefreshCw size={14} />}>
              Aktualisieren
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger-text)] px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
        <main className="space-y-6 min-w-0">
          <form
            onSubmit={submitPost}
            data-testid="lehrerzimmer-quick-message"
            className="rounded-2xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-6 shadow-sm space-y-4"
          >
            <div>
              <h2 className="font-bold text-lg tracking-[-0.01em]">Nachricht ans Kollegium</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Schnell fragen oder informieren – z. B. „Wer hat dieses Material?“ oder „Wer hat morgen Aufsicht?“
              </p>
            </div>

            <Textarea
              label="Nachricht"
              rows={4}
              value={body}
              onChange={event => setBody(event.target.value)}
              maxLength={4000}
              placeholder="Nachricht schreiben … @anna, @muster oder @annamuster"
              helperText="Mit @ kannst du Kolleg:innen direkt erwähnen."
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[var(--text-muted)]">
                Angemeldet als <span className="font-bold text-[var(--text-secondary)]">{me?.user.displayName}</span> · @{me?.user.handle}
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={!body.trim() || posting}
                isLoading={posting}
                rightIcon={<Send size={15} />}
              >
                Senden
              </Button>
            </div>
          </form>

          <section className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {([
                ['all', 'Alle'],
                ['organisation', 'Organisation'],
                ['unterricht', 'Unterricht'],
                ['info', 'Info'],
              ] as const).map(([value, label]) => (
                <Button
                  key={value}
                  variant={filter === value ? 'selected' : 'secondary'}
                  size="sm"
                  onClick={() => setFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {!posts.length ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] py-16 px-6 text-center">
                <MessageCircle size={30} className="mx-auto text-[var(--text-muted)] mb-3" />
                <h3 className="font-bold">Noch keine Beiträge</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">Schreib den ersten Beitrag für dein Kollegium.</p>
              </div>
            ) : (
              posts.map(post => {
                const mentionedMe = Boolean(me && (
                  post.mentions.includes(me.user.userId) ||
                  post.replies.some(reply => reply.mentions.includes(me.user.userId))
                ));
                const meta = CATEGORY_META[post.category];
                const isOwnPost = me?.user.userId === post.authorId;
                const isEditing = editingPostId === post.id;

                return (
                  <article
                    key={post.id}
                    data-unread={post.unread ? 'true' : 'false'}
                    className={`rounded-2xl border shadow-sm overflow-hidden transition-colors ${post.unread
                      ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]/45 ring-1 ring-[var(--accent)]/10'
                      : 'border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))]'}`}
                  >
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {!post.quick && (
                            <>
                              <Badge variant={meta.badge} icon={meta.icon}>{meta.label}</Badge>
                              <Badge variant={post.kind === 'frage' ? 'warning' : 'neutral'} icon={post.kind === 'frage' ? <HelpCircle size={12} /> : <MessageCircle size={12} />}>
                                {post.kind === 'frage' ? 'Frage' : 'Beitrag'}
                              </Badge>
                            </>
                          )}
                          {post.unread && <Badge variant="accent">Neu</Badge>}
                          {mentionedMe && <Badge variant="accent" icon={<AtSign size={12} />}>Erwähnt dich</Badge>}
                        </div>

                        {isOwnPost && !isEditing && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingPost(post)}
                              leftIcon={<Pencil size={13} />}
                            >
                              Bearbeiten
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void deleteOwnPost(post.id)}
                              disabled={mutatingId === 'post:' + post.id}
                              leftIcon={<Trash2 size={13} />}
                              className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                            >
                              Löschen
                            </Button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-4 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <Select
                              label="Kategorie"
                              value={editCategory}
                              onChange={event => setEditCategory(event.target.value as Category)}
                              options={[
                                { value: 'organisation', label: 'Organisation' },
                                { value: 'unterricht', label: 'Unterricht' },
                                { value: 'info', label: 'Info' },
                              ]}
                            />
                            <Select
                              label="Art"
                              value={editKind}
                              onChange={event => setEditKind(event.target.value as Kind)}
                              options={[
                                { value: 'beitrag', label: 'Beitrag / Information' },
                                { value: 'frage', label: 'Frage ans Kollegium' },
                              ]}
                            />
                          </div>
                          <Input
                            label="Titel"
                            value={editTitle}
                            onChange={event => setEditTitle(event.target.value)}
                            maxLength={140}
                          />
                          <Textarea
                            label="Text"
                            rows={5}
                            value={editBody}
                            onChange={event => setEditBody(event.target.value)}
                            maxLength={4000}
                            helperText="@Erwähnungen werden beim Speichern neu ausgewertet."
                          />
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={cancelEditingPost}
                              leftIcon={<X size={13} />}
                            >
                              Abbrechen
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => void saveEditedPost(post.id)}
                              disabled={!editTitle.trim() || !editBody.trim() || mutatingId === 'post:' + post.id}
                              isLoading={mutatingId === 'post:' + post.id}
                            >
                              Änderungen speichern
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            {!post.quick && <h2 className="text-lg sm:text-xl font-bold tracking-[-0.01em]">{post.title}</h2>}
                            <div className={`${post.quick ? '' : 'mt-1 '}text-xs text-[var(--text-muted)]`}>
                              <span className="font-bold text-[var(--text-secondary)]">{post.authorName}</span>
                              {' '}@{post.authorHandle} · {formatDate(post.createdAt)}
                              {post.updatedAt !== post.createdAt && <span> · bearbeitet</span>}
                            </div>
                          </div>

                          <p className="text-sm sm:text-[15px] leading-7 whitespace-pre-wrap text-[var(--text-primary)]">
                            <MentionText text={post.body} />
                          </p>
                        </>
                      )}
                    </div>

                    <div className="border-t border-[var(--border-subtle,var(--border))] bg-[var(--surface-subtle,var(--surface2))]/60 p-4 sm:p-5 space-y-4">
                      {post.replies.length > 0 && (
                        <div className="space-y-3">
                          {post.replies.map(reply => {
                            const isOwnReply = me?.user.userId === reply.authorId;
                            return (
                              <div key={reply.id} className="rounded-2xl bg-[var(--surface-card,var(--surface))] border border-[var(--border-subtle,var(--border))] px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-xs text-[var(--text-muted)] mb-1.5">
                                    <span className="font-bold text-[var(--text-secondary)]">{reply.authorName}</span>
                                    {' '}@{reply.authorHandle} · {formatDate(reply.createdAt)}
                                  </div>
                                  {isOwnReply && (
                                    <button
                                      type="button"
                                      onClick={() => void deleteOwnReply(post.id, reply.id)}
                                      disabled={mutatingId === 'reply:' + reply.id}
                                      className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-50"
                                      aria-label="Eigene Antwort löschen"
                                      title="Antwort löschen"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm leading-6 whitespace-pre-wrap">
                                  <MentionText text={reply.body} />
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex gap-2 items-end">
                        <Textarea
                          rows={2}
                          value={replyDrafts[post.id] || ''}
                          onChange={event => setReplyDrafts(previous => ({ ...previous, [post.id]: event.target.value }))}
                          maxLength={2500}
                          placeholder="Antworten … @vorname, @nachname oder @vornamenachname"
                          className="min-h-[72px]"
                        />
                        <Button
                          variant="primary"
                          size="md"
                          aria-label="Antwort senden"
                          disabled={!replyDrafts[post.id]?.trim() || replyingPostId === post.id}
                          isLoading={replyingPostId === post.id}
                          onClick={() => void submitReply(post.id)}
                          className="shrink-0"
                        >
                          <Send size={16} />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-4">
          <div className="rounded-2xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users size={17} className="text-[var(--accent)]" />
              <h2 className="font-black">Kollegium</h2>
              <Badge variant="neutral" size="sm">{colleagues.length}</Badge>
            </div>

            <div className="space-y-2">
              {colleagues.map(person => (
                <button
                  key={person.userId}
                  type="button"
                  onClick={() => insertMention(person.handle)}
                  className="w-full text-left rounded-xl border border-transparent hover:border-[var(--border-default,var(--border))] hover:bg-[var(--surface-subtle,var(--surface2))] px-3 py-2.5 transition-colors"
                  title={'@' + person.handle + ' erwähnen'}
                >
                  <div className="text-sm font-bold">{person.displayName}</div>
                  <div className="text-xs text-[var(--accent)]">@{person.handle}</div>
                  {person.mentionAliases && person.mentionAliases.length > 1 && (
                    <div className="mt-1 text-[0.68rem] leading-4 text-[var(--text-muted)]">
                      auch {person.mentionAliases.filter(alias => alias !== person.handle).slice(0, 3).map(alias => '@' + alias).join(' · ')}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <p className="mt-4 pt-4 border-t border-[var(--border-subtle,var(--border))] text-xs leading-5 text-[var(--text-muted)]">
              Alle registrierten KLASSIO-Kolleg:innen dieser verifizierten Schule erscheinen hier. Du kannst sie mit @Vorname, @Nachname oder @VornameNachname erwähnen.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle,var(--border))] bg-[var(--accent-soft)] p-4">
            <div className="flex gap-3">
              <ShieldCheck size={17} className="text-[var(--accent)] shrink-0 mt-0.5" />
              <p className="text-xs leading-5 text-[var(--text-secondary)]">
                Das Lehrerzimmer ist für schulweite Organisation und Austausch gedacht. Schülerbezogene sensible Daten gehören weiterhin in die lokalen Klassio-Bereiche.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
