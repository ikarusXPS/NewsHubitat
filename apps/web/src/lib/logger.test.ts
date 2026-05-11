import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    debugSpy.mockRestore();
  });

  describe('level methods', () => {
    it('logger.log delegates to console.log', () => {
      logger.log('hello');
      expect(logSpy).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledWith('hello');
    });

    it('logger.info delegates to console.info', () => {
      logger.info('hello');
      expect(infoSpy).toHaveBeenCalledWith('hello');
    });

    it('logger.warn delegates to console.warn', () => {
      logger.warn('hello');
      expect(warnSpy).toHaveBeenCalledWith('hello');
    });

    it('logger.error delegates to console.error', () => {
      logger.error('hello');
      expect(errorSpy).toHaveBeenCalledWith('hello');
    });

    it('logger.debug delegates to console.debug', () => {
      logger.debug('hello');
      expect(debugSpy).toHaveBeenCalledWith('hello');
    });
  });

  describe('argument scrubbing', () => {
    it('scrubs email patterns inside string args', () => {
      logger.info('login failed for alice@example.com');
      expect(infoSpy).toHaveBeenCalledWith('login failed for [redacted-email]');
    });

    it('scrubs sensitive keys inside object args', () => {
      logger.warn('config:', { password: 'secret', name: 'Alice' });
      const arg = warnSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(arg.password).toBe('[redacted]');
      expect(arg.name).toBe('Alice');
    });

    it('rebuilds Error instances with scrubbed message + stack', () => {
      const err = new Error('Login failed for charlie@example.com');
      err.stack = 'Error: Login failed for charlie@example.com\n    at handler.ts:42';
      logger.error('caught:', err);
      const passed = errorSpy.mock.calls[0][1] as Error;
      expect(passed).toBeInstanceOf(Error);
      expect(passed.message).toBe('Login failed for [redacted-email]');
      expect(passed.stack).toContain('[redacted-email]');
      expect(passed.name).toBe('Error');
    });

    it('preserves Error.name for custom Error subclasses', () => {
      class MyErr extends Error {
        constructor(msg: string) {
          super(msg);
          this.name = 'MyErr';
        }
      }
      const err = new MyErr('boom');
      logger.error(err);
      const passed = errorSpy.mock.calls[0][0] as Error;
      expect(passed.name).toBe('MyErr');
    });

    it('passes primitives through unchanged', () => {
      logger.log(42, true, null, undefined);
      expect(logSpy).toHaveBeenCalledWith(42, true, null, undefined);
    });

    it('passes multiple mixed args independently scrubbed', () => {
      logger.warn('user:', { password: 'p' }, 'email:', 'bob@example.com');
      const args = warnSpy.mock.calls[0];
      expect(args[0]).toBe('user:');
      expect((args[1] as Record<string, unknown>).password).toBe('[redacted]');
      expect(args[2]).toBe('email:');
      expect(args[3]).toBe('[redacted-email]');
    });

    it('handles Error with no stack property by leaving the rebuilt stack alone', () => {
      // When the input Error has no stack, the rebuilt Error gets its own
      // (browser-supplied) stack from `new Error(...)` — that's expected and
      // safer than leaking nothing. The contract is: rebuilt Error preserves
      // message + name and never throws.
      const err = new Error('plain');
      err.stack = undefined as unknown as string;
      expect(() => logger.error(err)).not.toThrow();
      const passed = errorSpy.mock.calls[0][0] as Error;
      expect(passed.message).toBe('plain');
      expect(passed.name).toBe('Error');
    });
  });
});
