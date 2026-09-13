import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useUser } from '../context/UserContext';
import SubmitVideoModal from '../components/SubmitVideoModal';
import type { SubmissionStatus } from '../utils/submissionStatus';
import { getRoleBadge } from '../utils/roleConfig';

interface Participant {
  userId: string;
  role: string;
}

interface Casting {
  id: string;
  title: string;
  description: string;
  participants: Participant[];
}

interface RoundSummary {
  id: string;
  number: number;
  castingId: string;
  castingTitle: string;
  status: 'active' | 'passed';
  submissions: SubmissionData[];
}

interface SubmissionData {
  id: string;
  actorId: string;
  duration: number | null;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
}

interface CastingWithRoles {
  id: string;
  title: string;
  description: string;
  roles: string[];
  roundsCount: number;
  totalSubmissions: number;
  pendingSubmissions: number;
}

export default function Dashboard() {
  const { participations } = useUser();
  const [castings, setCastings] = useState<Casting[]>([]);
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitModalRoundId, setSubmitModalRoundId] = useState<string | null>(null);

  const myCastingIds = useMemo(() => {
    const ids = new Set<string>();
    participations.forEach((p) => {
      if (p.type === 'casting') ids.add(p.castingId);
      if (p.type === 'round') ids.add(p.castingId);
    });
    return ids;
  }, [participations]);

  const rolesByCasting = useMemo(() => {
    const map = new Map<string, Set<string>>();
    participations.forEach((p) => {
      const castingId = p.type === 'casting' ? p.castingId : p.castingId;
      if (!map.has(castingId)) map.set(castingId, new Set());
      map.get(castingId)!.add(p.role);
    });
    return map;
  }, [participations]);

  const hasLoadedRef = useRef(false);
  const previousIdsRef = useRef<string>('');

  useEffect(() => {
    const currentIds = Array.from(myCastingIds).sort().join(',');

    if (previousIdsRef.current === currentIds && hasLoadedRef.current) {
      setLoading(false);
      return;
    }

    if (previousIdsRef.current !== currentIds && hasLoadedRef.current) {
      hasLoadedRef.current = false;
    }

    if (previousIdsRef.current !== currentIds) {
      previousIdsRef.current = currentIds;
    }

    if (hasLoadedRef.current) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        if (myCastingIds.size > 0) {
          const castingsRes = await client.get('/castings');
          if (cancelled) return;
          const allCastings: Casting[] = castingsRes.data;
          const myCastings = allCastings.filter((c) => myCastingIds.has(c.id));
          setCastings(myCastings);

          const roundsData: RoundSummary[] = [];
          for (const casting of myCastings) {
            const castingRes = await client.get(`/castings/${casting.id}`);
            if (cancelled) return;
            for (const r of castingRes.data.rounds) {
              const roundRes = await client.get(`/rounds/${r.id}`);
              if (cancelled) return;
              roundsData.push({
                id: r.id,
                number: r.number,
                castingId: casting.id,
                castingTitle: casting.title,
                status: r.status || 'active',
                submissions: roundRes.data.submissions,
              });
            }
          }
          if (!cancelled) {
            setRounds(roundsData);
            hasLoadedRef.current = true;
          }
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [myCastingIds]);

  const castingsWithRoles = useMemo<CastingWithRoles[]>(() => {
    return castings.map((casting) => {
      const roles = Array.from(rolesByCasting.get(casting.id) || []);
      const castingRounds = rounds.filter((r) => r.castingId === casting.id);
      const totalSubmissions = castingRounds.reduce((acc, r) => acc + r.submissions.length, 0);
      const pendingSubmissions = castingRounds.reduce(
        (acc, r) => acc + r.submissions.filter((s) => s.status === 'pending').length,
        0
      );
      return {
        id: casting.id,
        title: casting.title,
        description: casting.description,
        roles,
        roundsCount: castingRounds.length,
        totalSubmissions,
        pendingSubmissions,
      };
    });
  }, [castings, rounds, rolesByCasting]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-container text-on-error-container p-4 rounded-xl">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display-lg text-display-lg text-on-background">Dashboard</h1>
        <p className="text-on-surface-variant mt-2 font-body-lg text-body-lg">
          Your castings and participations.
        </p>
      </div>

      {castingsWithRoles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {castingsWithRoles.map((casting) => (
            <CastingCard key={casting.id} casting={casting} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-surface border border-outline-variant/30 rounded-xl">
          <span className="material-symbols-outlined text-6xl text-outline mb-4 block">movie_creation</span>
          <p className="text-on-surface-variant font-body-lg text-body-lg">
            No castings yet. Create your first one.
          </p>
        </div>
      )}

      {submitModalRoundId && (
        <SubmitVideoModal
          roundId={submitModalRoundId}
          isOpen={true}
          onClose={() => setSubmitModalRoundId(null)}
          onSuccess={() => {
            setSubmitModalRoundId(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function CastingCard({ casting }: { casting: CastingWithRoles }) {
  return (
    <Link
      to={`/castings/${casting.id}`}
      className="group relative bg-surface border border-outline-variant/30 rounded-xl overflow-hidden hover:border-primary/50 transition-colors duration-300 flex flex-col h-full cursor-pointer"
    >
      <div className="absolute inset-0 bg-surface-container-low opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="p-6 flex-1 flex flex-col z-10">
        <h3 className="font-headline-md text-headline-md text-on-background mb-2">
          {casting.title}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {casting.roles.map((role) => {
            const config = getRoleBadge(role);
            return (
              <span
                key={role}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label-caps border ${config.className}`}
              >
                <span>{config.icon}</span>
                {config.label}
              </span>
            );
          })}
        </div>

        <div className="flex gap-4 text-sm text-on-surface-variant mt-auto">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">loop</span>
            {casting.roundsCount} {casting.roundsCount === 1 ? 'round' : 'rounds'}
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">upload</span>
            {casting.totalSubmissions} submissions
          </span>
          {casting.pendingSubmissions > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">pending</span>
              {casting.pendingSubmissions} pending
            </span>
          )}
        </div>
      </div>
      <div className="bg-surface-container-high border-t border-outline-variant/30 p-4 z-10 relative">
        <span className="w-full flex items-center justify-between text-primary font-title-sm text-title-sm group-hover:text-primary-fixed transition-colors">
          <span>View Details</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </span>
      </div>
    </Link>
  );
}
