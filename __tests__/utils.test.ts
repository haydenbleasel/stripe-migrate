import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStripeInstances, handleError } from '../src/lib/utils';
import chalk from 'chalk';

describe('utils', () => {
  describe('createStripeInstances', () => {
    it('should throw error when "from" argument is missing', () => {
      expect(() => createStripeInstances(undefined, 'sk_test_to')).toThrow(
        '<from> argument is required'
      );
    });

    it('should throw error when "to" argument is missing', () => {
      expect(() => createStripeInstances('sk_test_from', undefined)).toThrow(
        '<to> argument is required'
      );
    });

    it('should throw error when both arguments are missing', () => {
      expect(() => createStripeInstances()).toThrow(
        '<from> argument is required'
      );
    });

    it('should create Stripe instances with correct configuration', () => {
      const { oldStripe, newStripe } = createStripeInstances(
        'sk_test_from',
        'sk_test_to'
      );

      expect(oldStripe).toBeDefined();
      expect(newStripe).toBeDefined();
      // Verify they are separate instances
      expect(oldStripe).not.toBe(newStripe);
    });

    it('should return object with oldStripe and newStripe properties', () => {
      const result = createStripeInstances('sk_test_from', 'sk_test_to');

      expect(result).toHaveProperty('oldStripe');
      expect(result).toHaveProperty('newStripe');
    });
  });

  describe('handleError', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log Error message in red', () => {
      const error = new Error('Test error message');
      handleError(error);

      expect(consoleSpy).toHaveBeenCalledWith(chalk.red('Test error message'));
    });

    it('should convert non-Error objects to string', () => {
      handleError('string error');

      expect(consoleSpy).toHaveBeenCalledWith(chalk.red('string error'));
    });

    it('should handle number input', () => {
      handleError(404);

      expect(consoleSpy).toHaveBeenCalledWith(chalk.red('404'));
    });

    it('should handle null input', () => {
      handleError(null);

      expect(consoleSpy).toHaveBeenCalledWith(chalk.red('null'));
    });

    it('should handle undefined input', () => {
      handleError(undefined);

      expect(consoleSpy).toHaveBeenCalledWith(chalk.red('undefined'));
    });

    it('should handle object input', () => {
      handleError({ code: 'ERR_001' });

      expect(consoleSpy).toHaveBeenCalledWith(
        chalk.red('[object Object]')
      );
    });
  });
});
