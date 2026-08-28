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
  HiOutlineNewspaper,
  HiOutlineCalendar,
  HiOutlineEnvelope,
  HiOutlineComputerDesktop,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi2';

const navItems = [
  { label: 'Dashboard', icon: HiOutlineHome, path: '/dashboard' },
  { label: 'Users', icon: HiOutlineUsers, path: '/dashboard/users' },
  { label: 'Courses', icon: HiOutlineShoppingBag, path: '/dashboard/products' },
  { label: 'Payments', icon: HiOutlineDocumentText, path: '/dashboard/payments' },
  { label: 'Blogs', icon: HiOutlineNewspaper, path: '/dashboard/blogs' },
  { label: 'Events', icon: HiOutlineCalendar, path: '/dashboard/events' },
  { label: 'Messages', icon: HiOutlineEnvelope, path: '/dashboard/messages' },
  { label: 'Sessions', icon: HiOutlineComputerDesktop, path: '/dashboard/sessions' },
  { label: 'Notices', icon: HiOutlineBellAlert, path: '/dashboard/notices' },
];

const Sidebar = ({ collapsed, mobileOpen, onToggle }) => {
  const isCollapsed = collapsed && !mobileOpen;

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">💡</span>
          {!isCollapsed && <span className="sidebar__logo-text">Idea Admin</span>}
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
                {!isCollapsed && (
                  <span className="sidebar__link-text">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <button className="sidebar__toggle" onClick={onToggle} title="Toggle sidebar">
        {isCollapsed ? <HiChevronRight /> : <HiChevronLeft />}
      </button>
    </aside>
  );
};

export default Sidebar;
