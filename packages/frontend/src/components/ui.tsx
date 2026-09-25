import type { ReactNode } from 'react';
import type { InventoryHealthBand, InventoryRiskFlag } from '@inventoryiq/core';

export type Tone = 'ok' | 'watch' | 'warn' | 'crit' | 'neutral' | 'info';

export function riskTone(flag: InventoryRiskFlag): Tone {
  if (flag === 'STOCKOUT_RISK') return 'crit';
  if (flag === 'CAPITAL_SURPLUS') return 'watch';
  return 'ok';
}

export function bandTone(band: InventoryHealthBand): Tone {
  if (band === 'HEALTHY') return 'ok';
  if (band === 'NEEDS_ATTENTION') return 'watch';
  if (band === 'AT_RISK') return 'warn';
  return 'crit';
}

export function alertTone(level: string): Tone {
  if (level === 'HEALTHY') return 'ok';
  if (level === 'WATCH') return 'watch';
  if (level === 'WARNING') return 'warn';
  return 'crit';
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Panel({
  title,
  desc,
  actions,
  foot,
  className = '',
  children,
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
  foot?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      <header className="panel-head">
        <div>
          <h2 className="panel-title">{title}</h2>
          {desc !== undefined ? <p className="panel-desc">{desc}</p> : null}
        </div>
        {actions !== undefined ? <div className="row-between">{actions}</div> : null}
      </header>
      <div className="panel-body">{children}</div>
      {foot !== undefined ? <footer className="panel-foot">{foot}</footer> : null}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <article className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub !== undefined ? <span className="stat-sub">{sub}</span> : null}
    </article>
  );
}

export function Delta({ value, suffix = '' }: { value: number; suffix?: string }) {
  const tone = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const sign = value > 0 ? '+' : '';
  return (
    <span className={`delta ${tone}`}>
      {sign}
      {Math.round(value).toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

export function Meter({
  value,
  max,
  tone = 'neutral',
  label,
}: {
  value: number;
  max: number;
  tone?: Tone;
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const toneClass = tone === 'neutral' || tone === 'info' ? '' : ` ${tone}`;
  return (
    <span className="meter">
      <span className="meter-track">
        <span
          className={`meter-fill${toneClass}`}
          style={{ width: `${pct}%` }}
          role="img"
          aria-label={`${Math.round(pct)} percent`}
        />
      </span>
      <span className="meter-value">{label ?? `${Math.round(pct)}%`}</span>
    </span>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <span className="empty-title">{title}</span>
      <span className="empty-body">{body}</span>
    </div>
  );
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Recomputing recommendations</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="skeleton skeleton-line"
          style={{ width: `${100 - index * 8}%` }}
        />
      ))}
    </div>
  );
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`callout ${tone}`}>
      <div>
        <div className="callout-title">{title}</div>
        {children !== undefined ? <div className="callout-body">{children}</div> : null}
      </div>
    </div>
  );
}

export function Legend({ items }: { items: readonly { label: string; color: string }[] }) {
  return (
    <div className="chart-legend">
      {items.map((item) => (
        <span key={item.label}>
          <span className="swatch" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export const CHART_INK = {
  primary: 'oklch(0.12 0.01 60)',
  secondary: 'oklch(0.35 0.02 60)',
  tertiary: 'oklch(0.55 0.02 60)',
  quaternary: 'oklch(0.7 0.02 60)',
  faint: 'oklch(0.85 0.01 60)',
  ok: 'oklch(0.55 0.1 152)',
  warn: 'oklch(0.62 0.16 45)',
  crit: 'oklch(0.53 0.2 27)',
  watch: 'oklch(0.68 0.14 72)',
} as const;
