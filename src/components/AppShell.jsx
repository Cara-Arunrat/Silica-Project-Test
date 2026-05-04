import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, FileInput, History, Database, Calculator, LogOut, Menu, ClipboardList, FlaskConical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AppShell.css';

import Dashboard from '../pages/Dashboard';
import Inputs from '../pages/Inputs';
import HistoryPage from '../pages/History';
import MasterData from '../pages/MasterData';
import Accounting from '../pages/Accounting';
import Inputs2 from '../pages/Inputs2';
import TestSieveResult from '../pages/TestSieveResult';

const SidebarLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <li>
      <Link to={to} className={`sidebar-link ${isActive ? 'active' : ''}`}>
        <Icon size={20} />
        <span>{label}</span>
      </Link>
    </li>
  );
};

const Navigation = ({ isMobileOpen }) => {
  const { user, logout } = useAuth();
  
  return (
    <nav className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <h1 className="logo">SilicaOps</h1>
      </div>
      
      <ul className="sidebar-nav">
        <SidebarLink to="/" icon={Home} label="Dashboard" />
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <SidebarLink to="/inputs" icon={FileInput} label="Inputs" />
        )}
        {(user?.role === 'manager' || user?.role === 'admin') && (
          <SidebarLink to="/inputs2" icon={ClipboardList} label="Inputs 2" />
        )}
        <SidebarLink to="/history" icon={History} label="History" />
        {user?.role === 'manager' && (
          <>
            <SidebarLink to="/accounting" icon={Calculator} label="Accounting" />
            <SidebarLink to="/master" icon={Database} label="Master Data" />
            <SidebarLink to="/sieve-results" icon={FlaskConical} label="Test Sieve Result" />
          </>
        )}
      </ul>
      
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{user?.username ? user.username.charAt(0).toUpperCase() : '?'}</div>
          <div className="user-info">
            <span className="user-name">{user?.username || 'Guest'}</span>
            <span className="user-role">Role: {user?.role || 'Unknown'}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default function AppShell() {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const location = useLocation();

  // Close sidebar when navigating on mobile
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  return (
    <div className="app-layout">
      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      <Navigation isMobileOpen={isMobileOpen} />

      <main className="main-content">
        <header className="top-header">
          <button 
            className="mobile-toggle" 
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          
          <div className="header-breadcrumbs">
             <span className="text-secondary">Silica Operations Dashboard</span>
          </div>
        </header>
        
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inputs/*" element={<Inputs />} />
            <Route path="/inputs2/*" element={<Inputs2 />} />
            <Route path="/sieve-results" element={<TestSieveResult />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/master/*" element={<MasterData />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
