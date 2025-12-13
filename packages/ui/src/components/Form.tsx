'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Check, Circle } from 'lucide-react';
import { cn } from '../lib/utils';

// Label Component
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    required?: boolean;
  }
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-slate-300',
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="ml-1 text-red-500">*</span>}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

// Checkbox Component
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    label?: string;
    description?: string;
  }
>(({ className, label, description, ...props }, ref) => {
  const id = React.useId();

  return (
    <div className="flex items-start gap-3">
      <CheckboxPrimitive.Root
        ref={ref}
        id={id}
        className={cn(
          'peer h-5 w-5 shrink-0 rounded border border-slate-300 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:border-slate-700 dark:bg-slate-900 dark:ring-offset-slate-900',
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <Check className="h-3.5 w-3.5" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={id}
              className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white"
            >
              {label}
            </label>
          )}
          {description && (
            <span className="text-sm text-slate-500 dark:text-slate-400">{description}</span>
          )}
        </div>
      )}
    </div>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

// Radio Group Component
const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn('grid gap-2', className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
    label?: string;
    description?: string;
  }
>(({ className, label, description, ...props }, ref) => {
  const id = React.useId();

  return (
    <div className="flex items-start gap-3">
      <RadioGroupPrimitive.Item
        ref={ref}
        id={id}
        className={cn(
          'aspect-square h-5 w-5 rounded-full border border-slate-300 text-blue-600 ring-offset-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:ring-offset-slate-900',
          className
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="h-2.5 w-2.5 fill-current text-current" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={id}
              className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white"
            >
              {label}
            </label>
          )}
          {description && (
            <span className="text-sm text-slate-500 dark:text-slate-400">{description}</span>
          )}
        </div>
      )}
    </div>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

// Switch Component
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
    label?: string;
    description?: string;
  }
>(({ className, label, description, ...props }, ref) => {
  const id = React.useId();

  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={id}
              className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white"
            >
              {label}
            </label>
          )}
          {description && (
            <span className="text-sm text-slate-500 dark:text-slate-400">{description}</span>
          )}
        </div>
      )}
      <SwitchPrimitive.Root
        id={id}
        className={cn(
          'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 dark:focus-visible:ring-offset-slate-900 dark:data-[state=unchecked]:bg-slate-700',
          className
        )}
        {...props}
        ref={ref}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
});
Switch.displayName = SwitchPrimitive.Root.displayName;

// Form Field Wrapper
interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {hint && !error && <p className="text-sm text-slate-500">{hint}</p>}
    </div>
  );
};

// Vote Option Card (for election ballots)
interface VoteOptionCardProps {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  selected?: boolean;
  disabled?: boolean;
  onChange?: (selected: boolean) => void;
  type?: 'radio' | 'checkbox';
}

const VoteOptionCard: React.FC<VoteOptionCardProps> = ({
  id,
  title,
  subtitle,
  description,
  imageUrl,
  selected,
  disabled,
  onChange,
  type = 'radio',
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange?.(!selected)}
      className={cn(
        'w-full rounded-xl border-2 p-4 text-left transition-all',
        selected
          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-2 dark:bg-blue-900/20'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <div className="flex items-start gap-4">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            className="h-16 w-16 rounded-lg object-cover"
          />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">{title}</h4>
              {subtitle && (
                <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                type === 'radio' ? 'rounded-full' : 'rounded-md',
                selected
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-600'
              )}
            >
              {selected && <Check className="h-4 w-4" />}
            </div>
          </div>
          {description && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>
    </button>
  );
};

export {
  Label,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Switch,
  FormField,
  VoteOptionCard,
};
