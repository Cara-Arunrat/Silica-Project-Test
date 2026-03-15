import React, { useState } from 'react';
import { useTransactions, findKey } from '../../api/hooks';
import { Download, Trash2 } from 'lucide-react';

export default function HistoryTable({ title, tableName, columns, renderRow, onExport, dateRange, filterRecord }) {
  const { data, loading, error, deleteRecord } = useTransactions(tableName);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filteredData = React.useMemo(() => {
    let result = data;
    if (!result) return result;

    if (dateRange) {
      result = result.filter(record => {
        const dateKey = findKey(Object.keys(record), 'purchase_date') ||
                        findKey(Object.keys(record), 'purchase date') ||
                        findKey(Object.keys(record), 'date') || 
                        findKey(Object.keys(record), 'month') || 
                        findKey(Object.keys(record), 'submitted date');
        
        const recordDateVal = dateKey ? record[dateKey] : record._createdTime;
        if (!recordDateVal) return true;

        const d = new Date(recordDateVal);
        if (isNaN(d)) return true;
        const iso = d.toISOString().split('T')[0];

        return iso >= dateRange.start && iso <= dateRange.end;
      });
    }

    if (filterRecord) {
      result = result.filter(record => {
        const safeGet = (search) => {
          const key = findKey(Object.keys(record), search);
          const val = key ? record[key] : null;
          if (Array.isArray(val)) return val.join(', ');
          return val;
        };
        return filterRecord(record, safeGet);
      });
    }

    // Always sort by latest first (descending)
    if (result && result.length > 0) {
      result = [...result].sort((a, b) => {
        const getVal = (obj) => {
          const k = findKey(Object.keys(obj), 'purchase_date') || 
                    findKey(Object.keys(obj), 'purchase date') ||
                    findKey(Object.keys(obj), 'date') || 
                    findKey(Object.keys(obj), 'month') || 
                    findKey(Object.keys(obj), 'submitted date') ||
                    findKey(Object.keys(obj), 'created_at');
          return k ? obj[k] : (obj._createdTime || '');
        };
        return String(getVal(b)).localeCompare(String(getVal(a)));
      });
    }

    return result;
  }, [data, dateRange, filterRecord]);

  const handleExport = async () => {
    if (!filteredData || filteredData.length === 0) {
      alert("No data to export");
      return;
    }

    try {
      const XLSX = await import('xlsx');
      
      const exportRows = filteredData.map(record => {
        const get = (search) => {
          const key = findKey(Object.keys(record), search);
          const val = key ? record[key] : null;
          if (Array.isArray(val)) return val.join(', ');
          return val;
        };

        if (onExport) {
          return onExport(get, record);
        }

        const row = {};
        columns.forEach(col => {
          row[col] = get(col);
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, title);
      
      const fileName = `${title}_History_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export Excel file. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteRecord(id);
      setConfirmDeleteId(null);
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (error) return <div className="text-danger p-md">Error loading {title}: {error}</div>;

  return (
    <div className="card mb-lg">
      <div className="flex justify-between items-center mb-md flex-wrap gap-md">
        <div>
          <h3 className="text-lg font-bold">{title} History</h3>
          <span className="text-secondary text-sm">
            {filteredData?.length || 0} records {dateRange ? 'in range' : 'found'}
          </span>
        </div>
        
        <button 
          onClick={handleExport}
          className="btn btn-secondary flex items-center gap-xs text-sm"
          disabled={!filteredData || filteredData.length === 0}
        >
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {loading ? (
        <div className="text-secondary p-sm text-center">Loading {title}...</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {columns.map((col, i) => (
                  <th key={i}>{col}</th>
                ))}
                <th>Created At</th>
                <th>Created By</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {!filteredData || filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 3} className="text-center text-secondary py-lg">
                    No records found for {title} in this date range.
                  </td>
                </tr>
              ) : (
                filteredData.map((record) => {
                  const safeGet = (search) => {
                    const key = findKey(Object.keys(record), search);
                    const val = key ? record[key] : null;
                    if (Array.isArray(val)) return val.join(', ');
                    return val;
                  };

                  const createdAt = safeGet('created at') || safeGet('timestamp') || safeGet('created time') || record._createdTime;
                  let createdBy = safeGet('created by') || safeGet('author') || record._createdBy || '';

                  if (createdBy && typeof createdBy === 'object') {
                    createdBy = createdBy.name || createdBy.email || createdBy.id || JSON.stringify(createdBy);
                  }
                  
                  return (
                    <tr key={record._id}>
                      {renderRow(record, safeGet)}
                      <td className="text-secondary text-xs">
                        {createdAt ? new Date(createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="text-secondary text-xs">
                        {createdBy || '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-delete-icon"
                          onClick={() => setConfirmDeleteId(record._id)}
                          disabled={deletingId === record._id}
                          title="Delete record"
                        >
                          {deletingId === record._id ? (
                            <span className="text-xs text-secondary">...</span>
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold mb-sm">Confirm Deletion</h4>
            <p className="text-secondary mb-lg">
              Are you sure you want to delete this {title.toLowerCase()} record? This action cannot be undone.
            </p>
            <div className="flex justify-between gap-md">
              <button
                className="btn btn-secondary flex-1"
                onClick={() => setConfirmDeleteId(null)}
                disabled={!!deletingId}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger flex-1 flex items-center justify-center gap-xs"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
              >
                <Trash2 size={16} />
                {deletingId ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-delete-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-delete-icon:hover {
          background-color: var(--danger-bg);
          color: var(--danger-color);
        }
        .btn-delete-icon:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-danger {
          background-color: var(--danger-color);
          color: white;
          font-weight: 500;
        }
        .btn-danger:hover {
          opacity: 0.9;
        }
        .btn-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }
        .modal-content {
          background: var(--surface-color);
          border-radius: var(--border-radius-lg);
          padding: var(--spacing-xl);
          max-width: 420px;
          width: 90%;
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </div>
  );
}
