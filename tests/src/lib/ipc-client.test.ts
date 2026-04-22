import { beforeEach, describe, expect, it, vi } from 'vitest';

class FakeWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = FakeWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(_url: string) {}

  send(_data: string): void {}

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.(new Event('close'));
  }
}

function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

describe('ipc-client external backend controls', () => {
  beforeEach(() => {
    vi.resetModules();
    const localStorageMock = createStorage();
    const sessionStorageMock = createStorage();
    const locationMock = new URL('http://localhost/');
    const windowMock = {
      api: {
        platform: 'darwin',
        invoke: vi.fn(),
        on: vi.fn(() => () => {}),
        send: vi.fn(),
      },
      location: locationMock,
      navigator: { userAgent: 'Macintosh' },
      history: {
        replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
          const next = new URL(url?.toString() ?? 'http://localhost/', locationMock.toString());
          locationMock.href = next.toString();
        },
      },
      open: vi.fn(),
    };

    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    vi.stubGlobal('location', locationMock);
    vi.stubGlobal('window', windowMock);
    vi.stubGlobal('navigator', windowMock.navigator);
    window.history.replaceState({}, '', 'http://localhost/');
    (window as any).api = {
      platform: 'darwin',
      invoke: vi.fn(),
      on: vi.fn(() => () => {}),
      send: vi.fn(),
    };
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  it('clears stored backend auth and returns to unpaired state', async () => {
    window.history.replaceState({}, '', 'http://localhost/?remoteBackendUrl=https://nas.local:18088');
    localStorage.setItem('companion-auth-token', 'token-123');
    localStorage.setItem('companion-ws-url', 'wss://nas.local:18088/');

    const ipcClient = await import('../../../src/lib/ipc-client');
    ipcClient.initCompanionPolyfill();

    expect(ipcClient.getExternalBackendStatus().state).toBe('connecting');

    ipcClient.resetExternalBackendSession();

    expect(localStorage.getItem('companion-auth-token')).toBeNull();
    expect(localStorage.getItem('companion-ws-url')).toBeNull();
    expect(localStorage.getItem('companion-auth-token:https%3A%2F%2Fnas.local%3A18088')).toBeNull();
    expect(localStorage.getItem('companion-ws-url:https%3A%2F%2Fnas.local%3A18088')).toBeNull();
    expect(ipcClient.getExternalBackendStatus().state).toBe('unpaired');
  });

  it('scopes stored auth by backend target', async () => {
    const ipcClient = await import('../../../src/lib/ipc-client');

    window.history.replaceState({}, '', 'http://localhost/?remoteBackendUrl=https://nas-a.local:18088');
    ipcClient.initCompanionPolyfill();
    ipcClient.storeExternalBackendAuthToken('token-a');
    expect(ipcClient.getExternalBackendStatus().state).toBe('connecting');

    window.history.replaceState({}, '', 'http://localhost/?remoteBackendUrl=https://nas-b.local:18088');
    ipcClient.initCompanionPolyfill();

    expect(ipcClient.getExternalBackendStatus().state).toBe('unpaired');
    expect(localStorage.getItem('companion-auth-token:https%3A%2F%2Fnas-a.local%3A18088')).toBe('token-a');
    expect(localStorage.getItem('companion-auth-token:https%3A%2F%2Fnas-b.local%3A18088')).toBeNull();
  });

  it('updates the active backend target in place', async () => {
    const ipcClient = await import('../../../src/lib/ipc-client');

    window.history.replaceState({}, '', 'http://localhost/?remoteBackendUrl=https://nas-a.local:18088');
    ipcClient.initCompanionPolyfill();
    expect(ipcClient.getRemoteBackendHttpUrl()).toBe('https://nas-a.local:18088/');

    ipcClient.setExternalBackendTarget('https://nas-b.local:18088');

    expect(window.location.search).toContain('remoteBackendUrl=https%3A%2F%2Fnas-b.local%3A18088');
    expect(ipcClient.getRemoteBackendHttpUrl()).toBe('https://nas-b.local:18088/');
    expect(ipcClient.getExternalBackendStatus().state).toBe('unpaired');
  });
});
