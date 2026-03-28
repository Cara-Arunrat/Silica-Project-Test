import React, { useMemo, forwardRef, useImperativeHandle, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { findKey } from '../../api/hooks';

const VAT_RATE = 0.07;

const PurchasesTab = forwardRef(({ purchases, suppliers, resolveName, period }, ref) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  // ── Aggregate by supplier ──
  const aggregated = useMemo(() => {
    const map = {};
    purchases.forEach(p => {
      const keys = Object.keys(p);
      const supplierKey = findKey(keys, 'supplier') || findKey(keys, 'supplier_id');
      const tonsKey = findKey(keys, 'tons_purchased') || findKey(keys, 'tons_purchase');
      const priceKey = findKey(keys, 'price_per_unit') || findKey(keys, 'price') || findKey(keys, 'unit_price');

      const supplierId = supplierKey ? (Array.isArray(p[supplierKey]) ? p[supplierKey][0] : p[supplierKey]) : 'Unknown';
      const tons = parseFloat(tonsKey ? p[tonsKey] : 0) || 0;
      const price = parseFloat(priceKey ? p[priceKey] : 0) || 0;

      if (!map[supplierId]) {
        map[supplierId] = { supplierId, name: resolveName(supplierId, suppliers), totalTons: 0, totalValue: 0, priceSum: 0, count: 0 };
      }
      map[supplierId].totalTons += tons;
      map[supplierId].totalValue += tons * price;
      map[supplierId].priceSum += price;
      map[supplierId].count += 1;
    });

    return Object.values(map).map(row => ({
      ...row,
      avgPrice: row.count > 0 ? row.priceSum / row.count : 0,
      subtotal: row.totalValue,
      vat: row.totalValue * VAT_RATE,
      payable: row.totalValue * (1 + VAT_RATE),
    }));
  }, [purchases, suppliers, resolveName]);

  const totals = useMemo(() => {
    const t = { tons: 0, subtotal: 0, vat: 0, payable: 0 };
    aggregated.forEach(r => {
      t.tons += r.totalTons;
      t.subtotal += r.subtotal;
      t.vat += r.vat;
      t.payable += r.payable;
    });
    return t;
  }, [aggregated]);

  // ── Export ──
  useImperativeHandle(ref, () => ({
    getExportData: () => ({
      sheetName: 'Purchases',
      headers: ['Supplier', 'Total Weight (tons)', 'Avg Price/Unit', 'Subtotal (฿)', 'VAT 7% (฿)', 'Payable (฿)'],
      rows: [
        ...aggregated.map(r => [r.name, r.totalTons.toFixed(2), r.avgPrice.toFixed(2), r.subtotal.toFixed(2), r.vat.toFixed(2), r.payable.toFixed(2)]),
        ['TOTAL', totals.tons.toFixed(2), '', totals.subtotal.toFixed(2), totals.vat.toFixed(2), totals.payable.toFixed(2)],
      ],
    })
  }));

  // ── TanStack Table ──
  const columns = useMemo(() => [
    { accessorKey: 'name', header: 'Supplier', cell: info => <span className="font-medium">{info.getValue()}</span> },
    { accessorKey: 'totalTons', header: 'Total Weight (tons)', cell: info => info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { accessorKey: 'avgPrice', header: 'Avg Price/Unit', cell: info => `฿${info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { accessorKey: 'subtotal', header: 'Subtotal (฿)', cell: info => `฿${info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { accessorKey: 'vat', header: 'VAT 7% (฿)', cell: info => `฿${info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { accessorKey: 'payable', header: 'Payable (฿)', cell: info => <span className="font-bold">{`฿${info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span> },
  ], []);

  const [sorting, setSorting] = React.useState([]);

  const table = useReactTable({
    data: aggregated,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // ── Detailed Table for selected supplier ──
  const detailedPurchases = useMemo(() => {
    if (!selectedSupplierId) return [];
    
    return purchases.filter(p => {
      const keys = Object.keys(p);
      const supplierKey = findKey(keys, 'supplier') || findKey(keys, 'supplier_id');
      const pId = supplierKey ? (Array.isArray(p[supplierKey]) ? p[supplierKey][0] : p[supplierKey]) : 'Unknown';
      return pId === selectedSupplierId;
    }).map(p => {
      const keys = Object.keys(p);
      const dateKey = findKey(keys, 'purchase_date') || findKey(keys, 'date');
      const date = dateKey && p[dateKey] ? new Date(p[dateKey]).toLocaleDateString() : '-';

      const tonsKey = findKey(keys, 'tons_purchased') || findKey(keys, 'tons_purchase');
      const tons = parseFloat(tonsKey ? p[tonsKey] : 0) || 0;

      const priceKey = findKey(keys, 'price_per_unit') || findKey(keys, 'price');
      const price = parseFloat(priceKey ? p[priceKey] : 0) || 0;

      return {
        id: p._id || Math.random().toString(),
        date,
        tons,
        price,
        totalCost: tons * price
      };
    });
  }, [purchases, selectedSupplierId]);

  const detailColumns = useMemo(() => [
    { accessorKey: 'date', header: 'Date', cell: info => <span className="text-secondary">{info.getValue()}</span> },
    { accessorKey: 'tons', header: 'Tons Purchased', cell: info => info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2 }) },
    { accessorKey: 'price', header: 'Price Per Unit (฿)', cell: info => `฿${info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    { accessorKey: 'totalCost', header: 'Total Cost (฿)', cell: info => <span className="font-semibold text-primary">฿{info.getValue().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
  ], []);

  const [detailSorting, setDetailSorting] = useState([]);
  const detailTable = useReactTable({
    data: detailedPurchases,
    columns: detailColumns,
    state: { sorting: detailSorting },
    onSortingChange: setDetailSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const fmt = (v) => `฿${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="mb-md">
        <h3 className="text-lg font-semibold mb-xs">Monthly Purchases — {period}</h3>
        <p className="text-secondary text-sm">Aggregated by supplier with 7% VAT applied. Click on a row to view the supplier's purchase history.</p>
      </div>

      {/* Summary Card moved to top */}
      <div className="card mb-lg" style={{ background: 'var(--primary-bg)', borderColor: 'var(--primary-color)' }}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-secondary font-medium">Total Monthly Payable</p>
            <p className="text-3xl font-bold text-primary">{fmt(totals.payable)}</p>
          </div>
          <div className="text-sm text-secondary" style={{ textAlign: 'right' }}>
            <p>{aggregated.length} supplier{aggregated.length !== 1 ? 's' : ''}</p>
            <p>{totals.tons.toLocaleString('en-US', { minimumFractionDigits: 2 })} tons total input</p>
            <p className="mt-xs text-xs text-secondary opacity-70">Excludes 7% VAT: {fmt(totals.subtotal)}</p>
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
                <tr><td colSpan={columns.length} className="text-center text-secondary p-lg">No purchase records for this period.</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id}
                    onClick={() => setSelectedSupplierId(row.original.supplierId)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedSupplierId === row.original.supplierId ? 'var(--primary-bg)' : 'transparent',
                      transition: 'all 0.2s ease',
                      borderLeft: selectedSupplierId === row.original.supplierId ? '3px solid var(--primary-color)' : '3px solid transparent'
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

      {/* ── Individual Supplier History ── */}
      <div className="card mt-lg">
        <div className="mb-md">
          <h3 className="text-lg font-semibold">Purchase History</h3>
          <p className="text-secondary text-sm">Showing detailed purchase records for the selected supplier.</p>
        </div>

        {selectedSupplierId ? (
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
            Please select a supplier from the main table above to view their purchase history.
          </div>
        )}
      </div>
    </div>
  );
});

PurchasesTab.displayName = 'PurchasesTab';
export default PurchasesTab;
