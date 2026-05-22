// IndexedDB 音频缓存服务
// 用于缓存口令跟练音频，避免每次重新下载

const DB_NAME = 'AshtangaAudioDB';
const STORE_NAME = 'audioCache';
const AUDIO_KEY = 'guruji-led-primary';
const CACHE_VERSION_KEY = 'audio-cache-version';

// 当前音频版本，如果音频文件更新，修改此版本号
const CURRENT_AUDIO_VERSION = '1.0';

class AudioCacheService {
  private db: IDBDatabase | null = null;

  // 初始化数据库
  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  // 检查缓存是否有效（存在且版本正确）
  async isCacheValid(): Promise<boolean> {
    try {
      const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      if (cachedVersion !== CURRENT_AUDIO_VERSION) {
        return false;
      }

      const hasAudio = await this.hasAudio();
      return hasAudio;
    } catch {
      return false;
    }
  }

  // 检查是否有缓存的音频
  async hasAudio(): Promise<boolean> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(AUDIO_KEY);

      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };

      request.onerror = () => resolve(false);
    });
  }

  // 获取缓存的音频（返回 Blob URL）
  async getAudioUrl(): Promise<string | null> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(AUDIO_KEY);

      request.onsuccess = () => {
        if (request.result) {
          const blob = new Blob([request.result], { type: 'audio/mp4' });
          const url = URL.createObjectURL(blob);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  // 获取缓存的音频（返回 ArrayBuffer，用于创建 Audio 对象）
  async getAudioBuffer(): Promise<ArrayBuffer | null> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(AUDIO_KEY);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => resolve(null);
    });
  }

  // 保存音频到缓存
  async saveAudio(arrayBuffer: ArrayBuffer): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(arrayBuffer, AUDIO_KEY);

      request.onsuccess = () => {
        // 保存版本号
        localStorage.setItem(CACHE_VERSION_KEY, CURRENT_AUDIO_VERSION);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // 下载并缓存音频，带进度回调
  async downloadAndCache(
    url: string,
    onProgress?: (loaded: number, total: number) => void,
    options?: { priority?: 'high' | 'low' | 'auto' }
  ): Promise<ArrayBuffer> {
    const response = await fetch(new Request(url, { priority: options?.priority || 'auto' }));

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('无法读取响应体');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (onProgress && total > 0) {
        onProgress(loaded, total);
      }
    }

    // 合并 chunks
    const allChunks = new Uint8Array(loaded);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    const arrayBuffer = allChunks.buffer;

    // 保存到 IndexedDB（后台执行，不阻塞）
    this.saveAudio(arrayBuffer).catch((err) => {
      console.error('缓存音频失败:', err);
    });

    return arrayBuffer;
  }

  // 清理缓存
  async clearCache(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(AUDIO_KEY);

      request.onsuccess = () => {
        localStorage.removeItem(CACHE_VERSION_KEY);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// 导出单例
export const audioCache = new AudioCacheService();
