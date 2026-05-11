import { logger } from '../lib/logger';

const DB_NAME = 'newshub-sync';
const DB_VERSION = 1;
const QUEUE_STORE = 'sync-queue';

interface SyncAction {
  id: string;
  type: 'bookmark' | 'history';
  payload: unknown;
  timestamp: number;
}

class SyncService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private reconnectListenerAttached = false;

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

        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async queueAction(action: SyncAction): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    store.add(action);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Try Background Sync API (Chromium only)
    if (await this.registerBackgroundSync()) {
      return;
    }

    // Fallback: Poll on reconnect (Safari)
    this.setupReconnectListener();
  }

  private async registerBackgroundSync(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;
    if (!('sync' in ServiceWorkerRegistration.prototype)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      // Background Sync API types not in standard lib - cast after runtime check
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-queue');
      return true;
    } catch (error) {
      logger.warn('Background Sync registration failed:', error);
      return false;
    }
  }

  private setupReconnectListener(): void {
    if (this.reconnectListenerAttached) return;

    window.addEventListener('online', () => {
      this.replayQueue();
    });

    this.reconnectListenerAttached = true;
  }

  async replayQueue(): Promise<void> {
    const actions = await this.getAllActions();
    for (const action of actions) {
      try {
        await this.sendToServer(action);
        await this.removeAction(action.id);
      } catch (error) {
        logger.error('Sync failed for action:', action, error);
        // Leave in queue for next retry
      }
    }
  }

  private async getAllActions(): Promise<SyncAction[]> {
    await this.init();
    if (!this.db) return [];

    const transaction = this.db.transaction([QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async removeAction(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    store.delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async sendToServer(action: SyncAction): Promise<void> {
    const endpoint = action.type === 'bookmark' ? '/api/bookmarks' : '/api/history';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
}

export const syncService = new SyncService();
