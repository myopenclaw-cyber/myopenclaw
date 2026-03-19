import { afterEach, describe, expect, it, vi } from 'vitest';
import { WsManager } from '../ws-manager';

describe('WsManager chat event correlation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('captures runId from the chat.send ack response', () => {
    const manager = new WsManager() as any;
    manager.activeStreamId = 'req-1';
    manager.activeSessionKey = 'agent:main:myopenclaw:session-1';

    manager._handleMessage(JSON.stringify({
      type: 'res',
      id: 'req-1',
      ok: true,
      payload: { runId: 'run-1', status: 'started' },
    }));

    expect(manager.activeRunId).toBe('run-1');
  });

  it('ignores terminal chat events for a different runId', () => {
    const manager = new WsManager() as any;
    const cb = vi.fn();

    manager.activeStreamId = 'req-1';
    manager.activeRunId = 'run-1';
    manager.activeSessionKey = 'agent:main:myopenclaw:session-1';
    manager.pending.set('req-1', cb);
    manager.mainWindow = {
      isDestroyed: () => false,
      webContents: { send: vi.fn() },
    };

    manager._handleMessage(JSON.stringify({
      type: 'event',
      event: 'chat',
      payload: {
        state: 'final',
        runId: 'run-2',
        sessionKey: 'agent:main:myopenclaw:session-1',
        message: { content: [{ type: 'text', text: 'wrong run' }] },
      },
    }));

    expect(cb).not.toHaveBeenCalled();
    expect(manager.activeStreamId).toBe('req-1');
  });

  it('delays empty final events before resolving the active request', () => {
    vi.useFakeTimers();

    const manager = new WsManager() as any;
    const cb = vi.fn();

    manager.activeStreamId = 'req-1';
    manager.activeRunId = 'run-1';
    manager.activeSessionKey = 'agent:main:myopenclaw:session-1';
    manager.pending.set('req-1', cb);
    manager.mainWindow = {
      isDestroyed: () => false,
      webContents: { send: vi.fn() },
    };

    manager._handleMessage(JSON.stringify({
      type: 'event',
      event: 'chat',
      payload: {
        state: 'final',
        runId: 'run-1',
        sessionKey: 'agent:main:myopenclaw:session-1',
        message: { content: [] },
      },
    }));

    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(cb).toHaveBeenCalledWith(null);
  });
});
