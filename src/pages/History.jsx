import React, { useState, useMemo } from 'react';
import HistoryTable from './history/HistoryTable';
import { TABLE_NAMES } from '../api/airtable';
import { useMasterData } from '../api/hooks';

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState('purchase');

  // Filter State
  const [rangeType, setRangeType] = useState('month');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const dLast = new Date(y, today.getMonth() + 1, 0).getDate();
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(dLast).padStart(2, '0')}` };
  });

  const handleRangeChange = (type) => {
    setRangeType(type);
    const today = new Date();
    const y = today.getFullYear();

    if (type === 'month') {
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const dLast = new Date(y, today.getMonth() + 1, 0).getDate();
      setDateRange({ start: `${y}-${m}-01`, end: `${y}-${m}-${String(dLast).padStart(2, '0')}` });
    } else if (type === 'year') {
      setDateRange({ start: `${y}-01-01`, end: `${y}-12-31` });
    } else if (type === '2024') {
      setDateRange({ start: '2024-01-01', end: '2024-12-31' });
    } else if (type === '2025') {
      setDateRange({ start: '2025-01-01', end: '2025-12-31' });
    } else if (type === 'all') {
      setDateRange(null);
    }
  };

  // Fetch all master data for ID resolution
  const { data: trucks, loading: loadTrucks } = useMasterData(TABLE_NAMES.VEHICLES);
  const { data: drivers, loading: loadDrivers } = useMasterData(TABLE_NAMES.DRIVERS);
  const { data: suppliers, loading: loadSuppliers } = useMasterData(TABLE_NAMES.SUPPLIERS);
  const { data: customers, loading: loadCustomers } = useMasterData(TABLE_NAMES.CUSTOMERS);
  const { data: grades, loading: loadGrades } = useMasterData(TABLE_NAMES.PRODUCT_GRADES);

  // Helper to resolve linked record names
  const getName = useMemo(() => (ids, masterList, isLoading) => {
    if (isLoading && (!masterList || masterList.length === 0)) return '...';
    if (!ids) return '-';
    
    // Airtable returns arrays for linked records, but safeGet might have joined them
    let idArray = [];
    if (Array.isArray(ids)) {
      idArray = ids;
    } else {
      const idStr = String(ids);
      idArray = idStr.includes(',') ? idStr.split(',').map(s => s.trim()) : [idStr];
    }
    
    const names = idArray.map(id => {
      const match = masterList.find(item => item._id === id || item.id === id);
      if (match) {
        // Try to find any field that looks like a name/text
        return match.name || match.Name || match.username || match.text || 
               match[Object.keys(match).find(k => k.toLowerCase().includes('name'))] || 
               match[Object.keys(match).find(k => k.toLowerCase().includes('label'))] || id;
      }
      return id;
    });
    return names.join(', ');
  }, []);

  const tabs = [
    { id: 'purchase', label: 'Purchases' },
    { id: 'delivery', label: 'Deliveries' },
    { id: 'gasoline', label: 'Gasoline Usage' },
    { id: 'production', label: 'Production Logs' },
    { id: 'plan', label: 'Monthly Plans' },
  ];

  return (
    <div className="history-page">
      <div className="flex justify-between items-end mb-lg flex-wrap gap-md">
        <div>
          <h2 className="text-2xl font-bold mb-xs">Operations History</h2>
          <p className="text-secondary">View past transactions and log entries.</p>
        </div>

        <div className="flex items-center gap-md flex-wrap">
          <div className="form-group mb-0">
            <select
              className="form-control"
              value={rangeType}
              onChange={(e) => handleRangeChange(e.target.value)}
              style={{ padding: '8px 12px', minWidth: '180px' }}
            >
              <option value="month">This Calendar Month</option>
              <option value="year">This Calendar Year</option>
              <option value="2025">Last Year (2025)</option>
              <option value="2024">Year 2024</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {activeTab === 'purchase' && (
            <div className="form-group mb-0">
              <select
                className="form-control"
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                style={{ padding: '8px 12px', minWidth: '180px' }}
              >
                <option value="">All Suppliers</option>
                {suppliers?.map(s => (
                  <option key={s._id} value={s._id}>
                    {getName(s._id, suppliers, loadSuppliers)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {rangeType === 'custom' && (
            <div className="card p-sm flex items-center gap-sm" style={{ padding: '8px 16px', margin: 0, border: '1px solid var(--primary-color)' }}>
              <div className="flex items-center gap-xs">
                <label className="text-xs font-medium text-secondary">From:</label>
                <input
                  type="date"
                  className="form-control text-sm"
                  style={{ padding: '4px 8px', minHeight: 'auto' }}
                  value={dateRange?.start || ''}
                  onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
                />
              </div>
              <div className="text-secondary text-sm">-</div>
              <div className="flex items-center gap-xs">
                <label className="text-xs font-medium text-secondary">To:</label>
                <input
                  type="date"
                  className="form-control text-sm"
                  style={{ padding: '4px 8px', minHeight: 'auto' }}
                  value={dateRange?.end || ''}
                  onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="tabs-container bg-surface rounded-lg shadow-sm border border-border overflow-hidden mb-lg">
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn flex-none py-sm px-lg font-medium text-sm transition-colors ${activeTab === tab.id ? 'active-tab' : 'text-secondary hover:bg-bg'
                }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-xl">
          {activeTab === 'purchase' && (
            <HistoryTable
              title="Purchase"
              tableName={TABLE_NAMES.PURCHASES}
              columns={['Date', 'Supplier Name', 'Purchase (tons)', 'Notes']}
              dateRange={dateRange}
              filterRecord={(record, safeGet) => {
                if (!supplierFilter) return true;
                const val = safeGet('supplier') || safeGet('supplierid');
                return val && String(val).includes(supplierFilter);
              }}
              renderRow={(row, get) => (
                <>
                  <td>{get('date')}</td>
                  <td>{getName(get('supplier'), suppliers, loadSuppliers)}</td>
                  <td className="font-medium">
                    {get('tons_puchase') || get('tons purchase') || get('tons_purchase') || get('kg_purchase') || get('kg purchase') || '-'}
                  </td>
                  <td className="text-secondary text-sm">{get('notes') || '-'}</td>
                </>
              )}
              onExport={(get) => ({
                'Date': get('date'),
                'Supplier Name': getName(get('supplier'), suppliers, loadSuppliers),
                'Purchase (tons)': get('tons_puchase') || get('tons purchase') || get('tons_purchase') || (parseFloat(get('kg_purchase')) / 1000) || '-',
                'Notes': get('notes') || '-'
              })}
            />
          )}

          {activeTab === 'delivery' && (
            <HistoryTable
              title="Delivery"
              tableName={TABLE_NAMES.DELIVERIES}
              columns={['Date', 'Customer Name', 'Product Grade', 'Vehicle Name', 'Driver Name', 'Weight (kg)', 'Cert No.', 'Weighing Sequence No.']}
              dateRange={dateRange}
              renderRow={(row, get) => (
                <>
                  <td>{get('date')}</td>
                  <td>{getName(get('customer'), customers, loadCustomers)}</td>
                  <td>{getName(get('product grade'), grades, loadGrades)}</td>
                  <td>{getName(get('vehicle'), trucks, loadTrucks)}</td>
                  <td>{getName(get('driver'), drivers, loadDrivers)}</td>
                  <td className="font-medium">{get('net weight')}</td>
                  <td className="text-secondary text-sm">{get('delivery certificate') || '-'}</td>
                  <td className="text-secondary text-sm">{get('weighing_sequence_no') || get('weighing sequence') || '-'}</td>
                </>
              )}
              onExport={(get) => ({
                'Date': get('date'),
                'Customer Name': getName(get('customer'), customers, loadCustomers),
                'Product Grade': getName(get('product grade'), grades, loadGrades),
                'Vehicle Name': getName(get('vehicle'), trucks, loadTrucks),
                'Driver Name': getName(get('driver'), drivers, loadDrivers),
                'Weight (kg)': get('net weight'),
                'Cert No.': get('delivery certificate') || '-',
                'Weighing Sequence No.': get('weighing_sequence_no') || get('weighing sequence') || '-'
              })}
            />
          )}

          {activeTab === 'gasoline' && (
            <HistoryTable
              title="Gasoline"
              tableName={TABLE_NAMES.GASOLINE}
              columns={['Date', 'Vehicle Name', 'Driver Name', 'Meter Start', 'Meter End', 'Fuel Used']}
              dateRange={dateRange}
              renderRow={(row, get) => (
                <>
                  <td>{get('date')}</td>
                  <td>{getName(get('vehicle'), trucks, loadTrucks)}</td>
                  <td>{getName(get('driver'), drivers, loadDrivers)}</td>
                  <td>{get('meter start')}</td>
                  <td>{get('meter end')}</td>
                  <td className="font-medium text-primary">{get('fuel')} units</td>
                </>
              )}
              onExport={(get) => ({
                'Date': get('date'),
                'Vehicle Name': getName(get('vehicle'), trucks, loadTrucks),
                'Driver Name': getName(get('driver'), drivers, loadDrivers),
                'Meter Start': get('meter start'),
                'Meter End': get('meter end'),
                'Fuel Used': get('fuel')
              })}
            />
          )}

          {activeTab === 'production' && (
            <HistoryTable
              title="Production"
              tableName={TABLE_NAMES.PRODUCTION}
              columns={['Date', 'Input (t)', 'Output (t)', 'Yield %', 'Notes']}
              dateRange={dateRange}
              renderRow={(row, get) => (
                <>
                  <td>{get('date')}</td>
                  <td>{get('raw input tons')}</td>
                  <td>{get('output tons')}</td>
                  <td className="font-medium">{get('yield percent')}%</td>
                  <td className="text-secondary text-sm">{get('notes') || '-'}</td>
                </>
              )}
              onExport={(get) => ({
                'Date': get('date'),
                'Input (t)': get('raw input tons'),
                'Output (t)': get('output tons'),
                'Yield %': get('yield percent'),
                'Notes': get('notes') || '-'
              })}
            />
          )}

          {activeTab === 'plan' && (
            <HistoryTable
              title="Monthly Plan"
              tableName={TABLE_NAMES.PLAN}
              columns={['Target Month', 'Customer Name', 'Planned Tons', 'Submitted Date']}
              dateRange={dateRange}
              renderRow={(row, get) => (
                <>
                  <td className="font-medium">{get('month')}</td>
                  <td>{getName(get('customer'), customers, loadCustomers)}</td>
                  <td>{get('planned tons')} t</td>
                  <td className="text-secondary text-sm">{get('submitted date')}</td>
                </>
              )}
              onExport={(get) => ({
                'Target Month': get('month'),
                'Customer Name': getName(get('customer'), customers, loadCustomers),
                'Planned Tons': get('planned tons'),
                'Submitted Date': get('submitted date')
              })}
            />
          )}
        </div>
      </div>

      <style>{`
        .bg-surface { background-color: var(--surface-color); }
        .rounded-lg { border-radius: var(--border-radius-lg); }
        .shadow-sm { box-shadow: var(--shadow-sm); }
        .border { border: 1px solid var(--border-color); }
        .border-b { border-bottom: 1px solid var(--border-color); }
        .border-border { border-color: var(--border-color); }
        .overflow-hidden { overflow: hidden; }
        .overflow-x-auto { overflow-x: auto; }
        .flex-none { flex: none; }
        .py-sm { padding-top: var(--spacing-sm); padding-bottom: var(--spacing-sm); }
        .px-lg { padding-left: var(--spacing-lg); padding-right: var(--spacing-lg); }
        .hover\\:bg-bg:hover { background-color: var(--bg-color); }
        .active-tab {
          color: var(--primary-color);
          border-bottom: 2px solid var(--primary-color);
          background-color: var(--bg-color);
        }
      `}</style>
    </div>
  );
}
