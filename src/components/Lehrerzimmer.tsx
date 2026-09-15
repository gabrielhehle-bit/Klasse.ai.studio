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
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge, Button, Input, Select, Textarea } from './ui';

type Category = 'organisation' | 'unterricht' | 'info';
type Kind = 'beitrag' | 'frage';

type LehrerzimmerUser = {
  userId: string;
  displayName: string;
  handle: string;
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
    domain: string;
  };
};

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
  const parts = text.split(/(@[a-z0-9._-]{2,48})/gi);
  return (
    <>
      {parts.map((part, index) =>
        /^@[a-z0-9._-]{2,48}$/i.test(part) ? (
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
    };
    error.status = response.status;
    error.requiresSchoolEmail = data?.requiresSchoolEmail === true;
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
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<Category>('organisation');
  const [kind, setKind] = useState<Kind>('beitrag');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingPostId, setReplyingPostId] = useState<string | null>(null);

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
      setMe(meData);
      setPosts(postsData.posts || []);
      setColleagues(colleaguesData.users || []);
      setRequiresSchoolEmail(false);
    } catch (cause: any) {
      if (cause?.requiresSchoolEmail || cause?.status === 403) {
        setRequiresSchoolEmail(true);
        setMe(null);
        setPosts([]);
        setColleagues([]);
      } else {
        setError(cause instanceof Error ? cause.message : 'Das Lehrerzimmer konnte nicht geladen werden.');
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const mentionMeCount = useMemo(() => {
    if (!me) return 0;
    return posts.reduce((count, post) => {
      const postMention = post.mentions.includes(me.user.userId) ? 1 : 0;
      const replyMentions = post.replies.filter(reply => reply.mentions.includes(me.user.userId)).length;
      return count + postMention + replyMentions;
    }, 0);
  }, [me, posts]);

  const insertMention = (handle: string) => {
    const token = '@' + handle;
    setBody(previous => {
      const spacer = previous && !previous.endsWith(' ') && !previous.endsWith('\n') ? ' ' : '';
      return previous + spacer + token + ' ';
    });
  };

  const submitPost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim() || posting) return;

    setPosting(true);
    setError(null);
    try {
      await fetch('/api/lehrerzimmer/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, kind, title: title.trim(), body: body.trim() }),
      }).then(readJson);
      setTitle('');
      setBody('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Beitrag konnte nicht gespeichert werden.');
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
    return (
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="rounded-3xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-7 sm:p-9 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto">
            <LockKeyhole size={26} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Lehrerzimmer nur mit Schul-E-Mail</h2>
            <p className="text-sm leading-6 text-[var(--text-secondary)] max-w-xl mx-auto">
              Das Lehrerzimmer ist ein gemeinsamer Bereich des Kollegiums. Deshalb reicht der administrative Zugangscode hier nicht aus:
              Die Schulzugehörigkeit wird über eine verifizierte Schul-E-Mail bestätigt.
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={reloginWithSchoolEmail}>
            Abmelden und mit Schul-E-Mail anmelden
          </Button>
          <p className="text-xs text-[var(--text-muted)]">
            Persönliche Klassen- und Schülerdaten bleiben davon getrennt im lokalen verschlüsselten Datentresor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <section className="rounded-3xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] text-[var(--accent-text,#fff)] flex items-center justify-center shrink-0">
              <MessageCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight">Lehrerzimmer</h1>
                {mentionMeCount > 0 && <Badge variant="accent">{mentionMeCount} × erwähnt</Badge>}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {me?.school.code?.toUpperCase()} · {me?.school.domain}
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
          <form onSubmit={submitPost} className="rounded-3xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-lg">Ins Kollegium schreiben</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">Beiträge und Fragen bleiben innerhalb deiner Schule.</p>
              </div>
              <Badge variant={kind === 'frage' ? 'warning' : 'neutral'} icon={kind === 'frage' ? <HelpCircle size={13} /> : <MessageCircle size={13} />}>
                {kind === 'frage' ? 'Frage' : 'Beitrag'}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Select
                label="Kategorie"
                value={category}
                onChange={event => setCategory(event.target.value as Category)}
                options={[
                  { value: 'organisation', label: 'Organisation' },
                  { value: 'unterricht', label: 'Unterricht' },
                  { value: 'info', label: 'Info' },
                ]}
              />
              <Select
                label="Art"
                value={kind}
                onChange={event => setKind(event.target.value as Kind)}
                options={[
                  { value: 'beitrag', label: 'Beitrag / Information' },
                  { value: 'frage', label: 'Frage ans Kollegium' },
                ]}
              />
            </div>

            <Input
              label="Titel"
              value={title}
              onChange={event => setTitle(event.target.value)}
              maxLength={140}
              placeholder={kind === 'frage' ? 'Was möchtest du das Kollegium fragen?' : 'Worum geht es?'}
            />

            <Textarea
              label="Text"
              rows={5}
              value={body}
              onChange={event => setBody(event.target.value)}
              maxLength={4000}
              placeholder="Schreib deine Nachricht … Mit @name kannst du Kolleg:innen erwähnen."
              helperText="@Erwähnungen werden im Beitrag und in Antworten erkannt."
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[var(--text-muted)]">
                Angemeldet als <span className="font-bold text-[var(--text-secondary)]">{me?.user.displayName}</span> · @{me?.user.handle}
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={!title.trim() || !body.trim() || posting}
                isLoading={posting}
                rightIcon={<Send size={15} />}
              >
                {kind === 'frage' ? 'Frage stellen' : 'Veröffentlichen'}
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
              <div className="rounded-3xl border border-dashed border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] py-16 px-6 text-center">
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

                return (
                  <article key={post.id} className="rounded-3xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] shadow-sm overflow-hidden">
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={meta.badge} icon={meta.icon}>{meta.label}</Badge>
                        <Badge variant={post.kind === 'frage' ? 'warning' : 'neutral'} icon={post.kind === 'frage' ? <HelpCircle size={12} /> : <MessageCircle size={12} />}>
                          {post.kind === 'frage' ? 'Frage' : 'Beitrag'}
                        </Badge>
                        {mentionedMe && <Badge variant="accent" icon={<AtSign size={12} />}>Erwähnt dich</Badge>}
                      </div>

                      <div>
                        <h2 className="text-lg sm:text-xl font-black tracking-tight">{post.title}</h2>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          <span className="font-bold text-[var(--text-secondary)]">{post.authorName}</span>
                          {' '}@{post.authorHandle} · {formatDate(post.createdAt)}
                        </div>
                      </div>

                      <p className="text-sm sm:text-[15px] leading-7 whitespace-pre-wrap text-[var(--text-primary)]">
                        <MentionText text={post.body} />
                      </p>
                    </div>

                    <div className="border-t border-[var(--border-subtle,var(--border))] bg-[var(--surface-subtle,var(--surface2))]/60 p-4 sm:p-5 space-y-4">
                      {post.replies.length > 0 && (
                        <div className="space-y-3">
                          {post.replies.map(reply => (
                            <div key={reply.id} className="rounded-2xl bg-[var(--surface-card,var(--surface))] border border-[var(--border-subtle,var(--border))] px-4 py-3">
                              <div className="text-xs text-[var(--text-muted)] mb-1.5">
                                <span className="font-bold text-[var(--text-secondary)]">{reply.authorName}</span>
                                {' '}@{reply.authorHandle} · {formatDate(reply.createdAt)}
                              </div>
                              <p className="text-sm leading-6 whitespace-pre-wrap">
                                <MentionText text={reply.body} />
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 items-end">
                        <Textarea
                          rows={2}
                          value={replyDrafts[post.id] || ''}
                          onChange={event => setReplyDrafts(previous => ({ ...previous, [post.id]: event.target.value }))}
                          maxLength={2500}
                          placeholder="Antworten … @name für Erwähnungen"
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
          <div className="rounded-3xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 shadow-sm">
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
                </button>
              ))}
            </div>

            <p className="mt-4 pt-4 border-t border-[var(--border-subtle,var(--border))] text-xs leading-5 text-[var(--text-muted)]">
              Klick auf eine Person, um sie im neuen Beitrag mit @ zu erwähnen.
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
