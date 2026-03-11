import { useAuth } from '../context/AuthContext';
import {
  HiOutlineUsers,
  HiOutlineShoppingBag,
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
} from 'react-icons/hi2';

const statCards = [
  {
    label: 'Total Users',
    value: '—',
    icon: HiOutlineUsers,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
  },
  {
    label: 'Products',
    value: '—',
    icon: HiOutlineShoppingBag,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
  },
  {
    label: 'Orders',
    value: '—',
    icon: HiOutlineDocumentText,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
  },
  {
    label: 'Revenue',
    value: '—',
    icon: HiOutlineCurrencyDollar,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
  },
];

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__greeting">
        <h1>Welcome back, <span className="dashboard-page__name">{user?.name || 'Admin'}</span> 👋</h1>
        <p>Here's what's happening with your platform today.</p>
      </div>

      <div className="dashboard-page__stats">
        {statCards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className="stat-card__icon" style={{ backgroundColor: card.bg, color: card.color }}>
              <card.icon />
            </div>
            <div className="stat-card__info">
              <p className="stat-card__label">{card.label}</p>
              <h3 className="stat-card__value">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-page__placeholder">
        <div className="placeholder-card">
          <h3>📊 Analytics Overview</h3>
          <p>Charts and analytics will appear here once connected to the API endpoints.</p>
          <div className="placeholder-card__skeleton">
            <div className="skeleton-bar" style={{ width: '80%' }} />
            <div className="skeleton-bar" style={{ width: '60%' }} />
            <div className="skeleton-bar" style={{ width: '90%' }} />
            <div className="skeleton-bar" style={{ width: '45%' }} />
          </div>
        </div>
        <div className="placeholder-card">
          <h3>📋 Recent Activity</h3>
          <p>Recent orders and user activity will be displayed here.</p>
          <div className="placeholder-card__skeleton">
            <div className="skeleton-bar" style={{ width: '70%' }} />
            <div className="skeleton-bar" style={{ width: '85%' }} />
            <div className="skeleton-bar" style={{ width: '55%' }} />
            <div className="skeleton-bar" style={{ width: '75%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
