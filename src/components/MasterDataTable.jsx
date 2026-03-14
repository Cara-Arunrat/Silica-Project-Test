import React, { useState } from 'react';
import { useMasterData } from '../api/hooks';
import { Trash2, Eye, EyeOff } from 'lucide-react';

export default function MasterDataTable({ title, tableName }) {
  const { data, loading, error, addRecord, toggleActive, deleteRecord } = useMasterData(tableName, false);
  const [newValue, setNewValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to extract the title display name
  const getDisplayName = (item) => {
    const findVal = (keys) => {
      for (const k of keys) {
        const kLower = k.toLowerCase().replace(/_/g, ' ');
        const actualKey = Object.keys(item).find(key => {
          const keyLower = key.toLowerCase().replace(/_/g, ' ');
          return keyLower === kLower;
        });
        if (actualKey) return item[actualKey];
      }
      return null;
    };

    let val = null;
    if (tableName === 'Vehicles') val = findVal(['vehicle_name', 'plate_number']);
    if (tableName === 'Customers') val = findVal(['customer_name']);
    if (tableName === 'Suppliers') val = findVal(['supplier_name']);
    if (tableName === 'Product_Grades') val = findVal(['grade_name']);

    if (val) return val;

    const nameKey = Object.keys(item).find(k => {
      const lower = k.toLowerCase().trim();
      return lower === 'name' || lower.endsWith(' name') || lower.endsWith('_name');
    });
    
    if (nameKey) return item[nameKey];
    return item._id;
  };

  // Best guess at what field to write to when adding a new one
  const getNewFieldPayload = (val) => {
    // Collect all keys from all records to find EXACT database field names
    const allKeys = data.length > 0 
      ? Array.from(new Set(data.flatMap(item => Object.keys(item))))
      : [];

    const findBestKey = (searchStrings, fallback) => {
      for (const s of searchStrings) {
        const sLower = s.toLowerCase().replace(/_/g, ' ').trim();
        const found = allKeys.find(k => k.toLowerCase().replace(/_/g, ' ').trim() === sLower);
        if (found) return found;
      }
      return fallback;
    };

    let exactKey = null;
    if (tableName === 'Vehicles') exactKey = findBestKey(['vehicle_name', 'plate_number'], 'Vehicle Name');
    else if (tableName === 'Customers') exactKey = findBestKey(['customer_name'], 'Customer Name');
    else if (tableName === 'Suppliers') exactKey = findBestKey(['supplier_name'], 'Supplier Name');
    else if (tableName === 'Product_Grades') exactKey = findBestKey(['grade_name'], 'Grade Name');
    else exactKey = findBestKey(['name'], 'Name');

    return { [exactKey]: val };
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newValue.trim()) return;

    setIsSubmitting(true);
    try {
      await addRecord(getNewFieldPayload(newValue.trim()));
      setNewValue('');
    } catch (err) {
      alert(`Failed to add: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await toggleActive(id, currentStatus);
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    const isConfirmed = window.confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`);
    if (!isConfirmed) return;

    try {
      await deleteRecord(id);
    } catch (err) {
      alert(`Failed to delete record: ${err.message}`);
    }
  };

  if (error) return <div className="text-danger p-md">Error loading {title}: {error}</div>;

  return (
    <div className="card mb-lg">
      <div className="flex justify-between items-center mb-md">
        <h3 className="text-lg font-bold">{title}</h3>
      </div>

      <form onSubmit={handleAdd} className="flex gap-sm mb-md">
        <input
          type="text"
          className="form-control flex-1"
          placeholder={`Add new ${title.toLowerCase()}...`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          disabled={loading || isSubmitting}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || isSubmitting || !newValue.trim()}
        >
          {isSubmitting ? 'Adding...' : 'Add'}
        </button>
      </form>

      {loading && data.length === 0 ? (
        <div className="text-secondary p-sm text-center">Loading {title}...</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name / ID</th>
                <th>Status</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center text-secondary py-md">No records found.</td>
                </tr>
              ) : (
                data.map(item => {
                  const isActive = item.active || item.Active || item.ACTIVE;
                  const isActiveStatus = isActive === true || isActive === '1' || isActive === 1;

                  return (
                    <tr key={item._id} style={{ opacity: isActiveStatus ? 1 : 0.5 }}>
                      <td className="font-medium">{getDisplayName(item)}</td>
                      <td>
                        <span className={isActiveStatus ? 'text-success font-medium' : 'text-danger font-medium'}>
                          {isActiveStatus ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex gap-sm justify-end">
                          <button
                            onClick={() => handleToggle(item._id, isActiveStatus)}
                            className="btn btn-secondary text-sm flex items-center justify-center title-tooltip"
                            title={isActiveStatus ? 'Deactivate' : 'Reactivate'}
                            style={{ padding: '6px 8px' }}
                          >
                            {isActiveStatus ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => handleDelete(item._id, getDisplayName(item))}
                            className="btn text-danger text-sm flex items-center justify-center title-tooltip"
                            title="Delete Record"
                            style={{ padding: '6px 8px', border: '1px solid var(--danger-color)', background: 'transparent' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
