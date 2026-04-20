import packageJson from '../../package.json';

type InvokeHandler = (event: unknown, ...args: any[]) => unknown;
type EventHandler = (event: unknown, ...args: any[]) => void;

class IpcMainShim {
  public _invokeHandlers = new Map<string, InvokeHandler>();
  private eventHandlers = new Map<string, Set<EventHandler>>();

  handle(channel: string, handler: InvokeHandler): this {
    this._invokeHandlers.set(channel, handler);
    return this;
  }

  on(channel: string, handler: EventHandler): this {
    const listeners = this.eventHandlers.get(channel) ?? new Set<EventHandler>();
    listeners.add(handler);
    this.eventHandlers.set(channel, listeners);
    return this;
  }

  removeHandler(channel: string): this {
    this._invokeHandlers.delete(channel);
    return this;
  }

  removeAllListeners(channel?: string): this {
    if (channel) {
      this.eventHandlers.delete(channel);
      return this;
    }

    this.eventHandlers.clear();
    return this;
  }

  emit(channel: string, ...args: any[]): boolean {
    const listeners = this.eventHandlers.get(channel);
    if (!listeners) return false;

    for (const listener of listeners) {
      listener(null, ...args);
    }
    return listeners.size > 0;
  }
}

export const ipcMain = new IpcMainShim();

export class BrowserWindow {
  static getAllWindows(): BrowserWindow[] {
    return [];
  }

  static getFocusedWindow(): BrowserWindow | null {
    return null;
  }

  webContents = {
    send: (_channel: string, ..._args: any[]) => {},
  };
}

export const dialog = {
  async showOpenDialog(_windowOrOptions?: unknown, maybeOptions?: unknown) {
    const options = maybeOptions ?? _windowOrOptions;
    const openDirectory = Boolean(
      options &&
      typeof options === 'object' &&
      Array.isArray((options as { properties?: unknown[] }).properties) &&
      (options as { properties: unknown[] }).properties.includes('openDirectory')
    );

    return {
      canceled: true,
      filePaths: [],
      ...(openDirectory ? {} : { filePath: undefined }),
    };
  },

  async showSaveDialog(_windowOrOptions?: unknown, _maybeOptions?: unknown) {
    return {
      canceled: true,
      filePath: undefined,
    };
  },

  async showMessageBox(_windowOrOptions?: unknown, _maybeOptions?: unknown) {
    return {
      response: 1,
      checkboxChecked: false,
    };
  },
};

export const shell = {
  async openExternal(url: string): Promise<void> {
    console.warn(`[StandaloneBackend] shell.openExternal is unavailable: ${url}`);
  },

  showItemInFolder(filePath: string): void {
    console.warn(`[StandaloneBackend] shell.showItemInFolder is unavailable: ${filePath}`);
  },
};

export const clipboard = {
  writeText(_text: string): void {
    console.warn('[StandaloneBackend] clipboard.writeText is unavailable');
  },
};

const noop = () => {};

export const app = {
  commandLine: {
    appendSwitch: (_name: string, _value?: string) => {},
  },
  dock: undefined,
  getAppPath(): string {
    return process.env.PILOT_APP_ROOT || process.cwd();
  },
  getVersion(): string {
    return packageJson.version;
  },
  whenReady(): Promise<void> {
    return Promise.resolve();
  },
  on(_event: string, _listener: (...args: any[]) => void) {
    return app;
  },
  quit(): void {
    noop();
  },
};

export const Menu = {
  setApplicationMenu: (_menu: unknown) => {},
  buildFromTemplate: (template: unknown) => template,
};

export const protocol = {
  registerSchemesAsPrivileged: (_schemes: unknown) => {},
  handle: (_scheme: string, _handler: unknown) => {},
};

export const net = {
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
};
