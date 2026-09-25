import { PIPELINE_RUN, PIPELINE_SOURCES, SCHEMA_TABLES } from '../data/pipeline';
import { SKUS } from '../data/model';
import { Badge, Callout, Panel, Stat } from '../components/ui';
import { formatInt, formatShortDate } from '../utils/format';

export function PipelineSection() {
  const wired = PIPELINE_SOURCES.filter((source) => source.status === 'WIRED').length;

  return (
    <>
      <p className="section-intro">
        The intelligence is only as good as what feeds it. EVM's suite already produces the data: Procura holds
        the planning grid, CRM holds per-warehouse stock, EasyEcom holds marketplace orders. This layer
        normalises those exports into one schema instead of asking anyone to retype numbers.
      </p>

      <div className="stats stagger">
        <Stat
          label="Sources wired"
          value={`${wired} / ${PIPELINE_SOURCES.length}`}
          sub="Tally connector is V1"
        />
        <Stat label="Tables provisioned" value={formatInt(SCHEMA_TABLES.length)} sub="RDS PostgreSQL schema" />
        <Stat
          label="SKUs modelled"
          value={formatInt(SKUS.length)}
          sub="end to end in this build"
        />
        <Stat
          label="Rows parsed this run"
          value={formatInt(PIPELINE_RUN.procuraRows.length + PIPELINE_RUN.hundiaRows.length + PIPELINE_RUN.easyEcomDaily.length)}
          sub="live parse, not a mock-up"
        />
      </div>

      <Panel
        title="Ingestion sources"
        desc="Every source carries its own provenance so an operator can always tell observed data from modelled data."
      >
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Data sources feeding the engine</caption>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Origin</th>
                <th scope="col">Cadence</th>
                <th scope="col">Provenance</th>
                <th scope="col">Status</th>
                <th scope="col">Fields</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE_SOURCES.map((source) => (
                <tr key={source.name}>
                  <th scope="row" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                    {source.name}
                  </th>
                  <td>{source.origin}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>
                    {source.cadence}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className={`dot dot-${source.provenance}`} aria-hidden="true" />
                      {source.provenance}
                    </span>
                  </td>
                  <td>
                    <Badge tone={source.status === 'WIRED' ? 'ok' : 'neutral'}>{source.status}</Badge>
                  </td>
                  <td style={{ whiteSpace: 'normal', minWidth: 240 }}>{source.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid">
        <Panel
          className="col-12"
          title="Live parse: this page ran the parsers"
          desc="Not a description of the pipeline: the tables below are the actual output of the integration modules on sample exports."
          foot={
            <>
              <Badge tone="info">
                {formatInt(PIPELINE_RUN.ignoredEasyEcomRows)} rows dropped as pending or cancelled
              </Badge>
              <span>Quoted fields, thousands separators and CRLF are handled by the tokenizer.</span>
            </>
          }
        >
          <div className="grid">
            <div className="col-4">
              <h3 className="panel-title" style={{ fontSize: 15, marginBottom: 8 }}>
                Procura MSL export
              </h3>
              <div className="table-wrap">
                <table className="table">
                  <caption className="sr-only">Parsed Procura MSL planning rows</caption>
                  <thead>
                    <tr>
                      <th scope="col">SKU</th>
                      <th scope="col" className="right">
                        MSP
                      </th>
                      <th scope="col" className="right">
                        Stock
                      </th>
                      <th scope="col" className="right">
                        MSL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PIPELINE_RUN.procuraRows.map((row) => (
                      <tr key={row.sku}>
                        <th scope="row" className="sku">
                          {row.sku}
                        </th>
                        <td className="right num">{formatInt(row.monthlySellingPlan)}</td>
                        <td className="right num">{formatInt(row.currentStock)}</td>
                        <td className="right num">{formatInt(row.minimumStockLevel)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-4">
              <h3 className="panel-title" style={{ fontSize: 15, marginBottom: 8 }}>
                Hundia warehouse stock
              </h3>
              <div className="table-wrap">
                <table className="table">
                  <caption className="sr-only">Parsed per-warehouse stock rows</caption>
                  <thead>
                    <tr>
                      <th scope="col">SKU</th>
                      <th scope="col">Warehouse</th>
                      <th scope="col" className="right">
                        Available
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PIPELINE_RUN.hundiaRows.map((row) => (
                      <tr key={`${row.sku}-${row.warehouse}`}>
                        <th scope="row" className="sku">
                          {row.sku}
                        </th>
                        <td>{row.warehouse}</td>
                        <td className="right num">{formatInt(row.availableStock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-4">
              <h3 className="panel-title" style={{ fontSize: 15, marginBottom: 8 }}>
                EasyEcom daily sales
              </h3>
              <div className="table-wrap">
                <table className="table">
                  <caption className="sr-only">Aggregated daily channel sales with returns netted</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Channel</th>
                      <th scope="col" className="right">
                        Sold
                      </th>
                      <th scope="col" className="right">
                        Returned
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PIPELINE_RUN.easyEcomDaily.map((row) => (
                      <tr key={`${row.date}-${row.channel}`}>
                        <th scope="row" className="mono">
                          {formatShortDate(row.date)}
                        </th>
                        <td>{row.channel}</td>
                        <td className="right num">{formatInt(row.unitsSold)}</td>
                        <td className="right num">{formatInt(row.unitsReturned)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          className="col-12"
          title="Target schema"
          desc="One idempotent migration creates the tables the whole pipeline writes into."
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: 10,
            }}
          >
            {SCHEMA_TABLES.map((table) => (
              <div
                key={table.name}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '10px 12px',
                }}
              >
                <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
                  {table.name}
                </div>
                <div className="kv-label" style={{ marginTop: 4 }}>
                  {table.purpose}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Badge tone="neutral">{table.engine}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Callout tone="info" title="Prototype boundary">
        No live API call and no database connection runs here. Exports are parsed in-process, which is exactly
        how the two-to-three day prototype runs. The Tally connector and the scheduled 6:00 AM IST DRR job are
        V1 work, and until they land the sales and lead-time history stays simulated while planning fields stay
        observed.
      </Callout>
    </>
  );
}
