import { useState, useCallback, useEffect } from 'react';
import { getExternalBackendStatus, getRemoteBackendHttpUrl, isCompanionMode, storeExternalBackendAuthToken } from '../../lib/ipc-client';
import { getRemoteBackendCompatibility } from '../../lib/remote-backend-compatibility';
import { fetchRemoteBackendHealth } from '../../lib/remote-backend-health';
import type { RemoteBackendHealthResponse } from '../../../shared/types';

interface CompanionPairingScreenProps {
  onPaired: () => void;
}

/**
 * Full-screen pairing UI shown whenever external backend mode is enabled but no auth token exists.
 * The copy adapts for browser companion clients vs Electron thin-client launches.
 */
export function CompanionPairingScreen({ onPaired }: CompanionPairingScreenProps) {
  const backendStatus = getExternalBackendStatus();
  const browserCompanion = isCompanionMode();
  const backendLabel = browserCompanion ? 'Pilot Desktop' : 'Pilot backend';
  const pinSourceLabel = browserCompanion ? 'your Pilot Desktop' : 'the remote backend';
  const heading = browserCompanion ? 'Pilot Companion' : 'Pilot Backend Pairing';
  const subtitle = browserCompanion
    ? 'Connect this device to your Pilot Desktop'
    : 'Connect this Pilot app to your remote backend';
  const [pin, setPin] = useState('');
  const [deviceName, setDeviceName] = useState(() => getDefaultDeviceName());
  const [error, setError] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [healthCheckNonce, setHealthCheckNonce] = useState(0);
  const [backendReachability, setBackendReachability] = useState<{
    status: 'checking' | 'reachable' | 'unreachable';
    message: string;
    details: RemoteBackendHealthResponse | null;
  }>({
    status: 'checking',
    message: 'Checking backend availability…',
    details: null,
  });
  const backendBaseUrl = getRemoteBackendHttpUrl() ?? window.location.origin;
  const backendCompatibility = backendReachability.details
    ? getRemoteBackendCompatibility(backendReachability.details)
    : null;

  useEffect(() => {
    const controller = new AbortController();
    setBackendReachability({
      status: 'checking',
      message: 'Checking backend availability…',
      details: null,
    });

    fetchRemoteBackendHealth(backendBaseUrl, (input, init) =>
      fetch(input, { ...init, signal: controller.signal })
    )
      .then((details) => {
        setBackendReachability({
          status: 'reachable',
          message: `Backend reachable over ${details.protocol.toUpperCase()}`,
          details,
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setBackendReachability({
          status: 'unreachable',
          message: err instanceof Error ? err.message : 'Backend is unavailable',
          details: null,
        });
      });

    return () => controller.abort();
  }, [backendBaseUrl, healthCheckNonce]);

  const handlePair = useCallback(async () => {
    if (backendReachability.status === 'unreachable') {
      setError('Backend is unavailable. Retry the connection check before pairing.');
      return;
    }
    if (backendCompatibility?.status === 'incompatible') {
      setError(backendCompatibility.message);
      return;
    }
    if (pin.length !== 6) {
      setError(`Enter the 6-digit PIN from ${backendLabel}`);
      return;
    }

    setPairing(true);
    setError(null);

    try {
      const pairUrl = new URL('/api/companion-pair', backendBaseUrl);
      const res = await fetch(pairUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: pin, deviceName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Pairing failed (${res.status})`);
      }

      const { token } = await res.json();
      if (!token) throw new Error('No token received');

       // Persist token so reconnects and new tabs don't require re-pairing.
       // localStorage survives tab close; sessionStorage is only per-tab.
       storeExternalBackendAuthToken(token);
         onPaired();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pairing failed');
    } finally {
      setPairing(false);
    }
  }, [backendBaseUrl, backendCompatibility, backendLabel, backendReachability.status, pin, deviceName, onPaired]);

  const handlePinChange = (value: string) => {
    // Only allow digits, max 6
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 6) {
      handlePair();
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bg-base">
      <div className="max-w-md w-full mx-4 space-y-8">
        {/* Logo / Title */}
        <div className="text-center space-y-2">
          <div className="text-4xl">🧑‍✈️</div>
          <h1 className="text-2xl font-bold text-text-primary">{heading}</h1>
          <p className="text-text-secondary text-sm">
            {subtitle}
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-bg-elevated rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">How to pair</h2>
          <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
            <li>Open <strong className="text-text-primary">{backendLabel}</strong>{browserCompanion ? ' on your computer' : ''}</li>
            <li>Go to <strong className="text-text-primary">Settings → Companion</strong></li>
            <li>Make sure the companion server is <strong className="text-text-primary">enabled</strong></li>
            <li>Click <strong className="text-text-primary">"Show PIN"</strong> to get a 6-digit code</li>
            <li>Enter the code below</li>
          </ol>
          {!browserCompanion && backendStatus.httpUrl && (
            <p className="text-xs text-text-secondary">
              Target backend: <span className="font-mono text-text-primary">{backendStatus.httpUrl}</span>
            </p>
          )}
          <p className="text-xs text-text-secondary">
            Reachability:{' '}
            <span
              className={
                backendReachability.status === 'reachable'
                  ? 'text-success'
                  : (backendReachability.status === 'unreachable' ? 'text-error' : 'text-text-secondary')
              }
            >
              {backendReachability.message}
            </span>
          </p>
          {backendCompatibility && (
            <p className="text-xs text-text-secondary">
              Compatibility:{' '}
              <span className={backendCompatibility.status === 'compatible' ? 'text-success' : 'text-warning'}>
                {backendCompatibility.message}
              </span>
            </p>
          )}
          {backendReachability.status === 'unreachable' && (
            <button
              onClick={() => setHealthCheckNonce((value) => value + 1)}
              className="text-xs px-2.5 py-1 bg-bg-base border border-border text-text-secondary rounded hover:bg-bg-elevated hover:text-text-primary transition-colors"
            >
              Retry connection check
            </button>
          )}
        </div>

        {/* PIN Entry */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Pairing PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              autoFocus
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] rounded-lg
                bg-bg-base border border-border text-text-primary placeholder:text-text-secondary/30
                focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Device name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="My Device"
              className="w-full px-3 py-2 rounded-lg bg-bg-base border border-border text-text-primary
                text-sm placeholder:text-text-secondary/50
                focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-error text-center">{error}</p>
          )}

          <button
            onClick={handlePair}
            disabled={
              pin.length !== 6
              || pairing
              || !deviceName.trim()
              || backendReachability.status !== 'reachable'
              || backendCompatibility?.status === 'incompatible'
            }
            className="w-full py-3 rounded-lg text-sm font-medium transition-colors
              bg-accent text-white hover:bg-accent-hover
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pairing ? 'Pairing…' : 'Pair Device'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-text-secondary/60 text-center">
          The PIN expires after 30 seconds. Generate a new one on {pinSourceLabel} if it doesn't work.
        </p>
      </div>
    </div>
  );
}

function getDefaultDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Browser (Mac)';
  if (/Win/.test(ua)) return 'Browser (Windows)';
  if (/Linux/.test(ua)) return 'Browser (Linux)';
  return 'Browser';
}
