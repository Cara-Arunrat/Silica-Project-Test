import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, Cell, ComposedChart
} from 'recharts';

/**
 * Silica Loss Trend Chart (Line Chart)
 */
export const LossTrendChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-secondary p-lg text-center">No loss data available.</div>;
  
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
          <XAxis dataKey="month" stroke="var(--secondary-text)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--secondary-text)" fontSize={12} tickLine={false} axisLine={false} unit="%" />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Legend verticalAlign="top" height={36}/>
          <Line 
            type="monotone" 
            dataKey="lossPercentage" 
            name="Loss %"
            stroke="var(--primary-color)" 
            strokeWidth={3}
            dot={{ r: 6, fill: 'var(--primary-color)', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 8 }}
          />
          {/* Reference Line for 30% Threshold could be added here if needed */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Purchase Trend Chart (Bar Chart)
 */
export const PurchaseTrendChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-secondary p-lg text-center">No purchase data available.</div>;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
          <XAxis dataKey="month" stroke="var(--secondary-text)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--secondary-text)" fontSize={12} tickLine={false} axisLine={false} unit=" t" />
          <Tooltip 
            cursor={{ fill: 'var(--bg-color)' }}
            contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
          />
          <Bar dataKey="tons" name="Tons Purchased" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Fuel Comparison Chart (Grouped Bar Chart)
 */
export const FuelComparisonChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-secondary p-lg text-center">No fuel data available.</div>;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
          <XAxis dataKey="month" stroke="var(--secondary-text)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--secondary-text)" fontSize={12} tickLine={false} axisLine={false} unit=" L" />
          <Tooltip 
            cursor={{ fill: 'var(--bg-color)' }}
            contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar dataKey="purchased" name="Purchased" fill="var(--success-color)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="used" name="Used" fill="#fbbf24" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Productivity/Efficiency Bar Chart (Generic Horizontal Bar)
 */
export const HorizontalMetricChart = ({ data, dataKey, color = "var(--primary-color)", unit = "" }) => {
  if (!data || data.length === 0) return <div className="text-secondary p-lg text-center">No data available.</div>;

  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <BarChart 
          layout="vertical" 
          data={data} 
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
          <XAxis type="number" stroke="var(--secondary-text)" fontSize={11} tickLine={false} axisLine={false} unit={unit} />
          <YAxis type="category" dataKey="name" stroke="var(--secondary-text)" fontSize={11} tickLine={false} axisLine={false} width={80} />
          <Tooltip 
            cursor={{ fill: 'var(--bg-color)' }}
            contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
