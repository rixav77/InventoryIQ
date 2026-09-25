import { COVERAGE_TALLY, LIMITATIONS } from '../data/coverage';
import type { CoverageStatus, Harm } from '../data/coverage';
import { Badge, Callout, Panel, Stat } from '../components/ui';
import { formatInt } from '../utils/format';

function harmTone(harm: Harm): 'crit' | 'warn' | 'watch' | 'neutral' {
  if (harm === 'CRITICAL') return 'crit';
  if (harm === 'HIGH') return 'warn';
  if (harm === 'MODERATE') return 'watch';
  return 'neutral';
}

function statusTone(status: CoverageStatus): 'ok' | 'watch' | 'neutral' {
  if (status === 'ADDRESSED') return 'ok';
  if (status === 'PARTIAL') return 'watch';
  return 'neutral';
}

export function CoverageSection() {
  const byHarm = (harm: Harm) => LIMITATIONS.filter((item) => item.harm === harm).length;

  return (
    <>
      <p className="section-intro">
        The 22 September review produced twelve ranked limitations in EVM's Procura planning. This is the
        honest ledger: what the engine answers today, with the number that proves it, and what is still open.
        Two low-harm items are deferred rather than dressed up.
      </p>

      <div className="stats stagger">
        <Stat label="Tracked limitations" value={formatInt(COVERAGE_TALLY.total)} sub="ranked by harm" />
        <Stat label="Addressed" value={formatInt(COVERAGE_TALLY.addressed)} sub="shipped and evidenced" />
        <Stat
          label="Critical + high"
          value={formatInt(byHarm('CRITICAL') + byHarm('HIGH'))}
          sub={`${byHarm('CRITICAL')} critical · ${byHarm('HIGH')} high`}
        />
        <Stat label="Deferred" value={formatInt(COVERAGE_TALLY.deferred)} sub="low harm, V1 scope" />
      </div>

      <Panel
        title="Limitation ledger"
        desc="Each row pairs the original finding with the specific evidence the engine now produces."
        foot={
          <>
            <Badge tone="ok">addressed</Badge>
            <Badge tone="watch">partial</Badge>
            <Badge tone="neutral">deferred</Badge>
            <span>Evidence values are recomputed on every load.</span>
          </>
        }
      >
        <div className="coverage">
          {LIMITATIONS.map((item) => (
            <div className="coverage-row" key={item.n}>
              <div className="coverage-main">
                <div className="coverage-head">
                  <span className="coverage-num">{String(item.n).padStart(2, '0')}</span>
                  <span className="coverage-problem">{item.problem}</span>
                  <Badge tone={harmTone(item.harm)}>{item.harm}</Badge>
                </div>
                <div className="coverage-note">
                  {item.solution} · <span className="coverage-engine">{item.engine}</span>
                </div>
              </div>
              <div className="coverage-side">
                <span className="coverage-evidence">{item.evidence}</span>
                <Badge tone={statusTone(item.status)}>{item.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout tone="watch" title="What is deliberately not claimed">
        Spare-parts segregation and the MSP audit trail are deferred: the first needs warranty RMA history that
        is not in the current export, and the second needs write-path access to Procura that the prototype
        intentionally does not have. Until then, MSP remains an observed input the engine consumes rather than
        overrides.
      </Callout>
    </>
  );
}
