import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import ConfirmationModal from '../../components/ConfirmationModal';

// ──────────────────────────────────────────────
// Mesh configuration: 11 standard sieve sizes
// ──────────────────────────────────────────────
const MESH_CONFIG = [
  { mesh: 18,  multiplier: 12  },
  { mesh: 30,  multiplier: 20  },
  { mesh: 40,  multiplier: 30  },
  { mesh: 50,  multiplier: 40  },
  { mesh: 60,  multiplier: 45  },
  { mesh: 70,  multiplier: 50  },
  { mesh: 80,  multiplier: 60  },
  { mesh: 90,  multiplier: 65  },
  { mesh: 100, multiplier: 70  },
  { mesh: 140, multiplier: 100 },
  { mesh: 200, multiplier: 140 },
];

const SAND_TYPES = [
  'ทรายดิบ',
  'ทรายแห้ง',
  'ทรายแก้ว',
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Build empty mesh map keyed by mesh size */
const emptyMeshValues = () =>
  Object.fromEntries(MESH_CONFIG.map(({ mesh }) => [mesh, '']));

/** Calculate AFS and Avg Weighted from mesh gram values */
function calcAFS(meshValues) {
  let totalWeight = 0;
  let weightedSum = 0;

  MESH_CONFIG.forEach(({ mesh, multiplier }) => {
    const raw = meshValues[mesh];
    if (raw === '' || raw === null || raw === undefined) return; // skip blanks
    const grams = parseFloat(raw);
    if (isNaN(grams) || grams <= 0) return; // skip zeros & invalid
    totalWeight += grams;
    weightedSum += grams * multiplier;
  });

  if (totalWeight === 0) return { afs: null, avgWeighted: null, totalWeight: 0 };

  const afs = weightedSum / totalWeight;
  return {
    afs: Math.round(afs * 100) / 100,
    avgWeighted: Math.round(weightedSum * 100) / 100,
    totalWeight: Math.round(totalWeight * 100) / 100,
  };
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export default function TestSieveForm() {
  const { user } = useAuth();
  const { addRecord } = useTransactions(TABLE_NAMES.TEST_SIEVE);

  const [form, setForm] = useState({
    sand_name: '',
    sand_type: '',
    test_date: new Date().toISOString().substring(0, 10),
  });

  const [meshValues, setMeshValues] = useState(emptyMeshValues());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Live calculation
  const results = useMemo(() => calcAFS(meshValues), [meshValues]);

  const filledMeshCount = useMemo(
    () =>
      MESH_CONFIG.filter(({ mesh }) => {
        const v = parseFloat(meshValues[mesh]);
        return !isNaN(v) && v > 0;
      }).length,
    [meshValues],
  );

  // ── handlers ──
  const handleHeaderChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMeshChange = (mesh, value) => {
    // Allow empty string, or numeric-ish input
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setMeshValues((prev) => ({ ...prev, [mesh]: value }));
  };

  // ── validation ──
  const validate = () => {
    if (!form.sand_name.trim()) return 'Sand Name is required.';
    if (!form.sand_type) return 'Sand Type is required.';
    if (!form.test_date) return 'Test Date is required.';
    if (filledMeshCount === 0) return 'At least one Mesh weight must be greater than 0.';
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setError('');

    try {
      // Build payload: header + each mesh value + calculated results
      const payload = {
        sand_name: form.sand_name.trim(),
        sand_type: form.sand_type,
        test_date: form.test_date,
      };

      // Add each mesh gram value (only non-empty)
      MESH_CONFIG.forEach(({ mesh }) => {
        const raw = meshValues[mesh];
        if (raw !== '' && raw !== null && raw !== undefined) {
          const num = parseFloat(raw);
          if (!isNaN(num) && num > 0) {
            payload[`m${mesh}`] = num;
          }
        }
      });

      // Add calculated fields
      if (results.afs !== null) {
        payload.AFS = results.afs;
        payload.Avg_weighted = results.avgWeighted;
      }

      await addRecord(payload);

      setSuccess(`Test Sieve result for "${form.sand_name}" saved successfully!`);
      setForm({ sand_name: '', sand_type: '', test_date: new Date().toISOString().substring(0, 10) });
      setMeshValues(emptyMeshValues());

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setForm({ sand_name: '', sand_type: '', test_date: new Date().toISOString().substring(0, 10) });
    setMeshValues(emptyMeshValues());
    setError('');
    setSuccess('');
  };

  // Build confirmation details
  const confirmDetails = {
    'Sand Name': form.sand_name,
    'Sand Type': form.sand_type,
    'Test Date': form.test_date,
    'Meshes Filled': `${filledMeshCount} / ${MESH_CONFIG.length}`,
    'Total Weight': results.totalWeight ? `${results.totalWeight} g` : '—',
    'AFS Number': results.afs !== null ? results.afs : '—',
  };

  return (
    <div className="sieve-form-wrapper">
      {/* Success toast */}
      {success && (
        <div className="sieve-toast sieve-toast-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="sieve-error-banner">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ─── Header inputs ─── */}
        <div className="sieve-header-section">
          <h3 className="sieve-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
            </svg>
            Test Sieve Entry
          </h3>

          <div className="sieve-header-grid">
            <div className="form-group">
              <label className="form-label">
                Sand Name <span className="sieve-required">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Rayong Silica #4"
                value={form.sand_name}
                onChange={(e) => handleHeaderChange('sand_name', e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Sand Type <span className="sieve-required">*</span>
              </label>
              <select
                className="form-control"
                value={form.sand_type}
                onChange={(e) => handleHeaderChange('sand_type', e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">— Select Type —</option>
                {SAND_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Test Date <span className="sieve-required">*</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={form.test_date}
                onChange={(e) => handleHeaderChange('test_date', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* ─── Mesh grid ─── */}
        <div className="sieve-mesh-section">
          <h4 className="sieve-section-subtitle">
            Sieve Weights (grams)
            <span className="sieve-filled-badge">
              {filledMeshCount} / {MESH_CONFIG.length} filled
            </span>
          </h4>

          <div className="sieve-mesh-grid">
            {/* Header row */}
            <div className="sieve-mesh-header-row">
              <div className="sieve-mesh-col-label">Mesh Size</div>
              <div className="sieve-mesh-col-label">Multiplier</div>
              <div className="sieve-mesh-col-label">Weight (g)</div>
              <div className="sieve-mesh-col-label">Contribution</div>
            </div>

            {MESH_CONFIG.map(({ mesh, multiplier }) => {
              const raw = meshValues[mesh];
              const grams = raw !== '' ? parseFloat(raw) : NaN;
              const hasValue = !isNaN(grams) && grams > 0;
              const contribution = hasValue ? Math.round(grams * multiplier * 100) / 100 : null;

              return (
                <div
                  key={mesh}
                  className={`sieve-mesh-row ${hasValue ? 'sieve-mesh-row-active' : ''}`}
                >
                  <div className="sieve-mesh-label">+{mesh}</div>
                  <div className="sieve-mesh-multiplier">×{multiplier}</div>
                  <div className="sieve-mesh-input-cell">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-control sieve-mesh-input"
                      placeholder="—"
                      value={meshValues[mesh]}
                      onChange={(e) => handleMeshChange(mesh, e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="sieve-mesh-contribution">
                    {contribution !== null ? contribution.toLocaleString() : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Results panel ─── */}
        <div className={`sieve-results-panel ${results.afs !== null ? 'sieve-results-active' : ''}`}>
          <div className="sieve-result-item">
            <span className="sieve-result-label">Total Weight</span>
            <span className="sieve-result-value">
              {results.totalWeight ? `${results.totalWeight} g` : '—'}
            </span>
          </div>
          <div className="sieve-result-divider" />
          <div className="sieve-result-item">
            <span className="sieve-result-label">Weighted Sum</span>
            <span className="sieve-result-value">
              {results.avgWeighted !== null ? results.avgWeighted.toLocaleString() : '—'}
            </span>
          </div>
          <div className="sieve-result-divider" />
          <div className="sieve-result-item sieve-result-afs">
            <span className="sieve-result-label">AFS Number</span>
            <span className="sieve-result-value sieve-afs-value">
              {results.afs !== null ? results.afs : '—'}
            </span>
          </div>
        </div>

        {/* ─── Actions ─── */}
        <div className="sieve-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={isSubmitting}
          >
            Clear All
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Review & Save'}
          </button>
        </div>
      </form>

      {/* Confirmation modal */}
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Test Sieve Entry"
        isSubmitting={isSubmitting}
        details={confirmDetails}
      />

      {/* ────────── scoped styles ────────── */}
      <style>{`
        .sieve-form-wrapper {
          position: relative;
        }

        /* ── Toast ── */
        .sieve-toast {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--border-radius);
          margin-bottom: var(--spacing-lg);
          font-weight: 600;
          font-size: 0.9rem;
          animation: sieveSlideDown 0.3s ease;
        }
        .sieve-toast-success {
          background: rgba(34, 197, 94, 0.12);
          color: var(--success-color, #16a34a);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        @keyframes sieveSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Error ── */
        .sieve-error-banner {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #dc2626;
          border-radius: var(--border-radius);
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: var(--spacing-md);
        }

        .sieve-required { color: #ef4444; margin-left: 2px; }

        /* ── Header section ── */
        .sieve-header-section {
          margin-bottom: var(--spacing-lg);
        }
        .sieve-section-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 1.15rem;
          font-weight: 700;
          margin: 0 0 var(--spacing-md);
          color: var(--text-color);
        }
        .sieve-section-title svg {
          color: var(--primary-color);
        }
        .sieve-header-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: var(--spacing-md);
        }

        /* ── Mesh section ── */
        .sieve-mesh-section {
          margin-bottom: var(--spacing-lg);
        }
        .sieve-section-subtitle {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0 0 var(--spacing-sm);
          color: var(--text-color);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .sieve-filled-badge {
          background: rgba(var(--primary-rgb), 0.1);
          color: var(--primary-color);
          border-radius: 99px;
          padding: 2px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        /* ── Mesh grid ── */
        .sieve-mesh-grid {
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          overflow: hidden;
        }
        .sieve-mesh-header-row {
          display: grid;
          grid-template-columns: 100px 100px 1fr 120px;
          background: rgba(var(--primary-rgb), 0.06);
          border-bottom: 2px solid var(--border-color);
          padding: var(--spacing-sm) var(--spacing-md);
        }
        .sieve-mesh-col-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }
        .sieve-mesh-row {
          display: grid;
          grid-template-columns: 100px 100px 1fr 120px;
          align-items: center;
          padding: var(--spacing-xs) var(--spacing-md);
          border-bottom: 1px solid var(--border-color);
          transition: background 0.15s;
        }
        .sieve-mesh-row:last-child { border-bottom: none; }
        .sieve-mesh-row:hover { background: rgba(var(--primary-rgb), 0.03); }
        .sieve-mesh-row-active {
          background: rgba(var(--primary-rgb), 0.04);
        }
        .sieve-mesh-row-active:hover {
          background: rgba(var(--primary-rgb), 0.07);
        }
        .sieve-mesh-label {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-color);
        }
        .sieve-mesh-multiplier {
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-family: 'Courier New', monospace;
        }
        .sieve-mesh-input-cell {
          padding-right: var(--spacing-md);
        }
        .sieve-mesh-input {
          max-width: 140px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .sieve-mesh-contribution {
          font-size: 0.85rem;
          color: var(--text-secondary);
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .sieve-mesh-row-active .sieve-mesh-contribution {
          color: var(--primary-color);
          font-weight: 600;
        }

        /* ── Results panel ── */
        .sieve-results-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-lg);
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          padding: var(--spacing-lg) var(--spacing-xl);
          margin-bottom: var(--spacing-lg);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sieve-results-active {
          border-color: rgba(var(--primary-rgb), 0.3);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.08);
        }
        .sieve-result-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .sieve-result-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }
        .sieve-result-value {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-color);
          font-variant-numeric: tabular-nums;
        }
        .sieve-result-divider {
          width: 1px;
          height: 36px;
          background: var(--border-color);
        }
        .sieve-result-afs .sieve-afs-value {
          font-size: 1.5rem;
          color: var(--primary-color);
        }

        /* ── Actions ── */
        .sieve-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--spacing-md);
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .sieve-header-grid {
            grid-template-columns: 1fr;
          }
          .sieve-mesh-header-row,
          .sieve-mesh-row {
            grid-template-columns: 70px 70px 1fr 90px;
          }
          .sieve-results-panel {
            flex-direction: column;
            gap: var(--spacing-md);
          }
          .sieve-result-divider {
            width: 60%;
            height: 1px;
          }
        }
        @media (max-width: 480px) {
          .sieve-mesh-header-row,
          .sieve-mesh-row {
            grid-template-columns: 55px 55px 1fr 70px;
            padding: var(--spacing-xs) var(--spacing-sm);
          }
          .sieve-mesh-col-label { font-size: 0.65rem; }
          .sieve-mesh-input { max-width: 100px; }
        }
      `}</style>
    </div>
  );
}
