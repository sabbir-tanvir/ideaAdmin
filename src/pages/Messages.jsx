import { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  HiOutlineEnvelope,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiChevronLeft,
  HiChevronRight
} from 'react-icons/hi2';
import '../styles/messages.css';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Modals state
  const [viewMessage, setViewMessage] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch messages
  const fetchMessages = async (currentPage) => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get(`/messages?page=${currentPage}&limit=${limit}`);
      
      if (res.data && res.data.success) {
        setMessages(res.data.data);
        setTotalPages(res.data.totalPages || 1);
        setTotalItems(res.data.total || 0);
        setPage(res.data.page || currentPage);
      } else {
         setMessages(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(page);
  }, [page]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Delete message
  const handleDelete = async (messageId) => {
    try {
      setDeleteLoading(true);
      await API.delete(`/messages/${messageId}`);
      
      // Update locally
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      setTotalItems((prev) => prev - 1);
      
      // If we deleted the last item on current page and we're not on page 1, go to previous page
      if (messages.length === 1 && page > 1) {
        setPage(page - 1);
      }
      
      setDeleteConfirm(null);
      showNotification('Message deleted successfully');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete message', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="messages-page">
      {/* Notification Toast */}
      {notification && (
        <div className={`toast toast--${notification.type}`}>
          {notification.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamationTriangle />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="messages-page__header">
        <div>
          <h1 className="messages-page__title">
            <HiOutlineEnvelope className="messages-page__title-icon" />
            Messages
          </h1>
          <p className="messages-page__subtitle">
            User inquiries from the contact form
          </p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="messages-table-skeleton">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="messages-table-skeleton__row">
              <div className="skeleton-bar" style={{ width: '40px' }} />
              <div className="skeleton-bar" style={{ width: '150px' }} />
              <div className="skeleton-bar" style={{ width: '180px' }} />
              <div className="skeleton-bar" style={{ width: '150px' }} />
              <div className="skeleton-bar" style={{ width: '200px' }} />
              <div className="skeleton-bar" style={{ width: '60px' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="messages-error">
          <HiOutlineExclamationTriangle />
          <p>{error}</p>
          <button onClick={() => fetchMessages(page)} className="btn-secondary">Retry</button>
        </div>
      ) : (
        <>
          <div className="messages-table-wrapper">
            <table className="messages-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Contact Info</th>
                  <th>Subject</th>
                  <th>Message Preview</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="messages-table__empty">
                      No messages found.
                    </td>
                  </tr>
                ) : (
                  messages.map((msg) => (
                    <tr key={msg.id} className="messages-table__row">
                      <td className="messages-table__id">#{msg.id}</td>
                      <td className="messages-table__name">{msg.name}</td>
                      <td className="messages-table__email">
                        <div>{msg.email}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>{msg.phone}</div>
                      </td>
                      <td className="messages-table__subject">{msg.subject || '—'}</td>
                      <td className="messages-table__message" title={msg.message}>
                        {msg.message}
                      </td>
                      <td className="messages-table__date">{formatDate(msg.createdAt)}</td>
                      <td>
                        <div className="messages-table__actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => setViewMessage(msg)}
                            title="View Message"
                          >
                            <HiOutlineEye />
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => setDeleteConfirm(msg)}
                            title="Delete Message"
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="messages-pagination">
              <div className="messages-pagination__info">
                Showing {messages.length} of {totalItems} items
              </div>
              <div className="messages-pagination__controls">
                <button 
                  className="messages-pagination__btn"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <HiChevronLeft /> Prev
                </button>
                <div style={{ display: 'flex', alignItems: 'center', margin: '0 8px', fontSize: '0.875rem' }}>
                  Page {page} of {totalPages}
                </div>
                <button 
                  className="messages-pagination__btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next <HiChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== View Modal ===== */}
      {viewMessage && (
        <div className="modal-overlay" onClick={() => setViewMessage(null)}>
          <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal__close"
              onClick={() => setViewMessage(null)}
            >
              <HiOutlineXMark />
            </button>
            <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineEnvelope style={{ color: 'var(--color-accent)' }} /> 
              Message Details
            </h2>
            
            <div className="message-detail">
              <div className="message-detail__row">
                <div className="message-detail__col">
                  <div className="message-detail__label">From</div>
                  <div className="message-detail__value">{viewMessage.name}</div>
                </div>
                <div className="message-detail__col">
                  <div className="message-detail__label">Received</div>
                  <div className="message-detail__value">{formatDate(viewMessage.createdAt)}</div>
                </div>
              </div>

              <div className="message-detail__row">
                <div className="message-detail__col">
                  <div className="message-detail__label">Email</div>
                  <div className="message-detail__value">
                    <a href={`mailto:${viewMessage.email}`} className="message-detail__valuea">
                      {viewMessage.email}
                    </a>
                  </div>
                </div>
                <div className="message-detail__col">
                  <div className="message-detail__label">Phone</div>
                  <div className="message-detail__value">
                    <a href={`tel:${viewMessage.phone}`} className="message-detail__valuea">
                      {viewMessage.phone || '—'}
                    </a>
                  </div>
                </div>
              </div>

              <div className="message-detail__row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <div className="message-detail__col">
                  <div className="message-detail__label">Subject</div>
                  <div className="message-detail__value">{viewMessage.subject || '—'}</div>
                </div>
              </div>

              <div className="message-detail__body">
                {viewMessage.message}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setViewMessage(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleteLoading && setDeleteConfirm(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', color: 'var(--color-danger)', marginBottom: '16px' }}>
                <HiOutlineExclamationTriangle />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Delete Message</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                Are you sure you want to delete this message from <strong>{deleteConfirm.name}</strong>?
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{ background: 'var(--color-danger)' }}
                  onClick={() => handleDelete(deleteConfirm.id)}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
