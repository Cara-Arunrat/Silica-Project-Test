import React, { useState, useMemo, useEffect } from 'react';
import { useTransactions, findKey } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import { ShieldCheck, ShieldAlert, ShieldOff, ChevronLeft, ChevronRight, Trash2, Download } from 'lucide-react';

const PAGE_SIZE = 15;

function StatusBadge({ active, expiration }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!expiration) return <span className="cert-badge cert-badge-unknown">Unknown</span>;

  const exp = new Date(expiration);
  const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

  if (diff < 0)     return <span className="cert-badge cert-badge-expired"><ShieldOff size={12} /> Expired</span>;
  if (diff <= 30)   return <span className="cert-badge cert-badge-warning"><ShieldAlert size={12} /> Expires in {diff}d</span>;
  return              <span className="cert-badge cert-badge-active"><ShieldCheck size={12} /> Active</span>;
}

function formatDate(val) {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CertReminderTab({ users = [] }) {
  const { data, loading, error, refetch, deleteRecord } = useTransactions(TABLE_NAMES.CERT_REMINDER);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId]     = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Always re-fetch from Airtable when this tab mounts so Complete_date
  // populated from the Dashboard "Renewed" action is immediately visible.
  useEffect(() => { refetch(); }, []);

  // Sort: newest first by Active_date or created time
  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const getDate = (r) => {
        const k = findKey(Object.keys(r), 'active_date') ||
                  findKey(Object.keys(r), 'active date') ||
                  findKey(Object.keys(r), 'created_at');
        return k ? r[k] : (r._createdTime || '');
      };
      return String(getDate(b)).localeCompare(String(getDate(a)));
    });
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteRecord(id);
      setConfirmDeleteId(null);
      // Adjust page if last item on page was deleted
      if (pageData.length === 1 && page > 1) setPage(p => p - 1);
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    if (!sorted || sorted.length === 0) { alert('No data to export'); return; }
    try {
      const XLSX = await import('xlsx');
      const rows = sorted.map(r => {
        const get = (key) => {
          const k = findKey(Object.keys(r), key);
          return k ? r[k] : null;
        };
        return {
          'Certificate Name':  get('name') || get('Name') || '-',
          'Active Date':       formatDate(get('active_date') || get('active date')),
          'Expiration Date':   formatDate(get('expiration_date') || get('expiration date')),
          'Renewal Days':      get('renew_days') || get('renew days') || '-',
          'Complete Date':     formatDate(get('complete_date') || get('complete date')),
          'Created By':        get('created_by') || get('created by') || '-',
          'Created At':        get('created_at') || get('created at') || r._createdTime || '-',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cert Reminders');
      XLSX.writeFile(wb, `Cert_Reminder_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Export failed. Please try again.');
    }
  };

  if (error)   return <div className="text-danger p-md">Error loading Cert. Reminders: {error}</div>;

  return (
    <div className="cert-tab mt-lg animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-md flex-wrap gap-md">
        <div>
          <h3 className="text-lg font-bold">Certificate Reminder Log</h3>
          <span className="text-secondary text-sm">
            {sorted.length} record{sorted.length !== 1 ? 's' : ''} total
          </span>
        </div>
        <button
          className="btn btn-secondary flex items-center gap-xs text-sm"
          onClick={handleExport}
          disabled={sorted.length === 0}
        >
          <Download size={16} /> Export Excel
        </button>
      </div>

      {loading ? (
        <div className="text-secondary p-sm text-center">Loading certificates...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Certificate Name</th>
                  <th>Active Date</th>
                  <th>Expiration Date</th>
                  <th>Renewal (days)</th>
                  <th>Complete Date</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-secondary py-lg">
                      No certificate records found.
                    </td>
                  </tr>
                ) : (
                  pageData.map((record, idx) => {
                    const get = (key) => {
                      const k = findKey(Object.keys(record), key);
                      const val = k ? record[k] : null;
                      return Array.isArray(val) ? val.join(', ') : val;
                    };

                    const name        = get('name') || get('Name') || '-';
                    const activeDate  = get('active_date') || get('active date');
                    const expDate     = get('expiration_date') || get('expiration date');
                    const renewDays   = get('renew_days') || get('renew days');
                    const completeDate= get('complete_date') || get('complete date');
                    const createdBy   = get('created_by') || get('created by') || '-';

                    const rowNum = (page - 1) * PAGE_SIZE + idx + 1;

                    return (
                      <tr key={record._id}>
                        <td className="text-secondary text-sm">{rowNum}</td>
                        <td className="font-medium">{name}</td>
                        <td>{formatDate(activeDate)}</td>
                        <td>{formatDate(expDate)}</td>
                        <td className="text-center">{renewDays ?? '-'}</td>
                        <td className="text-secondary">{formatDate(completeDate)}</td>
                        <td><StatusBadge active={activeDate} expiration={expDate} /></td>
                        <td className="text-secondary text-xs">{createdBy}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-delete-icon"
                            onClick={() => setConfirmDeleteId(record._id)}
                            disabled={deletingId === record._id}
                            title="Delete record"
                          >
                            {deletingId === record._id
                              ? <span className="text-xs text-secondary">...</span>
                              : <Trash2 size={15} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="cert-pagination">
              <span className="cert-page-info">
                Page {page} of {totalPages} &nbsp;·&nbsp; {sorted.length} records
              </span>
              <div className="cert-page-controls">
                <button
                  className="cert-page-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, i, arr) => {
                    if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === '…'
                      ? <span key={`ellipsis-${i}`} className="cert-page-ellipsis">…</span>
                      : (
                        <button
                          key={item}
                          className={`cert-page-num ${page === item ? 'active' : ''}`}
                          onClick={() => setPage(item)}
                        >
                          {item}
                        </button>
                      )
                  )}
                <button
                  className="cert-page-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h4 className="text-lg font-bold mb-sm">Confirm Deletion</h4>
            <p className="text-secondary mb-lg">
              Are you sure you want to delete this certificate record? This action cannot be undone.
            </p>
            <div className="flex justify-between gap-md">
              <button className="btn btn-secondary flex-1" onClick={() => setConfirmDeleteId(null)} disabled={!!deletingId}>
                Cancel
              </button>
              <button
                className="btn btn-danger flex-1 flex items-center justify-center gap-xs"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
              >
                <Trash2 size={16} />
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Status badges */
        .cert-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .cert-badge-active  { background: rgba(34,197,94,0.12);  color: #16a34a; border: 1px solid rgba(34,197,94,0.25); }
        .cert-badge-warning { background: rgba(251,146,60,0.12); color: #ea580c; border: 1px solid rgba(251,146,60,0.25); }
        .cert-badge-expired { background: rgba(239,68,68,0.10);  color: #dc2626; border: 1px solid rgba(239,68,68,0.25); }
        .cert-badge-unknown { background: rgba(148,163,184,0.12); color: var(--text-secondary); border: 1px solid var(--border-color); }

        /* Pagination */
        .cert-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--spacing-md);
          margin-top: var(--spacing-lg);
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--border-color);
        }
        .cert-page-info { font-size: 0.85rem; color: var(--text-secondary); }
        .cert-page-controls { display: flex; align-items: center; gap: 4px; }
        .cert-page-btn, .cert-page-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          height: 34px;
          border-radius: var(--border-radius);
          border: 1px solid var(--border-color);
          background: var(--surface-color);
          color: var(--text-color);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0 6px;
        }
        .cert-page-btn:hover:not(:disabled),
        .cert-page-num:hover:not(.active) {
          background: var(--bg-color);
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
        .cert-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .cert-page-num.active {
          background: var(--primary-color);
          border-color: var(--primary-color);
          color: #fff;
        }
        .cert-page-ellipsis {
          padding: 0 4px;
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 34px;
        }

        /* Reuse existing modal styles */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; backdrop-filter: blur(2px);
        }
        .modal-content {
          background: var(--surface-color);
          border-radius: var(--border-radius-lg);
          padding: var(--spacing-xl);
          max-width: 420px; width: 90%;
          box-shadow: var(--shadow-lg);
        }
        .btn-delete-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          border-radius: 6px; border: none;
          background: transparent; color: var(--text-tertiary);
          cursor: pointer; transition: all 0.15s;
        }
        .btn-delete-icon:hover { background: rgba(239,68,68,.1); color: #dc2626; }
        .btn-delete-icon:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-danger { background: #dc2626; color: #fff; font-weight: 500; }
        .btn-danger:hover { opacity: 0.9; }
        .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
