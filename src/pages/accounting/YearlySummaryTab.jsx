import React, { useMemo, forwardRef, useImperativeHandle } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { findKey } from '../../api/hooks';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const YearlySummaryTab = forwardRef(({ purchases, deliveries, gasolineLogs, allDeliveries, allGasolineLogs, drivers, vehicles, suppliers, resolveName, selectedYear }, ref) => {

  // ── Vehicle → Driver map ──
  const vehicleDriverMap = useMemo(() => {
    const map = {};
    vehicles?.forEach(v => {
      const keys = Object.keys(v);
      const dk = findKey(keys, 'driver') || findKey(keys, 'driver_id');
      if (dk && v[dk]) {
        const dId = Array.isArray(v[dk]) ? v[dk][0] : v[dk];
        map[v._id] = dId;
      }
    });
    return map;
  }, [vehicles]);

  const getDate = (r) => {
    const keys = Object.keys(r);
    const dk = findKey(keys, 'purchase_date') || findKey(keys, 'date') || findKey(keys, 'delivery_date') || findKey(keys, 'created_at');
    const val = dk ? r[dk] : r._createdTime;
    return val ? new Date(val) : null;
  };

  // ── 1. Total Purchases (฿) by Month ──
  const monthlyPurchases = useMemo(() => {
    const arr = Array(12).fill(0);
    purchases.forEach(p => {
      const d = getDate(p);
      if (!d) return;
      const keys = Object.keys(p);
      const tonsKey = findKey(keys, 'tons_purchased') || findKey(keys, 'tons_purchase');
      const priceKey = findKey(keys, 'price_per_unit') || findKey(keys, 'price') || findKey(keys, 'unit_price');
      const tons = parseFloat(tonsKey ? p[tonsKey] : 0) || 0;
      const price = parseFloat(priceKey ? p[priceKey] : 0) || 0;
      arr[d.getMonth()] += tons * price;
    });
    return MONTHS.map((m, i) => ({ month: m, value: Math.round(arr[i] * 100) / 100 }));
  }, [purchases]);

  // ── 2. Total Delivered Volume (Tons) by Bi-Monthly ──
  const biMonthlyDeliveries = useMemo(() => {
    const arr = Array(24).fill(0); // 12 months × 2 halves
    deliveries.forEach(d => {
      const dt = getDate(d);
      if (!dt) return;
      const keys = Object.keys(d);
      const tonsKey = findKey(keys, 'tons_delivered') || findKey(keys, 'tons');
      const tons = parseFloat(tonsKey ? d[tonsKey] : 0) || 0;
      const half = dt.getDate() <= 15 ? 0 : 1;
      arr[dt.getMonth() * 2 + half] += tons;
    });
    const result = [];
    for (let m = 0; m < 12; m++) {
      result.push({ period: `${MONTHS[m]} H1`, value: Math.round(arr[m * 2] * 100) / 100 });
      result.push({ period: `${MONTHS[m]} H2`, value: Math.round(arr[m * 2 + 1] * 100) / 100 });
    }
    return result;
  }, [deliveries]);

  // ── 3. Total Driver Payback (฿) by Month ──
  const monthlyDriverPayback = useMemo(() => {
    const income = Array(12).fill(0);
    const cost = Array(12).fill(0);

    deliveries.forEach(d => {
      const dt = getDate(d);
      if (!dt) return;
      const keys = Object.keys(d);
      const tonsKey = findKey(keys, 'tons_delivered') || findKey(keys, 'tons');
      const rateKey = findKey(keys, 'driver_rate') || findKey(keys, 'rate');
      const tons = parseFloat(tonsKey ? d[tonsKey] : 0) || 0;
      const rate = parseFloat(rateKey ? d[rateKey] : 0) || 0;
      income[dt.getMonth()] += tons * rate;
    });

    gasolineLogs.forEach(g => {
      const dt = getDate(g);
      if (!dt) return;
      const keys = Object.keys(g);
      const costKey = findKey(keys, 'total_price') || findKey(keys, 'total_cost');
      const c = parseFloat(costKey ? g[costKey] : 0) || 0;
      cost[dt.getMonth()] += c;
    });

    return MONTHS.map((m, i) => ({
      month: m,
      income: Math.round(income[i] * 100) / 100,
      gasoline: Math.round(cost[i] * 100) / 100,
      net: Math.round((income[i] - cost[i]) * 100) / 100,
    }));
  }, [deliveries, gasolineLogs]);

  // ── 4. Net Operational Flow (฿) by Month ──
  const monthlyNetFlow = useMemo(() => {
    return MONTHS.map((m, i) => ({
      month: m,
      purchases: monthlyPurchases[i].value,
      driverPayback: monthlyDriverPayback[i].net,
      netFlow: Math.round((monthlyPurchases[i].value - monthlyDriverPayback[i].net) * 100) / 100,
    }));
  }, [monthlyPurchases, monthlyDriverPayback]);

  // ── Annual Totals ──
  const annualTotals = useMemo(() => ({
    purchases: monthlyPurchases.reduce((s, r) => s + r.value, 0),
    delivered: biMonthlyDeliveries.reduce((s, r) => s + r.value, 0),
    driverPayback: monthlyDriverPayback.reduce((s, r) => s + r.net, 0),
    netFlow: monthlyNetFlow.reduce((s, r) => s + r.netFlow, 0),
  }), [monthlyPurchases, biMonthlyDeliveries, monthlyDriverPayback, monthlyNetFlow]);

  // ── Export ──
  useImperativeHandle(ref, () => ({
    getExportData: () => ({
      sheetName: 'Yearly_Summary',
      headers: ['Month', 'Purchases (฿)', 'Delivered (Tons)', 'Driver Payback (฿)', 'Net Flow (฿)'],
      rows: [
        ...MONTHS.map((m, i) => [
          m,
          monthlyPurchases[i].value.toFixed(2),
          (biMonthlyDeliveries[i * 2].value + biMonthlyDeliveries[i * 2 + 1].value).toFixed(2),
          monthlyDriverPayback[i].net.toFixed(2),
          monthlyNetFlow[i].netFlow.toFixed(2),
        ]),
        ['ANNUAL TOTAL', annualTotals.purchases.toFixed(2), annualTotals.delivered.toFixed(2), annualTotals.driverPayback.toFixed(2), annualTotals.netFlow.toFixed(2)],
      ],
    })
  }));

  const fmt = (v) => `฿${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtShort = (v) => {
    if (Math.abs(v) >= 1000000) return `฿${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000) return `฿${(v / 1000).toFixed(1)}K`;
    return `฿${v.toFixed(0)}`;
  };

  const chartStyle = { fontSize: 12, fill: '#64748b' };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-sm">Yearly Summary — {selectedYear}</h3>
      <p className="text-secondary text-sm mb-lg">Annual operational overview with monthly and bi-monthly breakdowns.</p>

      {/* Annual KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-xl">
        <div className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
          <p className="text-xs font-semibold tracking-wider uppercase text-secondary">Total Purchases</p>
          <p className="text-2xl font-bold text-primary mt-xs">{fmt(annualTotals.purchases)}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--success-color)' }}>
          <p className="text-xs font-semibold tracking-wider uppercase text-secondary">Total Delivered</p>
          <p className="text-2xl font-bold mt-xs" style={{ color: 'var(--success-color)' }}>{annualTotals.delivered.toLocaleString('en-US', { minimumFractionDigits: 1 })} tons</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <p className="text-xs font-semibold tracking-wider uppercase text-secondary">Driver Payback</p>
          <p className="text-2xl font-bold mt-xs" style={{ color: '#f59e0b' }}>{fmt(annualTotals.driverPayback)}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
          <p className="text-xs font-semibold tracking-wider uppercase text-secondary">Net Operational Flow</p>
          <p className="text-2xl font-bold mt-xs" style={{ color: '#6366f1' }}>{fmt(annualTotals.netFlow)}</p>
        </div>
      </div>

      {/* 1. Purchases Chart */}
      <div className="card mb-lg">
        <h4 className="font-semibold mb-md">Total Purchases (฿) — Monthly</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyPurchases}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={chartStyle} />
            <YAxis tickFormatter={fmtShort} tick={chartStyle} />
            <Tooltip formatter={(v) => [fmt(v), 'Purchases']} />
            <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2. Delivered Volume Chart */}
      <div className="card mb-lg">
        <h4 className="font-semibold mb-md">Total Delivered Volume (Tons) — Bi-Monthly</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={biMonthlyDeliveries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="period" tick={{ ...chartStyle, fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={chartStyle} />
            <Tooltip formatter={(v) => [`${v.toFixed(2)} tons`, 'Delivered']} />
            <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Driver Payback Chart */}
      <div className="card mb-lg">
        <h4 className="font-semibold mb-md">Driver Payback (฿) — Monthly</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyDriverPayback}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={chartStyle} />
            <YAxis tickFormatter={fmtShort} tick={chartStyle} />
            <Tooltip formatter={(v, name) => [fmt(v), name === 'income' ? 'Income' : name === 'gasoline' ? 'Gasoline' : 'Net']} />
            <Legend />
            <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="gasoline" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gasoline" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Net Operational Flow Chart */}
      <div className="card">
        <h4 className="font-semibold mb-md">Net Operational Flow (฿) — Monthly</h4>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyNetFlow}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={chartStyle} />
            <YAxis tickFormatter={fmtShort} tick={chartStyle} />
            <Tooltip formatter={(v, name) => [fmt(v), name === 'netFlow' ? 'Net Flow' : name === 'purchases' ? 'Purchases' : 'Driver Payback']} />
            <Legend />
            <Line type="monotone" dataKey="purchases" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} name="Purchases" />
            <Line type="monotone" dataKey="driverPayback" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Driver Payback" />
            <Line type="monotone" dataKey="netFlow" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} name="Net Flow" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

YearlySummaryTab.displayName = 'YearlySummaryTab';
export default YearlySummaryTab;
