import type { ReactNode } from 'react';

/*
 * Math primitives shared by the About narrative and the per-layer breakdown.
 * The engine's rules are formulas, so they are set as formulas rather than as
 * styled spans wherever they appear.
 */

export function V({ children }: { children: ReactNode }) {
  return <span className="math-v">{children}</span>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <span className="math-sub">{children}</span>;
}

export function Pow({ children }: { children: ReactNode }) {
  return <span className="math-sup">{children}</span>;
}

export function O({ children }: { children: ReactNode }) {
  return <span className="math-op">{children}</span>;
}

export function Fraction({ n, d }: { n: ReactNode; d: ReactNode }) {
  return (
    <span className="math-frac">
      <span>{n}</span>
      <span>{d}</span>
    </span>
  );
}

export function Root({ children }: { children: ReactNode }) {
  return (
    <span className="math-sqrt">
      <span className="math-radic">√</span>
      <span className="math-sqrt-body">{children}</span>
    </span>
  );
}

export function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="math-block">
      <span className="math-label">{label}</span>
      {children}
    </div>
  );
}

export function Line({ children }: { children: ReactNode }) {
  return <div className="math-line">{children}</div>;
}
