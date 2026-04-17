import { useState, useEffect, useMemo } from 'react';
import API from '../../api/axios';
import {
  HiOutlineUsers,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineUser,
} from 'react-icons/hi2';

const EnrolledUsers = ({ course, showNotification }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch enrolled users
  const fetchEnrolledUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get(`/courses/${course.id}/enrolled-users`);
      if (res.data.success) {
        setUsers(res.data.data || []);
      } else {
        setUsers(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch enrolled users');
      showNotification(
        err.response?.data?.message || 'Failed to fetch enrolled users',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (course?.id) {
      fetchEnrolledUsers();
    }
  }, [course]);

  // Filter by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter((enrollment) => {
      const user = enrollment.user || {};
      return (
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query)
      );
    });
  }, [users, searchQuery]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'enrolled-status-badge--active';
      case 'INACTIVE':
        return 'enrolled-status-badge--inactive';
      case 'SUSPENDED':
        return 'enrolled-status-badge--suspended';
      default:
        return 'enrolled-status-badge--default';
    }
  };

  return (
    <div className="enrolled-users">
      <div className="enrolled-users__header">
        <h3 className="enrolled-users__title">
          <HiOutlineUsers /> Enrolled Students
        </h3>
        <span className="enrolled-users__count">{users.length}</span>
      </div>

      {/* Search */}
      <div className="enrolled-users__search">
        <HiOutlineMagnifyingGlass className="enrolled-users__search-icon" />
        <input
          type="text"
          className="enrolled-users__search-input"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="enrolled-users__search-clear"
            onClick={() => setSearchQuery('')}
          >
            <HiOutlineXMark />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="enrolled-users__loading">
          <div className="skeleton-bar" style={{ width: '100%', height: '12px', marginBottom: '12px' }} />
          <div className="skeleton-bar" style={{ width: '100%', height: '12px', marginBottom: '12px' }} />
          <div className="skeleton-bar" style={{ width: '100%', height: '12px' }} />
        </div>
      ) : error ? (
        <div className="enrolled-users__error">
          <HiOutlineExclamationTriangle />
          <p>{error}</p>
          <button onClick={fetchEnrolledUsers}>Retry</button>
        </div>
      ) : users.length === 0 ? (
        <div className="enrolled-users__empty">
          <HiOutlineUsers />
          <p>No enrolled students yet</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="enrolled-users__empty">
          <HiOutlineMagnifyingGlass />
          <p>No students found matching your search</p>
        </div>
      ) : (
        <div className="enrolled-users__table-wrapper">
          <table className="enrolled-users__table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Enrolled Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((enrollment) => {
                const user = enrollment.user || {};
                return (
                  <tr key={enrollment.id} className="enrolled-users__row">
                    <td className="enrolled-users__cell enrolled-users__cell--name">
                      <div className="enrolled-users__cell-avatar">
                        <HiOutlineUser />
                      </div>
                      <span>{user.name || '—'}</span>
                    </td>
                    <td className="enrolled-users__cell">{user.email || '—'}</td>
                    <td className="enrolled-users__cell">{user.phone || '—'}</td>
                    <td className="enrolled-users__cell">
                      <span
                        className={`enrolled-status-badge ${getStatusBadgeClass(enrollment.status)}`}
                      >
                        {enrollment.status || '—'}
                      </span>
                    </td>
                    <td className="enrolled-users__cell enrolled-users__cell--date">
                      {formatDate(enrollment.enrolledAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EnrolledUsers;
