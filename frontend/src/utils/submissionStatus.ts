export type SubmissionStatus = 'pending' | 'reviewed' | 'selected' | 'rejected';

export const STATUS_STYLES: Record<SubmissionStatus, { label: string; chipClass: string; badgeClass: string }> = {
  pending: {
    label: 'PENDING',
    chipClass: 'bg-amber-100 text-amber-800 border border-amber-300',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300',
  },
  reviewed: {
    label: 'REVIEWED',
    chipClass: 'bg-blue-100 text-blue-800 border border-blue-300',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-300',
  },
  selected: {
    label: 'SELECTED',
    chipClass: 'bg-green-100 text-green-800 border border-green-300',
    badgeClass: 'bg-green-100 text-green-800 border border-green-300',
  },
  rejected: {
    label: 'REJECTED',
    chipClass: 'bg-red-100 text-red-800 border border-red-300',
    badgeClass: 'bg-red-100 text-red-800 border border-red-300',
  },
};

export function getStatusStyle(status: SubmissionStatus) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.pending;
}
