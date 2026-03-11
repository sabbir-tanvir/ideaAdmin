import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineXMark,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineShieldCheck,
  HiOutlineCalendar,
  HiOutlineExclamationTriangle,
  HiOutlineUsers,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineFunnel,
} from 'react-icons/hi2';
import '../styles/users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // View user detail
  const handleViewUser = async (userId) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const res = await API.get(`/users/${userId}`);
      if (res.data.success !== false) {
        setSelectedUser(res.data.data || res.data);
      }
    } catch (err) {
      showNotification('Failed to load user details', 'error');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    try {
      setDeleteLoading(true);
      await API.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
      showNotification('User deleted successfully');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter & search
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(user.id).includes(searchQuery);

      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Get unique roles for filter
  const roles = useMemo(() => {
    const set = new Set(users.map((u) => u.role));
    return ['ALL', ...Array.from(set)];
  }, [users]);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Role badge color
  const getRoleBadgeClass = (role) => {
    switch (role?.toUpperCase()) {
      case 'SUPERADMIN':
        return 'role-badge--superadmin';
      case 'ADMIN':
        return 'role-badge--admin';
      case 'STUDENT':
        return 'role-badge--student';
      default:
        return 'role-badge--default';
    }
  };

  return (
    <div className="users-page">
      {/* Notification Toast */}
      {notification && (
        <div className={`toast toast--${notification.type}`}>
          {notification.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamationTriangle />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="users-page__header">
        <div>
          <h1 className="users-page__title">
            <HiOutlineUsers className="users-page__title-icon" />
            Users Management
          </h1>
          <p className="users-page__subtitle">
            {users.length} total users registered on the platform
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="users-toolbar">
        <div className="users-toolbar__search">
          <HiOutlineMagnifyingGlass className="users-toolbar__search-icon" />
          <input
            type="text"
            className="users-toolbar__search-input"
            placeholder="Search by name, email, phone, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="users-search-input"
          />
          {searchQuery && (
            <button
              className="users-toolbar__search-clear"
              onClick={() => setSearchQuery('')}
            >
              <HiOutlineXMark />
            </button>
          )}
        </div>

        <div className="users-toolbar__filters">
          <HiOutlineFunnel className="users-toolbar__filter-icon" />
          {roles.map((role) => (
            <button
              key={role}
              className={`users-toolbar__filter-btn ${roleFilter === role ? 'users-toolbar__filter-btn--active' : ''}`}
              onClick={() => setRoleFilter(role)}
            >
              {role === 'ALL' ? 'All' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="users-table-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="users-table-skeleton__row">
              <div className="skeleton-bar" style={{ width: '40px' }} />
              <div className="skeleton-bar" style={{ width: '120px' }} />
              <div className="skeleton-bar" style={{ width: '180px' }} />
              <div className="skeleton-bar" style={{ width: '80px' }} />
              <div className="skeleton-bar" style={{ width: '60px' }} />
              <div className="skeleton-bar" style={{ width: '100px' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="users-error">
          <HiOutlineExclamationTriangle />
          <p>{error}</p>
          <button onClick={fetchUsers}>Retry</button>
        </div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Email Verified</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="users-table__empty">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="users-table__row">
                    <td className="users-table__id">#{user.id}</td>
                    <td>
                      <div className="users-table__user">
                        <div className="users-table__avatar">
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="users-table__name">{user.name}</span>
                      </div>
                    </td>
                    <td className="users-table__email">{user.email}</td>
                    <td className="users-table__phone">{user.phone || '—'}</td>
                    <td>
                      <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.isEmailConfirmed ? (
                        <span className="verified-badge verified-badge--yes">
                          <HiOutlineCheckCircle /> Verified
                        </span>
                      ) : (
                        <span className="verified-badge verified-badge--no">
                          <HiOutlineXCircle /> No
                        </span>
                      )}
                    </td>
                    <td className="users-table__date">{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="users-table__actions">
                        <button
                          className="action-btn action-btn--view"
                          onClick={() => handleViewUser(user.id)}
                          title="View details"
                        >
                          <HiOutlineEye />
                        </button>
                        <button
                          className="action-btn action-btn--delete"
                          onClick={() => setDeleteConfirm(user)}
                          title="Delete user"
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Results count */}
      {!loading && !error && (
        <div className="users-page__footer">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      )}

      {/* ===== User Detail Modal ===== */}
      {showDetailModal && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal__close"
              onClick={() => setShowDetailModal(false)}
            >
              <HiOutlineXMark />
            </button>

            {detailLoading ? (
              <div className="modal__loading">
                <div className="loading-spinner" />
                <p>Loading user details...</p>
              </div>
            ) : selectedUser ? (
              <>
                <div className="modal__header">
                  <div className="modal__avatar">
                    {selectedUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h2 className="modal__name">{selectedUser.name}</h2>
                    <span className={`role-badge ${getRoleBadgeClass(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                </div>

                <div className="modal__details">
                  <div className="modal__detail-item">
                    <HiOutlineEnvelope className="modal__detail-icon" />
                    <div>
                      <label>Email</label>
                      <p>{selectedUser.email}</p>
                    </div>
                  </div>
                  <div className="modal__detail-item">
                    <HiOutlinePhone className="modal__detail-icon" />
                    <div>
                      <label>Phone</label>
                      <p>{selectedUser.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="modal__detail-item">
                    <HiOutlineShieldCheck className="modal__detail-icon" />
                    <div>
                      <label>Email Verified</label>
                      <p>{selectedUser.isEmailConfirmed ? 'Yes ✅' : 'No ❌'}</p>
                    </div>
                  </div>
                  <div className="modal__detail-item">
                    <HiOutlineCalendar className="modal__detail-icon" />
                    <div>
                      <label>Joined</label>
                      <p>{formatDate(selectedUser.createdAt)}</p>
                    </div>
                  </div>
                  <div className="modal__detail-item">
                    <HiOutlineCalendar className="modal__detail-icon" />
                    <div>
                      <label>Last Updated</label>
                      <p>{formatDate(selectedUser.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleteLoading && setDeleteConfirm(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm">
              <div className="delete-confirm__icon">
                <HiOutlineExclamationTriangle />
              </div>
              <h3>Delete User</h3>
              <p>
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                This action cannot be undone.
              </p>
              <div className="delete-confirm__actions">
                <button
                  className="delete-confirm__btn delete-confirm__btn--cancel"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  className="delete-confirm__btn delete-confirm__btn--delete"
                  onClick={() => handleDeleteUser(deleteConfirm.id)}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? <span className="login__spinner" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
