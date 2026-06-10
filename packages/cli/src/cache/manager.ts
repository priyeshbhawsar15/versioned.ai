import fs from 'fs';
import path from 'path';
import initSqlJs, { type Database } from 'sql.js';

export interface CachedResult {
  response: string;
  latencyMs: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

let sqlPromise: ReturnType<typeof initSqlJs> | null = null;

function getSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs();
  }
  return sqlPromise;
}

export class CacheManager {
  private db: Database | null = null;
  private dbPath: string;
  private initPromise: Promise<void>;

  constructor(cwd: string) {
    this.dbPath = path.resolve(cwd, '.prompt_cache.db');
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    const SQL = await getSql();

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        response TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    this.persist();
  }

  private async ensureReady(): Promise<Database> {
    await this.initPromise;
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  private persist(): void {
    if (!this.db) return;
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  async get(key: string): Promise<CachedResult | null> {
    const db = await this.ensureReady();
    const stmt = db.prepare('SELECT response, latency_ms, prompt_tokens, completion_tokens, total_tokens FROM cache WHERE key = ?');
    stmt.bind([key]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.getAsObject() as {
      response: string;
      latency_ms: number;
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    stmt.free();

    return {
      response: row.response,
      latencyMs: row.latency_ms,
      tokenUsage: {
        prompt: row.prompt_tokens,
        completion: row.completion_tokens,
        total: row.total_tokens,
      },
    };
  }

  async set(key: string, result: CachedResult): Promise<void> {
    const db = await this.ensureReady();
    db.run(
      `INSERT OR REPLACE INTO cache (key, response, latency_ms, prompt_tokens, completion_tokens, total_tokens)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        key,
        result.response,
        result.latencyMs,
        result.tokenUsage.prompt,
        result.tokenUsage.completion,
        result.tokenUsage.total,
      ]
    );
    this.persist();
  }

  async delete(key: string): Promise<void> {
    const db = await this.ensureReady();
    db.run('DELETE FROM cache WHERE key = ?', [key]);
    this.persist();
  }

  async clear(): Promise<void> {
    const db = await this.ensureReady();
    db.run('DELETE FROM cache');
    this.persist();
  }

  async close(): Promise<void> {
    const db = await this.ensureReady();
    this.persist();
    db.close();
    this.db = null;
  }
}
