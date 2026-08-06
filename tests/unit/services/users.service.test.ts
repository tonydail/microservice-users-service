import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '../../../src/services/users.service.js';
import { UsersRepository } from '../../../src/repositories/users.repository.js';
import { AppError } from '../../../src/middleware/errorHandler.js';

vi.mock('../../../src/repositories/users.repository.js');

const mockUsersRepo = vi.mocked(UsersRepository.prototype);

describe('UsersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('throws 404 when profile not found', async () => {
      mockUsersRepo.findByUserId = vi.fn().mockResolvedValue(null);
      const usersService = new UsersService();
      await expect(usersService.getProfile('missing-user')).rejects.toThrow(
        new AppError(404, 'Profile not found'),
      );
    });

    it('returns profile when found', async () => {
      const profile = { id: '1', userId: 'user-1', displayName: 'Alice' };
      mockUsersRepo.findByUserId = vi.fn().mockResolvedValue(profile);
      const usersService = new UsersService();
      const result = await usersService.getProfile('user-1');
      expect(result).toEqual(profile);
    });
  });

  describe('createProfileFromEvent', () => {
    it('skips creation if profile already exists (idempotent)', async () => {
      const existing = { id: '1', userId: 'user-1', displayName: null };
      mockUsersRepo.findByUserId = vi.fn().mockResolvedValue(existing);
      const usersService = new UsersService();
      const result = await usersService.createProfileFromEvent('user-1');
      expect(result).toEqual(existing);
      expect(mockUsersRepo.create).not.toHaveBeenCalled();
    });
  });
});
