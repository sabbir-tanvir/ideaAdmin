import { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  HiOutlineBellAlert,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiCheckCircle,
  HiOutlineExclamationTriangle
} from 'react-icons/hi2';
import '../styles/notices.css';

const NoticeCategory = ['Urgent', 'General', 'Course Update', 'Event'];

const getCategoryBadgeClass = (cat) => {
  switch (cat) {
    case 'Urgent': return 'notice-badge--urgent';
    case 'Course Update': return 'notice-badge--courseupdate';
    case 'Event': return 'notice-badge--event';
    default: return 'notice-badge--general';
  }
};

const Notices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const limit = 12;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'General',
    isPinned: false,
    date: new Date().toISOString().slice(0, 16)
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notification, setNotification] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchNotices();
  }, [page, category]);

  const fetchNotices = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.append('page', page);
      query.append('limit', limit);
      if (search) query.append('search', search);
      if (category) query.append('category', category);

      // Using the user's provided API route, relative to the axios baseURL
      const res = await API.get(`/notices?${query.toString()}`);
      setNotices(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch notices.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchNotices();
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: 'General',
      isPinned: false,
      date: new Date().toISOString().slice(0, 16)
    });
    setShowModal(true);
  };

  const openEditModal = (notice) => {
    setModalMode('edit');
    setFormData({
      id: notice.id,
      title: notice.title || '',
      excerpt: notice.excerpt || '',
      content: notice.content || '',
      category: notice.category || 'General',
      isPinned: notice.isPinned || false,
      date: notice.date ? new Date(notice.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    
    // Format date properly to ISO 8601
    const payload = { ...formData, date: new Date(formData.date).toISOString() };

    try {
      if (modalMode === 'add') {
        await API.post('/notices', payload);
        showNotification('Notice created successfully!');
      } else {
        await API.put(`/notices/${formData.id}`, payload);
        showNotification('Notice updated successfully!');
      }
      setShowModal(false);
      fetchNotices();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save notice', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const confirmDelete = (notice) => {
    setDeleteTarget(notice);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setSubmitLoading(true);
    try {
      await API.delete(`/notices/${deleteTarget.id}`);
      showNotification('Notice deleted successfully!');
      setDeleteTarget(null);
      fetchNotices();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete notice', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="notices-page">
      {notification && (
        <div className={`notification notification--${notification.type}`}>
          {notification.type === 'success' ? <HiCheckCircle /> : <HiOutlineExclamationTriangle />}
          <span>{notification.msg}</span>
        </div>
      )}

      <div className="notices-page__header">
        <div>
          <h1 className="notices-page__title">
            <HiOutlineBellAlert className="notices-page__title-icon" /> Notice Board
          </h1>
          <p className="notices-page__subtitle">Manage announcements and important updates.</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <HiOutlinePlus /> Add Notice
        </button>
      </div>

      <div className="notices-toolbar">
        <div className="notices-toolbar__left">
          <select
            className="notices-toolbar__filter"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {NoticeCategory.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <form onSubmit={handleSearch} className="notices-toolbar__search">
            <HiOutlineMagnifyingGlass className="notices-toolbar__search-icon" />
            <input
              type="text"
              placeholder="Search notices..."
              className="notices-toolbar__search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>
      </div>

      {loading && notices.length === 0 ? (
        <div className="events-table-skeleton">
          <p>Loading notices...</p>
        </div>
      ) : error ? (
        <div className="events-error">
          <HiOutlineExclamationTriangle />
          <p>{error}</p>
          <button className="btn-secondary" onClick={fetchNotices}>Retry</button>
        </div>
      ) : notices.length === 0 ? (
        <div className="events-table-wrapper" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-tertiary)' }}>No notices found.</p>
        </div>
      ) : (
        <>
          <div className="notices-grid">
            {notices.map((notice) => (
              <div key={notice.id} className={`notice-card ${notice.isPinned ? 'notice-card--pinned' : ''}`}>
                <div className="notice-card__header">
                  <div className="notice-card__badges">
                    <span className={`notice-badge ${getCategoryBadgeClass(notice.category)}`}>
                      {notice.category}
                    </span>
                    {notice.isPinned && (
                      <span className="notice-badge notice-badge--pinned">📌 Pinned</span>
                    )}
                  </div>
                  <span className="notice-card__date">
                    {new Date(notice.date || notice.createdAt).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                
                <h3 className="notice-card__title">{notice.title}</h3>
                <p className="notice-card__excerpt">{notice.excerpt}</p>
                
                <div className="notice-card__footer">
                  <button className="action-btn action-btn--edit" onClick={() => openEditModal(notice)} title="Edit">
                    <HiOutlinePencilSquare />
                  </button>
                  <button className="action-btn action-btn--delete" onClick={() => confirmDelete(notice)} title="Delete">
                    <HiOutlineTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="btn-secondary" 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button 
                className="btn-secondary" 
                disabled={page >= totalPages} 
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !submitLoading && setShowModal(false)}>
          <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowModal(false)} disabled={submitLoading}>
              <HiOutlineXMark />
            </button>
            <h2 className="modal__title">{modalMode === 'add' ? 'Add New Notice' : 'Edit Notice'}</h2>
            
            <form className="event-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter notice title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Excerpt (Short Description) *</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="A short summary of the notice"
                  required
                />
              </div>

              <div className="form-group">
                <label>Full Content</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Detailed content of the notice (optional)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    {NoticeCategory.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                />
                <span>Pin this notice to top</span>
              </label>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Saving...' : (modalMode === 'add' ? 'Create Notice' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !submitLoading && setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm" style={{ textAlign: 'center' }}>
              <div className="delete-confirm__icon" style={{ fontSize: '3rem', color: 'var(--color-danger)', marginBottom: '16px' }}>
                <HiOutlineTrash />
              </div>
              <h3 style={{ marginBottom: '8px' }}>Delete Notice</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This action cannot be undone.
              </p>
              <div className="form-actions" style={{ justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={submitLoading}>Cancel</button>
                <button className="btn-primary" style={{ background: 'var(--color-danger)' }} onClick={executeDelete} disabled={submitLoading}>
                  {submitLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notices;
