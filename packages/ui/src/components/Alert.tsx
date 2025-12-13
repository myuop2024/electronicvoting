import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4',
  {
    variants: {
      variant: {
        default: 'bg-slate-50 text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700',
        info: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-900/20 dark:text-sky-100 dark:border-sky-800',
        success: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-100 dark:border-emerald-800',
        warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800',
        error: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-100 dark:border-red-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const iconMap = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', title, icon, dismissible, onDismiss, children, ...props }, ref) => {
    const IconComponent = iconMap[variant || 'default'];
    const displayIcon = icon !== undefined ? icon : <IconComponent className="h-5 w-5" />;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex gap-3">
          {displayIcon && <div className="shrink-0">{displayIcon}</div>}
          <div className="flex-1">
            {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
            <div className="text-sm [&_p]:leading-relaxed">{children}</div>
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);
Alert.displayName = 'Alert';

// Toast component for notifications
interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: VariantProps<typeof alertVariants>['variant'];
  duration?: number;
  onClose?: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  title,
  description,
  variant = 'default',
  onClose,
}) => {
  return (
    <div
      className={cn(
        alertVariants({ variant }),
        'animate-in slide-in-from-top-full fade-in-0 pointer-events-auto shadow-lg'
      )}
    >
      <div className="flex gap-3">
        <div className="shrink-0">
          {React.createElement(iconMap[variant || 'default'], { className: 'h-5 w-5' })}
        </div>
        <div className="flex-1">
          {title && <p className="font-medium">{title}</p>}
          {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => onClose?.(id)}
          className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Inline Alert for forms
interface InlineAlertProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  className?: string;
}

const InlineAlert: React.FC<InlineAlertProps> = ({ type, message, className }) => {
  const colors = {
    error: 'text-red-600 dark:text-red-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-sky-600 dark:text-sky-400',
  };

  const Icon = iconMap[type];

  return (
    <div className={cn('flex items-center gap-2 text-sm', colors[type], className)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
};

export { Alert, Toast, InlineAlert, alertVariants };
