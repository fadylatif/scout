import { type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  gold?: boolean;
}

export function Card({ hover, gold, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-surface border border-border rounded-2xl',
        hover && 'transition-all duration-200 hover:border-gold-400/50 hover:shadow-md',
        gold && 'border-gold-400/30 shadow-gold',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-5 pt-5 pb-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-5 pb-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('px-5 pb-4 pt-3 border-t border-border', className)}
      {...props}
    >
      {children}
    </div>
  );
}
