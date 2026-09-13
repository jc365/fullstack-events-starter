import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserProvider, useUser } from './UserContext';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

import client from '../api/client';

function TestComponent() {
  const { user, participations, isLoading, refreshUser } = useUser();
  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="user">{user ? user.name : 'null'}</div>
      <div data-testid="participations">{participations.length}</div>
      <button onClick={refreshUser}>Refresh</button>
    </div>
  );
}

describe('UserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('refreshUser carga usuario y participaciones', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userId', 'user-123');

    const mockGet = vi.mocked(client.get);
    mockGet.mockImplementation((url: string | object) => {
      const urlStr = String(url);
      if (urlStr.includes('/users/user-123')) {
        return Promise.resolve({ data: { id: 'user-123', name: 'Test User', email: 'test@example.com' } });
      }
      return Promise.resolve({ data: [{ type: 'casting', castingId: 'c1', role: 'director' }] });
    });

    await act(async () => {
      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      expect(screen.getByTestId('participations')).toHaveTextContent('1');
    });
  });

  it('no carga datos cuando no hay token', async () => {
    await act(async () => {
      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('participations')).toHaveTextContent('0');
    });
  });

  it('Polling refresca participaciones cada 30 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userId', 'user-123');

    const mockGet = vi.mocked(client.get);
    mockGet.mockImplementation((url: string | object) => {
      const urlStr = String(url);
      if (urlStr.includes('/users/user-123')) {
        return Promise.resolve({ data: { id: 'user-123', name: 'Test User', email: 'test@example.com' } });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });

    const initialCallCount = mockGet.mock.calls.filter(
      (call) => String(call[0]).includes('/participations')
    ).length;

    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });

    await waitFor(() => {
      const newCallCount = mockGet.mock.calls.filter(
        (call) => String(call[0]).includes('/participations')
      ).length;
      expect(newCallCount).toBeGreaterThan(initialCallCount);
    });

    vi.useRealTimers();
  });
});
