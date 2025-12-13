import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
        primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        secondary: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
        warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
        outline: 'border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
  removable?: boolean;
  onRemove?: () => void;
}

function Badge({
  className,
  variant,
  size,
  dot,
  dotColor,
  removable,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            dotColor || 'bg-current'
          )}
        />
      )}
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// Status Badge Component
interface StatusBadgeProps {
  status: 'active' | 'pending' | 'inactive' | 'error' | 'success' | 'warning';
  label?: string;
  className?: string;
}

const statusConfig = {
  active: { variant: 'success' as const, label: 'Active', dot: true },
  pending: { variant: 'warning' as const, label: 'Pending', dot: true },
  inactive: { variant: 'secondary' as const, label: 'Inactive', dot: true },
  error: { variant: 'error' as const, label: 'Error', dot: true },
  success: { variant: 'success' as const, label: 'Success', dot: false },
  warning: { variant: 'warning' as const, label: 'Warning', dot: false },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} dot={config.dot} className={className}>
      {label || config.label}
    </Badge>
  );
};

// Election Status Badge
interface ElectionStatusBadgeProps {
  status: string;
  className?: string;
}

const electionStatusConfig: Record<string, { variant: VariantProps<typeof badgeVariants>['variant']; label: string }> = {
  DRAFT: { variant: 'secondary', label: 'Draft' },
  PENDING_REVIEW: { variant: 'warning', label: 'Pending Review' },
  APPROVED: { variant: 'info', label: 'Approved' },
  PUBLISHED: { variant: 'primary', label: 'Published' },
  REGISTRATION_OPEN: { variant: 'info', label: 'Registration Open' },
  VOTING_OPEN: { variant: 'success', label: 'Voting Open' },
  VOTING_CLOSED: { variant: 'warning', label: 'Voting Closed' },
  TALLYING: { variant: 'warning', label: 'Tallying' },
  RESULTS_PUBLISHED: { variant: 'success', label: 'Results Published' },
  ARCHIVED: { variant: 'secondary', label: 'Archived' },
  CANCELLED: { variant: 'error', label: 'Cancelled' },
};

const ElectionStatusBadge: React.FC<ElectionStatusBadgeProps> = ({ status, className }) => {
  const config = electionStatusConfig[status] || { variant: 'secondary', label: status };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};

export { Badge, StatusBadge, ElectionStatusBadge, badgeVariants };
