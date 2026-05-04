import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import CertReminderForm from './forms/CertReminderForm';
import MonthlyPlanForm from './forms/MonthlyPlanForm';
import TestSieveForm from './forms/TestSieveForm';

// Placeholder for future tabs
const PlaceholderTab = ({ label }) => (
  <div className="inputs2-placeholder-tab">
    <div className="inputs2-placeholder-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <path d="M9 9h6M9 12h6M9 15h4"/>
      </svg>
    </div>
    <h3 className="inputs2-placeholder-title">{label}</h3>
    <p className="inputs2-placeholder-desc">This module is under development and will be available soon.</p>
    <div className="inputs2-placeholder-badge">Coming Soon</div>
  </div>
);

export default function Inputs2() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cert_reminder');

  // Manager and Admin access
  if (user?.role !== 'manager' && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: 'cert_reminder', label: 'Cert. Reminder' },
    { id: 'plan',          label: 'Monthly Plans' },
    { id: 'test_sieve',    label: 'Test Sieve' },
    { id: 'reports',       label: 'Reports' },
    { id: 'approvals',     label: 'Approvals' },
  ];

  return (
    <div className="inputs2-page w-full max-w-7xl mx-auto px-md">
      <div className="mb-lg">
        <h2 className="text-2xl font-bold mb-xs">Manager Inputs</h2>
        <p className="text-secondary">Manager-exclusive data entry and oversight tools.</p>
      </div>

      <div className="tabs-container bg-surface rounded-lg shadow-sm border border-border overflow-hidden mb-lg">
        {/* Tab bar — identical styling to Inputs page */}
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

        {/* Tab content */}
        <div className="p-xl">
          {activeTab === 'cert_reminder' && <CertReminderForm />}
          {activeTab === 'plan'          && <MonthlyPlanForm />}
          {activeTab === 'test_sieve'    && <TestSieveForm />}
          {activeTab === 'reports'       && <PlaceholderTab label="Reports" />}
          {activeTab === 'approvals'     && <PlaceholderTab label="Approvals" />}
        </div>
      </div>

      <style>{`
        .inputs2-page .max-w-7xl { max-width: 80rem; margin-left: auto; margin-right: auto; }
        .bg-bg-light  { background-color: rgba(var(--primary-rgb), 0.03); }
        .bg-surface   { background-color: var(--surface-color); }
        .rounded-lg   { border-radius: var(--border-radius-lg); }
        .shadow-sm    { box-shadow: var(--shadow-sm); }
        .border       { border: 1px solid var(--border-color); }
        .border-b     { border-bottom: 1px solid var(--border-color); }
        .border-r     { border-right: 1px solid var(--border-color); }
        .border-border { border-color: var(--border-color); }
        .overflow-hidden { overflow: hidden; }
        .overflow-x-auto { overflow-x: auto; }
        .flex-1       { flex: 1 1 0%; }
        .py-md        { padding-top: var(--spacing-md); padding-bottom: var(--spacing-md); }
        .px-lg        { padding-left: var(--spacing-lg); padding-right: var(--spacing-lg); }
        .p-xl         { padding: var(--spacing-xl); }

        /* Placeholder tab */
        .inputs2-placeholder-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--spacing-xl) var(--spacing-lg);
          min-height: 260px;
          gap: var(--spacing-md);
          color: var(--text-secondary);
        }
        .inputs2-placeholder-icon { opacity: 0.3; }
        .inputs2-placeholder-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-color);
          opacity: 0.5;
          margin: 0;
        }
        .inputs2-placeholder-desc {
          max-width: 340px;
          font-size: 0.875rem;
          margin: 0;
          opacity: 0.7;
        }
        .inputs2-placeholder-badge {
          background: rgba(var(--primary-rgb), 0.08);
          color: var(--primary-color);
          border: 1px solid rgba(var(--primary-rgb), 0.2);
          border-radius: 99px;
          padding: 4px 14px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
