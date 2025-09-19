import { describe, it, expect, beforeEach } from 'vitest';
import { HashService } from '../hash.service';

describe('HashService', () => {
  let hashService: HashService;

  beforeEach(() => {
    hashService = new HashService();
  });

  describe('hash', () => {
    it('should hash a password successfully', async () => {
      const password = 'SecurePassword123!';
      const hashedPassword = await hashService.hash(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt pattern
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePassword123!';
      const hash1 = await hashService.hash(password);
      const hash2 = await hashService.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hashedPassword = await hashService.hash(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await hashService.hash(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    it('should handle unicode characters in password', async () => {
      const password = 'パスワード123!测试密码';
      const hashedPassword = await hashService.hash(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).toMatch(/^\$2[ayb]\$.{56}$/);
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'SecurePassword123!';
      const hashedPassword = await hashService.hash(password);

      const isValid = await hashService.verify(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await hashService.hash(password);

      const isValid = await hashService.verify(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should handle case sensitivity', async () => {
      const password = 'SecurePassword123!';
      const wrongCasePassword = 'securepassword123!';
      const hashedPassword = await hashService.hash(password);

      const isValid = await hashService.verify(wrongCasePassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should handle empty password verification', async () => {
      const password = '';
      const hashedPassword = await hashService.hash(password);

      const isValid = await hashService.verify('', hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await hashService.verify('notempty', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it('should handle invalid hash format', async () => {
      const password = 'SecurePassword123!';
      const invalidHash = 'invalid-hash-format';

      const isValid = await hashService.verify(password, invalidHash);
      expect(isValid).toBe(false);
    });

    it('should handle special and unicode characters in verification', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?パスワード123!测试密码';
      const hashedPassword = await hashService.hash(password);

      const isValid = await hashService.verify(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await hashService.verify(password + 'extra', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe('performance', () => {
    it('should hash password in reasonable time', async () => {
      const password = 'SecurePassword123!';
      const startTime = Date.now();

      await hashService.hash(password);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second (generous limit for CI environments)
      expect(duration).toBeLessThan(1000);
    });

    it('should verify password in reasonable time', async () => {
      const password = 'SecurePassword123!';
      const hashedPassword = await hashService.hash(password);

      const startTime = Date.now();
      await hashService.verify(password, hashedPassword);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});