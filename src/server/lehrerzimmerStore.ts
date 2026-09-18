import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { mentionAliasesForTeacher, normalizeMentionAlias, type TeacherIdentity } from './teacherIdentity';

export type LehrerzimmerCategory = 'organisation' | 'unterricht' | 'info';
export type LehrerzimmerKind = 'beitrag' | 'frage';

export interface LehrerzimmerUser {
  userId: string;
  displayName: string;
  handle: string;
  mentionAliases?: string[];
  schoolId: string;
  joinedAt: string;
  lastSeenAt: string;
}

export interface LehrerzimmerReply {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  mentions: string[];
  createdAt: string;
}

export interface LehrerzimmerPost {
  id: string;
  category: LehrerzimmerCategory;
  kind: LehrerzimmerKind;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  replies: LehrerzimmerReply[];
}

type StoreData = {
  version: 1;
  users: Record<string, LehrerzimmerUser[]>;
  posts: Record<string, LehrerzimmerPost[]>;
};

const EMPTY_STORE: StoreData = {
  version: 1,
  users: {},
  posts: {},
};

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function isCategory(value: unknown): value is LehrerzimmerCategory {
  return value === 'organisation' || value === 'unterricht' || value === 'info';
}

function isKind(value: unknown): value is LehrerzimmerKind {
  return value === 'beitrag' || value === 'frage';
}

function mentionHandles(text: string): string[] {
  const handles = new Set<string>();
  const re = /(^|\s)@([^\s@.,!?;:]{2,64})/gu;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const normalized = normalizeMentionAlias(match[2]);
    if (normalized.length >= 2) handles.add(normalized);
  }
  return [...handles];
}

function withMentionAliases(user: LehrerzimmerUser): LehrerzimmerUser {
  return {
    ...user,
    mentionAliases: mentionAliasesForTeacher(user.displayName, user.handle),
  };
}

export function resolveMentionUserIds(users: LehrerzimmerUser[], text: string): string[] {
  const ids = new Set<string>();
  for (const token of mentionHandles(text)) {
    const matches = users.filter(user =>
      mentionAliasesForTeacher(user.displayName, user.handle).includes(token)
    );
    // Kurze Namen wie @anna können doppelt vorkommen. In diesem Fall wird bewusst
    // niemand automatisch markiert; die Oberfläche bietet den eindeutigen Namen an.
    if (matches.length === 1) ids.add(matches[0].userId);
  }
  return [...ids];
}

function cloneEmptyStore(): StoreData {
  return { version: 1, users: {}, posts: {} };
}

