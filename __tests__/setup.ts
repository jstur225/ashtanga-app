/**
 * Test setup file
 * Mocks IndexedDB for audioCache tests
 */

// Mock IndexedDB for audioCache tests
const fakeStore: Record<string, any> = {}

const mockIDBObjectStore = {
  get: (key: string) => ({
    onsuccess: null as ((e: any) => void) | null,
    onerror: null as ((e: any) => void) | null,
    result: fakeStore[key],
  }),
  put: (value: any, key?: string) => ({
    onsuccess: null as ((e: any) => void) | null,
    onerror: null as ((e: any) => void) | null,
  }),
  delete: (key: string) => ({
    onsuccess: null as ((e: any) => void) | null,
    onerror: null as ((e: any) => void) | null,
  }),
}

const mockTransaction = {
  objectStore: () => mockIDBObjectStore,
  oncomplete: null as ((e: any) => void) | null,
  onerror: null as ((e: any) => void) | null,
}

const mockDB = {
  transaction: () => mockTransaction,
}

const mockOpenDBRequest = {
  result: mockDB,
  onsuccess: null as ((e: any) => void) | null,
  onerror: null as ((e: any) => void) | null,
  onupgradeneeded: null as ((e: any) => void) | null,
}

const indexedDBMock = {
  open: () => {
    const req = { ...mockOpenDBRequest }
    setTimeout(() => {
      req.onsuccess?.({ target: req } as any)
    }, 0)
    return req
  },
  deleteDatabase: () => ({}),
}

// @ts-ignore
globalThis.indexedDB = indexedDBMock
