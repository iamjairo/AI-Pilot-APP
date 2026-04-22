/**
 * @file Tunnel output store — manages remote provider output streams.
 */
import { create } from 'zustand';
import { IPC } from '../../shared/ipc';
import { on } from '../lib/ipc-client';

/** Tunnel provider type. */
export type TunnelProvider = 'tailscale' | 'cloudflare' | 'caddy';

/** Virtual command IDs used in the output window system. */
export const TUNNEL_IDS = {
  tailscale: '__tunnel:tailscale__',
  cloudflare: '__tunnel:cloudflare__',
  caddy: '__tunnel:caddy__',
} as const;

/** Labels for display in output window tabs. */
export const TUNNEL_LABELS: Record<string, string> = {
  [TUNNEL_IDS.tailscale]: 'Tailscale Funnel',
  [TUNNEL_IDS.cloudflare]: 'Cloudflare Tunnel',
  [TUNNEL_IDS.caddy]: 'Caddy Reverse Proxy',
};

/** Check if a command ID is a tunnel output tab. */
export function isTunnelId(id: string): boolean {
  return id === TUNNEL_IDS.tailscale || id === TUNNEL_IDS.cloudflare || id === TUNNEL_IDS.caddy;
}

/** Get the provider from a tunnel ID. */
export function tunnelIdToProvider(id: string): TunnelProvider | null {
  if (id === TUNNEL_IDS.tailscale) return 'tailscale';
  if (id === TUNNEL_IDS.cloudflare) return 'cloudflare';
  if (id === TUNNEL_IDS.caddy) return 'caddy';
  return null;
}

interface TunnelOutputStore {
  output: Record<TunnelProvider, string>;
  appendOutput: (provider: TunnelProvider, text: string) => void;
  clearOutput: (provider: TunnelProvider) => void;
}

/**
 * Tunnel output store — manages Tailscale and Cloudflare tunnel output streams.
 */
export const useTunnelOutputStore = create<TunnelOutputStore>((set) => ({
  output: {
    tailscale: '',
    cloudflare: '',
    caddy: '',
  },

  appendOutput: (provider: TunnelProvider, text: string) => {
    set((s) => ({
      output: {
        ...s.output,
        [provider]: s.output[provider] + text,
      },
    }));
  },

  clearOutput: (provider: TunnelProvider) => {
    set((s) => ({
      output: {
        ...s.output,
        [provider]: '',
      },
    }));
  },
}));

/**
 * Register IPC push-event listener for tunnel output.
 * Called once from main.tsx after window.api is available.
 */
let _tunnelListenersRegistered = false;
export function initTunnelOutputListeners(): void {
  if (_tunnelListenersRegistered) return;
  _tunnelListenersRegistered = true;

  on(IPC.COMPANION_TUNNEL_OUTPUT, (provider: unknown, text: unknown) => {
    if (typeof provider === 'string' && typeof text === 'string') {
      useTunnelOutputStore.getState().appendOutput(provider as TunnelProvider, text);
    }
  });
}
