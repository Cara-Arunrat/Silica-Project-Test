import React, { useMemo, useState } from 'react';
import { useTransactions, findKey, useMasterData } from '../api/hooks';
import { TABLE_NAMES } from '../api/airtable';
import { 
  TrendingUp, Truck, PackageCheck, Droplets, 
  AlertTriangle, Filter, Calendar, BarChart3, Activity,
  Fuel, TrendingDown, Mountain
} from 'lucide-react';
import { 
  LossTrendChart, 
  PurchaseTrendChart, 
  FuelComparisonChart, 
  HorizontalMetricChart 
} from './dashboard/DashboardCharts';

/**
 * KPI Card Component
 */
const KPIButton = ({ title, value, unit, icon: Icon, colorClass, trend, status }) => {
  const isPositive = trend && parseFloat(trend) > 0;
  const isNegative = trend && parseFloat(trend) < 0;
  const trendColor = isPositive ? 'text-success' : isNegative ? 'text-danger' : 'text-slate-400';
  const trendArrow = isPositive ? '↑' : isNegative ? '↓' : '';

  return (
    <div className="card group hover:shadow-lg transition-all duration-300 relative overflow-hidden bg-surface flex flex-col justify-between h-full border" 
         style={{ padding: window.innerWidth < 480 ? '16px' : '24px' }}>
      {/* Status Badge - Ultra-compact 10px Typography */}
      {status && (
        <div className={`absolute text-white uppercase tracking-widest font-black rounded-lg shadow-sm ${status === 'warning' ? 'bg-orange' : 'bg-success'}`} 
             style={{ 
               top: window.innerWidth < 480 ? '10px' : '15px', 
               right: window.innerWidth < 480 ? '10px' : '15px',
               fontSize: '10px',
               padding: '4px 12px',
               zIndex: 10
             }}>
          {status}
        </div>
      )}

      <div className="flex flex-col h-full">
        {/* Larger Square Icon Background */}
        <div className="rounded-xl flex items-center justify-center transition-transform group-hover:rotate-3 duration-500 shadow-sm mb-md lg:mb-lg" 
             style={{ 
               width: window.innerWidth < 480 ? '42px' : '54px', 
               height: window.innerWidth < 480 ? '42px' : '54px', 
               backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
               flexShrink: 0
             }}>
          <Icon size={window.innerWidth < 480 ? 20 : 24} className={colorClass} />
        </div>
        
        {/* Lighter Gray Title - 12px & Unbolded */}
        <p className="text-secondary opacity-70 uppercase tracking-widest mb-2" style={{ fontSize: '12px', fontWeight: 400 }}>{title}</p>
        
        <div className="mt-auto" style={{ width: '100%' }}>
          {/* Value (-1px) and Unit (12px) */}
          <div className="flex items-end mb-2" style={{ gap: '4px' }}>
            <span className="font-black text-slate-900 tracking-tighter" 
                  style={{ 
                    lineHeight: 1, 
                    fontSize: window.innerWidth < 480 ? '23px' : '29px' 
                  }}>{value}</span>
            <span className="text-secondary" style={{ fontSize: '12px', fontWeight: 400, lineHeight: 1.1 }}>{unit}</span>
          </div>
          
          {/* Trend - 12px on its own line - Increased Spacing */}
          {trend !== undefined && (
            <div className={`flex items-center font-bold mt-1 ${trendColor}`} style={{ fontSize: '12px' }}>
              <span style={{ marginRight: '2px', lineHeight: 1 }}>{trendArrow}</span>
              <span style={{ lineHeight: 1 }}>{Math.abs(parseFloat(trend)).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  // Data Fetching
  const { data: purchases, loading: loadingPurchases } = useTransactions(TABLE_NAMES.PURCHASES);
  const { data: deliveries, loading: loadingDeliveries } = useTransactions(TABLE_NAMES.DELIVERIES);
  const { data: gasoline, loading: loadingGas } = useTransactions(TABLE_NAMES.GASOLINE);
  const { data: gasPurchases, loading: loadingGasPurch } = useTransactions(TABLE_NAMES.GASOLINE_PURCHASES);
  const { data: plans, loading: loadingPlans } = useTransactions(TABLE_NAMES.PLAN);
  
  // Master Data for name resolution
  const { data: customers = [] } = useMasterData(TABLE_NAMES.CUSTOMERS);
  const { data: vehicles = [] } = useMasterData(TABLE_NAMES.VEHICLES);

  const loading = loadingPurchases || loadingDeliveries || loadingGas || loadingGasPurch || loadingPlans;

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
    } else if (type === '2025') {
      setDateRange({ start: '2025-01-01', end: '2025-12-31' });
    } else if (type === 'all') {
      setDateRange({ start: '2020-01-01', end: '2030-12-31' }); // Sufficiently broad
    }
    // 'custom' keeps existing range for user to adjust
  };

  // Helper for name resolution
  const getMasterName = (id, list) => {
    if (!id || !list || !Array.isArray(list)) return '-';
    // Airtable linked records are often arrays
    const targetId = Array.isArray(id) ? id[0] : id;
    const match = list.find(item => item._id === targetId || item.id === targetId);
    if (!match) return targetId;
    return match.name || match.Name || match.username || match.text || 
           match[Object.keys(match).find(k => k.toLowerCase().includes('name'))] || 
           match[Object.keys(match).find(k => k.toLowerCase().includes('label'))] || targetId;
  };

  const dashboardData = useMemo(() => {
    if (loading) return null;

    const safeGet = (record, search) => {
      if (!record) return null;
      const keys = Object.keys(record);
      const key = findKey(keys, search);
      return key ? record[key] : null;
    };

    const getTons = (record, kgSearch, tonsSearch) => {
      const kg = parseFloat(safeGet(record, kgSearch));
      if (!isNaN(kg)) return kg / 1000;
      const tons = parseFloat(safeGet(record, tonsSearch));
      return isNaN(tons) ? 0 : tons;
    };

    const getDate = (record) => {
      const d = safeGet(record, 'date') || safeGet(record, 'month') || safeGet(record, 'purchase_date') || safeGet(record, 'delivery_date') || record?._createdTime;
      if (!d) return null;
      try {
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return null;
        return dt.toISOString().split('T')[0];
      } catch (e) {
        return null;
      }
    };

    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM local
    
    // --- 0. Range Filtering ---
    const inRange = (d) => {
      if (!d) return false;
      if (rangeType === 'all' || !dateRange) return true; // All-time includes everything with a valid date
      return d >= dateRange.start && d <= dateRange.end;
    };

    const fPurchases = (purchases || []).filter(p => inRange(getDate(p)));
    const fDeliveries = (deliveries || []).filter(d => inRange(getDate(d)));
    const fGasoline = (gasoline || []).filter(g => inRange(getDate(g)));

    // --- 1. Range KPI Metrics ---
    const purchasedInPeriod = fPurchases.reduce((sum, item) => sum + getTons(item, 'kg_purchase', 'tons_purchase'), 0);
    const deliveredInPeriod = fDeliveries.reduce((sum, item) => sum + getTons(item, 'net_weight_kg', 'tons_delivered'), 0);
    const fuelUsedInPeriod = fGasoline.reduce((sum, item) => sum + (parseFloat(safeGet(item, 'fuel_used_liters')) || 0), 0);
    
    const silicaLostInPeriod = purchasedInPeriod - deliveredInPeriod;

    // --- 1.2 Customer-Specific KPI Progress ---
    // Extract months covered by the current range (YYYY-MM format)
    const getMonthsInRange = (start, end) => {
      const months = [];
      let curr = new Date(start);
      const last = new Date(end);
      while (curr <= last) {
        months.push(curr.toISOString().substring(0, 7));
        curr.setMonth(curr.getMonth() + 1);
      }
      return months;
    };

    const activeRangeMonths = (dateRange && dateRange.start && dateRange.end) 
      ? getMonthsInRange(dateRange.start, dateRange.end) 
      : [currentMonthStr];

    const periodPlans = (plans || []).filter(p => {
      const m = safeGet(p, 'month') || '';
      return activeRangeMonths.includes(m.substring(0, 7));
    });
    
    // Group Targets by Customer (sum multiple months if range > 1 month)
    const targetsByCustomer = periodPlans.reduce((acc, p) => {
      const custId = Array.isArray(p?.customer) ? p.customer[0] : (p?.customer || null);
      if (!custId) return acc;
      const target = parseFloat(safeGet(p, 'planned_tons')) || 0;
      acc[custId] = (acc[custId] || 0) + target;
      return acc;
    }, {});

    // Group Deliveries by Customer
    const deliveriesByCustomer = fDeliveries.reduce((acc, d) => {
      const cust = safeGet(d, 'customer');
      if (!cust) return acc;
      const id = Array.isArray(cust) ? cust[0] : cust;
      const weight = getTons(d, 'net_weight_kg', 'tons_delivered');
      acc[id] = (acc[id] || 0) + weight;
      return acc;
    }, {});

    // Calculate Partner Performance using aggregated targets
    const customerPerformance = Object.keys(targetsByCustomer).map(custId => {
      const target = targetsByCustomer[custId] || 0;
      const delivered = deliveriesByCustomer[custId] || 0;
      const progress = target > 0 ? (delivered / target) * 100 : 0;
      
      return {
        id: custId,
        name: getMasterName(custId, customers),
        delivered: delivered.toFixed(1),
        target: target.toFixed(0),
        progress: progress.toFixed(1),
        progressNum: progress
      };
    }).sort((a, b) => b.progressNum - a.progressNum);

    // Global Aggregate KPI
    const monthlyKPI = Object.values(targetsByCustomer).reduce((sum, t) => sum + t, 0) || 4000;
    const deliveryProgress = monthlyKPI > 0 ? (deliveredInPeriod / monthlyKPI) * 100 : 0;

    // --- 2. Silica Loss Trend (Fixed Context - Last 4 Months) ---
    const months = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(mStr);
    }

    const lossTrendData = months.map(m => {
      const pTons = (purchases || []).filter(p => (getDate(p) || '').startsWith(m))
                             .reduce((sum, item) => sum + getTons(item, 'kg_purchase', 'tons_purchase'), 0);
      const dTons = (deliveries || []).filter(d => (getDate(d) || '').startsWith(m))
                             .reduce((sum, item) => sum + getTons(item, 'net_weight_kg', 'tons_delivered'), 0);
      const loss = pTons - dTons;
      const lossPercentage = pTons > 0 ? (loss / pTons) * 100 : 0;
      
      return {
        month: m,
        purchase: pTons,
        delivery: dTons,
        loss: loss,
        lossPercentage: parseFloat(lossPercentage.toFixed(1))
      };
    });

    // --- 3. Previous Period Performance ---
    let prevKPIs = { purchased: 0, delivered: 0, loss: 0, fuel: 0, progress: 0 };
    try {
      if (dateRange && dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const diff = end.getTime() - start.getTime();
          const prevEnd = new Date(start.getTime() - 86400000); 
          const prevStart = new Date(prevEnd.getTime() - diff);
          const ps = prevStart.toISOString().split('T')[0];
          const pe = prevEnd.toISOString().split('T')[0];
          
          const inPrevRange = (d) => d && d >= ps && d <= pe;

          const pPurchases = (purchases || []).filter(p => inPrevRange(getDate(p)));
          const pDeliveries = (deliveries || []).filter(d => inPrevRange(getDate(d)));
          const pGasoline = (gasoline || []).filter(g => inPrevRange(getDate(g)));

          const pPurchasedTons = pPurchases.reduce((sum, item) => sum + getTons(item, 'kg_purchase', 'tons_purchase'), 0);
          const pDeliveredTons = pDeliveries.reduce((sum, item) => sum + getTons(item, 'net_weight_kg', 'tons_delivered'), 0);
          const pFuelUsed = pGasoline.reduce((sum, item) => sum + (parseFloat(safeGet(item, 'fuel_used_liters')) || 0), 0);
          const pLoss = pPurchasedTons - pDeliveredTons;

          const pRangeMonths = getMonthsInRange(ps, pe);
          const pPlans = (plans || []).filter(p => pRangeMonths.includes((safeGet(p, 'month') || '').substring(0, 7)));
          const pKPI = pPlans.reduce((sum, p) => sum + (parseFloat(safeGet(p, 'planned_tons')) || 0), 0) || 4000;
          const pProgress = pKPI > 0 ? (pDeliveredTons / pKPI) * 100 : 0;

          prevKPIs = { purchased: pPurchasedTons, delivered: pDeliveredTons, loss: pLoss, fuel: pFuelUsed, progress: pProgress };
        }
      }
    } catch (e) {
      console.warn("Error calculating previous period:", e);
    }

    const calcTrend = (curr, prev) => {
      curr = parseFloat(curr) || 0;
      prev = parseFloat(prev) || 0;
      if (prev === 0) return 0;
      return ((curr - prev) / prev) * 100;
    };

    const trends = {
      purchased: calcTrend(purchasedInPeriod, prevKPIs.purchased),
      delivered: calcTrend(deliveredInPeriod, prevKPIs.delivered),
      loss: calcTrend(silicaLostInPeriod, prevKPIs.loss),
      fuel: calcTrend(fuelUsedInPeriod, prevKPIs.fuel),
      progress: calcTrend(deliveryProgress, prevKPIs.progress)
    };
    const yearMonths = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      yearMonths.push(mStr);
    }
    const purchaseTrendData = yearMonths.map(m => ({
      month: m,
      tons: parseFloat((purchases || []).filter(p => (getDate(p) || '').startsWith(m))
                                .reduce((sum, item) => sum + getTons(item, 'kg_purchase', 'tons_purchase'), 0).toFixed(1))
    }));

    // --- 5. Deliveries by Customer (Redundant - Replaced by customerPerformance) ---
    const topCustomers = customerPerformance.slice(0, 5);

    // --- 6. Fuel Purchase vs Usage (Grouped Bar) ---
    const fuelComparisonData = months.map(m => {
      const purchased = (gasPurchases || []).filter(p => (getDate(p) || '').startsWith(m))
                                   .reduce((sum, item) => sum + (parseFloat(safeGet(item, 'fuel_liters')) || 0), 0);
      const used = (gasoline || []).filter(g => (getDate(g) || '').startsWith(m))
                          .reduce((sum, item) => sum + (parseFloat(safeGet(item, 'fuel_used_liters')) || 0), 0);
      return { month: m, purchased, used };
    });

    // --- 7. Fuel Usage by Vehicle ---
    const vehicleFuelTotals = fGasoline.reduce((acc, g) => {
      const v = safeGet(g, 'vehicle');
      if (!v) return acc;
      const id = Array.isArray(v) ? v[0] : v;
      acc[id] = (acc[id] || 0) + (parseFloat(safeGet(g, 'fuel_used_liters')) || 0);
      return acc;
    }, {});
    const vehicleFuel = Object.entries(vehicleFuelTotals)
      .map(([id, liters]) => ({ name: getMasterName(id, vehicles), liters: parseFloat(liters.toFixed(1)) }))
      .sort((a, b) => b.liters - a.liters);

    // --- 8. Truck Productivity (Tons Delivered) ---
    const truckProductivityTotals = fDeliveries.reduce((acc, d) => {
      const v = safeGet(d, 'vehicle');
      if (!v) return acc;
      const id = Array.isArray(v) ? v[0] : v;
      acc[id] = (acc[id] || 0) + getTons(d, 'net_weight_kg', 'tons_delivered');
      return acc;
    }, {});
    const truckProductivity = Object.entries(truckProductivityTotals)
      .map(([id, tons]) => ({ name: getMasterName(id, vehicles), tons: parseFloat(tons.toFixed(1)) }))
      .sort((a, b) => b.tons - a.tons);

    // --- 9. Efficiency Metrics ---
    const silicaYieldTotal = purchasedInPeriod > 0 ? (deliveredInPeriod / purchasedInPeriod) : 0;
    const fuelEfficiencyTotal = deliveredInPeriod > 0 ? (fuelUsedInPeriod / deliveredInPeriod) : 0;

    return {
      kpis: {
        purchased: (purchasedInPeriod || 0).toFixed(1),
        delivered: (deliveredInPeriod || 0).toFixed(1),
        fuel: (fuelUsedInPeriod || 0).toFixed(0),
        progress: (deliveryProgress || 0).toFixed(1),
        loss: (silicaLostInPeriod || 0).toFixed(1)
      },
      lossTrendData: lossTrendData || [],
      purchaseTrendData: purchaseTrendData || [],
      topCustomers: topCustomers || [],
      fuelComparisonData: fuelComparisonData || [],
      vehicleFuel,
      truckProductivity,
      trends,
      efficiency: {
        yield: ((silicaYieldTotal || 0) * 100).toFixed(1),
        fuelEff: (fuelEfficiencyTotal || 0).toFixed(2)
      },
      monthlyKPI,
      customerPerformance
    };
  }, [loading, purchases, deliveries, gasoline, gasPurchases, plans, customers, vehicles, dateRange, rangeType]);

  if (loading || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center p-xl min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-md"></div>
        <p className="text-secondary">Orchestrating operational intelligence...</p>
      </div>
    );
  }

  const { kpis, lossTrendData, purchaseTrendData, topCustomers, fuelComparisonData, vehicleFuel, truckProductivity, trends, efficiency, monthlyKPI, customerPerformance } = dashboardData;

  const getLossStatus = (val) => val > 30 ? 'warning' : 'optimal';

  const getProgressColor = (percent) => {
    const p = parseFloat(percent);
    if (p < 50) return { text: 'text-orange', bg: 'bg-orange' };
    if (p < 80) return { text: 'text-primary', bg: 'bg-primary' };
    return { text: 'text-success', bg: 'bg-success' };
  };

  return (
    <div className="dashboard-v2 pb-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-xl flex-wrap gap-md">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Silica Intelligence Dashboard</h1>
          <p className="text-secondary mt-xs">Operational visibility and efficiency metrics.</p>
        </div>
        
        <div className="flex items-center gap-md flex-wrap">
          <div className="form-group mb-0">
            <select 
              className="form-control" 
              value={rangeType} 
              onChange={(e) => handleRangeChange(e.target.value)}
              style={{ padding: '8px 12px', minWidth: '160px', height: '42px' }}
            >
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="2025">Year 2025</option>
              <option value="all">All-time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {rangeType === 'custom' && (
            <div className="card flex items-center gap-sm" style={{ padding: '4px 12px', margin: 0, border: '1px solid var(--border-color)', height: '42px' }}>
              <input 
                type="date" 
                className="form-control text-xs" 
                style={{ padding: '2px 4px', border: 'none', background: 'transparent', width: '120px' }}
                value={dateRange.start}
                onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
              />
              <span className="text-secondary">-</span>
              <input 
                type="date" 
                className="form-control text-xs" 
                style={{ padding: '2px 4px', border: 'none', background: 'transparent', width: '120px' }}
                value={dateRange.end}
                onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
              />
            </div>
          )}

          <div className="flex items-center gap-sm bg-surface p-xs px-md rounded-lg border border-border h-[42px]">
            <Calendar size={16} className="text-primary" />
            <span className="text-sm font-medium">
              {rangeType === 'month' ? new Date().toLocaleString('default', { month: 'long', year: 'numeric' }) : 
               rangeType === 'year' ? new Date().getFullYear() : 
               rangeType === 'all' ? 'All Records' : 'Active Range'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-md lg:gap-lg mb-xl">
        <KPIButton title="Raw Material" value={kpis.purchased} unit="tons" icon={Mountain} colorClass="text-primary" trend={trends.purchased} />
        <KPIButton title="Product Delivered" value={kpis.delivered} unit="tons" icon={Truck} colorClass="text-success" trend={trends.delivered} />
        <KPIButton title="Silica Loss" value={kpis.loss} unit="tons" icon={TrendingDown} colorClass={parseFloat(kpis.loss) > 0 ? "text-warning" : "text-success"} trend={trends.loss} status={getLossStatus((parseFloat(kpis.loss) / (parseFloat(kpis.purchased) || 1)) * 100)} />
        <KPIButton title="Fuel Consumption" value={kpis.fuel} unit="liters" icon={Fuel} colorClass="text-warning" trend={trends.fuel} />
        <KPIButton title="KPI Progress" value={kpis.progress} unit="%" icon={TrendingUp} colorClass="text-success" trend={trends.progress} status={parseFloat(kpis.progress) >= 100 ? 'achieved' : 'active'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl mb-xl">
        {/* SECTION 2: SILICA LOSS MONITORING */}
        <div className="card">
          <div className="flex justify-between items-center mb-lg">
            <div>
              <h3 className="text-lg font-bold">Silica Loss Trend (%)</h3>
              <p className="text-xs text-secondary">Historical loss monitoring (Fixed 4 Mo)</p>
            </div>
            {parseFloat(lossTrendData[lossTrendData.length - 1]?.lossPercentage) > 30 && (
              <div className="flex items-center gap-xs text-warning text-xs font-bold uppercase animate-pulse">
                <AlertTriangle size={14} /> High Loss Detected
              </div>
            )}
          </div>
          <LossTrendChart data={lossTrendData} />
        </div>

        {/* SECTION 10: OPERATIONAL EFFICIENCY */}
        <div className="card">
          <h3 className="text-lg font-bold mb-lg">Efficiency Analytics (In Range)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md md:h-[300px]">
             <div className="flex flex-col items-center justify-center bg-bg rounded-xl p-md text-center border border-border min-h-[140px]">
                <div className="p-sm bg-primary-light rounded-full mb-md text-primary">
                  <TrendingUp size={32} />
                </div>
                <p className="text-secondary text-xs uppercase font-bold tracking-widest mb-xs">Silica Yield</p>
                <h4 className="text-3xl font-black text-primary">{efficiency.yield}%</h4>
                <p className="text-[10px] text-secondary mt-sm">Total Delivery / Raw Purchase</p>
             </div>
             <div className="flex flex-col items-center justify-center bg-bg rounded-xl p-md text-center border border-border min-h-[140px]">
                <div className="p-sm bg-warning-light rounded-full mb-md text-warning">
                  <Droplets size={32} />
                </div>
                <p className="text-secondary text-xs uppercase font-bold tracking-widest mb-xs">Fuel Efficiency</p>
                <h4 className="text-3xl font-black text-warning">{efficiency.fuelEff}</h4>
                <p className="text-[10px] text-secondary mt-sm">Liters / Delivered Ton</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl mb-xl">
        {/* SECTION 3 & 4: CUSTOMER PERFORMANCE MONITORING (Integrated) */}
        <div className="lg:col-span-2 card">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-xl font-bold">Partner Delivery Progress</h3>
          </div>

          <div className="mb-lg p-lg bg-surface rounded-xl border-2 border-primary/20 shadow-md">
            {(() => {
              const summaryColors = getProgressColor(kpis.progress);
              return (
                <>
                  <div className="flex justify-between items-center mb-md">
                    <div className="flex items-center gap-sm">
                      {/* Standard icon container to match customer part secondary feel */}
                      <div className="p-xs bg-bg rounded-lg text-secondary border border-border">
                        <TrendingUp size={20} />
                      </div>
                      <h4 className="text-xl font-bold tracking-tight">Summary</h4>
                    </div>
                    {/* Matched font size with customer rows (3xl instead of 4xl) */}
                    <div className={`text-3xl font-black ${summaryColors.text} tracking-tighter`}>
                      {kpis.progress}<span className="text-sm ml-[2px]">%</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-md">
                    <div>
                      <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-xs">Total Achieved</p>
                      <p className={`text-xl font-bold ${summaryColors.text}`}>{kpis.delivered}<span className="text-xs ml-xs font-normal"> tons</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-xs">Overall Target</p>
                      <p className="text-xl font-bold">{monthlyKPI.toLocaleString()}<span className="text-xs ml-xs font-normal"> tons</span></p>
                    </div>
                    {/* Fixed Success Colors for Insight Badge */}
                    <div className="bg-success-light text-success p-xs px-sm rounded-lg flex flex-col justify-center border border-success/20 sm:h-fit sm:mt-auto">
                      <p className="text-[8px] font-black uppercase tracking-widest">Growth Insight</p>
                      <p className="text-xs font-bold leading-tight">Tracking {customerPerformance.length} Partners</p>
                    </div>
                  </div>
                  
                  <div className="h-4 bg-bg rounded-full overflow-hidden border border-border shadow-inner p-[2px]">
                    <div 
                      className={`h-full rounded-full ${summaryColors.bg} shadow-sm transition-all duration-1000 ease-out`}
                      style={{ width: `${Math.min(parseFloat(kpis.progress), 100)}%` }}
                    ></div>
                  </div>
                </>
              );
            })()}
          </div>
          
          <div className="grid grid-cols-1 gap-lg">
            {customerPerformance.length > 0 ? (
              customerPerformance.map(cp => {
                const colors = getProgressColor(cp.progress);
                const remaining = Math.max(0, cp.target - cp.delivered).toFixed(1);
                return (
                  <div key={cp.id} className="p-lg bg-bg rounded-xl border border-border shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-md">
                      <div className="flex items-center gap-sm">
                        {/* Status Accent Bar - Dynamic color from progress */}
                        <div className={`w-1 h-6 rounded-full ${colors.bg}`}></div>
                        <h4 className="text-xl font-bold tracking-tight">{cp.name}</h4>
                      </div>
                      <div className={`text-3xl font-black ${colors.text} tracking-tighter`}>
                        {cp.progress}<span className="text-sm ml-[2px]">%</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-md py-md border-y border-white/10">
                      <div>
                        <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-xs">Achieved</p>
                        {/* Metric Value - Dynamic based on progress */}
                        <p className={`text-lg font-bold ${colors.text}`}>{cp.delivered}<span className="text-[10px] ml-xs font-normal"> tons</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-xs">Remaining</p>
                        <p className={`text-lg font-bold ${parseFloat(remaining) > 0 ? 'text-secondary' : 'text-success'}`}>{remaining}<span className="text-[10px] ml-xs font-normal"> tons</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-xs">Target</p>
                        <p className="text-lg font-bold">{cp.target}<span className="text-[10px] ml-xs font-normal"> tons</span></p>
                      </div>
                    </div>
                    
                    <div className="h-3 bg-surface rounded-full overflow-hidden border border-border shadow-inner p-[2px]">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${colors.bg} shadow-sm`}
                        style={{ width: `${Math.min(parseFloat(cp.progress), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-xl text-center text-secondary bg-bg rounded-xl border border-dashed border-border">
                No delivery plans found for selected range.
              </div>
            )}
          </div>

        </div>

        {/* SECTION 8: FUEL USAGE BY VEHICLE */}
        <div className="card">
          <h3 className="text-lg font-bold mb-md">Vehicle Fuel Usage</h3>
          <p className="text-xs text-secondary mb-lg">Liters consumed in selected range</p>
          <HorizontalMetricChart data={vehicleFuel} dataKey="liters" unit=" L" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl mb-xl">
        {/* SECTION 5: PURCHASE TREND */}
        <div className="card">
          <h3 className="text-lg font-bold mb-md">Raw Material Purchase Trend</h3>
          <p className="text-xs text-secondary mb-lg">Total tons purchased per month (Fixed 12 Mo)</p>
          <PurchaseTrendChart data={purchaseTrendData} />
        </div>

        {/* SECTION 7: FUEL PURCHASE VS USAGE */}
        <div className="card">
          <h3 className="text-lg font-bold mb-md">Fuel Balance Audit</h3>
          <p className="text-xs text-secondary mb-lg">Historical Purchase vs Usage (Fixed context)</p>
          <FuelComparisonChart data={fuelComparisonData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* SECTION 6: DELIVERIES BY CUSTOMER (Combined above - replaced with extra insight or spacing) */}
        
        {/* SECTION 9: TRUCK PRODUCTIVITY */}
        <div className="card w-full">
          <h3 className="text-lg font-bold mb-md">Truck Utilization</h3>
          <p className="text-xs text-secondary mb-lg">Total tons delivered in range</p>
          <HorizontalMetricChart data={truckProductivity} dataKey="tons" unit=" t" />
        </div>

        {/* EXTRA INSIGHT: Top Performing Customers */}
        <div className="card w-full">
          <h3 className="text-lg font-bold mb-md">Productivity Snapshot</h3>
          <p className="text-xs text-secondary mb-lg">Aggregated operational throughput</p>
          <div className="flex flex-col gap-md">
            <div className="bg-bg p-md rounded-lg flex justify-between items-center">
              <span className="text-sm font-medium text-secondary">Total Delivered</span>
              <span className="text-lg font-bold text-success">{kpis.delivered} t</span>
            </div>
            <div className="bg-bg p-md rounded-lg flex justify-between items-center">
              <span className="text-sm font-medium text-secondary">Active Contracts</span>
              <span className="text-lg font-bold text-primary">{customerPerformance.length}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-v2 {
          animation: fadeIn 0.5s ease-out;
          --primary-rgb: 37, 99, 235;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        .gap-sm { gap: 0.5rem; }
        .gap-md { gap: 1rem; }
        .gap-lg { gap: 1.5rem; }
        .gap-xl { gap: 2rem; }
        .mb-sm { margin-bottom: 0.5rem; }
        .mb-md { margin-bottom: 1rem; }
        .mb-lg { margin-bottom: 1.5rem; }
        .mb-xl { margin-bottom: 2rem; }
        .mt-xs { margin-top: 0.25rem; }
        .mt-sm { margin-top: 0.5rem; }
        .p-xs { padding: 0.25rem; }
        .p-sm { padding: 0.5rem; }
        .p-md { padding: 1rem; }
        .p-lg { padding: 1.5rem; }
        .px-sm { padding-left: 0.5rem; padding-right: 0.5rem; }
        .px-md { padding-left: 1rem; padding-right: 1rem; }
        .tracking-tight { letter-spacing: -0.025em; }
        .tracking-wider { letter-spacing: 0.05em; }
        .tracking-widest { letter-spacing: 0.1em; }
        .w-fit { width: fit-content; }
        .h-fit { height: fit-content; }
        .relative { position: relative; }
        .overflow-hidden { overflow: hidden; }
        .rounded-lg { border-radius: 0.5rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .rounded-full { border-radius: 9999px; }
        .font-black { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .text-\[10px\] { font-size: 10px; }
        
        .bg-primary-light { background-color: rgba(37, 99, 235, 0.1); }
        .bg-success-light { background-color: rgba(34, 197, 94, 0.1); }
        .bg-warning-light { background-color: rgba(251, 191, 36, 0.1); }
        .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
        .from-primary { --tw-gradient-from: var(--primary-color); --tw-gradient-to: rgb(37 99 235 / 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
        .to-success { --tw-gradient-to: var(--success-color); }
        
        @media (min-width: 768px) {
          .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (min-width: 1024px) {
          .lg\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lg\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .lg\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
          .lg\:col-span-2 { grid-column: span 2 / span 2; }
        }

        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
    </div>
  );
}
