import * as React from 'react';
import clsx from 'clsx';

type CardProps = React.PropsWithChildren<{
  title?: string;
  className?: string;
}>;

export const Card: React.FC<CardProps> = ({ title, children, className }) => (
  <section
    className={clsx(
      'rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900',
      className
    )}
  >
    {title ? <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2> : null}
    <div className={clsx(title ? 'mt-4' : '')}>{children}</div>
  </section>
);
