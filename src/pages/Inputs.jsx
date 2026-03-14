import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../api/hooks';
import { TABLE_NAMES } from '../api/airtable';
import MasterDataSelect from '../components/MasterDataSelect';

// Sub-components for each form type to keep it organized
import PurchaseForm from './forms/PurchaseForm';
import DeliveryForm from './forms/DeliveryForm';
import GasolineForm from './forms/GasolineForm';
import ProductionForm from './forms/ProductionForm';
import MonthlyPlanForm from './forms/MonthlyPlanForm';

export default function Inputs() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('purchase');

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: 'purchase', label: 'Purchases' },
    { id: 'delivery', label: 'Deliveries' },
    { id: 'gasoline', label: 'Gasoline Usage' },
    { id: 'production', label: 'Production Logs' },
    { id: 'plan', label: 'Monthly Plans' },
  ];

  return (
    <div className="inputs-page max-w-4xl mx-auto">
      <div className="mb-lg">
        <h2 className="text-2xl font-bold mb-xs">Daily Data Entry</h2>
        <p className="text-secondary">Log operations strictly in tons. Pricing is omitted.</p>
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
          {activeTab === 'purchase' && <PurchaseForm />}
          {activeTab === 'delivery' && <DeliveryForm />}
          {activeTab === 'gasoline' && <GasolineForm />}
          {activeTab === 'production' && <ProductionForm />}
          {activeTab === 'plan' && <MonthlyPlanForm />}
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
