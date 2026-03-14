import React, { useMemo, useState } from 'react';
import { useTransactions, findKey } from '../api/hooks';
import { TABLE_NAMES } from '../api/airtable';
import { TrendingUp, Truck, PackageCheck, Droplets } from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, trend }) => (
  <div className="card flex items-center gap-md">
    <div className={`p-md rounded-full ${colorClass}`} style={{ backgroundColor: 'var(--bg-color)' }}>
      <Icon size={24} />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-xs">
        <p className="text-secondary text-sm font-medium">{title}</p>
        {trend !== undefined && trend !== null && (
          <span className={`text-xs font-bold px-xs rounded ${parseFloat(trend) >= 0 ? 'text-success bg-success-light' : 'text-danger bg-danger-light'}`}>
            {parseFloat(trend) >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold">{value}</h3>
      {subtitle && <p className="text-xs text-secondary mt-xs">{subtitle}</p>}
    </div>
  </div>
);

export default function Dashboard() {
  const { data: purchases, loading: loadingPurchases } = useTransactions(TABLE_NAMES.PURCHASES);
  const { data: deliveries, loading: loadingDeliveries } = useTransactions(TABLE_NAMES.DELIVERIES);
  const { data: production, loading: loadingProd } = useTransactions(TABLE_NAMES.PRODUCTION);
  const { data: plans, loading: loadingPlans } = useTransactions(TABLE_NAMES.PLAN);

  const [rangeType, setRangeType] = useState('month');
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
    }
    // 'custom' does not auto-update setDateRange, it keeps previous or awaits user input
  };

  const loading = loadingPurchases || loadingDeliveries || loadingProd || loadingPlans;

  const stats = useMemo(() => {
    if (loading) return null;

    const safeGet = (record, search) => {
      const keys = Object.keys(record);
      const key = findKey(keys, search);
      return key ? record[key] : null;
    };

    const getTons = (record, kgSearch, tonsSearch) => {
      const kg = parseFloat(safeGet(record, kgSearch));
      if (!isNaN(kg)) return kg / 1000;
      const tons = parseFloat(safeGet(record, tonsSearch) || safeGet(record, 'tons_puchase'));
      if (!isNaN(tons)) return tons;
      return 0;
    };

    const getDate = (record) => {
      return safeGet(record, 'date') || safeGet(record, 'month') || record._createdTime;
    };

    // Filter main dataset by current dateRange
    const fPurchases = purchases.filter(p => {
      const d = getDate(p);
      if (!d) return false;
      const iso = new Date(d).toISOString().split('T')[0];
      return iso >= dateRange.start && iso <= dateRange.end;
    });
    const fDeliveries = deliveries.filter(d => {
      const dt = getDate(d);
      if (!dt) return false;
      const iso = new Date(dt).toISOString().split('T')[0];
      return iso >= dateRange.start && iso <= dateRange.end;
    });
    const fProduction = production.filter(p => {
      const d = getDate(p);
      if (!d) return false;
      const iso = new Date(d).toISOString().split('T')[0];
      return iso >= dateRange.start && iso <= dateRange.end;
    });

    // Aggregate totals
    const totalPurchased = fPurchases.reduce((sum, item) => sum + getTons(item, 'kg_purchase', 'tons_purchased'), 0);
    const totalDelivered = fDeliveries.reduce((sum, item) => sum + getTons(item, 'net_weight_kg', 'tons_delivered'), 0);

    // Previous Period Calculation
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const diff = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 86400000); 
    const prevStart = new Date(prevEnd.getTime() - diff);
    
    const pStartIso = prevStart.toISOString().split('T')[0];
    const pEndIso = prevEnd.toISOString().split('T')[0];

    const prevPurchased = purchases.filter(p => {
      const d = getDate(p);
      if (!d) return false;
      const iso = new Date(d).toISOString().split('T')[0];
      return iso >= pStartIso && iso <= pEndIso;
    }).reduce((sum, item) => sum + getTons(item, 'kg_purchase', 'tons_purchased'), 0);

    const prevDelivered = deliveries.filter(d => {
      const dt = getDate(d);
      if (!dt) return false;
      const iso = new Date(dt).toISOString().split('T')[0];
      return iso >= pStartIso && iso <= pEndIso;
    }).reduce((sum, item) => sum + getTons(item, 'net_weight_kg', 'tons_delivered'), 0);

    const calcTrend = (curr, prev) => {
      if (!prev || prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const purchaseTrend = calcTrend(totalPurchased, prevPurchased);
    const deliveryTrend = calcTrend(totalDelivered, prevDelivered);

    // Overall Process Yield tracking (Total Output / Total Raw Input)
    const totalRawInput = fProduction.reduce((sum, item) => sum + (parseFloat(safeGet(item, 'raw_input')) || 0), 0);
    const totalOutput = fProduction.reduce((sum, item) => sum + (parseFloat(safeGet(item, 'output')) || 0), 0);
    const productionYield = totalRawInput > 0 ? ((totalOutput / totalRawInput) * 100).toFixed(1) : 0;

    // Inventory Flow flow tracking
    const deliveryRatio = totalPurchased > 0 ? ((totalDelivered / totalPurchased) * 100).toFixed(1) : 0;

    // Delivery vs Plan logic
    const today = new Date().toISOString().split('T')[0];
    let targetMonth = dateRange.start.substring(0, 7);
    
    // If range incorporates current month, dashboard should focus on current month plan
    const currentMonth = today.substring(0, 7);
    if (currentMonth >= dateRange.start.substring(0, 7) && currentMonth <= dateRange.end.substring(0, 7)) {
      targetMonth = currentMonth;
    }
    
    // Calculate Monthly Plan Progress looking at the whole month
    const plannedThisMonth = plans
      .filter(p => (safeGet(p, 'month') || '').startsWith(targetMonth))
      .reduce((sum, item) => sum + (parseFloat(safeGet(item, 'planned')) || 0), 0);

    const deliveredThisMonth = deliveries
      .filter(d => {
        const dt = getDate(d);
        return dt && String(dt).startsWith(targetMonth);
      })
      .reduce((sum, item) => sum + getTons(item, 'net_weight_kg', 'tons_delivered'), 0);

    const planProgress = plannedThisMonth > 0 ? ((deliveredThisMonth / plannedThisMonth) * 100).toFixed(0) : 0;

    return {
      fDeliveries,
      fProduction,
      targetMonth,
      totalPurchased: totalPurchased.toFixed(1),
      totalDelivered: totalDelivered.toFixed(1),
      productionYield,
      deliveryRatio,
      plannedThisMonth: plannedThisMonth.toFixed(1),
      deliveredThisMonth: deliveredThisMonth.toFixed(1),
      planProgress,
      purchaseTrend,
      deliveryTrend,
      safeGet // Expose for rendering lists
    };
  }, [purchases, deliveries, production, plans, loading, dateRange]);

  if (loading) {
    return <div className="p-xl text-center text-secondary">Loading Dashboard Metrics...</div>;
  }

  return (
    <div className="dashboard max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-lg flex-wrap gap-md">
        <div>
          <h2 className="text-2xl font-bold mb-xs">Operations Overview</h2>
          <p className="text-secondary">High-level KPIs and aggregates.</p>
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
              <option value="2024">Year 2024</option>
              <option value="2025">Year 2025</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {rangeType === 'custom' && (
            <div className="card p-sm flex items-center gap-sm" style={{ padding: '8px 16px', margin: 0, border: '1px solid var(--primary-color)' }}>
              <div className="flex items-center gap-xs">
                <label className="text-xs font-medium text-secondary">From:</label>
                <input 
                  type="date" 
                  className="form-control text-sm" 
                  style={{ padding: '4px 8px', minHeight: 'auto' }}
                  value={dateRange.start}
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
                  value={dateRange.end}
                  onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-summary gap-lg mb-xl">
        <StatCard
          title="Total Purchases"
          value={`${stats.totalPurchased} t`}
          subtitle="Silica bought in range"
          icon={Droplets}
          trend={stats.purchaseTrend}
          colorClass="text-primary"
        />
        <StatCard
          title="Total Deliveries"
          value={`${stats.totalDelivered} t`}
          icon={Truck}
          trend={stats.deliveryTrend}
          colorClass="text-success"
        />
        <StatCard
          title="Production Yield"
          value={`${stats.productionYield}%`}
          subtitle="Avg Output / Raw Input"
          icon={TrendingUp}
          colorClass="text-primary"
        />
        <StatCard
          title="Delivery Ratio"
          value={`${stats.deliveryRatio}%`}
          subtitle="Total Delivered / Purchased"
          icon={PackageCheck}
          colorClass="text-success"
        />
      </div>

      <div className="card mb-lg">
        <h3 className="text-lg font-bold mb-md">Monthly Plan Progress ({stats.targetMonth})</h3>
        <div className="flex justify-between text-sm mb-xs">
          <span className="font-medium">{stats.deliveredThisMonth} t Delivered</span>
          <span className="text-secondary">{stats.plannedThisMonth} t Planned</span>
        </div>
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.min(stats.planProgress, 100)}%`,
              backgroundColor: stats.planProgress >= 100 ? 'var(--success-color)' : 'var(--primary-color)'
            }}
          ></div>
        </div>
        <p className="text-xs text-secondary mt-xs text-right">{stats.planProgress}% to target</p>
      </div>

      {/* Simple List placeholder for Driver/truck breakdowns to keep it lightweight */}
      <div className="grid-2-col gap-lg">
        <div className="card">
          <h3 className="text-lg font-bold mb-sm">Recent Deliveries</h3>
          <ul className="text-sm">
            {stats.fDeliveries.slice(0, 5).map(d => (
              <li key={d._id} className="py-sm border-b border-border flex justify-between">
                <span>{stats.safeGet(d, 'date') || new Date(d._createdTime).toLocaleDateString()}</span>
                <span className="font-medium text-success">
                  {(parseFloat(stats.safeGet(d, 'net_weight_kg')) || parseFloat(stats.safeGet(d, 'tons_delivered')) * 1000 || 0).toLocaleString()} kg
                </span>
              </li>
            ))}
            {stats.fDeliveries.length === 0 && <li className="text-secondary">No deliveries logged in this range.</li>}
          </ul>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold mb-sm">Recent Production</h3>
          <ul className="text-sm">
            {stats.fProduction.slice(0, 5).map(p => {
              const output = parseFloat(stats.safeGet(p, 'output')) || 0;
              const input = parseFloat(stats.safeGet(p, 'raw_input')) || 0;
              const yieldP = input > 0 ? ((output / input) * 100).toFixed(1) : 0;
              return (
                <li key={p._id} className="py-sm border-b border-border flex justify-between">
                  <span>{stats.safeGet(p, 'date') || new Date(p._createdTime).toLocaleDateString()}</span>
                  <span className="font-medium text-primary">{yieldP}% Yield</span>
                </li>
              );
            })}
            {stats.fProduction.length === 0 && <li className="text-secondary">No production logged in this range.</li>}
          </ul>
        </div>
      </div>

      <style>{`
        .max-w-6xl { max-width: 72rem; margin-left: auto; margin-right: auto; }
        .grid-summary {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
        }
        @media (min-width: 640px) {
          .grid-summary { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .grid-summary { grid-template-columns: repeat(4, 1fr); }
        }
        .grid-2-col {
          display: grid;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .grid-2-col { grid-template-columns: 1fr 1fr; }
        }
        .rounded-full { border-radius: 9999px; }
        .progress-bar-bg {
          width: 100%;
          height: 8px;
          background-color: var(--bg-color);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          transition: width 0.5s ease-out;
        }
        .border-b { border-bottom: 1px solid var(--border-color); }
        .border-border { border-color: var(--border-color); }
        .py-sm { padding-top: var(--spacing-sm); padding-bottom: var(--spacing-sm); }
      `}</style>
    </div>
  );
}
