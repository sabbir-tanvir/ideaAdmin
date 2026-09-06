import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineShoppingBag,
  HiOutlineDocumentText,
  HiOutlineBellAlert,
  HiOutlineNewspaper,
  HiOutlineCalendar,
  HiOutlineEnvelope,
  HiOutlineComputerDesktop,
  HiOutlineInformationCircle,
  HiOutlineFilm,
  HiChevronLeft,
  HiChevronRight,
  HiChevronDown,
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
  {
    label: 'About',
    icon: HiOutlineInformationCircle,
    path: '/dashboard/about',
    children: [
      { label: 'News & Video', icon: HiOutlineFilm, path: '/dashboard/about/news-video' },
    ],
  },
];

const Sidebar = ({ collapsed, mobileOpen, onToggle }) => {
  const isCollapsed = collapsed && !mobileOpen;
  const location = useLocation();
  const navigate = useNavigate();

  const [expandedToggles, setExpandedToggles] = useState({});

  const isItemExpanded = (item) => {
    if (expandedToggles[item.label] !== undefined) {
      return expandedToggles[item.label];
    }
    // Auto-expand if currently inside this route
    if (location.pathname.startsWith(item.path)) {
      return true;
    }
    return false;
  };

  const toggleExpand = (item) => {
    if (isCollapsed) {
      if (item.children?.[0]?.path) navigate(item.children[0].path);
      return;
    }
    const currentExpanded = isItemExpanded(item);
    setExpandedToggles((prev) => ({
      ...prev,
      [item.label]: !currentExpanded,
    }));
  };

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
          {navItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isChildActive = hasChildren && item.children.some((c) => location.pathname.startsWith(c.path));
            const isParentActive = isChildActive || location.pathname === item.path;
            const isExpanded = isItemExpanded(item);

            if (hasChildren) {
              return (
                <li key={item.path} className="sidebar__item sidebar__item--has-children">
                  <button
                    type="button"
                    onClick={() => toggleExpand(item)}
                    className={`sidebar__link ${isParentActive ? 'sidebar__link--parent-active' : ''}`}
                    title={collapsed ? `${item.label}: ${item.children.map((c) => c.label).join(', ')}` : undefined}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <item.icon className="sidebar__link-icon" />
                    {!isCollapsed && (
                      <>
                        <span className="sidebar__link-text">{item.label}</span>
                        <HiChevronDown
                          className={`sidebar__chevron ${isExpanded ? 'sidebar__chevron--expanded' : ''}`}
                        />
                      </>
                    )}
                  </button>

                  {/* Submenu */}
                  {!isCollapsed && isExpanded && (
                    <ul className="sidebar__submenu">
                      {item.children.map((child) => (
                        <li key={child.path} className="sidebar__subitem">
                          <NavLink
                            to={child.path}
                            className={({ isActive }) =>
                              `sidebar__sublink ${isActive ? 'sidebar__sublink--active' : ''}`
                            }
                          >
                            <child.icon className="sidebar__sublink-icon" />
                            <span className="sidebar__sublink-text">{child.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            return (
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
            );
          })}
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
