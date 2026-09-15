import { useEffect, useState } from 'react';
import client from '../api/client';

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

export default function Castings() {
  const [castings, setCastings] = useState<Casting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/castings')
      .then((res) => setCastings(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading castings...
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
    <div>
      <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-background mb-6">
        Casting Calls
      </h1>
      {castings.length === 0 ? (
        <p className="text-on-surface-variant font-body-lg text-body-lg">
          No hay castings creados.
        </p>
      ) : (
        <div className="space-y-4">
          {castings.map((c) => (
            <div
              key={c.id}
              className="bg-surface border border-outline-variant/30 rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-background">
                    {c.title}
                  </h3>
                  <p className="text-on-surface-variant font-body-sm text-body-sm mt-1">
                    {c.description}
                  </p>
                </div>
                <code className="text-xs text-outline bg-surface-container-high px-2 py-1 rounded">
                  {c.id}
                </code>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-outline-variant/20 pt-4">
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">
                    Participants
                  </p>
                  <p className="font-title-sm text-title-sm text-on-surface">
                    {c.participants.length}
                  </p>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">
                    Directors
                  </p>
                  <p className="font-title-sm text-title-sm text-on-surface">
                    {c.participants.filter((p) => p.role === 'director').length}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
