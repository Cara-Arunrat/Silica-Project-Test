import React from 'react';
import { useTransactions, findKey } from '../../api/hooks';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

export default function HistoryTable({ title, tableName, columns, renderRow, onExport, dateRange, filterRecord }) {
  const { data, loading, error } = useTransactions(tableName);

  const filteredData = React.useMemo(() => {
    let result = data;
    if (!result) return result;

    if (dateRange) {
      result = result.filter(record => {
        // Find the best date field (Date, Month, or Created Time)
        const dateKey = findKey(Object.keys(record), 'date') || 
                        findKey(Object.keys(record), 'month') || 
                        findKey(Object.keys(record), 'submitted date');
        
        const recordDateVal = dateKey ? record[dateKey] : record._createdTime;
        if (!recordDateVal) return true;

        // Normalize to YYYY-MM-DD
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

    return result;
  }, [data, dateRange, filterRecord]);

  const handleExport = () => {
    if (!filteredData || filteredData.length === 0) {
      alert("No data to export");
      return;
    }

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

      // Default export if onExport not provided
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
              </tr>
            </thead>
            <tbody>
              {!filteredData || filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="text-center text-secondary py-lg">
                    No records found for {title} in this date range.
                  </td>
                </tr>
              ) : (
                filteredData.map((record) => {
                  // Resilient field extraction helper using the same logic as the saving hook
                  const safeGet = (search) => {
                    const key = findKey(Object.keys(record), search);
                    const val = key ? record[key] : null;
                    if (Array.isArray(val)) return val.join(', ');
                    return val;
                  };

                  const createdAt = safeGet('created at') || safeGet('timestamp') || safeGet('created time') || record._createdTime;
                  let createdBy = safeGet('created by') || safeGet('author') || safeGet('user') || safeGet('by');

                  // Handle Collaborator Object or ID Array
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
