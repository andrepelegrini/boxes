import { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'nubank' | 'nubank-elevated' | 'nubank-flat' | 'nubank-gradient' | 'default' | 'bordered' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variantClasses = {
  // Variantes Nubank (novas)
  nubank: 'bg-white rounded-nubank shadow-nubank border border-nubank-purple-500/10 transition-all duration-300',
  'nubank-elevated': 'bg-white rounded-nubank shadow-nubank-elevated border border-nubank-purple-500/5 transition-all duration-300',
  'nubank-flat': 'bg-nubank-gray-50 rounded-nubank border border-nubank-gray-200 transition-all duration-300',
  'nubank-gradient': 'bg-gradient-to-br from-white to-nubank-gray-50 rounded-nubank shadow-nubank border border-nubank-purple-500/10 transition-all duration-300',
  
  // Variantes legadas (atualizadas com estilo Nubank)
  default: 'bg-white rounded-nubank shadow-nubank border border-nubank-gray-200 transition-all duration-300',
  bordered: 'bg-white border-2 border-nubank-purple-500/20 rounded-nubank transition-all duration-300',
  elevated: 'bg-white rounded-nubank shadow-nubank-elevated border border-nubank-gray-100 transition-all duration-300',
  flat: 'bg-nubank-gray-50 rounded-nubank transition-all duration-300',
};

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const hoverClasses = 'hover:shadow-nubank-hover hover:-translate-y-1 hover:border-nubank-purple-500/20 cursor-pointer';

export function Card({
  variant = 'nubank',
  padding = 'md',
  hover = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const classes = [
    variantClasses[variant],
    paddingClasses[padding],
    hover ? hoverClasses : '',
    className,
  ].join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`border-b border-nubank-gray-200 pb-4 mb-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-xl font-bold text-nubank-gray-800 ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`text-nubank-gray-700 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`border-t border-nubank-gray-200 pt-4 mt-6 ${className}`} {...props}>
      {children}
    </div>
  );
}