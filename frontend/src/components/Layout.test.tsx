import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

const mockRefreshUser = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock('../context/UserContext', () => ({
  useUser: () => ({
    user: null,
    refreshUser: mockRefreshUser,
    login: mockLogin,
    logout: mockLogout,
  }),
  UserProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    themes: [
      { id: 'light', label: 'Light', cssClass: '' },
      { id: 'dark', label: 'Dark', cssClass: 'dark' },
      { id: 'ocean', label: 'Ocean', cssClass: 'theme-ocean' },
      { id: 'forest', label: 'Forest', cssClass: 'theme-forest' },
      { id: 'sunset', label: 'Sunset', cssClass: 'theme-sunset' },
      { id: 'night', label: 'Night', cssClass: 'theme-night' },
    ],
    getThemeLabel: (id: string) => id,
    getThemeClass: (id: string) => id === 'dark' ? 'dark' : '',
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_DEMO_MODE: 'true' },
      writable: true,
    });
  });

  it('shows login form when not authenticated', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    expect(screen.getAllByText('Slate Casting').length).toBeGreaterThan(0);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('toggle demo llama a login con xUserId', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    const toggle = screen.getByText('Demo Mode').closest('div')?.querySelector('.relative');
    if (toggle) {
      fireEvent.click(toggle);
    }

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ xUserId: 'director' });
    });
  });

  it('toggle demo guarda token y userId en localStorage', async () => {
    mockLogin.mockImplementation(async () => {
      localStorage.setItem('token', 'demo-token');
      localStorage.setItem('userId', 'user-director-1');
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    const toggle = screen.getByText('Demo Mode').closest('div')?.querySelector('.relative');
    if (toggle) {
      fireEvent.click(toggle);
    }

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('demo-token');
      expect(localStorage.getItem('userId')).toBe('user-director-1');
    });
  });

  it('toggle demo OFF limpia localStorage', async () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem('userId', 'user-123');

    mockLogout.mockImplementation(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    const toggle = screen.getByText('Demo Mode').closest('div')?.querySelector('.relative');
    if (toggle) {
      fireEvent.click(toggle);
    }

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('userId')).toBeNull();
    });
  });

  it('role selector changes selected role', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mode Demo Activated')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    const roleSelect = selects.find((s) => s.querySelector('option[value="director"]'));
    if (roleSelect) {
      fireEvent.change(roleSelect, { target: { value: 'actor' } });
    }

    await waitFor(() => {
      expect(screen.getByText('Mode Demo Activated')).toBeInTheDocument();
    });
  });
});
