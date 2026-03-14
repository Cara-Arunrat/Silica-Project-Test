import React, { useState } from 'react';
import MasterDataTable from '../components/MasterDataTable';
import { TABLE_NAMES } from '../api/airtable';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function MasterData() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('suppliers');

  // Extra safety check in case they bypass AppShell UI
  if (user?.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'customers', label: 'Customers' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'product_grades', label: 'Product Grades' },
  ];

  return (
    <div className="master-data-page max-w-4xl mx-auto">
      <div className="mb-lg">
        <h2 className="text-2xl font-bold mb-xs">Master Data Management</h2>
        <p className="text-secondary">
          Manage system entities. Deactivating an item removes it from future input dropdowns, but preserves historical data.
        </p>
      </div>

      <div className="tabs-container bg-surface rounded-lg shadow-sm border border-border overflow-hidden mb-lg">
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn flex-none py-sm px-lg font-medium text-sm transition-colors ${
                activeTab === tab.id ? 'active-tab' : 'text-secondary hover:bg-bg'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="p-xl">
          {activeTab === 'suppliers' && <MasterDataTable title="Suppliers" tableName={TABLE_NAMES.SUPPLIERS} />}
          {activeTab === 'customers' && <MasterDataTable title="Customers" tableName={TABLE_NAMES.CUSTOMERS} />}
          {activeTab === 'vehicles' && <MasterDataTable title="Vehicles" tableName={TABLE_NAMES.VEHICLES} />}
          {activeTab === 'drivers' && <MasterDataTable title="Drivers" tableName={TABLE_NAMES.DRIVERS} />}
          {activeTab === 'product_grades' && <MasterDataTable title="Product Grades" tableName={TABLE_NAMES.PRODUCT_GRADES} />}
        </div>
      </div>

      <style>{`
        .max-w-4xl { max-width: 56rem; margin-left: auto; margin-right: auto; }
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
