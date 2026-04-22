import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('renderer CSP', () => {
  it('allows remote backend HTTP and WebSocket connections', () => {
    const html = readFileSync(resolve(process.cwd(), 'src/index.html'), 'utf8');

    expect(html).toContain("connect-src 'self' https: http: wss: ws:");
  });
});
