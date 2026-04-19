import React, { useState, useMemo, useRef, useCallback } from 'react';
import { TABLE_NAMES } from '../api/airtable';
import { useTransactions, useMasterData, findKey } from '../api/hooks';
import { Download } from 'lucide-react';
import PurchasesTab from './accounting/PurchasesTab';
import SandDeliveredTab from './accounting/SandDeliveredTab';
import DriverPaybackTab from './accounting/DriverPaybackTab';
import YearlySummaryTab from './accounting/YearlySummaryTab';

const TABS = [
  { id: 'purchases', label: 'Purchases' },
  { id: 'sand', label: 'Sand Delivered' },
  { id: 'driver', label: 'Driver Payback' },
  { id: 'yearly', label: 'Yearly Summary' },
];

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const NOW = new Date();
const INITIAL_MONTH = NOW.getMonth();
const INITIAL_YEAR = NOW.getFullYear();

export default function Accounting() {
  const [activeTab, setActiveTab] = useState('purchases');
  const [selectedMonth, setSelectedMonth] = useState(INITIAL_MONTH); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(INITIAL_YEAR);
  const exportRef = useRef(null);

  // ── Data Hooks ──
  const { data: purchases, loading: loadPurchases } = useTransactions(TABLE_NAMES.PURCHASES);
  const { data: deliveries, loading: loadDeliveries } = useTransactions(TABLE_NAMES.DELIVERIES);
  const { data: gasolineLogs, loading: loadGasoline } = useTransactions(TABLE_NAMES.GASOLINE);
  const { data: suppliers, loading: loadSuppliers } = useMasterData(TABLE_NAMES.SUPPLIERS);
  const { data: drivers, loading: loadDrivers } = useMasterData(TABLE_NAMES.DRIVERS);
  const { data: customers, loading: loadCustomers } = useMasterData(TABLE_NAMES.CUSTOMERS);
  const { data: productGrades, loading: loadGrades } = useMasterData(TABLE_NAMES.PRODUCT_GRADES);
  const { data: vehicles } = useMasterData(TABLE_NAMES.VEHICLES);

  const isLoading = loadPurchases || loadDeliveries || loadGasoline || loadSuppliers || loadDrivers || loadCustomers || loadGrades;

  // ── Helper: resolve name from linked record ──
  const resolveName = useCallback((value, masterList) => {
    if (!value) return '-';
    const id = Array.isArray(value) ? value[0] : value;
    if (typeof id === 'string' && !id.startsWith('rec')) return id;
    const match = masterList?.find(m => m._id === id);
    if (!match) return id;
    const keys = Object.keys(match);
    const nameKey = findKey(keys, 'name') || findKey(keys, 'supplier_name') || findKey(keys, 'customer_name') || findKey(keys, 'driver_name') || keys.find(k => k.toLowerCase().includes('name'));
    return nameKey ? match[nameKey] : id;
  }, []);

  // ── Period-filtered data (month/year) ──
  const filterByMonth = useCallback((records) => {
    return records.filter(r => {
      const keys = Object.keys(r);
      const dateKey = findKey(keys, 'purchase_date') || findKey(keys, 'date') || findKey(keys, 'created_at');
      const dateVal = dateKey ? r[dateKey] : r._createdTime;
      if (!dateVal) return false;
      const d = new Date(dateVal);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [selectedMonth, selectedYear]);

  const filterByYear = useCallback((records) => {
    return records.filter(r => {
      const keys = Object.keys(r);
      const dateKey = findKey(keys, 'purchase_date') || findKey(keys, 'date') || findKey(keys, 'created_at');
      const dateVal = dateKey ? r[dateKey] : r._createdTime;
      if (!dateVal) return false;
      const d = new Date(dateVal);
      return d.getFullYear() === selectedYear;
    });
  }, [selectedYear]);

  const monthlyPurchases = useMemo(() => filterByMonth(purchases), [purchases, selectedMonth, selectedYear]);
  const monthlyDeliveries = useMemo(() => filterByMonth(deliveries), [deliveries, selectedMonth, selectedYear]);
  const monthlyGasoline = useMemo(() => filterByMonth(gasolineLogs), [gasolineLogs, selectedMonth, selectedYear]);
  const yearlyPurchases = useMemo(() => filterByYear(purchases), [purchases, selectedYear]);
  const yearlyDeliveries = useMemo(() => filterByYear(deliveries), [deliveries, selectedYear]);
  const yearlyGasoline = useMemo(() => filterByYear(gasolineLogs), [gasolineLogs, selectedYear]);

  // ── Export handler ──
  const handleExport = useCallback(() => {
    if (exportRef.current?.getExportData) {
      const { sheetName, headers, rows } = exportRef.current.getExportData();
      import('../utils/exportAccounting').then(mod => {
        mod.exportToXlsx(sheetName, headers, rows, `Accounting_${activeTab}_${MONTHS[selectedMonth]}_${selectedYear}`);
      });
    }
  }, [activeTab, selectedMonth, selectedYear]);

  // ── Memoized period string ──
  const period = useMemo(() => `${MONTHS[selectedMonth]} ${selectedYear}`, [selectedMonth, selectedYear]);

  // ── Year options ──
  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = INITIAL_YEAR; y >= 2024; y--) opts.push(y);
    return opts;
  }, []);

  return (
    <div className="accounting-page pb-xl">
      {/* ── Header ── */}
      <div className="flex justify-between items-end mb-lg flex-wrap gap-md">
        <div>
          <h1 className="text-3xl font-bold mb-xs">Accounting</h1>
          <p className="text-secondary">Financial summaries, billing, and payroll.</p>
        </div>

        <div className="flex items-center gap-md flex-wrap">
          <div className="form-group mb-0">
            <select
              className="form-control"
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              style={{ padding: '8px 12px', minWidth: '150px', height: '42px', boxSizing: 'border-box' }}
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="form-group mb-0">
            <select
              className="form-control"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{ padding: '8px 12px', minWidth: '100px', height: '42px', boxSizing: 'border-box' }}
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleExport} style={{ height: '42px' }}>
            <Download size={16} />
            <span style={{ marginLeft: '6px' }}>Download Report</span>
          </button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-xs mb-lg" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-medium text-sm`}
            style={{
              padding: '10px 20px',
              borderBottom: activeTab === tab.id ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
              background: 'transparent',
              marginBottom: '-2px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="card p-xl text-center">
          <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', margin: '0 auto 16px' }} />
          <p className="text-secondary">Loading accounting data...</p>
        </div>
      ) : (
        <>
          {activeTab === 'purchases' && (
            <PurchasesTab
              ref={exportRef}
              purchases={monthlyPurchases}
              suppliers={suppliers}
              resolveName={resolveName}
              period={period}
            />
          )}
          {activeTab === 'sand' && (
            <SandDeliveredTab
              ref={exportRef}
              deliveries={monthlyDeliveries}
              customers={customers}
              productGrades={productGrades}
              drivers={drivers}
              vehicles={vehicles}
              resolveName={resolveName}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              period={period}
            />
          )}
          {activeTab === 'driver' && (
            <DriverPaybackTab
              ref={exportRef}
              deliveries={monthlyDeliveries}
              gasolineLogs={monthlyGasoline}
              allDeliveries={deliveries}
              allGasolineLogs={gasolineLogs}
              drivers={drivers}
              vehicles={vehicles}
              customers={customers}
              productGrades={productGrades}
              resolveName={resolveName}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              period={period}
            />
          )}
          {activeTab === 'yearly' && (
            <YearlySummaryTab
              ref={exportRef}
              purchases={yearlyPurchases}
              deliveries={yearlyDeliveries}
              gasolineLogs={yearlyGasoline}
              allDeliveries={deliveries}
              allGasolineLogs={gasolineLogs}
              drivers={drivers}
              vehicles={vehicles}
              suppliers={suppliers}
              resolveName={resolveName}
              selectedYear={selectedYear}
            />
          )}
        </>
      )}
    </div>
  );
}
