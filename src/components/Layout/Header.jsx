import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  HiOutlineBars3,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineMagnifyingGlass,
  HiOutlineBell,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUser,
} from 'react-icons/hi2';

const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="header">
      {/* Left section */}
      <div className="header__left">
        <button
          className="header__menu-btn"
          onClick={onMenuToggle}
          title="Toggle sidebar"
          id="menu-toggle-btn"
        >
          <HiOutlineBars3 />
        </button>

        <div className="header__search">
          <HiOutlineMagnifyingGlass className="header__search-icon" />
          <input
            type="text"
            className="header__search-input"
            placeholder="Search..."
            id="header-search-input"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="header__right">
        {/* Theme toggle */}
        <button
          className="header__icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          id="theme-toggle-btn"
        >
          {theme === 'dark' ? <HiOutlineSun /> : <HiOutlineMoon />}
        </button>

        {/* Notifications */}
        <button className="header__icon-btn" title="Notifications" id="notifications-btn">
          <HiOutlineBell />
          <span className="header__badge">3</span>
        </button>

        {/* User dropdown */}
        <div className="header__user" ref={dropdownRef}>
          <button
            className="header__user-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            id="user-dropdown-btn"
          >
            <div className="header__avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <span className="header__username">{user?.name || 'Admin'}</span>
          </button>

          {dropdownOpen && (
            <div className="header__dropdown">
              <div className="header__dropdown-header">
                <p className="header__dropdown-name">{user?.name}</p>
                <p className="header__dropdown-email">{user?.email}</p>
              </div>
              <div className="header__dropdown-divider" />
              <button className="header__dropdown-item" id="profile-btn">
                <HiOutlineUser />
                <span>Profile</span>
              </button>
              <button
                className="header__dropdown-item header__dropdown-item--danger"
                onClick={logout}
                id="logout-btn"
              >
                <HiOutlineArrowRightOnRectangle />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
