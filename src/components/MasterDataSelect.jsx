import React from 'react';
import { useMasterData } from '../api/hooks';

export default function MasterDataSelect({
  tableName,
  value,
  onChange,
  onSelectLabel,
  label,
  required = true,
  disabled = false,
  filterFn = null
}) {
  // Always fetch only active records for dropdowns
  const { data, loading, error } = useMasterData(tableName, true);

  // Helper to extract the title display name
  const getDisplayName = (item) => {
    const findVal = (keys) => {
      for (const k of keys) {
        // Case-insensitive check
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
    if (tableName === 'Raw_materials') val = findVal(['product_code']);

    if (val) return val;

    // Generic fallback: Look for "name" or anything ending in " name" or "_name"
    const nameKey = Object.keys(item).find(k => {
      const lower = k.toLowerCase().trim();
      return lower === 'name' || lower.endsWith(' name') || lower.endsWith('_name');
    });
    
    if (nameKey) return item[nameKey];
    return item._id;
  };

  const filteredData = filterFn ? data.filter(filterFn) : data;

  const handleSelectChange = (val) => {
    onChange(val);
    if (onSelectLabel) {
      const selectedItem = data.find(item => item._id === val);
      onSelectLabel(selectedItem ? getDisplayName(selectedItem) : '');
    }
  };

  return (
    <div className="form-group flex-1">
      <label className="form-label">{label}</label>
      <select
        className="form-control"
        value={value}
        onChange={(e) => handleSelectChange(e.target.value)}
        required={required}
        disabled={disabled || loading}
      >
        <option value="">{loading ? 'Loading...' : `Select ${label}...`}</option>
        {filteredData.map((item) => (
          <option key={item._id} value={item._id}>
            {getDisplayName(item)}
          </option>
        ))}
      </select>
      {error && <span className="text-danger text-sm">Table missing / No access</span>}
    </div>
  );
}
