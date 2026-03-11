import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import '../styles/payments.css';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  const [notification, setNotification] = useState(null);

  // Fetch all payments
  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/payments');
      if (res.data.success) {
        setPayments(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Open status modal
  const handleEditStatus = (payment) => {
    setStatusConfirm(payment);
    setNewStatus(payment.status);
    setShowStatusModal(true);
  };

  // Update payment status
  const handleUpdateStatus = async (paymentId) => {
    try {
      setStatusUpdating(true);
      const res = await API.put(`/payments/${paymentId}/status`, { status: newStatus });
      setPayments((prev) => 
        prev.map((p) => p.id === paymentId ? { ...p, status: newStatus } : p)
      );
      setShowStatusModal(false);
      setStatusConfirm(null);
      showNotification('Payment status updated successfully');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Filter & search
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch =
        !searchQuery ||
        payment.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(payment.id).includes(searchQuery);

      return matchesSearch;
    });
  }, [payments, searchQuery]);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'APPROVED':
        return 'status-badge--success';
      case 'PENDING':
        return 'status-badge--pending';
      case 'FAILED':
      case 'REJECTED':
        return 'status-badge--failed';
      default:
        return 'status-badge--default';
    }
  };

  return (
    <div className="payments-page">
      {/* Notification Toast */}
      {notification && (
        <div className={`toast toast--${notification.type}`}>
          {notification.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamationTriangle />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="payments-page__header">
        <div>
          <h1 className="payments-page__title">
            <HiOutlineDocumentText className="payments-page__title-icon" />
            Payments Management
          </h1>
          <p className="payments-page__subtitle">
            {payments.length} total payments retrieved
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="payments-toolbar">
        <div className="payments-toolbar__search">
          <HiOutlineMagnifyingGlass className="payments-toolbar__search-icon" />
          <input
            type="text"
            className="payments-toolbar__search-input"
            placeholder="Search by name, email, transaction ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="payments-search-input"
          />
          {searchQuery && (
            <button
              className="payments-toolbar__search-clear"
              onClick={() => setSearchQuery('')}
            >
              <HiOutlineXMark />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="payments-table-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="payments-table-skeleton__row">
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
        <div className="payments-error">
          <HiOutlineExclamationTriangle />
          <p>{error}</p>
          <button onClick={fetchPayments}>Retry</button>
        </div>
      ) : (
        <div className="payments-table-wrapper">
          <table className="payments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User Details</th>
                <th>Course Details</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Transaction ID</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="payments-table__empty">
                    No payments found matching your search.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="payments-table__row">
                    <td className="payments-table__id">#{payment.id}</td>
                    <td>
                      <div className="payments-table__user">
                        <span className="payments-table__name">{payment.user?.name || '—'}</span>
                        <span className="payments-table__email">{payment.user?.email || '—'}</span>
                      </div>
                    </td>
                    <td className="payments-table__course">
                      {payment.course?.title || `Course #${payment.courseId}`}
                    </td>
                    <td className="payments-table__amount">
                      ৳{payment.amount}
                    </td>
                    <td className="payments-table__method">
                      {payment.paymentMethod || '—'}
                    </td>
                    <td className="payments-table__txn">
                      {payment.transactionId || '—'}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="payments-table__date">{formatDate(payment.createdAt)}</td>
                    <td>
                      <div className="payments-table__actions">
                        <button
                          className="action-btn action-btn--edit"
                          onClick={() => handleEditStatus(payment)}
                          title="Update Status"
                        >
                          <HiOutlinePencilSquare />
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
        <div className="payments-page__footer">
          Showing {filteredPayments.length} of {payments.length} payments
        </div>
      )}

      {/* ===== Update Status Modal ===== */}
      {showStatusModal && statusConfirm && (
        <div className="modal-overlay" onClick={() => !statusUpdating && setShowStatusModal(false)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="status-confirm">
              <h3>Update Payment Status</h3>
              <p>
                Update the status for Transaction <strong>{statusConfirm.transactionId}</strong>
              </p>
              
              <div className="status-confirm__form">
                <label>Select Status</label>
                <select 
                  value={newStatus} 
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="status-confirm__select"
                >
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div className="status-confirm__actions">
                <button
                  className="status-confirm__btn status-confirm__btn--cancel"
                  onClick={() => setShowStatusModal(false)}
                  disabled={statusUpdating}
                >
                  Cancel
                </button>
                <button
                  className="status-confirm__btn status-confirm__btn--update"
                  onClick={() => handleUpdateStatus(statusConfirm.id)}
                  disabled={statusUpdating || newStatus === statusConfirm.status}
                >
                  {statusUpdating ? <span className="login__spinner" /> : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
