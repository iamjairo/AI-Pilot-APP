import { IPC } from '../../shared/ipc';

const LOCAL_INVOKE_CHANNELS = new Set<string>([
  IPC.DOCS_READ,
  IPC.DOCS_LIST,
  IPC.PROJECT_OPEN_DIALOG,
  IPC.SESSION_EXPORT,
  IPC.SESSION_EXPORT_CLIPBOARD,
  IPC.SESSION_EXPORT_BY_PATH,
  IPC.SESSION_EXPORT_CLIPBOARD_BY_PATH,
]);

const LOCAL_SEND_CHANNELS = new Set<string>([
  IPC.APP_THEME_CHANGED,
  IPC.TERMINAL_SET_MENU_VISIBLE,
]);

export function shouldUseLocalElectronTransport(channel: string, kind: 'invoke' | 'on' | 'send'): boolean {
  if (kind === 'invoke') {
    return channel.startsWith('shell:') || LOCAL_INVOKE_CHANNELS.has(channel);
  }

  if (kind === 'send') {
    return LOCAL_SEND_CHANNELS.has(channel);
  }

  if (kind === 'on') {
    return channel.startsWith('menu:');
  }

  return false;
}
