import Database from 'better-sqlite3';
import type { DownloadStatus, HistoryEntry } from '@shared/types';
import { userDataFile } from './paths';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  db = new Database(userDataFile('history.sqlite'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS downloads (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      url           TEXT NOT NULL,
      title         TEXT NOT NULL,
      thumbnail_url TEXT,
      status        TEXT NOT NULL,
      format        TEXT NOT NULL,
      output_path   TEXT,
      date          INTEGER NOT NULL,
      duration      INTEGER,
      filesize      INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_downloads_date ON downloads(date DESC);
    CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
  `);
  return db;
}

export function addHistory(entry: Omit<HistoryEntry, 'id'>): number {
  const stmt = getDb().prepare(`
    INSERT INTO downloads (url, title, thumbnail_url, status, format, output_path, date, duration, filesize)
    VALUES (@url, @title, @thumbnail_url, @status, @format, @output_path, @date, @duration, @filesize)
  `);
  const info = stmt.run(entry);
  return Number(info.lastInsertRowid);
}

export function listHistory(limit = 200, offset = 0): HistoryEntry[] {
  return getDb()
    .prepare('SELECT * FROM downloads ORDER BY date DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as HistoryEntry[];
}

export function searchHistory(query: string, limit = 200): HistoryEntry[] {
  const like = `%${query}%`;
  return getDb()
    .prepare(
      `SELECT * FROM downloads
       WHERE title LIKE ? OR url LIKE ? OR format LIKE ?
       ORDER BY date DESC LIMIT ?`
    )
    .all(like, like, like, limit) as HistoryEntry[];
}

export function deleteHistory(id: number): void {
  getDb().prepare('DELETE FROM downloads WHERE id = ?').run(id);
}

export function updateHistoryStatus(
  id: number,
  status: DownloadStatus,
  patch: Partial<Pick<HistoryEntry, 'output_path' | 'filesize' | 'title' | 'thumbnail_url'>> = {}
): void {
  getDb()
    .prepare(
      `UPDATE downloads
       SET status = @status,
           output_path = COALESCE(@output_path, output_path),
           filesize = COALESCE(@filesize, filesize),
           title = COALESCE(@title, title),
           thumbnail_url = COALESCE(@thumbnail_url, thumbnail_url)
       WHERE id = @id`
    )
    .run({
      id,
      status,
      output_path: patch.output_path ?? null,
      filesize: patch.filesize ?? null,
      title: patch.title ?? null,
      thumbnail_url: patch.thumbnail_url ?? null
    });
}
