import Store from 'electron-store';
import { safeStorage } from 'electron';
import type { SiteCredential, SiteCredentialInput } from '@shared/types';

interface StoredCredential {
  domain: string;
  username?: string;
  encryptedPassword?: string; // base64 of safeStorage.encryptString
  cookiesPath?: string;
  updatedAt: number;
}

interface CredStore {
  entries: Record<string, StoredCredential>;
}

let _store: Store<CredStore> | null = null;

function store(): Store<CredStore> {
  if (_store) return _store;
  _store = new Store<CredStore>({
    name: 'credentials',
    defaults: { entries: {} }
  });
  return _store;
}

function normalizeDomain(d: string): string {
  return d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

export function listCredentials(): SiteCredential[] {
  const entries = store().get('entries');
  return Object.values(entries).map((e) => ({
    domain: e.domain,
    hasSecret: Boolean(e.encryptedPassword),
    username: e.username,
    updatedAt: e.updatedAt
  }));
}

export function upsertCredential(input: SiteCredentialInput): SiteCredential {
  const domain = normalizeDomain(input.domain);
  if (!domain) throw new Error('Invalid domain');

  const entries = { ...store().get('entries') };
  const prev = entries[domain];

  let encryptedPassword = prev?.encryptedPassword;
  if (input.password != null) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS-level encryption is not available on this system');
    }
    encryptedPassword = input.password
      ? safeStorage.encryptString(input.password).toString('base64')
      : undefined;
  }

  const entry: StoredCredential = {
    domain,
    username: input.username ?? prev?.username,
    encryptedPassword,
    cookiesPath: input.cookiesPath ?? prev?.cookiesPath,
    updatedAt: Date.now()
  };
  entries[domain] = entry;
  store().set('entries', entries);

  return {
    domain: entry.domain,
    hasSecret: Boolean(entry.encryptedPassword),
    username: entry.username,
    updatedAt: entry.updatedAt
  };
}

export function deleteCredential(domain: string): void {
  const key = normalizeDomain(domain);
  const entries = { ...store().get('entries') };
  delete entries[key];
  store().set('entries', entries);
}

/**
 * Main-process only. Decrypts password for use when spawning yt-dlp.
 * NEVER return this value over IPC.
 */
export function resolveCredentialForSpawn(
  domain: string
): { username?: string; password?: string; cookiesPath?: string } | null {
  const key = normalizeDomain(domain);
  const entry = store().get('entries')[key];
  if (!entry) return null;

  let password: string | undefined;
  if (entry.encryptedPassword) {
    try {
      password = safeStorage.decryptString(Buffer.from(entry.encryptedPassword, 'base64'));
    } catch {
      password = undefined;
    }
  }
  return { username: entry.username, password, cookiesPath: entry.cookiesPath };
}
