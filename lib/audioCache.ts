// IndexedDB 音频缓存服务
// 用于缓存口令跟练音频，避免每次重新下载

const DB_NAME = 'AshtangaAudioDB';
const STORE_NAME = 'audioCache';
const LEGACY_AUDIO_KEY = 'guruji-led-primary';
const LEGACY_CACHE_VERSION_KEY = 'audio-cache-version';

type AudioDownloadDetails = {
  requestedUrl: string;
  responseUrl: string | null;
  status: number;
  redirected: boolean;
  contentType: string | null;
  contentLength: string | null;
  receivedBytes?: number;
};

export class AudioDownloadError extends Error {
  details: AudioDownloadDetails;

  constructor(message: string, details: AudioDownloadDetails) {
    super(message);
    this.name = 'AudioDownloadError';
    this.details = details;
  }
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function hasSupportedAudioSignature(bytes: Uint8Array) {
  // M4A / MP4 (ISO Base Media File Format)
  if (bytes.length >= 8 && startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return true;
  // MP3 with ID3 metadata or an MPEG frame sync.
  if (bytes.length >= 3 && startsWith(bytes, [0x49, 0x44, 0x33])) return true;
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true;
  // OGG, WAV and FLAC are accepted so this cache remains reusable.
  if (bytes.length >= 4 && startsWith(bytes, [0x4f, 0x67, 0x67, 0x53])) return true;
  if (bytes.length >= 12 && startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
    && startsWith(bytes, [0x57, 0x41, 0x56, 0x45], 8)) return true;
  return bytes.length >= 4 && startsWith(bytes, [0x66, 0x4c, 0x61, 0x43]);
}

export function validateAudioPayload(arrayBuffer: ArrayBuffer, contentType: string | null): void {
  const bytes = new Uint8Array(arrayBuffer);
  const prefix = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 160))).trimStart();

  if (prefix.startsWith('version https://git-lfs.github.com/spec/v1')) {
    throw new Error('音频地址返回了 Git LFS 指针，而不是真实音频');
  }

  if (!hasSupportedAudioSignature(bytes)) {
    const normalizedType = contentType?.split(';', 1)[0].trim().toLowerCase() || 'unknown';
    throw new Error(`响应不是有效音频: ${normalizedType}, ${bytes.byteLength} bytes`);
  }
}

function getCacheVersionKey(audioKey: string) {
  return `audio-cache-version:${audioKey}`;
}

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
  async isCacheValid(audioKey: string, currentVersion: string): Promise<boolean> {
    try {
      const versionKey = getCacheVersionKey(audioKey);
      let cachedVersion = localStorage.getItem(versionKey);

      // 兼容升级前已经下载的老掌门人缓存，避免重新下载大文件。
      if (!cachedVersion && audioKey === LEGACY_AUDIO_KEY) {
        cachedVersion = localStorage.getItem(LEGACY_CACHE_VERSION_KEY);
        if (cachedVersion === currentVersion) localStorage.setItem(versionKey, cachedVersion);
      }

      if (cachedVersion !== currentVersion) {
        return false;
      }

      const buffer = await this.getAudioBuffer(audioKey);
      if (!buffer) return false;

      try {
        validateAudioPayload(buffer, 'audio/mp4');
        return true;
      } catch {
        await this.clearCache(audioKey).catch(() => undefined);
        return false;
      }
    } catch {
      return false;
    }
  }

  // 检查是否有缓存的音频
  async hasAudio(audioKey: string): Promise<boolean> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(audioKey);

      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };

      request.onerror = () => resolve(false);
    });
  }

  // 获取缓存的音频（返回 Blob URL）
  async getAudioUrl(audioKey: string): Promise<string | null> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(audioKey);

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
  async getAudioBuffer(audioKey: string): Promise<ArrayBuffer | null> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(audioKey);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => resolve(null);
    });
  }

  // 保存音频到缓存
  async saveAudio(audioKey: string, currentVersion: string, arrayBuffer: ArrayBuffer): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(arrayBuffer, audioKey);

      request.onsuccess = () => {
        // 保存版本号
        localStorage.setItem(getCacheVersionKey(audioKey), currentVersion);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // 下载并缓存音频，带进度回调
  async downloadAndCache(
    url: string,
    audioKey: string,
    currentVersion: string,
    onProgress?: (loaded: number, total: number) => void,
    options?: { priority?: 'high' | 'low' | 'auto' }
  ): Promise<ArrayBuffer> {
    const response = await fetch(new Request(url, { priority: options?.priority || 'auto' }));

    const details: AudioDownloadDetails = {
      requestedUrl: url,
      responseUrl: response.url || null,
      status: response.status,
      redirected: Boolean(response.redirected),
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    };

    if (!response.ok) {
      throw new AudioDownloadError(`下载失败: ${response.status}`, details);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new AudioDownloadError('无法读取响应体', details);
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

    try {
      validateAudioPayload(arrayBuffer, details.contentType);
    } catch (error) {
      throw new AudioDownloadError(
        error instanceof Error ? error.message : '响应不是有效音频',
        { ...details, receivedBytes: loaded },
      );
    }

    // 保存到 IndexedDB（后台执行，不阻塞）
    this.saveAudio(audioKey, currentVersion, arrayBuffer).catch((err) => {
      console.error('缓存音频失败:', err);
    });

    return arrayBuffer;
  }

  // 清理缓存
  async clearCache(audioKey: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(audioKey);

      request.onsuccess = () => {
        localStorage.removeItem(getCacheVersionKey(audioKey));
        if (audioKey === LEGACY_AUDIO_KEY) localStorage.removeItem(LEGACY_CACHE_VERSION_KEY);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// 导出单例
export const audioCache = new AudioCacheService();
