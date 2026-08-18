import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'dashboard-layout--collapsed' : ''}`}>
      <Sidebar 
        collapsed={sidebarCollapsed} 
        mobileOpen={sidebarMobileOpen}
        onToggle={toggleSidebar} 
      />
      {sidebarMobileOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}
      <div className="dashboard-layout__main">
        <Header onMenuToggle={toggleSidebar} />
        <main className="dashboard-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
