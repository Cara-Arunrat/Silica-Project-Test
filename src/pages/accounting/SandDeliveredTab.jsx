import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { findKey } from '../../api/hooks';

const VAT_RATE = 0.07;
const TODAY = new Date();
const TODAY_STR = TODAY.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const DEFAULT_HALF = TODAY.getDate() <= 15 ? 'H1' : 'H2';

const SandDeliveredTab = forwardRef(({ deliveries, customers, productGrades, drivers, vehicles, resolveName, selectedMonth, selectedYear, period }, ref) => {
  const [halfPeriod, setHalfPeriod] = useState(DEFAULT_HALF);
  const [activeCustomerTab, setActiveCustomerTab] = useState(null);
  const [gradePrices, setGradePrices] = useState({});
  const [selectedGradeId, setSelectedGradeId] = useState('');


  // ── Filter by half-period ──
  const periodFiltered = useMemo(() => {
    return deliveries.filter(d => {
      const keys = Object.keys(d);
      const dateKey = findKey(keys, 'purchase_date') || findKey(keys, 'date') || findKey(keys, 'delivery_date') || findKey(keys, 'created_at');
      const dateVal = dateKey ? d[dateKey] : d._createdTime;
      if (!dateVal) return false;
      const dt = new Date(dateVal);
      const day = dt.getDate();
      if (halfPeriod === 'H1') return day >= 1 && day <= 15;
      return day >= 16;
    });
  }, [deliveries, halfPeriod]);

  // ── Group by customer → detect TMG (S5/S8) vs others ──
  const customerGroups = useMemo(() => {
    const map = {};
    periodFiltered.forEach(d => {
      const keys = Object.keys(d);
      const custKey = findKey(keys, 'customer') || findKey(keys, 'customer_id');
      const custId = custKey ? (Array.isArray(d[custKey]) ? d[custKey][0] : d[custKey]) : 'Unknown';
      const custName = resolveName(custId, customers);
      if (!map[custId]) map[custId] = { id: custId, name: custName, records: [] };
      map[custId].records.push(d);
    });
    return Object.values(map);
  }, [periodFiltered, customers, resolveName]);

  const isTmgCustomer = (name) => {
    const n = String(name).toUpperCase();
    return n.includes('S5') || n.includes('S8');
  };

  const tmgGroups = useMemo(() => customerGroups.filter(g => isTmgCustomer(g.name)), [customerGroups]);
  const otherGroups = useMemo(() => customerGroups.filter(g => !isTmgCustomer(g.name)), [customerGroups]);

  // Build tab list: TMG first (if exists), then other customers
  const tabs = useMemo(() => {
    const t = [];
    if (tmgGroups.length > 0) t.push({ id: 'TMG', label: 'TMG (S5+S8)', isTmg: true });
    otherGroups.forEach(g => t.push({ id: g.id, label: g.name, isTmg: false }));
    return t;
  }, [tmgGroups, otherGroups]);

  // Auto-select first tab
  React.useEffect(() => {
    if (tabs.length > 0 && (!activeCustomerTab || !tabs.find(t => t.id === activeCustomerTab))) {
      setActiveCustomerTab(tabs[0].id);
    }
  }, [tabs, activeCustomerTab]);

  // ── Get records for active tab ──
  const activeRecords = useMemo(() => {
    if (!activeCustomerTab) return [];
    if (activeCustomerTab === 'TMG') {
      return tmgGroups.flatMap(g => g.records);
    }
    const group = otherGroups.find(g => g.id === activeCustomerTab);
    return group ? group.records : [];
  }, [activeCustomerTab, tmgGroups, otherGroups]);

  // ── Aggregate by grade ──
  const gradeData = useMemo(() => {
    const map = {};
    activeRecords.forEach(d => {
      const keys = Object.keys(d);
      const gradeKey = findKey(keys, 'grade_name') || findKey(keys, 'product_grade') || findKey(keys, 'Product Grade');
      const tonsKey = findKey(keys, 'tons_delivered') || findKey(keys, 'tons');
      const gradeId = gradeKey ? (Array.isArray(d[gradeKey]) ? d[gradeKey][0] : d[gradeKey]) : 'Unknown';
      const tons = parseFloat(tonsKey ? d[tonsKey] : 0) || 0;
      const gradeName = resolveName(gradeId, productGrades);

      if (!map[gradeId]) map[gradeId] = { gradeId, gradeName, totalTons: 0 };
      map[gradeId].totalTons += tons;
    });

    return Object.values(map).map(row => ({
      ...row,
      price: gradePrices[row.gradeId] || 0,
      subtotal: row.totalTons * (gradePrices[row.gradeId] || 0),
    }));
  }, [activeRecords, productGrades, resolveName, gradePrices]);

  const consolidated = useMemo(() => {
    const subtotal = gradeData.reduce((s, r) => s + r.subtotal, 0);
    return { subtotal, vat: subtotal * VAT_RATE, total: subtotal * (1 + VAT_RATE) };
  }, [gradeData]);

  const handlePriceChange = (gradeId, value) => {
    setGradePrices(prev => ({ ...prev, [gradeId]: parseFloat(value) || 0 }));
  };

  // ── Export ──
  useImperativeHandle(ref, () => ({
    getExportData: () => {
      const activeLabel = tabs.find(t => t.id === activeCustomerTab)?.label || 'Unknown';
      return {
        sheetName: `Sand_${activeLabel}`,
        headers: ['Product Grade', 'Total Tons', 'Price/Ton (฿)', 'Grade Subtotal (฿)'],
        rows: [
          ...gradeData.map(r => [r.gradeName, r.totalTons.toFixed(2), r.price.toFixed(2), r.subtotal.toFixed(2)]),
          [],
          ['Consolidated Subtotal', '', '', consolidated.subtotal.toFixed(2)],
          ['VAT (7%)', '', '', consolidated.vat.toFixed(2)],
          ['FINAL BALANCE', '', '', consolidated.total.toFixed(2)],
        ],
      };
    }
  }));

  // ── TanStack Table ──
  const columns = useMemo(() => [
    { accessorKey: 'gradeName', header: 'Product Grade', cell: info => <span className="font-medium">{info.getValue()}</span> },
    { accessorKey: 'totalTons', header: 'Total Tons', cell: info => info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    {
      id: 'priceInput',
      header: 'Price/Ton (฿)',
      cell: ({ row }) => (
        <input
          type="number"
          className="form-control"
          defaultValue={row.original.price === 0 ? '' : row.original.price}
          onBlur={e => setGradePrices(prev => ({ ...prev, [row.original.gradeId]: parseFloat(e.target.value) || 0 }))}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
          placeholder="Enter price"
          style={{ width: '140px', padding: '6px 10px', minHeight: 'auto' }}
        />
      ),
    },
    { accessorKey: 'subtotal', header: 'Grade Subtotal (฿)', cell: info => `฿${info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  ], []);

  const [sorting, setSorting] = useState([]);
  const table = useReactTable({
    data: gradeData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // ── Detailed Table for selected grade ──
  const detailedDeliveries = useMemo(() => {
    if (!selectedGradeId) return [];
    
    return activeRecords.filter(d => {
      const keys = Object.keys(d);
      const gradeKey = findKey(keys, 'grade_name') || findKey(keys, 'product_grade') || findKey(keys, 'Product Grade');
      const gId = gradeKey ? (Array.isArray(d[gradeKey]) ? d[gradeKey][0] : d[gradeKey]) : 'Unknown';
      return gId === selectedGradeId;
    }).map(d => {
      const keys = Object.keys(d);
      const dateKey = findKey(keys, 'delivery_date') || findKey(keys, 'date') || findKey(keys, 'created_at');
      const date = dateKey && d[dateKey] ? new Date(d[dateKey]).toLocaleDateString() : '-';

      const tonsKey = findKey(keys, 'tons_delivered') || findKey(keys, 'tons');
      const tons = parseFloat(tonsKey ? d[tonsKey] : 0) || 0;

      const rateKey = findKey(keys, 'driver_rate') || findKey(keys, 'rate');
      const rate = parseFloat(rateKey ? d[rateKey] : 0) || 0;

      const vehKey = findKey(keys, 'vehicle') || findKey(keys, 'vehicle_name');
      const vehicleName = vehKey ? resolveName(d[vehKey], vehicles) : '-';

      const dvrKey = findKey(keys, 'driver') || findKey(keys, 'driver_name') || findKey(keys, 'Driver');
      const driverName = dvrKey ? resolveName(d[dvrKey], drivers) : '-';

      return {
        id: d._id || Math.random().toString(),
        date,
        tons,
        rate,
        vehicleName,
        driverName
      };
    });
  }, [activeRecords, selectedGradeId, vehicles, drivers, resolveName]);

  const detailColumns = useMemo(() => [
    { accessorKey: 'date', header: 'Date', cell: info => <span className="text-secondary">{info.getValue()}</span> },
    { accessorKey: 'tons', header: 'Tons Delivered', cell: info => <span className="font-medium">{info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
    { accessorKey: 'rate', header: 'Driver Rate (฿)', cell: info => `฿${info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    { accessorKey: 'vehicleName', header: 'Vehicle Name' },
    { accessorKey: 'driverName', header: 'Driver Name' },
  ], []);

  const [detailSorting, setDetailSorting] = useState([]);
  const detailTable = useReactTable({
    data: detailedDeliveries,
    columns: detailColumns,
    state: { sorting: detailSorting },
    onSortingChange: setDetailSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const fmt = (v) => `฿${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const periodLabel = halfPeriod === 'H1'
    ? `1st – 15th ${period}`
    : `16th – End of ${period}`;

  return (
    <div>
      {/* Control Bar: Today + Billing Range + Customer Pills */}
      <div className="card mb-lg" style={{ padding: '16px 20px' }}>
        {/* Row 1: Today's date */}
        <div className="flex items-center gap-sm mb-sm">
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>📅 Today:</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-color)' }}>{TODAY_STR}</span>
        </div>

        {/* Row 2: Billing Range + Customer Selector */}
        <div className="flex items-center gap-md flex-wrap">
          {/* Billing Range */}
          <div className="flex items-center gap-xs">
            <span className="text-sm font-medium text-secondary" style={{ whiteSpace: 'nowrap' }}>Billing Range:</span>
            <button
              className={`btn ${halfPeriod === 'H1' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setHalfPeriod('H1')}
              style={{ borderRadius: '20px', padding: '6px 16px', fontSize: '13px' }}
            >
              1st – 15th
            </button>
            <button
              className={`btn ${halfPeriod === 'H2' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setHalfPeriod('H2')}
              style={{ borderRadius: '20px', padding: '6px 16px', fontSize: '13px' }}
            >
              16th – End
            </button>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }} />

          {/* Customer Selector */}
          <div className="flex items-center gap-xs flex-wrap">
            <span className="text-sm font-medium text-secondary" style={{ whiteSpace: 'nowrap' }}>Customer:</span>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCustomerTab(tab.id)}
                className="font-medium text-sm"
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  background: activeCustomerTab === tab.id
                    ? (tab.isTmg ? 'var(--primary-color)' : '#6366f1')
                    : 'var(--bg-color)',
                  color: activeCustomerTab === tab.id ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeCustomerTab === tab.id ? 'transparent' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Pill Tabs */}
      {tabs.length === 0 ? (
        <div className="card p-lg text-center text-secondary">No delivery records for this period.</div>
      ) : (
        <>


          <div className="mb-md">
            <h3 className="text-lg font-semibold mb-xs">
              {tabs.find(t => t.id === activeCustomerTab)?.label || ''} — {periodLabel}
            </h3>
            <p className="text-secondary text-sm">Enter price per grade to compute billing totals. Click on a row to view delivery history.</p>
          </div>

          {/* Summary Card Moved to Top */}
          <div className="card mb-lg" style={{ background: 'var(--primary-bg)', borderColor: 'var(--primary-color)' }}>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-secondary mb-md">
              {activeCustomerTab === 'TMG' ? 'TMG Consolidated Summary' : `${tabs.find(t => t.id === activeCustomerTab)?.label} Summary`}
            </h4>
            <div className="space-y-sm">
              <div className="flex justify-between items-center">
                <span className="text-secondary">Consolidated Subtotal</span>
                <span className="font-semibold">{fmt(consolidated.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-secondary">VAT (7%)</span>
                <span className="font-semibold">{fmt(consolidated.vat)}</span>
              </div>
              <div style={{ borderTop: '2px solid var(--primary-color)', paddingTop: '12px', marginTop: '8px' }} className="flex justify-between items-center">
                <span className="font-bold text-lg">Final Balance</span>
                <span className="font-bold text-2xl text-primary">{fmt(consolidated.total)}</span>
              </div>
            </div>
          </div>

          <div className="card mb-lg">
            <div className="table-container">
              <table className="table">
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted()] ?? ''}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr><td colSpan={columns.length} className="text-center text-secondary p-lg">No records.</td></tr>
                  ) : (
                    table.getRowModel().rows.map(row => (
                      <tr 
                        key={row.id}
                        onClick={() => setSelectedGradeId(row.original.gradeId)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedGradeId === row.original.gradeId ? 'var(--primary-bg)' : 'transparent',
                          transition: 'all 0.2s ease',
                          borderLeft: selectedGradeId === row.original.gradeId ? '3px solid var(--primary-color)' : '3px solid transparent'
                        }}
                      >
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Individual Grade History ── */}
          <div className="card mt-lg">
            <div className="mb-md">
              <h3 className="text-lg font-semibold">Delivery History</h3>
              <p className="text-secondary text-sm">Showing detailed delivery records for the selected product grade.</p>
            </div>

            {selectedGradeId ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    {detailTable.getHeaderGroups().map(hg => (
                      <tr key={hg.id}>
                        {hg.headers.map(header => (
                          <th key={header.id} onClick={header.column.getToggleSortingHandler()} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted()] ?? ''}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {detailTable.getRowModel().rows.length === 0 ? (
                      <tr><td colSpan={detailColumns.length} className="text-center text-secondary p-lg">No history found.</td></tr>
                    ) : (
                      detailTable.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-xl text-center text-secondary bg-gray-50 rounded" style={{ border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                Please select a grade from the main table above to view its delivery history.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

SandDeliveredTab.displayName = 'SandDeliveredTab';
export default SandDeliveredTab;
