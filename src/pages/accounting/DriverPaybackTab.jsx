import React, { useMemo, forwardRef, useImperativeHandle, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { findKey } from '../../api/hooks';

const DriverPaybackTab = forwardRef(({ deliveries, gasolineLogs, allDeliveries, allGasolineLogs, drivers, vehicles, customers, productGrades, resolveName, selectedMonth, selectedYear, period }, ref) => {
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // ── Helper: get previous month data ──
  const getPrevMonth = () => {
    let pm = selectedMonth - 1, py = selectedYear;
    if (pm < 0) { pm = 11; py -= 1; }
    return { month: pm, year: py };
  };

  const filterByPeriod = (records, month, year) => {
    return records.filter(r => {
      const keys = Object.keys(r);
      const dateKey = findKey(keys, 'purchase_date') || findKey(keys, 'date') || findKey(keys, 'created_at');
      const dateVal = dateKey ? r[dateKey] : r._createdTime;
      if (!dateVal) return false;
      const d = new Date(dateVal);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  };

  // ── Map vehicles to drivers ──
  const vehicleDriverMap = useMemo(() => {
    const map = {};
    vehicles?.forEach(v => {
      const keys = Object.keys(v);
      const driverKey = findKey(keys, 'driver') || findKey(keys, 'driver_id');
      if (driverKey && v[driverKey]) {
        const driverId = Array.isArray(v[driverKey]) ? v[driverKey][0] : v[driverKey];
        map[v._id] = driverId;
      }
    });
    return map;
  }, [vehicles]);

  // ── Current month aggregation ──
  const driverData = useMemo(() => {
    const map = {};

    // 1. Income from deliveries
    deliveries.forEach(d => {
      const keys = Object.keys(d);
      const driverKey = findKey(keys, 'driver') || findKey(keys, 'Driver') || findKey(keys, 'driver_id');
      const tonsKey = findKey(keys, 'tons_delivered') || findKey(keys, 'tons');
      const rateKey = findKey(keys, 'driver_rate') || findKey(keys, 'rate');

      const driverId = driverKey ? (Array.isArray(d[driverKey]) ? d[driverKey][0] : d[driverKey]) : null;
      if (!driverId) return;

      const tons = parseFloat(tonsKey ? d[tonsKey] : 0) || 0;
      const rate = parseFloat(rateKey ? d[rateKey] : 0) || 0;

      if (!map[driverId]) {
        map[driverId] = { driverId, name: resolveName(driverId, drivers), totalTons: 0, income: 0, gasolineCost: 0 };
      }
      map[driverId].totalTons += tons;
      map[driverId].income += tons * rate;
    });

    // 2. Gasoline cost from logs
    gasolineLogs.forEach(g => {
      const keys = Object.keys(g);
      const costKey = findKey(keys, 'total_price') || findKey(keys, 'total_cost') || findKey(keys, 'cost');
      const cost = parseFloat(costKey ? g[costKey] : 0) || 0;

      // Find which driver owns this gasoline log
      const driverLogKey = findKey(keys, 'driver') || findKey(keys, 'Driver') || findKey(keys, 'driver_id');
      let driverId = driverLogKey ? (Array.isArray(g[driverLogKey]) ? g[driverLogKey][0] : g[driverLogKey]) : null;

      if (!driverId) {
        const vehicleKey = findKey(keys, 'vehicle_name') || findKey(keys, 'vehicle') || findKey(keys, 'vehicle_id');
        const vehicleVal = vehicleKey ? (Array.isArray(g[vehicleKey]) ? g[vehicleKey][0] : g[vehicleKey]) : null;
        
        if (vehicleVal && vehicleVal.startsWith('rec')) {
          driverId = vehicleDriverMap[vehicleVal];
        } else if (vehicleVal) {
          const vRecord = vehicles?.find(v => {
            const nmKey = findKey(Object.keys(v), 'name') || findKey(Object.keys(v), 'vehicle_name');
            return v[nmKey] === vehicleVal;
          });
          if (vRecord) driverId = vehicleDriverMap[vRecord._id];
        }
      }

      if (driverId) {
        if (!map[driverId]) {
          map[driverId] = { driverId, name: resolveName(driverId, drivers), totalTons: 0, income: 0, gasolineCost: 0 };
        }
        map[driverId].gasolineCost += cost;
      }
    });

    return Object.values(map).map(row => ({
      ...row,
      netPayback: row.income - row.gasolineCost,
    }));
  }, [deliveries, gasolineLogs, drivers, vehicles, resolveName, vehicleDriverMap]);

  // ── Previous month data for discrepancy detection ──
  const prevMonthCosts = useMemo(() => {
    const prev = getPrevMonth();
    const prevGasoline = filterByPeriod(allGasolineLogs, prev.month, prev.year);
    const prevDeliveries = filterByPeriod(allDeliveries, prev.month, prev.year);
    const map = {};

    prevGasoline.forEach(g => {
      const keys = Object.keys(g);
      const costKey = findKey(keys, 'total_price') || findKey(keys, 'total_cost');
      const cost = parseFloat(costKey ? g[costKey] : 0) || 0;

      const driverLogKey = findKey(keys, 'driver') || findKey(keys, 'Driver') || findKey(keys, 'driver_id');
      let driverId = driverLogKey ? (Array.isArray(g[driverLogKey]) ? g[driverLogKey][0] : g[driverLogKey]) : null;

      if (!driverId) {
        const vehicleKey = findKey(keys, 'vehicle_name') || findKey(keys, 'vehicle') || findKey(keys, 'vehicle_id');
        const vehicleVal = vehicleKey ? (Array.isArray(g[vehicleKey]) ? g[vehicleKey][0] : g[vehicleKey]) : null;
        
        if (vehicleVal && vehicleVal.startsWith('rec')) {
          driverId = vehicleDriverMap[vehicleVal];
        } else if (vehicleVal) {
          const vRecord = vehicles?.find(v => {
            const nmKey = findKey(Object.keys(v), 'name') || findKey(Object.keys(v), 'vehicle_name');
            return v[nmKey] === vehicleVal;
          });
          if (vRecord) driverId = vehicleDriverMap[vRecord._id];
        }
      }

      if (driverId) {
        map[driverId] = (map[driverId] || 0) + cost;
      }
    });
    return map;
  }, [allGasolineLogs, allDeliveries, vehicleDriverMap, selectedMonth, selectedYear]);

  const getDiscrepancyStatus = (driverId, currentCost) => {
    const prevCost = prevMonthCosts[driverId];
    if (!prevCost || prevCost === 0) return null;
    if (currentCost > prevCost * 1.20) return 'warning';
    return null;
  };

  const totals = useMemo(() => {
    return driverData.reduce((acc, r) => ({
      tons: acc.tons + r.totalTons,
      income: acc.income + r.income,
      gasoline: acc.gasoline + r.gasolineCost,
      net: acc.net + r.netPayback,
    }), { tons: 0, income: 0, gasoline: 0, net: 0 });
  }, [driverData]);

  // ── Export ──
  useImperativeHandle(ref, () => ({
    getExportData: () => ({
      sheetName: 'Driver_Payback',
      headers: ['Driver', 'Total Tons', 'Income (฿)', 'Gasoline Cost (฿)', 'Net Payback (฿)', 'Status'],
      rows: [
        ...driverData.map(r => [
          r.name, r.totalTons.toFixed(2), r.income.toFixed(2), r.gasolineCost.toFixed(2), r.netPayback.toFixed(2),
          getDiscrepancyStatus(r.driverId, r.gasolineCost) === 'warning' ? 'HIGH COST ⚠️' : 'OK'
        ]),
        ['TOTAL', totals.tons.toFixed(2), totals.income.toFixed(2), totals.gasoline.toFixed(2), totals.net.toFixed(2), ''],
      ],
    })
  }));

  // ── TanStack Table ──
  const columns = useMemo(() => [
    { accessorKey: 'name', header: 'Driver', cell: info => <span className="font-medium">{info.getValue()}</span> },
    { accessorKey: 'totalTons', header: 'Total Tons', cell: info => info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { accessorKey: 'income', header: 'Income (฿)', cell: info => `฿${info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    {
      accessorKey: 'gasolineCost',
      header: 'Gasoline Cost (฿)',
      cell: ({ row }) => {
        const status = getDiscrepancyStatus(row.original.driverId, row.original.gasolineCost);
        return (
          <span style={{ color: status === 'warning' ? 'var(--danger-color)' : 'inherit', fontWeight: status === 'warning' ? 700 : 400 }}>
            ฿{row.original.gasolineCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {status === 'warning' && <span style={{ marginLeft: '6px', fontSize: '11px', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px' }}>⚠ HIGH</span>}
          </span>
        );
      }
    },
    {
      accessorKey: 'netPayback',
      header: 'Net Payback (฿)',
      cell: info => (
        <span className="font-bold" style={{ color: info.getValue() >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
          ฿{info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
  ], [prevMonthCosts, vehicleDriverMap]);

  const [sorting, setSorting] = useState([]);
  const table = useReactTable({
    data: driverData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // ── Selected Driver Deliveries Table ──
  const selectedDriverDeliveries = useMemo(() => {
    if (!selectedDriverId) return [];
    
    const dName = resolveName(selectedDriverId, drivers);

    return deliveries.filter(d => {
      const keys = Object.keys(d);
      const driverKey = findKey(keys, 'driver') || findKey(keys, 'Driver') || findKey(keys, 'driver_id');
      const dId = driverKey ? (Array.isArray(d[driverKey]) ? d[driverKey][0] : d[driverKey]) : null;
      return dId === selectedDriverId;
    }).map(d => {
      const keys = Object.keys(d);
      
      const dateKey = findKey(keys, 'purchase_date') || findKey(keys, 'date') || findKey(keys, 'created_at');
      const date = dateKey ? (d[dateKey] ? new Date(d[dateKey]).toLocaleDateString() : '-') : '-';

      const custKey = findKey(keys, 'customer') || findKey(keys, 'customer_id');
      const customer = custKey ? resolveName(d[custKey], customers) : '-';

      const gradeKey = findKey(keys, 'grade_name') || findKey(keys, 'product_grade') || findKey(keys, 'Product Grade');
      const productGrade = gradeKey ? resolveName(d[gradeKey], productGrades) : '-';

      const vehKey = findKey(keys, 'vehicle') || findKey(keys, 'vehicle_name');
      const vehicleName = vehKey ? resolveName(d[vehKey], vehicles) : '-';

      const tonsKey = findKey(keys, 'tons_delivered') || findKey(keys, 'tons');
      const weight = parseFloat(tonsKey ? d[tonsKey] : 0) || 0;

      return {
        id: d._id || Math.random().toString(),
        date,
        customer,
        productGrade,
        driverName: dName,
        vehicleName,
        weight
      };
    });
  }, [deliveries, selectedDriverId, customers, productGrades, vehicles, drivers, resolveName]);

  const deliveryColumns = useMemo(() => [
    { accessorKey: 'date', header: 'Date', cell: info => <span className="text-secondary">{info.getValue()}</span> },
    { accessorKey: 'customer', header: 'Customer Name' },
    { accessorKey: 'productGrade', header: 'Product Grade' },
    { accessorKey: 'driverName', header: 'Driver Name' },
    { accessorKey: 'vehicleName', header: 'Vehicle Name' },
    { accessorKey: 'weight', header: 'Weight (Tons)', cell: info => <span className="font-semibold">{info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
  ], []);

  const [deliverySorting, setDeliverySorting] = useState([]);
  const deliveryTable = useReactTable({
    data: selectedDriverDeliveries,
    columns: deliveryColumns,
    state: { sorting: deliverySorting },
    onSortingChange: setDeliverySorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const fmt = (v) => `฿${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="mb-md">
        <h3 className="text-lg font-semibold mb-xs">Driver Payback — {period}</h3>
        <p className="text-secondary text-sm">Income (tons × rate) minus gasoline cost. Click on a row to view the driver's delivery history. Anomalies highlighted when cost exceeds 120% of previous month.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <div className="card" style={{ borderLeft: '4px solid var(--success-color)' }}>
          <p className="text-sm text-secondary font-medium">Total Income</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--success-color)' }}>{fmt(totals.income)}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--danger-color)' }}>
          <p className="text-sm text-secondary font-medium">Total Gasoline Cost</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--danger-color)' }}>{fmt(totals.gasoline)}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
          <p className="text-sm text-secondary font-medium">Net Driver Payback</p>
          <p className="text-2xl font-bold text-primary">{fmt(totals.net)}</p>
        </div>
      </div>

      <div className="card mb-lg">

        <div className="table-container">
          <table className="table">
            <thead>
              {table.getHeaderGroups().map(hg => (
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
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="text-center text-secondary p-lg">No driver data for this period.</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id}
                    onClick={() => setSelectedDriverId(row.original.driverId)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedDriverId === row.original.driverId ? 'var(--primary-bg)' : 'transparent',
                      transition: 'all 0.2s ease',
                      borderLeft: selectedDriverId === row.original.driverId ? '3px solid var(--primary-color)' : '3px solid transparent'
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

      {/* (Summary cards moved to top) */}

      {/* ── Individual Driver Detail ── */}
      <div className="card mt-lg">
        <div className="mb-md">
          <h3 className="text-lg font-semibold">Driver Delivery History</h3>
          <p className="text-secondary text-sm">Showing delivery records for selected driver.</p>
        </div>

        {selectedDriverId ? (
          <div className="table-container">
            <table className="table">
              <thead>
                {deliveryTable.getHeaderGroups().map(hg => (
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
                {deliveryTable.getRowModel().rows.length === 0 ? (
                  <tr><td colSpan={deliveryColumns.length} className="text-center text-secondary p-lg">No deliveries found for this driver in this period.</td></tr>
                ) : (
                  deliveryTable.getRowModel().rows.map(row => (
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
            Please select a driver from the main table above to view their delivery records.
          </div>
        )}
      </div>

    </div>
  );
});

DriverPaybackTab.displayName = 'DriverPaybackTab';
export default DriverPaybackTab;
