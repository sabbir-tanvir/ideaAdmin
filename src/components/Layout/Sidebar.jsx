import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineCog6Tooth,
  HiOutlineChartBarSquare,
  HiOutlineDocumentText,
  HiOutlineShoppingBag,
  HiOutlineBellAlert,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi2';

const navItems = [
  { label: 'Dashboard', icon: HiOutlineHome, path: '/dashboard' },
  { label: 'Users', icon: HiOutlineUsers, path: '/dashboard/users' },
  { label: 'Products', icon: HiOutlineShoppingBag, path: '/dashboard/products' },
  { label: 'Payments', icon: HiOutlineDocumentText, path: '/dashboard/payments' },
  { label: 'Analytics', icon: HiOutlineChartBarSquare, path: '/dashboard/analytics' },
  { label: 'Notifications', icon: HiOutlineBellAlert, path: '/dashboard/notifications' },
  { label: 'Settings', icon: HiOutlineCog6Tooth, path: '/dashboard/settings' },
];

const Sidebar = ({ collapsed, onToggle }) => {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">💡</span>
          {!collapsed && <span className="sidebar__logo-text">Idea Admin</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        <ul className="sidebar__list">
          {navItems.map((item) => (
            <li key={item.path} className="sidebar__item">
              <NavLink
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="sidebar__link-icon" />
                {!collapsed && (
                  <span className="sidebar__link-text">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <button className="sidebar__toggle" onClick={onToggle} title="Toggle sidebar">
        {collapsed ? <HiChevronRight /> : <HiChevronLeft />}
      </button>
    </aside>
  );
};

export default Sidebar;