export class LehrerzimmerStore {
  private readonly filePath: string;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'lehrerzimmer.json');
  }

  private async read(): Promise<StoreData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      if (parsed.version !== 1 || typeof parsed.users !== 'object' || typeof parsed.posts !== 'object') {
        return cloneEmptyStore();
      }
      return {
        version: 1,
        users: parsed.users || {},
        posts: parsed.posts || {},
      };
    } catch (error: any) {
      if (error?.code === 'ENOENT') return cloneEmptyStore();
      throw error;
    }
  }

  private async write(data: StoreData): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tempPath = this.filePath + '.tmp-' + process.pid;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tempPath, this.filePath);
  }

  private mutate<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
    const task = this.writeQueue.then(async () => {
      const data = await this.read();
      const result = await fn(data);
      await this.write(data);
      return result;
    });

    this.writeQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  async ensureUser(identity: TeacherIdentity): Promise<LehrerzimmerUser> {
    return this.mutate(data => {
      const now = new Date().toISOString();
      const users = data.users[identity.schoolId] || (data.users[identity.schoolId] = []);
      const existing = users.find(user => user.userId === identity.userId);

      if (existing) {
        existing.displayName = identity.displayName;
        existing.handle = identity.handle;
        existing.mentionAliases = mentionAliasesForTeacher(identity.displayName, identity.handle);
        existing.lastSeenAt = now;
        return withMentionAliases(existing);
      }

      const created: LehrerzimmerUser = {
        userId: identity.userId,
        displayName: identity.displayName,
        handle: identity.handle,
        mentionAliases: mentionAliasesForTeacher(identity.displayName, identity.handle),
        schoolId: identity.schoolId,
        joinedAt: now,
        lastSeenAt: now,
      };
      users.push(created);
      return created;
    });
  }

  async listUsers(identity: TeacherIdentity): Promise<LehrerzimmerUser[]> {
    await this.ensureUser(identity);
    const data = await this.read();
    return [...(data.users[identity.schoolId] || [])]
      .map(withMentionAliases)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'));
  }

  async listPosts(identity: TeacherIdentity, category?: LehrerzimmerCategory): Promise<LehrerzimmerPost[]> {
    await this.ensureUser(identity);
    const data = await this.read();
    const posts = data.posts[identity.schoolId] || [];
    return posts
      .filter(post => !category || post.category === category)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createPost(
    identity: TeacherIdentity,
    input: { category: unknown; kind: unknown; title: unknown; body: unknown }
  ): Promise<LehrerzimmerPost> {
    if (!isCategory(input.category)) throw new Error('INVALID_CATEGORY');
    if (!isKind(input.kind)) throw new Error('INVALID_KIND');
    const category: LehrerzimmerCategory = input.category;
    const kind: LehrerzimmerKind = input.kind;
    const title = cleanText(input.title, 140);
    const body = cleanText(input.body, 4000);
    if (!title || !body) throw new Error('INVALID_CONTENT');

    return this.mutate(data => {
      const now = new Date().toISOString();
      const users = data.users[identity.schoolId] || (data.users[identity.schoolId] = []);
      let user = users.find(item => item.userId === identity.userId);
      if (!user) {
        user = {
          userId: identity.userId,
          displayName: identity.displayName,
          handle: identity.handle,
          mentionAliases: mentionAliasesForTeacher(identity.displayName, identity.handle),
          schoolId: identity.schoolId,
          joinedAt: now,
          lastSeenAt: now,
        };
        users.push(user);
      } else {
        user.lastSeenAt = now;
      }

      const mentionIds = resolveMentionUserIds(users, title + '\n' + body);

      const post: LehrerzimmerPost = {
        id: crypto.randomUUID(),
        category,
        kind,
        title,
        body,
        authorId: identity.userId,
        authorName: identity.displayName,
        authorHandle: identity.handle,
        mentions: mentionIds,
        createdAt: now,
        updatedAt: now,
        replies: [],
      };

      const posts = data.posts[identity.schoolId] || (data.posts[identity.schoolId] = []);
      posts.unshift(post);
      return post;
    });
  }

  async updatePost(
    identity: TeacherIdentity,
    postId: string,
    input: { category: unknown; kind: unknown; title: unknown; body: unknown }
  ): Promise<LehrerzimmerPost> {
    if (!isCategory(input.category)) throw new Error('INVALID_CATEGORY');
    if (!isKind(input.kind)) throw new Error('INVALID_KIND');
    const category: LehrerzimmerCategory = input.category;
    const kind: LehrerzimmerKind = input.kind;
    const title = cleanText(input.title, 140);
    const body = cleanText(input.body, 4000);
    if (!title || !body) throw new Error('INVALID_CONTENT');

    return this.mutate(data => {
      const posts = data.posts[identity.schoolId] || [];
      const post = posts.find(item => item.id === postId);
      if (!post) throw new Error('POST_NOT_FOUND');
      if (post.authorId !== identity.userId) throw new Error('FORBIDDEN');

      const users = data.users[identity.schoolId] || [];
      const mentionIds = resolveMentionUserIds(users, title + '\n' + body);

      post.category = category;
      post.kind = kind;
      post.title = title;
      post.body = body;
      post.mentions = mentionIds;
      post.updatedAt = new Date().toISOString();
      return post;
    });
  }

  async deletePost(identity: TeacherIdentity, postId: string): Promise<void> {
    return this.mutate(data => {
      const posts = data.posts[identity.schoolId] || [];
      const index = posts.findIndex(item => item.id === postId);
      if (index < 0) throw new Error('POST_NOT_FOUND');
      if (posts[index].authorId !== identity.userId) throw new Error('FORBIDDEN');
      posts.splice(index, 1);
    });
  }

  async deleteReply(identity: TeacherIdentity, postId: string, replyId: string): Promise<void> {
    return this.mutate(data => {
      const post = (data.posts[identity.schoolId] || []).find(item => item.id === postId);
      if (!post) throw new Error('POST_NOT_FOUND');
      const replyIndex = post.replies.findIndex(reply => reply.id === replyId);
      if (replyIndex < 0) throw new Error('REPLY_NOT_FOUND');
      if (post.replies[replyIndex].authorId !== identity.userId) throw new Error('FORBIDDEN');

      post.replies.splice(replyIndex, 1);
      post.updatedAt = new Date().toISOString();
    });
  }

  async addReply(identity: TeacherIdentity, postId: string, rawBody: unknown): Promise<LehrerzimmerReply> {
    const body = cleanText(rawBody, 2500);
    if (!body) throw new Error('INVALID_CONTENT');

    return this.mutate(data => {
      const now = new Date().toISOString();
      const users = data.users[identity.schoolId] || (data.users[identity.schoolId] = []);
      let user = users.find(item => item.userId === identity.userId);
      if (!user) {
        user = {
          userId: identity.userId,
          displayName: identity.displayName,
          handle: identity.handle,
          mentionAliases: mentionAliasesForTeacher(identity.displayName, identity.handle),
          schoolId: identity.schoolId,
          joinedAt: now,
          lastSeenAt: now,
        };
        users.push(user);
      } else {
        user.lastSeenAt = now;
      }

      const post = (data.posts[identity.schoolId] || []).find(item => item.id === postId);
      if (!post) throw new Error('POST_NOT_FOUND');

      const mentionIds = resolveMentionUserIds(users, body);

      const reply: LehrerzimmerReply = {
        id: crypto.randomUUID(),
        body,
        authorId: identity.userId,
        authorName: identity.displayName,
        authorHandle: identity.handle,
        mentions: mentionIds,
        createdAt: now,
      };

      post.replies.push(reply);
      post.updatedAt = now;
      return reply;
    });
  }
}

export function createLehrerzimmerStore(dataDir: string): LehrerzimmerStore {
  return new LehrerzimmerStore(dataDir);
}
