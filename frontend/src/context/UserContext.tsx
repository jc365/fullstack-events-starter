import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';

interface CastingParticipation {
  type: 'casting';
  castingId: string;
  castingTitle: string;
  castingDescription: string;
  role: string;
}

interface RoundParticipation {
  type: 'round';
  roundId: string;
  roundNumber: number;
  castingId: string;
  castingTitle: string;
  role: string;
}

type Participation = CastingParticipation | RoundParticipation;

interface UserContextValue {
  user: { id: string; name: string; email: string } | null;
  participations: Participation[];
  isLoading: boolean;
  refreshParticipations: () => void;
  refreshUser: () => void;
  login: (credentials: { email: string; password: string } | { xUserId: string }) => Promise<void>;
  logout: () => void;
  isDirectorOf: (castingId: string) => boolean;
  isActorOf: (roundId: string) => boolean;
  isPreselectorOf: (roundId: string) => boolean;
  getRoleInCasting: (castingId: string) => string | null;
  getRoleInRound: (roundId: string) => string | null;
}

const UserContext = createContext<UserContextValue | null>(null);

const POLL_INTERVAL = 30_000;

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    !!localStorage.getItem('token')
  );
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAuth = useCallback(() => {
    const next = !!localStorage.getItem('token');
    setIsAuthenticated(next);
    return next;
  }, []);

  const fetchUser = useCallback(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) { setUser(null); return; }
    client.get(`/users/${userId}`)
      .then((res) => {
        setUser({ id: res.data.id, name: res.data.name, email: res.data.email });
      })
      .catch(() => setUser(null));
  }, []);

  const fetchParticipations = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setParticipations([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    client.get(`/users/me/participations?t=${Date.now()}`)
      .then((res) => {
        setParticipations(res.data);
      })
      .catch(() => setParticipations([]))
      .finally(() => setIsLoading(false));
  }, []);

  const refreshParticipations = useCallback(() => {
    fetchParticipations();
  }, [fetchParticipations]);

  const refreshUser = useCallback(() => {
    checkAuth();
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetchUser();
    } else {
      setUser(null);
    }
    fetchParticipations();
  }, [checkAuth, fetchUser, fetchParticipations]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      setParticipations([]);
      setIsLoading(false);
      return;
    }
    fetchUser();
    fetchParticipations();
  }, [isAuthenticated, fetchUser, fetchParticipations]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const startPolling = () => {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(() => {
        if (!document.hidden) {
          fetchParticipations();
        }
      }, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) stopPolling();
      else startPolling();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, fetchParticipations]);

  const isDirectorOf = useCallback((castingId: string) =>
    participations.some((p) => p.type === 'casting' && p.castingId === castingId && p.role === 'director'),
    [participations]
  );

  const isActorOf = useCallback((roundId: string) =>
    participations.some((p) => p.type === 'round' && p.roundId === roundId && p.role === 'actor'),
    [participations]
  );

  const isPreselectorOf = useCallback((roundId: string) =>
    participations.some((p) => p.type === 'round' && p.roundId === roundId && p.role === 'preselector'),
    [participations]
  );

  const getRoleInCasting = useCallback((castingId: string) => {
    const p = participations.find((p) => p.type === 'casting' && p.castingId === castingId);
    return p ? p.role : null;
  }, [participations]);

  const getRoleInRound = useCallback((roundId: string) => {
    const p = participations.find((p) => p.type === 'round' && p.roundId === roundId);
    return p ? p.role : null;
  }, [participations]);

  const login = useCallback(async (credentials: { email: string; password: string } | { xUserId: string }) => {
    const res = await client.post('/auth/login', credentials);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('userId', res.data.userId);
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    refreshUser();
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{
      user,
      participations,
      isLoading,
      refreshParticipations,
      refreshUser,
      login,
      logout,
      isDirectorOf,
      isActorOf,
      isPreselectorOf,
      getRoleInCasting,
      getRoleInRound,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
