import { useState } from 'react';
import type { ReactNode } from 'react';
import { COVERAGE_TALLY } from './data/coverage';
import { AS_OF, PORTFOLIO, SKUS, TRANSFERS, VENDORS } from './data/model';
import { PIPELINE_SOURCES, SCHEMA_TABLES } from './data/pipeline';
import { SkuWorkbenchSection } from './sections/SkuWorkbenchSection';
import { OverviewSection } from './sections/OverviewSection';
import { MslSection } from './sections/MslSection';
import { DemandSection } from './sections/DemandSection';
import { CapitalSection } from './sections/CapitalSection';
import { TransfersSection } from './sections/TransfersSection';
import { VendorsSection } from './sections/VendorsSection';
import { PipelineSection } from './sections/PipelineSection';
import { CoverageSection } from './sections/CoverageSection';
import { AboutSection } from './sections/AboutSection';
import { formatDate, formatInt } from './utils/format';

type SectionId =
  | 'sku'
  | 'overview'
  | 'msl'
  | 'demand'
  | 'capital'
  | 'transfers'
  | 'vendors'
  | 'pipeline'
  | 'coverage'
  | 'about';

interface SectionDef {
  id: SectionId;
  index: string;
  label: string;
  title: string;
  desc: string;
  badge?: string;
  render: () => ReactNode;
}

const SECTIONS: readonly SectionDef[] = [
  {
    id: 'sku',
    index: '00',
    label: 'SKU workbench',
    title: 'SKU workbench',
    desc: 'One SKU, everything the engine knows about it: run rate, safety stock, service class, capital, movement, warehouses and vendors.',
    badge: `${SKUS.length} SKUs`,
    render: () => <SkuWorkbenchSection />,
  },
  {
    id: 'overview',
    index: '01',
    label: 'Overview',
    title: 'Executive overview',
    desc: 'Portfolio posture, trapped capital, and coverage across every problem the project set out to solve.',
    render: () => <OverviewSection />,
  },
  {
    id: 'msl',
    index: '02',
    label: 'MSL engine',
    title: 'Dynamic MSL engine',
    desc: 'Rolling daily run rate against the static Procura formula, SKU by SKU, with the engine rationale.',
    badge: String(PORTFOLIO.mslIncrease + PORTFOLIO.mslDecrease),
    render: () => <MslSection />,
  },
  {
    id: 'demand',
    index: '03',
    label: 'Demand',
    title: 'Demand intelligence',
    desc: 'Safety stock, ABC/XYZ segmentation, festival seasonality and net demand after returns.',
    badge: `${SKUS.filter((model) => model.classification.combinedClass === 'AX').length} AX`,
    render: () => <DemandSection />,
  },
  {
    id: 'capital',
    index: '04',
    label: 'Working capital',
    title: 'Working capital intelligence',
    desc: 'Surplus aging, dead stock, MOQ exposure and the carrying cost of capital sitting still.',
    badge: String(SKUS.filter((model) => model.surplusUnits > 0).length),
    render: () => <CapitalSection />,
  },
  {
    id: 'transfers',
    index: '05',
    label: 'Transfers',
    title: 'Transfer intelligence',
    desc: 'Surplus-to-deficit moves across the warehouse network, with proximity, transit time and cost.',
    badge: String(TRANSFERS.recommendations.length),
    render: () => <TransfersSection />,
  },
  {
    id: 'vendors',
    index: '06',
    label: 'Vendors',
    title: 'Vendor intelligence',
    desc: 'OTIF scorecards, cross-vendor rate disparities, concentration risk and allocation options.',
    badge: String(VENDORS.priceComparison.alerts.length),
    render: () => <VendorsSection />,
  },
  {
    id: 'pipeline',
    index: '07',
    label: 'Pipeline',
    title: 'Integration layer',
    desc: 'How each source arrives, what it carries, and the schema the whole pipeline writes into.',
    badge: `${PIPELINE_SOURCES.filter((source) => source.status === 'WIRED').length}/${PIPELINE_SOURCES.length}`,
    render: () => <PipelineSection />,
  },
  {
    id: 'coverage',
    index: '08',
    label: 'Limitations',
    title: 'Limitations ledger',
    desc: 'All twelve baseline findings from the Procura review, with the working evidence that answers each.',
    badge: `${COVERAGE_TALLY.addressed}/${COVERAGE_TALLY.total}`,
    render: () => <CoverageSection />,
  },
  {
    id: 'about',
    index: '09',
    label: 'About',
    title: 'About this build',
    desc: 'What InventoryIQ is, what was broken, the rules the engine applies in place of the old assumptions, and what is still missing.',
    render: () => <AboutSection />,
  },
];

const SECTION_BY_ID = new Map<SectionId, SectionDef>(SECTIONS.map((entry) => [entry.id, entry]));

const NAV_GROUPS: readonly { label: string; ids: readonly SectionId[] }[] = [
  { label: 'Per SKU', ids: ['sku'] },
  { label: 'Portfolio', ids: ['overview', 'msl', 'demand', 'capital'] },
  { label: 'Operations', ids: ['transfers', 'vendors', 'pipeline'] },
  { label: 'Reference', ids: ['coverage', 'about'] },
];

export function App() {
  const [active, setActive] = useState<SectionId>('sku');

  const section: SectionDef = SECTION_BY_ID.get(active) ?? SECTIONS[0]!;

  return (
    <div className="app">
      <a
        href="#content"
        className="btn btn-ghost"
        style={{ position: 'absolute', left: 10, top: 10, zIndex: 100, transform: 'translateY(-200%)' }}
        onFocus={(event) => {
          event.currentTarget.style.transform = 'translateY(0)';
        }}
        onBlur={(event) => {
          event.currentTarget.style.transform = 'translateY(-200%)';
        }}
      >
        Skip to content
      </a>

      <nav className="rail" aria-label="Sections">
        <div className="rail-brand">
          <span className="rail-mark">
            Inventory<span className="iq">IQ</span>
          </span>
          <span className="rail-by">Axiom Labs × EVM Zone</span>
        </div>

        <div className="rail-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ display: 'contents' }}>
              <span className="nav-label">{group.label}</span>
              {group.ids.map((id) => {
                const entry = SECTION_BY_ID.get(id);
                if (entry === undefined) {
                  return null;
                }
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className="nav-link"
                    aria-current={active === entry.id ? 'page' : undefined}
                    onClick={() => setActive(entry.id)}
                  >
                    <span className="nav-index">{entry.index}</span>
                    {entry.label}
                    {entry.badge !== undefined ? <span className="nav-badge">{entry.badge}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="rail-foot">
          <div className="legend">
            <span className="legend-item">
              <span className="dot dot-observed" aria-hidden="true" /> observed from EVM systems
            </span>
            <span className="legend-item">
              <span className="dot dot-imported" aria-hidden="true" /> imported via pipeline
            </span>
            <span className="legend-item">
              <span className="dot dot-simulated" aria-hidden="true" /> simulated history
            </span>
          </div>
          <span>
            Run of <span className="mono">{formatDate(AS_OF)}</span>
          </span>
          <span>
            {formatInt(SCHEMA_TABLES.length)} tables · recommend-only
          </span>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <div className="topbar-titles">
            <span className="eyebrow">{section.label}</span>
            <h1 className="page-title">{section.title}</h1>
            <p className="page-sub">{section.desc}</p>
          </div>
        </header>

        <main className="content stagger" id="content" key={active}>
          {section.render()}
        </main>
      </div>
    </div>
  );
}
