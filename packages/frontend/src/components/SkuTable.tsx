import type { DashboardRow } from '../data/dashboard-data';
import { formatDelta, formatNumber } from '../utils/format';

interface Props {
  rows: readonly DashboardRow[];
  selectedSku: string;
  onSelect: (sku: string) => void;
}

export function SkuTable({ rows, selectedSku, onSelect }: Props) {
  return (
    <div className="table-scroll">
      <table className="sku-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Stock</th>
            <th>Static MSL</th>
            <th>Dynamic MSL</th>
            <th>Δ</th>
            <th>Action</th>
            <th>Band</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.sku}
              className={row.sku === selectedSku ? 'selected' : undefined}
              onClick={() => onSelect(row.sku)}
            >
              <td>{row.sku}</td>
              <td>{formatNumber(row.currentStock)}</td>
              <td>{formatNumber(row.staticMsl)}</td>
              <td>{formatNumber(row.dynamicMsl)}</td>
              <td className={row.deltaUnits > 0 ? 'up' : row.deltaUnits < 0 ? 'down' : ''}>
                {formatDelta(row.deltaUnits)}
              </td>
              <td>
                <span className={`badge action-${row.action.toLowerCase()}`}>{row.action}</span>
              </td>
              <td>
                <span className={`badge band-${row.band.toLowerCase()}`}>{row.band}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
