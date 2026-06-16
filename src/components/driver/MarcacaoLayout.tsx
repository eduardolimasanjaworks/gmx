import { ReactNode } from 'react';

interface MarcacaoSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function MarcacaoSection({ title, children, className = '' }: MarcacaoSectionProps) {
  return (
    <div className={`rounded-lg border overflow-hidden bg-card ${className}`}>
      <div className="bg-yellow-400 text-black text-center py-2.5 px-3 font-bold uppercase text-sm tracking-wide">
        {title}
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

interface MarcacaoRowProps {
  label: string;
  value?: string | null;
  children?: ReactNode;
  emphasize?: boolean;
}

export function MarcacaoRow({ label, value, children, emphasize }: MarcacaoRowProps) {
  const display = value?.trim() ? value : '(vazio)';

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 min-h-[42px]">
      <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
        {label}
      </span>
      {children ?? (
        <span
          className={`text-sm text-right truncate max-w-[55%] ${
            value?.trim() ? (emphasize ? 'font-bold' : 'font-medium') : 'text-muted-foreground/50 italic'
          }`}
        >
          {display}
        </span>
      )}
    </div>
  );
}
