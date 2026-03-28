import { useState, useEffect, useCallback } from 'react';
import { base, TABLE_NAMES } from './airtable';
import { useAuth } from '../context/AuthContext';

export const findKey = (keys, searchKey) => {
  if (!keys || keys.length === 0) return null;
  
  const norm = (s) => s.toLowerCase().replace(/_/g, ' ').trim();
  const searchNorm = norm(searchKey);
  const searchBase = searchNorm.replace(' id', '').replace('_id', '').trim();

  // 1. Exact match
  if (keys.includes(searchKey)) return searchKey;

  // 2. Exact normalized match (case-insensitive + space/underscore)
  let found = keys.find(k => norm(k) === searchNorm);
  if (found) return found;

  // 3. Fuzzy prefix match (e.g., 'vehicle_id' matches 'vehicle_type' or 'Vehicle Name')
  // We prioritize fields that equal the searchBase or start with it
  found = keys.find(k => {
    const kNorm = norm(k);
    return kNorm === searchBase || kNorm.startsWith(searchBase + ' ');
  });
  if (found) return found;

  // 4. Special case for Date/Metadata
  if (searchNorm === 'date') {
    found = keys.find(k => norm(k).includes('date'));
    if (found) return found;
  }
  if (searchNorm === 'created at' || searchNorm === 'timestamp') {
    found = keys.find(k => {
      const kn = norm(k);
      return kn.includes('created') || kn.includes('timestamp') || kn.includes('recorded');
    });
    if (found) return found;
  }
  if (searchNorm === 'created by' || searchNorm === 'user') {
    found = keys.find(k => {
      const kn = norm(k);
      return kn.includes('by') || kn.includes('user') || kn.includes('author');
    });
    if (found) return found;
  }

  return null;
};

const normalizeFields = (inputFields, existingData, tableName) => {
  const existingKeys = existingData.length > 0 
    ? Array.from(new Set(existingData.flatMap(item => Object.keys(item))))
        .filter(k => !k.startsWith('_'))
    : [];
  
  const finalFields = {};
  console.log(`[Airtable Sync] ${tableName} existing columns:`, existingKeys);
  Object.keys(inputFields).forEach(key => {
    // Never send internal fields (starting with underscore) to Airtable
    if (key.startsWith('_')) return;

    const matchingKey = findKey(existingKeys, key);
    if (matchingKey) {
      finalFields[matchingKey] = inputFields[key];
    } else {
      // Fallback mappings if no clue from existing data
      const lowerKey = key.toLowerCase().trim();
      const common = {
        'date': 'purchase_date',
        'active': 'Active',
        'net_weight_kg': 'net_weight_kg',
        'delivery_certificate_no': 'delivery_certificate_no',
        'weighing_sequence_no': 'weighing_sequence_no',
        'tons_purchased': 'tons_purchased',
        'tons_purchase': 'tons_purchased',
        'tons_puchase': 'tons_purchased',
        'fuel_price_per_liter': 'fuel_price_per_liter',
        'price_per_unit': 'fuel_price_per_liter',
        'gas_price': 'fuel_price_per_liter',
        'created_by': 'created_by',
        'created_at': 'created_at',
        'kg_purchase': 'kg_purchase',
        'vehicle_id': 'Vehicle',
        'driver_id': 'Driver',
        'customer_id': 'Customer',
        'supplier_id': 'supplier',
        'product_grade_id': 'Product Grade',
        'meter_start': 'Meter Start',
        'meter_end': 'Meter End',
        'fuel_used': 'Fuel Used',
        'vehicle_name': 'vehicle_name',
        'vehicle_type': 'vehicle_type',
        'truck_plate': 'truck_plate',
        'trailer_plate': 'trailer_plate',
        'purchase_date': 'purchase_date',
        'fuel_liters': 'fuel_liters',
        'material_id': 'raw material',
        'total_cost': 'Total_Cost',
        'product_code': 'product_code'
      };
      
      if (common[lowerKey]) {
        finalFields[common[lowerKey]] = inputFields[key];
      } else {
        // Ultimate fallback: if no match found, keep the exact key from intake.
        finalFields[key] = inputFields[key];
      }
    }
  });
  console.log(`[Airtable Sync] ${tableName} Normalized Payload:`, finalFields);
  return finalFields;
};

