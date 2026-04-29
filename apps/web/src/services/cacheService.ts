import type { NewsArticle } from '../types';

const DB_NAME = 'newshub-cache';
const DB_VERSION = 1;
const ARTICLE_STORE = 'articles';
const METADATA_STORE = 'metadata';

interface CacheMetadata {
  key: string;
  timestamp: number;
  expiresAt: number;
}

class CacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Articles store
        if (!db.objectStoreNames.contains(ARTICLE_STORE)) {
          db.createObjectStore(ARTICLE_STORE, { keyPath: 'id' });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metaStore = db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
          metaStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async setArticles(key: string, articles: NewsArticle[], ttlMs: number = 5 * 60 * 1000): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([ARTICLE_STORE, METADATA_STORE], 'readwrite');
    const articleStore = transaction.objectStore(ARTICLE_STORE);
    const metaStore = transaction.objectStore(METADATA_STORE);

    // Store articles
    for (const article of articles) {
      articleStore.put(article);
    }

    // Store metadata
    const metadata: CacheMetadata = {
      key,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };
    metaStore.put(metadata);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getArticles(key: string): Promise<NewsArticle[] | null> {
    await this.init();
    if (!this.db) return null;

    // Check metadata first
    const metadata = await this.getMetadata(key);
    if (!metadata) return null;

    // Check if expired
    if (Date.now() > metadata.expiresAt) {
      await this.delete(key);
      return null;
    }

    // Get all articles
    const transaction = this.db.transaction([ARTICLE_STORE], 'readonly');
    const articleStore = transaction.objectStore(ARTICLE_STORE);
    const request = articleStore.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getMetadata(key: string): Promise<CacheMetadata | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction([METADATA_STORE], 'readonly');
    const metaStore = transaction.objectStore(METADATA_STORE);
    const request = metaStore.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([METADATA_STORE], 'readwrite');
    const metaStore = transaction.objectStore(METADATA_STORE);
    metaStore.delete(key);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearExpired(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const now = Date.now();
    const transaction = this.db.transaction([METADATA_STORE], 'readwrite');
    const metaStore = transaction.objectStore(METADATA_STORE);
    const index = metaStore.index('expiresAt');
    const request = index.openCursor(IDBKeyRange.upperBound(now));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([ARTICLE_STORE, METADATA_STORE], 'readwrite');
    transaction.objectStore(ARTICLE_STORE).clear();
    transaction.objectStore(METADATA_STORE).clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async isCached(key: string): Promise<boolean> {
    const metadata = await this.getMetadata(key);
    if (!metadata) return false;
    return Date.now() <= metadata.expiresAt;
  }

  async getCacheAge(key: string): Promise<number | null> {
    const metadata = await this.getMetadata(key);
    if (!metadata) return null;
    return Date.now() - metadata.timestamp;
  }
}

export const cacheService = new CacheService();
