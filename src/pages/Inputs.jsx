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
import GasolinePurchaseForm from './forms/GasolinePurchaseForm';
import MonthlyPlanForm from './forms/MonthlyPlanForm';
import VehicleForm from './forms/VehicleForm';

export default function Inputs() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('purchase');

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: 'purchase', label: 'Purchases' },
    { id: 'delivery', label: 'Deliveries' },
    { id: 'gas_purchase', label: 'Gasoline Purchase' },
    { id: 'gasoline', label: 'Gasoline Usage' },
    { id: 'plan', label: 'Monthly Plans' },
    { id: 'vehicle', label: 'Vehicles' },
  ];

  return (
    <div className="inputs-page w-full max-w-7xl mx-auto px-md">
      <div className="mb-lg">
        <h2 className="text-2xl font-bold mb-xs">Daily Data Entry</h2>
        <p className="text-secondary">Log operations strictly in tons. Pricing is omitted.</p>
      </div>

      <div className="tabs-container bg-surface rounded-lg shadow-sm border border-border overflow-hidden mb-lg">
        <div className="flex border-b border-border overflow-x-auto bg-bg-light">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn flex-1 py-md px-lg font-bold text-sm transition-all duration-200 border-r border-border last:border-r-0 ${
                activeTab === tab.id 
                  ? 'bg-surface text-primary border-b-2 border-b-primary shadow-sm' 
                  : 'text-secondary hover:bg-surface hover:text-primary opacity-70 hover:opacity-100'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>
        
        <div className="p-xl">
          {activeTab === 'purchase' && <PurchaseForm />}
          {activeTab === 'delivery' && <DeliveryForm />}
          {activeTab === 'gas_purchase' && <GasolinePurchaseForm />}
          {activeTab === 'gasoline' && <GasolineForm />}
          {activeTab === 'plan' && <MonthlyPlanForm />}
          {activeTab === 'vehicle' && <VehicleForm />}
        </div>
      </div>

      <style>{`
        .max-w-7xl { max-width: 80rem; margin-left: auto; margin-right: auto; }
        .bg-bg-light { background-color: rgba(var(--primary-rgb), 0.03); }
        .bg-surface { background-color: var(--surface-color); }
        .rounded-lg { border-radius: var(--border-radius-lg); }
        .shadow-sm { box-shadow: var(--shadow-sm); }
        .border { border: 1px solid var(--border-color); }
        .border-b { border-bottom: 1px solid var(--border-color); }
        .border-r { border-right: 1px solid var(--border-color); }
        .border-border { border-color: var(--border-color); }
        .overflow-hidden { overflow: hidden; }
        .overflow-x-auto { overflow-x: auto; }
        .flex-1 { flex: 1 1 0%; }
        .py-md { padding-top: var(--spacing-md); padding-bottom: var(--spacing-md); }
        .px-lg { padding-left: var(--spacing-lg); padding-right: var(--spacing-lg); }
        .active-tab {
          color: var(--primary-color);
          background-color: var(--surface-color);
          border-bottom: 2px solid var(--primary-color);
        }
      `}</style>
    </div>
  );
}
