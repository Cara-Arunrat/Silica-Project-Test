import React, { useState, useMemo } from 'react';
import { useTransactions, findKey } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import { ShieldCheck, ShieldAlert, ShieldOff, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────── */
function daysBetween(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  if (isNaN(exp.getTime())) return null;
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}

function progressPct(activeStr, expirationStr) {
  if (!activeStr || !expirationStr) return 0;
  const start = new Date(activeStr).getTime();
  const end   = new Date(expirationStr).getTime();
  const now   = Date.now();
  if (end <= start) return 100;
  const pct = ((now - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, pct));
}

function getColor(days, renewDays) {
  if (days === null) return 'grey';
  if (days < 0)              return 'red';
  if (days <= (renewDays || 30)) return 'yellow';
  return 'green';
}

const COLOR_MAP = {
  red:    { bar: '#ef4444', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.25)',    text: '#dc2626',  label: 'Overdue',       icon: ShieldOff  },
  yellow: { bar: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.25)',   text: '#b45309',  label: 'Renewal Window',icon: ShieldAlert },
  green:  { bar: '#22c55e', bg: 'rgba(34,197,94,0.06)',    border: 'rgba(34,197,94,0.20)',    text: '#16a34a',  label: 'Active',        icon: ShieldCheck },
  grey:   { bar: '#94a3b8', bg: 'rgba(148,163,184,0.08)',  border: 'rgba(148,163,184,0.20)',  text: '#64748b',  label: 'Unknown',       icon: ShieldCheck },
};

/* ─── single permit card ──────────────────────────────── */
function CertCard({ record, onRenew, onDelete, renewing, deleting }) {
  const get = (key) => {
    const k = findKey(Object.keys(record), key);
    const v = k ? record[k] : null;
    return Array.isArray(v) ? v.join(', ') : v;
  };

  const name       = get('name') || get('Name') || 'Unnamed Certificate';
  const activeDate = get('active_date') || get('active date');
  const expDate    = get('expiration_date') || get('expiration date');
  const renewDays  = parseInt(get('renew_days') || get('renew days') || 30, 10);
  const createdBy  = get('created_by') || get('created by') || '';

  const days     = daysBetween(expDate);
  const pct      = progressPct(activeDate, expDate);
  const colorKey = getColor(days, renewDays);
  const C        = COLOR_MAP[colorKey];
  const Icon     = C.icon;

  const daysLabel = days === null
    ? 'Unknown'
    : days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
        ? 'Expires today'
        : `${days}d remaining`;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

  return (
    <div
      className="cert-dashboard-card"
      style={{ background: C.bg, borderColor: C.border }}
    >
      {/* Top row */}
      <div className="cert-dc-header">
        <div className="cert-dc-icon" style={{ color: C.text }}>
          <Icon size={20} />
        </div>
        <div className="cert-dc-info">
          <h4 className="cert-dc-name">{name}</h4>
          <span className="cert-dc-sub">
            {fmt(activeDate)} → {fmt(expDate)}
            {createdBy ? ` · ${createdBy}` : ''}
          </span>
        </div>
        <div className="cert-dc-days" style={{ color: C.text }}>
          {daysLabel}
        </div>
      </div>

      {/* Progress bar */}
      <div className="cert-dc-bar-track">
        <div
          className="cert-dc-bar-fill"
          style={{ width: `${pct}%`, background: C.bar }}
        />
      </div>
      <div className="cert-dc-bar-labels">
        <span>{fmt(activeDate)}</span>
        <span style={{ color: C.text, fontWeight: 600 }}>{pct.toFixed(0)}% elapsed</span>
        <span>{fmt(expDate)}</span>
      </div>

      {/* Actions */}
      <div className="cert-dc-actions">
        <button
          className="cert-dc-btn cert-dc-btn-renew"
          onClick={() => onRenew(record._id)}
          disabled={renewing || deleting}
        >
          {renewing ? <span className="cert-dc-spinner" /> : <CheckCircle2 size={14} />}
          {renewing ? 'Marking...' : 'Renewed'}
        </button>
        <button
          className="cert-dc-btn cert-dc-btn-delete"
          onClick={() => onDelete(record._id)}
          disabled={renewing || deleting}
        >
          {deleting ? <span className="cert-dc-spinner" /> : <Trash2 size={14} />}
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

/* ─── main section component ──────────────────────────── */
export default function CertReminderDashboard() {
  const { data, loading, error, updateRecord, deleteRecord } = useTransactions(TABLE_NAMES.CERT_REMINDER);

  const [renewingId,  setRenewingId]  = useState(null);
  const [deletingId,  setDeletingId]  = useState(null);
  const [confirmId,   setConfirmId]   = useState(null);
  const [confirmType, setConfirmType] = useState(null); // 'renew' | 'delete'

  // Only show records where Complete_date is null/empty
  const pending = useMemo(() => {
    if (!data) return [];
    return data.filter(r => {
      const k = findKey(Object.keys(r), 'complete_date') || findKey(Object.keys(r), 'complete date');
      const v = k ? r[k] : null;
      return !v;
    }).sort((a, b) => {
      // Sort by days remaining ascending (most urgent first)
      const getExp = r => {
        const k = findKey(Object.keys(r), 'expiration_date') || findKey(Object.keys(r), 'expiration date');
        return k ? r[k] : null;
      };
      const dA = daysBetween(getExp(a)) ?? 99999;
      const dB = daysBetween(getExp(b)) ?? 99999;
      return dA - dB;
    });
  }, [data]);

  const initiateAction = (id, type) => {
    setConfirmId(id);
    setConfirmType(type);
  };

  const cancelConfirm = () => {
    setConfirmId(null);
    setConfirmType(null);
  };

  const handleConfirm = async () => {
    const id = confirmId;
    const type = confirmType;
    cancelConfirm();

    if (type === 'renew') {
      setRenewingId(id);
      try {
        const today = new Date().toISOString().split('T')[0];
        await updateRecord(id, { Complete_date: today });
        // updateRecord already patches local state + triggers a re-fetch,
        // so the card disappears immediately via the pending useMemo filter.
      } catch (err) {
        alert(`Failed to mark as renewed: ${err.message}`);
      } finally {
        setRenewingId(null);
      }
    } else if (type === 'delete') {
      setDeletingId(id);
      try {
        await deleteRecord(id);
      } catch (err) {
        alert(`Failed to delete: ${err.message}`);
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (error)   return null; // Silently hide on error — non-critical section
  if (loading) return (
    <div className="cert-dash-loading">
      <span className="cert-dc-spinner" /> Loading permit status...
    </div>
  );
  if (pending.length === 0) return (
    <div className="cert-dash-empty">
      <ShieldCheck size={28} />
      <span>All permits up to date — no pending renewals.</span>
    </div>
  );

  const overdue  = pending.filter(r => {
    const k = findKey(Object.keys(r), 'expiration_date') || findKey(Object.keys(r), 'expiration date');
    return daysBetween(k ? r[k] : null) < 0;
  }).length;
  const urgent = pending.filter(r => {
    const kE = findKey(Object.keys(r), 'expiration_date') || findKey(Object.keys(r), 'expiration date');
    const kR = findKey(Object.keys(r), 'renew_days') || findKey(Object.keys(r), 'renew days');
    const d = daysBetween(kE ? r[kE] : null);
    const rd = parseInt(kR ? r[kR] : 30, 10);
    return d !== null && d >= 0 && d <= rd;
  }).length;

  return (
    <div className="cert-dash-section">
      {/* Section header */}
      <div className="cert-dash-header">
        <div>
          <h3 className="cert-dash-title">
            <ShieldAlert size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Permit &amp; Certificate Monitor
          </h3>
          <p className="cert-dash-subtitle">
            {pending.length} pending renewal{pending.length !== 1 ? 's' : ''}
            {overdue  > 0 && <span className="cert-dash-badge cert-dash-badge-red">  {overdue} overdue</span>}
            {urgent   > 0 && <span className="cert-dash-badge cert-dash-badge-yellow"> {urgent} in renewal window</span>}
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="cert-dash-grid">
        {pending.map(r => (
          <CertCard
            key={r._id}
            record={r}
            onRenew={id => initiateAction(id, 'renew')}
            onDelete={id => initiateAction(id, 'delete')}
            renewing={renewingId === r._id}
            deleting={deletingId === r._id}
          />
        ))}
      </div>

      {/* Confirmation modal */}
      {confirmId && (
        <div className="cert-dash-overlay" onClick={cancelConfirm}>
          <div className="cert-dash-modal" onClick={e => e.stopPropagation()}>
            <h4 className="cert-dash-modal-title">
              {confirmType === 'renew' ? '✅ Confirm Renewal' : '🗑️ Confirm Deletion'}
            </h4>
            <p className="cert-dash-modal-body">
              {confirmType === 'renew'
                ? "This will set today's date as the Complete_date and remove the permit from the active monitor."
                : 'Are you sure you want to permanently delete this certificate record? This cannot be undone.'}
            </p>
            <div className="cert-dash-modal-actions">
              <button className="btn btn-secondary" onClick={cancelConfirm}>Cancel</button>
              <button
                className={`btn ${confirmType === 'renew' ? 'cert-btn-confirm-renew' : 'btn-danger'}`}
                onClick={handleConfirm}
              >
                {confirmType === 'renew' ? 'Yes, mark renewed' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Section wrapper */
        .cert-dash-section {
          margin-bottom: 2rem;
        }
        .cert-dash-loading, .cert-dash-empty {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem;
          border-radius: 0.75rem;
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 2rem;
        }
        .cert-dash-empty { color: #16a34a; }

        /* Section header */
        .cert-dash-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .cert-dash-title {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
        }
        .cert-dash-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .cert-dash-badge {
          display: inline-block;
          padding: 1px 8px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .cert-dash-badge-red    { background: rgba(239,68,68,0.1);  color: #dc2626; border: 1px solid rgba(239,68,68,0.25); }
        .cert-dash-badge-yellow { background: rgba(245,158,11,0.1); color: #b45309; border: 1px solid rgba(245,158,11,0.25); }

        /* Cards grid */
        .cert-dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1rem;
        }

        /* Individual card */
        .cert-dashboard-card {
          border: 1px solid;
          border-radius: 0.75rem;
          padding: 1rem 1.125rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          transition: box-shadow 0.2s;
        }
        .cert-dashboard-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }

        .cert-dc-header {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
        }
        .cert-dc-icon  { flex-shrink: 0; margin-top: 2px; }
        .cert-dc-info  { flex: 1; min-width: 0; }
        .cert-dc-name  {
          font-size: 0.9375rem;
          font-weight: 700;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cert-dc-sub {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: block;
          margin-top: 2px;
        }
        .cert-dc-days {
          font-size: 0.8rem;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Progress bar */
        .cert-dc-bar-track {
          height: 6px;
          background: rgba(0,0,0,0.07);
          border-radius: 99px;
          overflow: hidden;
        }
        .cert-dc-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.6s ease;
        }
        .cert-dc-bar-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-top: -2px;
        }

        /* Action buttons */
        .cert-dc-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .cert-dc-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .cert-dc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .cert-dc-btn-renew {
          background: rgba(34,197,94,0.10);
          border-color: rgba(34,197,94,0.35);
          color: #16a34a;
        }
        .cert-dc-btn-renew:hover:not(:disabled) {
          background: rgba(34,197,94,0.18);
        }
        .cert-dc-btn-delete {
          background: transparent;
          border-color: var(--border-color);
          color: var(--text-secondary);
        }
        .cert-dc-btn-delete:hover:not(:disabled) {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.35);
          color: #dc2626;
        }

        /* Spinner */
        .cert-dc-spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: certSpin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes certSpin { to { transform: rotate(360deg); } }

        /* Confirm Modal */
        .cert-dash-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .cert-dash-modal {
          background: var(--surface-color);
          border-radius: 0.75rem;
          padding: 1.5rem;
          max-width: 400px; width: 90%;
          box-shadow: 0 20px 50px rgba(0,0,0,.2);
        }
        .cert-dash-modal-title {
          font-size: 1rem; font-weight: 700; margin: 0 0 0.75rem 0;
        }
        .cert-dash-modal-body {
          font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem;
        }
        .cert-dash-modal-actions {
          display: flex; justify-content: flex-end; gap: 0.75rem;
        }
        .cert-btn-confirm-renew {
          background: #16a34a; color: #fff; font-weight: 600;
          padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer;
          transition: opacity 0.15s;
        }
        .cert-btn-confirm-renew:hover { opacity: 0.88; }
        .btn-danger {
          background: #dc2626; color: #fff; font-weight: 600;
          padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer;
          transition: opacity 0.15s;
        }
        .btn-danger:hover { opacity: 0.88; }
      `}</style>
    </div>
  );
}
