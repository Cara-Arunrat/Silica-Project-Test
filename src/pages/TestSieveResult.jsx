import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useTransactions } from '../api/hooks';
import { TABLE_NAMES } from '../api/airtable';

// ── Mesh config (order & multipliers) ──────────────────────────────────────
const MESH_CONFIG = [
  { mesh: 18,  key: 'm18',  multiplier: 12  },
  { mesh: 30,  key: 'm30',  multiplier: 20  },
  { mesh: 40,  key: 'm40',  multiplier: 30  },
  { mesh: 50,  key: 'm50',  multiplier: 40  },
  { mesh: 60,  key: 'm60',  multiplier: 45  },
  { mesh: 70,  key: 'm70',  multiplier: 50  },
  { mesh: 80,  key: 'm80',  multiplier: 60  },
  { mesh: 90,  key: 'm90',  multiplier: 65  },
  { mesh: 100, key: 'm100', multiplier: 70  },
  { mesh: 140, key: 'm140', multiplier: 100 },
  { mesh: 200, key: 'm200', multiplier: 140 },
];

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val + 'T00:00:00');
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Detail Modal ────────────────────────────────────────────────────────────
function DetailModal({ record, onClose }) {
  if (!record) return null;

  // Calculate totals from the raw grams
  let totalWeight = 0;
  let weightedSum = 0;
  const rows = MESH_CONFIG.map(({ mesh, key, multiplier }) => {
    const grams = parseFloat(record[key]) || 0;
    const contribution = grams * multiplier;
    if (grams > 0) {
      totalWeight += grams;
      weightedSum += contribution;
    }
    return { mesh, grams, multiplier, contribution };
  }).filter(r => r.grams > 0); // Only show meshes with data

  const afs = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  const avgWeighted = Math.round(weightedSum * 100) / 100;

  // Use stored AFS/Avg_weighted if available (Airtable formula), otherwise use computed
  const displayAFS = record.AFS ?? afs;
  const displayAvg = record.Avg_weighted ?? avgWeighted;

  return (
    <div className="sieve-modal-overlay" onClick={onClose}>
      <div className="sieve-modal-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sieve-modal-header">
          <div>
            <p className="sieve-modal-subtitle">Test Sieve Detail</p>
            <h2 className="sieve-modal-title">{record.sand_name || '—'}</h2>
            <div className="sieve-modal-meta">
              <span className="sieve-modal-badge">{record.sand_type || '—'}</span>
              <span className="sieve-modal-date">{formatDate(record.test_date)}</span>
            </div>
          </div>
          <button className="sieve-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Table */}
        <div className="sieve-detail-table-wrap">
          <table className="sieve-detail-table">
            <thead>
              <tr>
                <th>Mesh Size</th>
                <th>Multiplier</th>
                <th>Weight (g)</th>
                <th>% Retained</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ mesh, grams, multiplier, contribution }) => {
                const pct = totalWeight > 0 ? (grams / totalWeight * 100).toFixed(1) : '0.0';
                return (
                  <tr key={mesh}>
                    <td className="sieve-detail-mesh">+{mesh}</td>
                    <td className="sieve-detail-mult">×{multiplier}</td>
                    <td className="sieve-detail-num">{grams.toFixed(2)}</td>
                    <td>
                      <div className="sieve-pct-bar-wrap">
                        <div className="sieve-pct-bar" style={{ width: `${pct}%` }} />
                        <span>{pct}%</span>
                      </div>
                    </td>
                    <td className="sieve-detail-contribution">{contribution.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="sieve-detail-totals">
          <div className="sieve-total-item">
            <span className="sieve-total-label">Total Weight</span>
            <span className="sieve-total-value">{totalWeight.toFixed(2)} g</span>
          </div>
          <div className="sieve-total-divider" />
          <div className="sieve-total-item">
            <span className="sieve-total-label">Weighted Sum</span>
            <span className="sieve-total-value">{displayAvg.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
          </div>
          <div className="sieve-total-divider" />
          <div className="sieve-total-item sieve-total-afs">
            <span className="sieve-total-label">AFS Number</span>
            <span className="sieve-total-value sieve-afs-big">{displayAFS}</span>
          </div>
        </div>

        {/* Back button */}
        <div className="sieve-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            ← Back to Results
          </button>
        </div>
      </div>

      <style>{`
        .sieve-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sieve-modal-panel {
          background: var(--surface-color);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          width: 100%; max-width: 680px;
          max-height: 90vh;
          display: flex; flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes slideUp { from { opacity:0; transform: translateY(24px); } to { opacity:1; transform: translateY(0); } }
        .sieve-modal-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 24px 28px 20px;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          color: white;
          flex-shrink: 0;
        }
        .sieve-modal-subtitle {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.08em; color: rgba(255,255,255,0.6); margin-bottom: 4px;
        }
        .sieve-modal-title {
          font-size: 1.5rem; font-weight: 800; margin-bottom: 10px; color: white;
        }
        .sieve-modal-meta { display: flex; align-items: center; gap: 10px; }
        .sieve-modal-badge {
          background: rgba(251, 191, 36, 0.2); color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.4);
          border-radius: 99px; padding: 2px 12px;
          font-size: 12px; font-weight: 700;
        }
        .sieve-modal-date { font-size: 13px; color: rgba(255,255,255,0.7); }
        .sieve-modal-close {
          background: rgba(255,255,255,0.1); color: white; border: none;
          border-radius: 8px; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; cursor: pointer; flex-shrink: 0; margin-left: 16px;
          transition: background 0.15s;
        }
        .sieve-modal-close:hover { background: rgba(255,255,255,0.2); }

        .sieve-detail-table-wrap { overflow-y: auto; flex: 1; }
        .sieve-detail-table {
          width: 100%; border-collapse: collapse; font-size: 14px;
        }
        .sieve-detail-table thead tr {
          background: var(--primary-color);
          position: sticky; top: 0; z-index: 1;
        }
        .sieve-detail-table th {
          padding: 10px 16px; text-align: left;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: white;
          border-right: 1px solid rgba(255,255,255,0.15);
        }
        .sieve-detail-table th:last-child { border-right: none; }
        .sieve-detail-table td {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-color);
          border-right: 1px solid var(--border-color);
          vertical-align: middle;
        }
        .sieve-detail-table td:last-child { border-right: none; }
        .sieve-detail-table tbody tr:nth-child(even) { background: rgba(0,0,0,0.02); }
        .sieve-detail-table tbody tr:hover { background: rgba(37,99,235,0.04); }
        .sieve-detail-mesh { font-weight: 700; font-size: 15px; color: var(--text-primary); }
        .sieve-detail-mult { font-size: 12px; color: var(--text-secondary); font-family: monospace; }
        .sieve-detail-num { font-variant-numeric: tabular-nums; font-weight: 600; }
        .sieve-pct-bar-wrap {
          display: flex; align-items: center; gap: 8px; min-width: 120px;
        }
        .sieve-pct-bar {
          height: 6px; border-radius: 99px;
          background: linear-gradient(90deg, var(--primary-color), #60a5fa);
          min-width: 2px; max-width: 80px;
          transition: width 0.3s ease;
        }
        .sieve-pct-bar-wrap span { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
        .sieve-detail-contribution {
          font-variant-numeric: tabular-nums; font-weight: 600;
          color: var(--primary-color); text-align: right;
        }

        .sieve-detail-totals {
          display: flex; align-items: center; justify-content: center;
          gap: 0; border-top: 2px solid var(--border-color);
          background: #f8fafc;
          flex-shrink: 0;
        }
        .sieve-total-item {
          display: flex; flex-direction: column; align-items: center;
          padding: 16px 24px; gap: 4px; flex: 1;
        }
        .sieve-total-divider { width: 1px; height: 40px; background: var(--border-color); }
        .sieve-total-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--text-secondary);
        }
        .sieve-total-value { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
        .sieve-total-afs .sieve-total-label { color: var(--primary-color); }
        .sieve-afs-big { font-size: 1.6rem; color: var(--primary-color); }

        .sieve-modal-footer {
          padding: 16px 28px;
          border-top: 1px solid var(--border-color);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

// ── Summary Card ────────────────────────────────────────────────────────────
function SieveCard({ record, onClick }) {
  const displayAFS = record.AFS ?? '—';
  const displayAvg = record.Avg_weighted ?? '—';

  // Count filled meshes
  const filledCount = MESH_CONFIG.filter(({ key }) => parseFloat(record[key]) > 0).length;

  return (
    <div className="sieve-card" onClick={onClick}>
      <div className="sieve-card-header">
        <div>
          <p className="sieve-card-type">{record.sand_type || 'Unknown Type'}</p>
          <h3 className="sieve-card-name">{record.sand_name || '—'}</h3>
        </div>
        <div className="sieve-card-afs-badge">
          <span className="sieve-card-afs-label">AFS</span>
          <span className="sieve-card-afs-value">{displayAFS}</span>
        </div>
      </div>

      <div className="sieve-card-stats">
        <div className="sieve-card-stat">
          <span className="sieve-card-stat-label">Test Date</span>
          <span className="sieve-card-stat-value">{formatDate(record.test_date)}</span>
        </div>
        <div className="sieve-card-stat">
          <span className="sieve-card-stat-label">Avg Weighted</span>
          <span className="sieve-card-stat-value">{typeof displayAvg === 'number' ? displayAvg.toLocaleString(undefined, { minimumFractionDigits: 1 }) : displayAvg}</span>
        </div>
        <div className="sieve-card-stat">
          <span className="sieve-card-stat-label">Meshes</span>
          <span className="sieve-card-stat-value">{filledCount}/{MESH_CONFIG.length}</span>
        </div>
      </div>

      <div className="sieve-card-footer">
        <span className="sieve-card-view-btn">View Full Breakdown →</span>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function TestSieveResult() {
  const { data, loading, error } = useTransactions(TABLE_NAMES.TEST_SIEVE);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sort newest first
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const da = a.test_date || a._createdTime || '';
      const db = b.test_date || b._createdTime || '';
      return db.localeCompare(da);
    });
  }, [data]);

  const sandTypes = useMemo(() => {
    return [...new Set(sorted.map(r => r.sand_type).filter(Boolean))];
  }, [sorted]);

  const filtered = useMemo(() => {
    return sorted.filter(r => {
      const nameMatch = !searchTerm || (r.sand_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = !filterType || r.sand_type === filterType;
      
      let dateMatch = true;
      if (startDate || endDate) {
        const testDate = r.test_date ? new Date(r.test_date) : null;
        if (testDate) {
          if (startDate && new Date(startDate) > testDate) dateMatch = false;
          if (endDate && new Date(endDate) < testDate) dateMatch = false;
        } else {
          dateMatch = false;
        }
      }

      return nameMatch && typeMatch && dateMatch;
    });
  }, [sorted, searchTerm, filterType, startDate, endDate]);

  const handleExport = () => {
    if (filtered.length === 0) {
      alert("No records to export.");
      return;
    }

    const exportData = filtered.map(row => ({
      'Test Date': row.test_date || '',
      'Sand Name': row.sand_name || '',
      'Sand Type': row.sand_type || '',
      'm18': row.m18 ?? '',
      'm30': row.m30 ?? '',
      'm40': row.m40 ?? '',
      'm50': row.m50 ?? '',
      'm60': row.m60 ?? '',
      'm70': row.m70 ?? '',
      'm80': row.m80 ?? '',
      'm90': row.m90 ?? '',
      'm100': row.m100 ?? '',
      'm140': row.m140 ?? '',
      'm200': row.m200 ?? '',
      'AFS': row.AFS ?? '',
      'Avg Weighted': row.Avg_weighted ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test Sieve Results");
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Test_Sieve_Results_${dateStr}.xlsx`);
  };

  return (
    <div className="sieve-result-page">
      {/* Page Header */}
      <div className="sieve-result-page-header">
        <div>
          <h2 className="text-2xl font-bold mb-xs">Test Sieve Results</h2>
          <p className="text-secondary">Historical sieve analysis records sorted by newest date.</p>
        </div>
        <div className="sieve-result-count-badge">
          {loading ? '...' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Filters & Export */}
      <div className="sieve-result-filters-wrap">
        <div className="sieve-result-filters">
          <div className="sieve-search-wrap">
            <svg className="sieve-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="sieve-search-input"
              placeholder="Search sand name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ minWidth: '160px' }}
          >
            <option value="">All Sand Types</option>
            {sandTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="sieve-date-range">
            <span className="text-sm font-medium text-secondary">From:</span>
            <input 
              type="date" 
              className="form-control" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
            <span className="text-sm font-medium text-secondary">To:</span>
            <input 
              type="date" 
              className="form-control" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleExport} disabled={filtered.length === 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Excel
        </button>
      </div>

      {/* States */}
      {loading && (
        <div className="sieve-result-loading">
          <div className="sieve-spinner" />
          <span>Loading test records...</span>
        </div>
      )}

      {error && (
        <div className="sieve-result-error">
          <span>⚠ {error}</span>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="sieve-result-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
          </svg>
          <p>No test results found.</p>
          {(searchTerm || filterType || startDate || endDate) && <button className="btn btn-secondary btn-sm" onClick={() => { setSearchTerm(''); setFilterType(''); setStartDate(''); setEndDate(''); }}>Clear Filters</button>}
        </div>
      )}

      {/* Cards Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="sieve-cards-grid">
          {filtered.map(record => (
            <SieveCard
              key={record._id}
              record={record}
              onClick={() => setSelectedRecord(record)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <DetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      <style>{`
        .sieve-result-page {
          padding-bottom: var(--spacing-xl);
        }
        .sieve-result-page-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: var(--spacing-lg); flex-wrap: wrap; gap: var(--spacing-md);
        }
        .sieve-result-count-badge {
          background: rgba(37, 99, 235, 0.08); color: var(--primary-color);
          border: 1px solid rgba(37, 99, 235, 0.2);
          border-radius: 99px; padding: 6px 18px;
          font-size: 13px; font-weight: 700;
        }

        .sieve-result-filters-wrap {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: var(--spacing-lg); flex-wrap: wrap; gap: var(--spacing-md);
        }
        .sieve-result-filters {
          display: flex; gap: var(--spacing-md); flex-wrap: wrap; align-items: center;
        }
        .sieve-date-range {
          display: flex; align-items: center; gap: var(--spacing-sm);
        }
        .sieve-search-wrap {
          position: relative; flex: 1; min-width: 200px;
        }
        .sieve-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: var(--text-secondary); pointer-events: none;
        }
        .sieve-search-input {
          width: 100%; padding: 10px 12px 10px 38px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          background: var(--surface-color);
          color: var(--text-primary); font-size: 14px;
          transition: border-color 0.2s;
        }
        .sieve-search-input:focus {
          outline: none; border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .sieve-result-loading {
          display: flex; align-items: center; justify-content: center;
          gap: var(--spacing-md); padding: var(--spacing-xl);
          color: var(--text-secondary); font-weight: 500;
        }
        .sieve-spinner {
          width: 28px; height: 28px; border-radius: 50%;
          border: 3px solid var(--border-color);
          border-top-color: var(--primary-color);
          animation: spin 0.8s linear infinite;
        }
        .sieve-result-error {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3);
          color: #dc2626; border-radius: var(--border-radius);
          padding: var(--spacing-md); font-size: 14px;
        }
        .sieve-result-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: var(--spacing-md); padding: 60px var(--spacing-xl);
          color: var(--text-secondary); text-align: center;
        }
        .sieve-result-empty svg { opacity: 0.25; }
        .sieve-result-empty p { font-size: 1rem; font-weight: 500; }
        .btn-sm { padding: 6px 14px; font-size: 13px; }

        /* Cards Grid */
        .sieve-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--spacing-lg);
        }

        /* Card */
        .sieve-card {
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          overflow: hidden;
          display: flex; flex-direction: column;
        }
        .sieve-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
          border-color: rgba(37,99,235,0.3);
        }
        .sieve-card-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 20px 20px 0;
          gap: var(--spacing-sm);
        }
        .sieve-card-type {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--text-secondary); margin-bottom: 4px;
        }
        .sieve-card-name {
          font-size: 1.15rem; font-weight: 800; color: var(--text-primary);
          line-height: 1.3;
        }
        .sieve-card-afs-badge {
          display: flex; flex-direction: column; align-items: center;
          background: linear-gradient(135deg, var(--primary-hover) 0%, var(--primary-color) 100%);
          border-radius: 10px; padding: 8px 14px; flex-shrink: 0; min-width: 64px;
          box-shadow: 0 2px 8px rgba(37,99,235,0.25);
        }
        .sieve-card-afs-label {
          font-size: 9px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; color: rgba(255,255,255,0.75);
        }
        .sieve-card-afs-value {
          font-size: 1.2rem; font-weight: 900; color: white; line-height: 1.2;
        }

        .sieve-card-stats {
          display: flex; gap: 0; padding: 16px 20px 0;
        }
        .sieve-card-stat {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
          padding-right: 12px;
          border-right: 1px solid var(--border-color);
          margin-right: 12px;
        }
        .sieve-card-stat:last-child { border-right: none; margin-right: 0; padding-right: 0; }
        .sieve-card-stat-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--text-secondary);
        }
        .sieve-card-stat-value {
          font-size: 13px; font-weight: 700; color: var(--text-primary);
        }

        .sieve-card-footer {
          margin-top: auto; padding: 14px 20px;
          border-top: 1px solid var(--border-color);
          background: rgba(37,99,235,0.03);
        }
        .sieve-card-view-btn {
          font-size: 12px; font-weight: 700; color: var(--primary-color);
          letter-spacing: 0.02em;
          transition: gap 0.15s;
        }
        .sieve-card:hover .sieve-card-view-btn { letter-spacing: 0.05em; }

        @media (max-width: 640px) {
          .sieve-cards-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
