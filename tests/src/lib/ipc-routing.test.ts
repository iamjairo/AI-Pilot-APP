import { describe, expect, it } from 'vitest';
import { IPC } from '../../../shared/ipc';
import { shouldUseLocalElectronTransport } from '../../../src/lib/ipc-routing';

describe('shouldUseLocalElectronTransport', () => {
  it('routes theme and terminal visibility sends locally', () => {
    expect(shouldUseLocalElectronTransport(IPC.APP_THEME_CHANGED, 'send')).toBe(true);
    expect(shouldUseLocalElectronTransport(IPC.TERMINAL_SET_MENU_VISIBLE, 'send')).toBe(true);
  });

  it('routes menu listeners locally', () => {
    expect(shouldUseLocalElectronTransport('menu:about', 'on')).toBe(true);
    expect(shouldUseLocalElectronTransport('menu:new-conversation', 'on')).toBe(true);
  });

  it('does not force regular backend invokes locally', () => {
    expect(shouldUseLocalElectronTransport(IPC.AGENT_PROMPT, 'invoke')).toBe(false);
    expect(shouldUseLocalElectronTransport(IPC.MCP_LIST_SERVERS, 'invoke')).toBe(false);
  });

  it('routes native shell and export invokes locally', () => {
    expect(shouldUseLocalElectronTransport(IPC.SHELL_CONFIRM_DIALOG, 'invoke')).toBe(true);
    expect(shouldUseLocalElectronTransport(IPC.SHELL_DETECT_EDITORS, 'invoke')).toBe(true);
    expect(shouldUseLocalElectronTransport(IPC.PROJECT_OPEN_DIALOG, 'invoke')).toBe(true);
    expect(shouldUseLocalElectronTransport(IPC.DOCS_READ, 'invoke')).toBe(true);
    expect(shouldUseLocalElectronTransport(IPC.SESSION_EXPORT, 'invoke')).toBe(true);
    expect(shouldUseLocalElectronTransport(IPC.SESSION_EXPORT_CLIPBOARD_BY_PATH, 'invoke')).toBe(true);
  });

  it('does not route normal push events locally', () => {
    expect(shouldUseLocalElectronTransport(IPC.AGENT_EVENT, 'on')).toBe(false);
  });
});
