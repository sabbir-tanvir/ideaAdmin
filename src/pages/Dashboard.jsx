import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import {
  HiOutlineUsers,
  HiOutlineShoppingBag,
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
} from 'react-icons/hi2';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: '—',
    products: '—',
    payments: '—',
    revenue: '—',
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, coursesRes, paymentsRes] = await Promise.all([
          API.get('/users'),
          API.get('/courses'),
          API.get('/payments')
        ]);
        const usersList = usersRes.data.success ? usersRes.data.data : (Array.isArray(usersRes.data) ? usersRes.data : []);
        const productsList = coursesRes.data.success ? coursesRes.data.data : (Array.isArray(coursesRes.data) ? coursesRes.data : []);
        const paymentsList = paymentsRes.data.success ? paymentsRes.data.data : (Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
        
        // Calculate Revenue from SUCCESS payments
        const totalRevenue = paymentsList
          .filter(p => p.status === 'SUCCESS' || p.status === 'APPROVED')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);
          
        setStats({
          users: usersList.length,
          products: productsList.length,
          payments: paymentsList.length,
          revenue: `৳${totalRevenue.toLocaleString()}`,
        });
        
        // Generate Recent Activities
        const combinedActivities = [
          ...usersList.map(u => ({ 
            id: `u-${u.id}`, 
            type: 'USER', 
            date: u.createdAt, 
            title: 'New User Registered',
            desc: `${u.name} just joined the platform.` 
          })),
          ...paymentsList.map(p => ({ 
            id: `p-${p.id}`, 
            type: 'PAYMENT', 
            date: p.createdAt, 
            title: 'Payment Received',
            desc: `${p.user?.name || 'A user'} paid ৳${p.amount} via ${p.paymentMethod}.` 
          }))
        ];
        
        // Sort by date newest first, and take top 5
        combinedActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecentActivities(combinedActivities.slice(0, 5));
        
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Users',
      value: stats.users,
      icon: HiOutlineUsers,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.12)',
      path: '/dashboard/users',
    },
    {
      label: 'Products',
      value: stats.products,
      icon: HiOutlineShoppingBag,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      path: '/dashboard/products',
    },
    {
      label: 'Payments',
      value: stats.payments,
      icon: HiOutlineDocumentText,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      path: '/dashboard/payments',
    },
    {
      label: 'Revenue',
      value: stats.revenue,
      icon: HiOutlineCurrencyDollar,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      path: '/dashboard/payments', // Analytics removed, linking to payments
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__greeting">
        <h1>Welcome back, <span className="dashboard-page__name">{user?.name || 'Admin'}</span> 👋</h1>
        <p>Here's what's happening with your platform today.</p>
      </div>

      <div className="dashboard-page__stats">
        {statCards.map((card) => (
          <Link to={card.path} className="stat-card" style={{ textDecoration: 'none' }} key={card.label}>
            <div className="stat-card__icon" style={{ backgroundColor: card.bg, color: card.color }}>
              <card.icon />
            </div>
            <div className="stat-card__info">
              <p className="stat-card__label">{card.label}</p>
              <h3 className="stat-card__value">{card.value}</h3>
            </div>
          </Link>
        ))}
      </div>

      <div className="dashboard-page__placeholder" style={{ gridTemplateColumns: 'minmax(340px, 600px)' }}>
        <div className="placeholder-card">
          <h3>📋 Recent Activity</h3>
          <p>Latest platform events and transactions.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {recentActivities.length === 0 ? (
              <p style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>No recent activities found.</p>
            ) : (
              recentActivities.map(activity => (
                <div key={activity.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{activity.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                      {new Date(activity.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{activity.desc}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