// Generalized hook for fetching master data
export const useMasterData = (tableName, filterActiveOnly = false) => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Remove strict server-side formula constraints to prevent field missing errors
      const records = await base(tableName).select().all();
      
      let formattedData = records.map(record => {
        const fields = record.fields;
        const cbKey = findKey(Object.keys(fields), 'created by') || 
                      findKey(Object.keys(fields), 'created_by') ||
                      findKey(Object.keys(fields), 'author');
        let createdByVal = cbKey ? fields[cbKey] : null;
        if (createdByVal && typeof createdByVal === 'object') {
          createdByVal = createdByVal.name || createdByVal.email || createdByVal.id || JSON.stringify(createdByVal);
        }

        return {
          _id: record.id,
          _createdTime: record.createdTime || record._rawJson?.createdTime,
          _createdBy: createdByVal || '',
          ...fields
        };
      });

      // Robust client-side filtering and structuring based on variations
      if (filterActiveOnly) {
         formattedData = formattedData.filter(item => {
           // If 'active' column doesn't exist at all, we assume it's valid to show (optional field)
           const keys = Object.keys(item);
           const activeKey = findKey(keys, 'active');
           if (!activeKey) return true;
           const val = item[activeKey];
           return val === true || val === '1' || val === 1;
         });
      }

      // Robust client-side sort primarily by ID fallback
      formattedData.sort((a, b) => String(b._id).localeCompare(String(a._id)));
      
      // Merge locally-known _createdBy from localStorage
      const cbMap = getCreatedByMap();
      const finalData = formattedData.map(item => ({
        ...item,
        _createdBy: item._createdBy || cbMap[item._id] || ''
      }));

      setData(finalData);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err);
      if (err.statusCode === 403 || err.message.includes('NOT_FOUND') || err.message.includes('not authorized')) {
        setError(`Table "${tableName}" is missing or token lacks access to it.`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [tableName, filterActiveOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addRecord = async (fields) => {
    const metadata = {
      active: true
    };
    
    let currentFields = { ...fields, ...metadata };
    
    // Attempt save with retries for unknown fields
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const payload = normalizeFields(currentFields, data, tableName);
        const newRecord = await base(tableName).create([{ fields: payload }]);
        
        // Track authorship locally
        const createdByName = user?.username || user?.id || '';
        if (createdByName) setCreatedByMap(newRecord[0].id, createdByName);

        const formattedRecord = { _id: newRecord[0].id, _createdBy: createdByName, ...newRecord[0].fields };
        setData(prev => [formattedRecord, ...prev]);
        fetchData();
        return formattedRecord;
      } catch (err) {
        // Handle "Unknown field name" or "cannot accept the provided value" (computed fields) or parsing errors
        const isComputed = err.message && (err.message.includes('Unknown field name') || err.message.includes('cannot accept the provided value'));
        const isParsingError = err.message && err.message.includes('Cannot parse value');

        if (isComputed || isParsingError) {
          const match = err.message.match(/Field ["']?(.*?)["']? /i) || err.message.match(/field (.*)$/i) || err.message.match(/Unknown field name: "(.*)"/);
          const fieldName = (match && match[1]) ? (match[1] || match[2]).trim().replace(/['"]/g, '') : null;

          if (fieldName) {
            console.warn(`[Airtable Master] Stripping problematic field: ${fieldName}`);
            const newFields = { ...currentFields };
            delete newFields[fieldName];
            
            const originalKey = Object.keys(newFields).find(k => {
              const kNorm = k.toLowerCase().replace(/_/g, ' ');
              const fNorm = fieldName.toLowerCase().replace(/_/g, ' ');
              return kNorm === fNorm;
            });
            if (originalKey) delete newFields[originalKey];
            
            currentFields = newFields;
            continue; // Retry
          }
        }
        
        console.error(`Error adding to ${tableName} (Attempt ${attempt}):`, err);
        throw err;
      }
    }
  };

  const updateRecord = async (id, fields) => {
    let currentFields = { ...fields };
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const payload = normalizeFields(currentFields, data, tableName);
        const updatedRecord = await base(tableName).update([{ id, fields: payload }]);
        const formattedRecord = { _id: updatedRecord[0].id, ...updatedRecord[0].fields };
        setData(prev => prev.map(item => item._id === id ? formattedRecord : item));
        return formattedRecord;
      } catch (err) {
        if (err.message && (err.message.includes('Unknown field name') || err.message.includes('cannot accept the provided value'))) {
          const match = err.message.match(/Field "(.*)"/i) || err.message.match(/Unknown field name: "(.*)"/);
          const fieldName = match ? (match[1] || match[2]) : null;
          
          if (fieldName) {
            console.warn(`[Airtable Master Update] Stripping problematic field: ${fieldName}`);
            const newFields = { ...currentFields };
            delete newFields[fieldName];
            const originalKey = Object.keys(newFields).find(k => {
              const kNorm = k.toLowerCase().replace(/_/g, ' ');
              const fNorm = fieldName.toLowerCase().replace(/_/g, ' ');
              return kNorm === fNorm;
            });
            if (originalKey) delete newFields[originalKey];
            currentFields = newFields;
            continue;
          }
        }
        console.error(`Error updating ${tableName} (Attempt ${attempt}):`, err);
        throw err;
      }
    }
  };

  const toggleActive = async (id, currentStatus) => {
    const keys = data.length > 0 ? Object.keys(data[0]) : [];
    const activeKey = findKey(keys, 'active') || 'Active';
    return updateRecord(id, { [activeKey]: !currentStatus });
  };

  const deleteRecord = async (id) => {
    try {
      await base(tableName).destroy([id]);
      setData(prev => prev.filter(item => item._id !== id));
      return id;
    } catch (err) {
      console.error(`Error deleting from ${tableName}:`, err);
      throw err;
    }
  };

  return { data, loading, error, refetch: fetchData, addRecord, updateRecord, toggleActive, deleteRecord };
};

// Specialized hook for fetching transactions

// Helpers to persist created_by across page navigations (localStorage)
const CREATED_BY_KEY = 'silica_created_by_map';
const getCreatedByMap = () => {
  try { return JSON.parse(localStorage.getItem(CREATED_BY_KEY) || '{}'); } catch { return {}; }
};
const setCreatedByMap = (id, name) => {
  const map = getCreatedByMap();
  map[id] = name;
  localStorage.setItem(CREATED_BY_KEY, JSON.stringify(map));
};

export const useTransactions = (tableName) => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const records = await base(tableName).select().all();
      
      const formattedData = records.map(record => {
        const fields = record.fields;
        // Extract created_by from various possible field names
        const cbKey = findKey(Object.keys(fields), 'created by') || 
                      findKey(Object.keys(fields), 'created_by') ||
                      findKey(Object.keys(fields), 'author');
        let createdByVal = cbKey ? fields[cbKey] : null;
        if (createdByVal && typeof createdByVal === 'object') {
          createdByVal = createdByVal.name || createdByVal.email || createdByVal.id || JSON.stringify(createdByVal);
        }
        
        return {
          _id: record.id,
          _createdTime: record.createdTime || record._rawJson?.createdTime,
          _createdBy: createdByVal || '',
          ...fields
        };
      });

      // Sort by common date field names, falling back to system creation time
      formattedData.sort((a, b) => {
        const getVal = (obj) => {
          const k = findKey(Object.keys(obj), 'purchase_date') || 
                    findKey(Object.keys(obj), 'purchase date') ||
                    findKey(Object.keys(obj), 'date') || 
                    findKey(Object.keys(obj), 'month') || 
                    findKey(Object.keys(obj), 'created_at');
          return k ? obj[k] : (obj._createdTime || '');
        };
        const valA = String(getVal(a));
        const valB = String(getVal(b));
        // Primary sort by date/time descending
        return valB.localeCompare(valA);
      });
      
      // Merge locally-known _createdBy from localStorage (survives page navigations)
      const cbMap = getCreatedByMap();
      const finalData = formattedData.map(item => ({
        ...item,
        _createdBy: item._createdBy || cbMap[item._id] || ''
      }));
      
      setData(finalData);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err);
      if (err.statusCode === 403 || err.message.includes('NOT_FOUND') || err.message.includes('not authorized')) {
        setError(`Table "${tableName}" is missing or token lacks access to it.`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addRecord = async (inputFields) => {
    const metadata = {
      created_by: user?.username || user?.id
    };
    const createdByName = user?.username || user?.id || '';
    let currentFields = { ...inputFields, ...metadata };
    
    // Recursive attempt function to handle computed or missing fields
    const attempt = async (fieldsToSubmit) => {
      try {
        const payload = normalizeFields(fieldsToSubmit, data, tableName);
        console.log(`[Airtable Add] ${tableName} Final Payload:`, JSON.stringify(payload, null, 2));
        const newRecord = await base(tableName).create([{ fields: payload }]);
        // Persist in localStorage so it survives page navigations
        setCreatedByMap(newRecord[0].id, createdByName);
        // Always inject _createdBy so history table can display it even if Airtable stripped the field
        const formattedRecord = { _id: newRecord[0].id, _createdBy: createdByName, ...newRecord[0].fields };
        setData(prev => [formattedRecord, ...prev]);
        fetchData(); // Sync formula/system fields
        return formattedRecord;
      } catch (err) {
        // 1. Handle computed fields, permission errors, or parsing errors (e.g. sending text to a User field)
        const isComputed = err.message && (err.message.includes('field is computed') || err.message.includes('cannot accept the provided value'));
        const isParsingError = err.message && err.message.includes('Cannot parse value');
        
        if (isComputed || isParsingError) {
          // Broadened regex to handle "Field 'Name'", 'Field "Name"', or "field Name"
          const match = err.message.match(/Field ["']?(.*?)["']? /i) || err.message.match(/field (.*)$/i);
          const fieldName = match ? match[1].trim().replace(/['"]/g, '') : null;
          
          if (fieldName) {
            console.warn(`[Airtable] Problem with field "${fieldName}". Strip and retry.`);
            const originalKey = Object.keys(fieldsToSubmit).find(k => {
               // Recalculate what this original key would become in normalized payload
               const p = normalizeFields({ [k]: fieldsToSubmit[k] }, data, tableName);
               return Object.keys(p)[0] === fieldName;
            });
            if (originalKey) {
              const { [originalKey]: _, ...remaining } = fieldsToSubmit;
              return attempt(remaining);
            }
          }
        }

        // 2. Handle "Unknown field name" error for optional metadata
        if (err.message && err.message.includes('Unknown field name')) {
          const match = err.message.match(/Unknown field name: "(.*)"/);
          const fieldName = match ? match[1] : null;

          // Only auto-strip metadata-like fields to avoid losing important data
          const optionalBases = ['created', 'updated', 'by', 'note', 'timestamp', 'id'];
          const isOptional = fieldName && optionalBases.some(b => fieldName.toLowerCase().includes(b));

          if (fieldName && isOptional) {
            console.warn(`[Airtable] Field "${fieldName}" is missing but optional. Strip and retry.`);
            const originalKey = Object.keys(fieldsToSubmit).find(k => {
               const p = normalizeFields({ [k]: fieldsToSubmit[k] }, data, tableName);
               return Object.keys(p)[0] === fieldName;
            });
            if (originalKey) {
              const { [originalKey]: _, ...remaining } = fieldsToSubmit;
              return attempt(remaining);
            }
          }
          
          throw new Error(`${err.message}. (Table: ${tableName})`);
        }

        console.error(`Error adding to ${tableName}:`, err);
        throw err;
      }
    };

    return attempt(currentFields);
  };

  const deleteRecord = async (id) => {
    try {
      await base(tableName).destroy([id]);
      setData(prev => prev.filter(item => item._id !== id));
      return id;
    } catch (err) {
      console.error(`Error deleting from ${tableName}:`, err);
      throw err;
    }
  };

  return { data, loading, error, refetch: fetchData, addRecord, deleteRecord };
};
