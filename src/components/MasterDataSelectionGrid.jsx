import React from 'react';
import { useMasterData } from '../api/hooks';
import { TABLE_NAMES } from '../api/airtable';
import { Check } from 'lucide-react';

export default function MasterDataSelectionGrid({
  tableName,
  value,
  onChange,
  onSelectLabel,
  label,
  required = true,
  disabled = false,
  filterFn = null
}) {
  const { data, loading, error } = useMasterData(tableName, true);

  // Helper to extract the title display name (mirrored from MasterDataSelect for consistency)
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
    const lowerTable = tableName?.toLowerCase();

    if (lowerTable === TABLE_NAMES.VEHICLES.toLowerCase()) val = findVal(['vehicle_name', 'plate_number']);
    if (lowerTable === TABLE_NAMES.CUSTOMERS.toLowerCase()) val = findVal(['customer_name']);
    if (lowerTable === TABLE_NAMES.SUPPLIERS.toLowerCase()) val = findVal(['supplier_name']);
    if (lowerTable === TABLE_NAMES.PRODUCT_GRADES.toLowerCase()) val = findVal(['grade_name']);
    if (lowerTable === TABLE_NAMES.RAW_MATERIALS.toLowerCase()) val = findVal(['product_code', 'Name', 'material_name']);

    if (val) return val;

    const fallback = findVal(['product_code', 'name', 'Name', 'username', 'text', 'label']);
    if (fallback) return fallback;

    const nameKey = Object.keys(item).find(k => {
      const lower = k.toLowerCase().trim();
      return lower === 'name' || lower.endsWith(' name') || lower.endsWith('_name');
    });
    
    if (nameKey) return item[nameKey];
    return item._id;
  };

  const filteredData = filterFn ? data.filter(filterFn) : data;

  const handleSelect = (id, name) => {
    if (disabled) return;
    onChange(id);
    if (onSelectLabel) {
      onSelectLabel(name);
    }
  };

  return (
    <div className="form-group mb-lg w-full">
      <label className="form-label mb-sm" style={{ display: 'block', marginBottom: '8px' }}>
        {label} {required && <span className="text-danger">*</span>}
      </label>
      
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-bg rounded-lg border border-border"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
          {filteredData.length === 0 ? (
            <div className="col-span-full text-secondary text-sm p-sm bg-bg rounded-lg italic select-none">
              No matching {label.toLowerCase()}s found.
            </div>
          ) : (
            filteredData.map((item) => {
              const name = getDisplayName(item);
              const isSelected = value === item._id;
              return (
                <div 
                  key={item._id}
                  className={`selection-item ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={() => !disabled && handleSelect(item._id, name)}
                >
                  <div className={`checkbox-circle ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="selection-text">{name}</span>
                </div>
              );
            })
          )}
        </div>
      )}
      
      {error && <span className="text-danger text-xs mt-xs">Failed to load {label} data.</span>}
      
      <style>{`
        .selection-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
          min-height: 44px;
        }
        .selection-item:hover:not(.disabled):not(.selected) {
          border-color: var(--primary-color);
          background: var(--primary-bg);
          transform: translateY(-1px);
        }
        .selection-item.selected {
          border-color: var(--primary-color);
          background: var(--primary-bg);
          border-width: 2px;
          padding: 9px 13px;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        }
        .selection-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .checkbox-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.2s;
          flex-shrink: 0;
          background: white;
        }
        .selection-item.selected .checkbox-circle {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
          transform: scale(1.1);
        }
        .selection-text {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .selection-item.selected .selection-text {
          color: var(--primary-color);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
