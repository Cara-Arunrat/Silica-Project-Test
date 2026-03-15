import React, { useMemo, useState } from 'react';
import { useTransactions, findKey, useMasterData } from '../api/hooks';
import { TABLE_NAMES } from '../api/airtable';
import { 
  TrendingUp, Truck, PackageCheck, Droplets, 
  AlertTriangle, Filter, Calendar, BarChart3, Activity 
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
const KPIButton = ({ title, value, unit, subtitle, icon: Icon, colorClass, trend, status }) => (
  <div className="card flex flex-col gap-sm relative overflow-hidden">
    <div className={`p-md rounded-lg mb-sm w-fit ${colorClass}`} style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.1)' }}>
      <Icon size={20} className={colorClass} />
    </div>
    <div>
      <p className="text-secondary text-xs font-medium uppercase tracking-wider">{title}</p>
      <div className="flex items-baseline gap-xs mt-xs">
        <h3 className="text-2xl font-bold">{value}</h3>
        <span className="text-secondary text-sm font-medium">{unit}</span>
      </div>
      {subtitle && <p className="text-xs text-secondary mt-xs">{subtitle}</p>}
    </div>
    {status && (
      <div className={`absolute top-0 right-0 p-xs px-sm text-[10px] font-bold uppercase ${status === 'warning' ? 'bg-warning text-warning-content' : 'bg-success text-success-content'}`}>
        {status}
      </div>
    )}
  </div>
);

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

  // Helper for name resolution
  const getMasterName = (id, list) => {
    if (!id || !list || !Array.isArray(list)) return '-';
    // Airtable linked records are often arrays
    const targetId = Array.isArray(id) ? id[0] : id;
    const match = list.find(item => item._id === targetId || item.id === targetId);
    return match ? (match.name || match.Name || match.username || match.text || 'Unknown') : targetId;
  };

  const dashboardData = useMemo(() => {
    if (loading) return null;

    const safeGet = (record, search) => {
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
      return safeGet(record, 'date') || safeGet(record, 'month') || safeGet(record, 'purchase_date') || safeGet(record, 'delivery_date') || record._createdTime;
    };

    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7); // YYYY-MM
    
    // --- 1. MTD KPI Metrics ---
    const mtdPurchases = (purchases || []).filter(p => (getDate(p) || '').startsWith(currentMonthStr));
    const mtdDeliveries = (deliveries || []).filter(d => (getDate(d) || '').startsWith(currentMonthStr));
    const mtdGas = (gasoline || []).filter(g => (getDate(g) || '').startsWith(currentMonthStr));
    
    const purchasedMTD = mtdPurchases.reduce((sum, item) => sum + getTons(item, 'kg_purchase', 'tons_purchase'), 0);
    const deliveredMTD = mtdDeliveries.reduce((sum, item) => sum + getTons(item, 'net_weight_kg', 'tons_delivered'), 0);
    const fuelUsedMTD = mtdGas.reduce((sum, item) => sum + (parseFloat(safeGet(item, 'fuel_used_liters')) || 0), 0);
    
    const currentPlan = (plans || []).find(p => (safeGet(p, 'month') || '').startsWith(currentMonthStr));
    const monthlyKPI = currentPlan ? (parseFloat(safeGet(currentPlan, 'planned_tons')) || 4000) : 4000;
    const deliveryProgress = monthlyKPI > 0 ? (deliveredMTD / monthlyKPI) * 100 : 0;
    
    const silicaLostMTD = purchasedMTD - deliveredMTD;

    // --- 2. Silica Loss Trend (Last 4 Months) ---
    const months = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(d.toISOString().substring(0, 7));
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

    // --- 3. Previous Month Performance ---
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthStr = prevMonthDate.toISOString().substring(0, 7);
    const prevDeliveries = (deliveries || []).filter(d => (getDate(d) || '').startsWith(prevMonthStr));
    const prevDeliveredTons = prevDeliveries.reduce((sum, item) => sum + getTons(item, 'net_weight_kg', 'tons_delivered'), 0);
    const prevPlan = (plans || []).find(p => (safeGet(p, 'month') || '').startsWith(prevMonthStr));
    const prevKPI = prevPlan ? (parseFloat(safeGet(prevPlan, 'planned_tons')) || 4000) : 4000;
    const prevProgress = prevKPI > 0 ? (prevDeliveredTons / prevKPI) * 100 : 0;
    const prevMonthName = prevMonthDate.toLocaleString('default', { month: 'long' });

    // --- 4. Purchase Trend (12 Months) ---
    const yearMonths = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      yearMonths.push(d.toISOString().substring(0, 7));
    }
    const purchaseTrendData = yearMonths.map(m => ({
      month: m,
      tons: parseFloat((purchases || []).filter(p => (getDate(p) || '').startsWith(m))
                                .reduce((sum, item) => sum + getTons(item, 'kg_purchase', 'tons_purchase'), 0).toFixed(1))
    }));

    // --- 5. Deliveries by Customer (Top 5) ---
    const customerTotals = (deliveries || []).reduce((acc, d) => {
      const cust = safeGet(d, 'customer');
      if (!cust) return acc;
      const id = Array.isArray(cust) ? cust[0] : cust;
      const weight = getTons(d, 'net_weight_kg', 'tons_delivered');
      acc[id] = (acc[id] || 0) + weight;
      return acc;
    }, {});
    const topCustomers = Object.entries(customerTotals)
      .map(([id, tons]) => ({ name: getMasterName(id, customers), tons: parseFloat(tons.toFixed(1)) }))
      .sort((a, b) => b.tons - a.tons)
      .slice(0, 5);

    // --- 6. Fuel Purchase vs Usage (Grouped Bar) ---
    const fuelComparisonData = months.map(m => {
      const purchased = (gasPurchases || []).filter(p => (getDate(p) || '').startsWith(m))
                                   .reduce((sum, item) => sum + (parseFloat(safeGet(item, 'fuel_liters')) || 0), 0);
      const used = (gasoline || []).filter(g => (getDate(g) || '').startsWith(m))
                          .reduce((sum, item) => sum + (parseFloat(safeGet(item, 'fuel_used_liters')) || 0), 0);
      return { month: m, purchased, used };
    });

    // --- 7. Fuel Usage by Vehicle ---
    const vehicleFuelTotals = mtdGas.reduce((acc, g) => {
      const v = safeGet(g, 'vehicle');
      if (!v) return acc;
      const id = Array.isArray(v) ? v[0] : v;
      acc[id] = (acc[id] || 0) + (parseFloat(safeGet(g, 'fuel_used_liters')) || 0);
      return acc;
    }, {});
    const vehicleFuel = Object.entries(vehicleFuelTotals)
      .map(([id, liters]) => ({ name: getMasterName(id, vehicles), liters: parseFloat(liters.toFixed(1)) }))
      .sort((a, b) => b.liters - a.liters);

    // --- 8. Truck Productivity (Tons Delivered MTD) ---
    const truckProductivityTotals = mtdDeliveries.reduce((acc, d) => {
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
    const silicaYieldTotal = purchasedMTD > 0 ? (deliveredMTD / purchasedMTD) : 0;
    const fuelEfficiencyTotal = deliveredMTD > 0 ? (fuelUsedMTD / deliveredMTD) : 0;

    return {
      kpis: {
        purchased: purchasedMTD.toFixed(1),
        delivered: deliveredMTD.toFixed(1),
        fuel: fuelUsedMTD.toFixed(0),
        progress: deliveryProgress.toFixed(1),
        loss: silicaLostMTD.toFixed(1)
      },
      lossTrendData,
      purchaseTrendData,
      topCustomers,
      fuelComparisonData,
      vehicleFuel,
      truckProductivity,
      prevMonth: {
        name: prevMonthName,
        target: prevKPI.toFixed(0),
        delivered: prevDeliveredTons.toFixed(1),
        progress: prevProgress.toFixed(1)
      },
      efficiency: {
        yield: (silicaYieldTotal * 100).toFixed(1),
        fuelEff: fuelEfficiencyTotal.toFixed(2)
      },
      monthlyKPI
    };
  }, [loading, purchases, deliveries, gasoline, gasPurchases, plans, customers, vehicles]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-xl min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-md"></div>
        <p className="text-secondary">Orchestrating operational intelligence...</p>
      </div>
    );
  }

  const { kpis, lossTrendData, purchaseTrendData, topCustomers, fuelComparisonData, vehicleFuel, truckProductivity, prevMonth, efficiency, monthlyKPI } = dashboardData;

  const getLossStatus = (val) => val > 30 ? 'warning' : 'optimal';

  return (
    <div className="dashboard-v2 pb-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Silica Intelligence Dashboard</h1>
          <p className="text-secondary mt-xs">Real-time operational visibility and efficiency metrics.</p>
        </div>
        <div className="flex items-center gap-sm bg-surface p-xs px-sm rounded-lg border border-border">
          <Calendar size={16} className="text-primary" />
          <span className="text-sm font-medium">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-md mb-xl">
        <KPIButton title="Raw Material" value={kpis.purchased} unit="tons" subtitle="Purchased MTD" icon={Droplets} colorClass="text-primary" />
        <KPIButton title="Product Delivered" value={kpis.delivered} unit="tons" subtitle="Delivered MTD" icon={PackageCheck} colorClass="text-success" />
        <KPIButton title="Silica Loss" value={kpis.loss} unit="tons" subtitle="Purchase - Delivery" icon={AlertTriangle} colorClass={parseFloat(kpis.loss) > 0 ? "text-warning" : "text-success"} status={getLossStatus((parseFloat(kpis.loss) / parseFloat(kpis.purchased)) * 100)} />
        <KPIButton title="Fuel Consumption" value={kpis.fuel} unit="liters" subtitle="Total Used MTD" icon={Activity} colorClass="text-warning" />
        <KPIButton title="KPI Progress" value={kpis.progress} unit="%" subtitle="Of Monthly Target" icon={TrendingUp} colorClass="text-success" status={parseFloat(kpis.progress) >= 100 ? 'achieved' : 'active'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl mb-xl">
        {/* SECTION 2: SILICA LOSS MONITORING */}
        <div className="card">
          <div className="flex justify-between items-center mb-lg">
            <div>
              <h3 className="text-lg font-bold">Silica Loss Trend (%)</h3>
              <p className="text-xs text-secondary">Historical loss monitoring (4 Months)</p>
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
          <h3 className="text-lg font-bold mb-lg">Efficiency Analytics</h3>
          <div className="grid grid-cols-2 gap-md h-[300px]">
            <div className="flex flex-col items-center justify-center bg-bg rounded-xl p-md text-center border border-border">
               <div className="p-sm bg-primary-light rounded-full mb-md text-primary">
                 <TrendingUp size={32} />
               </div>
               <p className="text-secondary text-xs uppercase font-bold tracking-widest mb-xs">Silica Yield</p>
               <h4 className="text-3xl font-black text-primary">{efficiency.yield}%</h4>
               <p className="text-[10px] text-secondary mt-sm">Total Delivery / Raw Purchase</p>
            </div>
            <div className="flex flex-col items-center justify-center bg-bg rounded-xl p-md text-center border border-border">
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
        {/* SECTION 3 & 4: DELIVERY KPI PROGRESS */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-bold mb-md">Delivery Performance vs Target</h3>
          
          <div className="mb-xl p-lg bg-bg rounded-xl border border-border">
            <div className="flex justify-between items-end mb-sm">
              <div>
                <p className="text-xs text-secondary font-bold uppercase">Current Month Progress</p>
                <div className="flex items-baseline gap-xs mt-xs">
                  <span className="text-3xl font-black text-primary">{kpis.delivered} <span className="text-sm font-normal text-secondary">tons</span></span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-secondary">Target: {monthlyKPI.toLocaleString()} tons</p>
                <p className="text-2xl font-bold text-success">{kpis.progress}%</p>
              </div>
            </div>
            <div className="h-4 bg-surface rounded-full overflow-hidden border border-border">
              <div 
                className="h-full bg-gradient-to-r from-primary to-success transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(parseFloat(kpis.progress), 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
             <div>
               <h4 className="text-sm font-bold text-secondary mb-md border-b border-border pb-xs uppercase">Previous Month Summary</h4>
               <div className="flex items-center gap-lg">
                 <div className="flex flex-col">
                    <span className="text-xs text-secondary">{prevMonth.name}</span>
                    <span className="text-xl font-bold">{prevMonth.progress}%</span>
                 </div>
                 <div className="flex-1 text-xs text-secondary">
                   <p>Target: {prevMonth.target} tons</p>
                   <p>Delivered: {prevMonth.delivered} tons</p>
                 </div>
               </div>
             </div>
             <div className="bg-success-light text-success p-sm rounded-lg flex items-center gap-sm">
               <Truck size={24} />
               <div>
                  <p className="text-[10px] font-bold uppercase">Fleet Readiness</p>
                  <p className="text-sm font-medium">Optimal utilization detected</p>
               </div>
             </div>
          </div>
        </div>

        {/* SECTION 8: FUEL USAGE BY VEHICLE */}
        <div className="card">
          <h3 className="text-lg font-bold mb-md">Vehicle Fuel Consumption</h3>
          <p className="text-xs text-secondary mb-lg">Liters consumed MTD</p>
          <HorizontalMetricChart data={vehicleFuel} dataKey="liters" color="#fbbf24" unit=" L" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl mb-xl">
        {/* SECTION 5: PURCHASE TREND */}
        <div className="card">
          <h3 className="text-lg font-bold mb-md">Raw Material Purchase Trend</h3>
          <p className="text-xs text-secondary mb-lg">Total tons purchased per month (12 Months)</p>
          <PurchaseTrendChart data={purchaseTrendData} />
        </div>

        {/* SECTION 7: FUEL PURCHASE VS USAGE */}
        <div className="card">
          <h3 className="text-lg font-bold mb-md">Fuel Balance Audit</h3>
          <p className="text-xs text-secondary mb-lg">Purchase vs Usage comparison (MTD)</p>
          <FuelComparisonChart data={fuelComparisonData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* SECTION 6: DELIVERIES BY CUSTOMER */}
        <div className="card">
          <h3 className="text-lg font-bold mb-md">Top 5 Customers</h3>
          <p className="text-xs text-secondary mb-lg">Delivered tons grouped by partner</p>
          <HorizontalMetricChart data={topCustomers} dataKey="tons" color="var(--success-color)" unit=" t" />
        </div>

        {/* SECTION 9: TRUCK PRODUCTIVITY */}
        <div className="card">
          <h3 className="text-lg font-bold mb-md">Truck Utilization</h3>
          <p className="text-xs text-secondary mb-lg">Total tons delivered per vehicle</p>
          <HorizontalMetricChart data={truckProductivity} dataKey="tons" color="var(--primary-color)" unit=" t" />
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
