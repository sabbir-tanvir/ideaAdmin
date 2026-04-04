import { useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import {
  HiOutlineComputerDesktop,
  HiOutlineMagnifyingGlass,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineDevicePhoneMobile
} from 'react-icons/hi2';
import '../styles/sessions.css';

// Debounce hook or standard setTimeout can be used for search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value) }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [searchEmail, setSearchEmail] = useState('');
  const debouncedSearch = useDebounce(searchEmail, 500);

  const [notification, setNotification] = useState(null);

  // User Sessions Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [userModalloading, setUserModalLoading] = useState(false);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'session' | 'user_all', id, name }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get(`/auth/admin/sessions?page=${page}&limit=10&email=${debouncedSearch}`);
      if (res.data.success) {
        setSessions(res.data.sessions || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalSessions(res.data.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    setPage(1); // Reset page on search
  }, [debouncedSearch]);

  const viewUserSessions = async (user) => {
    setSelectedUser(user);
    setUserModalLoading(true);
    try {
      const res = await API.get(`/auth/admin/sessions/${user.id}`);
      if (res.data.success) {
        setUserSessions(res.data.data || []);
      }
    } catch (err) {
      showNotification('Failed to load user sessions', 'error');
    } finally {
      setUserModalLoading(false);
    }
  };

  const confirmDelete = (type, target) => {
    setDeleteTarget({ type, ...target });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'session') {
        await API.delete(`/auth/admin/sessions/${deleteTarget.id}`);
        showNotification('Session deleted successfully');
        
        // Update local state without full reload
        setSessions(prev => prev.filter(s => s.id !== deleteTarget.id));
        if (selectedUser) {
           setUserSessions(prev => prev.filter(s => s.id !== deleteTarget.id));
        }
      } else if (deleteTarget.type === 'user_all') {
        await API.delete(`/auth/admin/sessions/user/${deleteTarget.id}`);
        showNotification(`All sessions for ${deleteTarget.name} deleted`);
        setSelectedUser(null);
        fetchSessions();
      }
    } catch (err) {
      showNotification(`Failed to logout: ${err.response?.data?.message || 'Unknown error'}`, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="sessions-page">
      {notification && (
        <div className={`toast toast--${notification.type}`}>
          {notification.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamationTriangle />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="sessions-page__header">
        <div>
          <h1 className="sessions-page__title">
            <HiOutlineComputerDesktop className="sessions-page__title-icon" />
            Active Sessions
          </h1>
          <p className="sessions-page__subtitle">
            {totalSessions} active session{totalSessions !== 1 ? 's' : ''} on the platform
          </p>
        </div>
      </div>

      <div className="sessions-toolbar">
        <div className="sessions-toolbar__search">
          <HiOutlineMagnifyingGlass className="sessions-toolbar__search-icon" />
          <input
            type="text"
            className="sessions-toolbar__search-input"
            placeholder="Search by email address..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="sessions-table-container">
        {loading && sessions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Loading sessions...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>No active sessions found.</div>
        ) : (
          <table className="sessions-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Session ID</th>
                <th>User</th>
                <th>Device / Client</th>
                <th>Active Sessions</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sess, index) => {
                const userCount = sessions.filter(s => s.userId === sess.userId).length;
                return (
                  <tr key={sess.id}>
                    <td style={{ color: 'var(--color-text-tertiary)' }}>
                      {(page - 1) * 10 + index + 1}
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--color-text-tertiary)' }}>
                      {sess.id.slice(0, 8)}...
                    </td>
                    <td>
                      <div className="session-user">
                        <div className="session-user__avatar">
                          {sess.user?.name ? sess.user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="session-user__info">
                          <span className="session-user__name">{sess.user?.name || 'Unknown User'}</span>
                          <span className="session-user__email">{sess.user?.email || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="session-device" title={sess.userAgent}>
                        {sess.userAgent || 'Unknown Device'}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge status-badge--published" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--color-accent)'}}>
                        {userCount} {userCount === 1 ? 'Session' : 'Sessions'}
                      </span>
                    </td>
                    <td>{formatDate(sess.createdAt)}</td>
                    <td>
                    <div className="sessions-actions" style={{ justifyContent: 'flex-end' }}>
                      <button 
                        className="session-action-btn"
                        title={`View ${sess.user?.name || 'User'}'s Sessions`}
                        onClick={() => sess.user && viewUserSessions(sess.user)}
                      >
                        <HiOutlineEye />
                      </button>
                      <button 
                        className="session-action-btn session-action-btn--delete"
                        title="Delete Session"
                        onClick={() => confirmDelete('session', { id: sess.id, name: 'this session' })}
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn" 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Page {page} of {totalPages}
          </span>
          <button 
            className="pagination-btn" 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* --- USER SESSIONS MODAL --- */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setSelectedUser(null)}>
              <HiOutlineXMark />
            </button>
            <div className="user-sessions-modal__header">
              <div>
                <h2 className="modal__title" style={{ marginBottom: '4px' }}>{selectedUser.name}'s Sessions</h2>
                <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>{selectedUser.email}</p>
              </div>
              <button 
                className="btn btn--danger"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                onClick={() => confirmDelete('user_all', { id: selectedUser.id, name: selectedUser.name })}
              >
                 Logout from all devices
              </button>
            </div>
            
            {userModalloading ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Loading user sessions...</div>
            ) : userSessions.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>No active sessions.</div>
            ) : (
              <div className="user-sessions-modal__list">
                {userSessions.map(usess => (
                  <div key={usess.id} className="user-sessions-card">
                    <div className="user-sessions-card__info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HiOutlineDevicePhoneMobile style={{ color: 'var(--color-text-tertiary)' }}/>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {usess.userAgent || 'Unknown Device'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                        ID: {usess.id.slice(0, 16)}... • Created: {formatDate(usess.createdAt)}
                      </span>
                    </div>
                    <button 
                      className="session-action-btn session-action-btn--delete"
                      onClick={() => confirmDelete('session', { id: usess.id, name: 'this attached session' })}
                    >
                      <HiOutlineTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {deleteTarget && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm">
              <div className="delete-confirm__icon"><HiOutlineExclamationTriangle /></div>
              <h3>Confirm Logout</h3>
              <p>
                Are you sure you want to force logout <strong>{deleteTarget.name}</strong>? 
                {deleteTarget.type === 'user_all' && " They will be signed out from ALL active devices immediately."}
              </p>
              <div className="delete-confirm__actions">
                <button className="delete-confirm__btn delete-confirm__btn--cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="delete-confirm__btn delete-confirm__btn--delete" onClick={executeDelete}>
                  Force Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Sessions;
