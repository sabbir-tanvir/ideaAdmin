import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiPlus
} from 'react-icons/hi2';
import '../styles/events.css';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showEventModal, setShowEventModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eventForm, setEventForm] = useState({
    id: null,
    title: '',
    date: '',
    location: '',
    attendees: '',
    registrationUrl: '',
    active: true
  });

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [notification, setNotification] = useState(null);

  // Fetch all events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/events/all');
      if (res.data.success) {
        setEvents(res.data.data);
      } else {
         // fallback in case data structure differs slightly
         setEvents(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Open modal for Create
  const handleCreateNew = () => {
    setIsEditing(false);
    setEventForm({
      id: null,
      title: '',
      date: '',
      location: '',
      attendees: '',
      registrationUrl: '',
      active: true
    });
    setShowEventModal(true);
  };

  // Open modal for Edit
  const handleEdit = (event) => {
    setIsEditing(true);
    setEventForm({
      id: event.id,
      title: event.title || '',
      date: event.date || '',
      location: event.location || '',
      attendees: event.attendees || '',
      registrationUrl: event.registrationUrl || '',
      active: event.active !== undefined ? event.active : true
    });
    setShowEventModal(true);
  };

  // Handle Input Change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEventForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Submit Form (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const payload = {
        title: eventForm.title,
        date: eventForm.date,
        location: eventForm.location,
        attendees: eventForm.attendees,
        registrationUrl: eventForm.registrationUrl,
        active: eventForm.active
      };

      if (isEditing) {
        await API.put(`/events/${eventForm.id}`, payload);
        showNotification('Event updated successfully');
        // Refresh local list
        setEvents((prev) => 
          prev.map((ev) => ev.id === eventForm.id ? { ...ev, ...payload } : ev)
        );
      } else {
        const res = await API.post('/events', payload);
        showNotification('Event created successfully');
        // If API returns created event in res.data or res.data.data
        const newEvent = res.data?.data || res.data;
        if (newEvent && newEvent.id) {
            setEvents((prev) => [newEvent, ...prev]);
        } else {
            fetchEvents(); // Fallback if full object isn't returned
        }
      }
      setShowEventModal(false);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete event
  const handleDelete = async (eventId) => {
    try {
      setDeleteLoading(true);
      await API.delete(`/events/${eventId}`);
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      setDeleteConfirm(null);
      showNotification('Event deleted successfully');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete event', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Toggle Active Status
  const toggleActive = async (event) => {
    try {
      // Use the PUT endpoint to toggle active status. 
      // Assuming we need to send the whole object or just the fields being updated.
      // We'll send just the toggled active status, but the API may require title.
      // Safest is to send the whole current event with toggled active status.
      const payload = { ...event, active: !event.active };
      await API.put(`/events/${event.id}`, payload);
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, active: !e.active } : e))
      );
      showNotification(`Event marked as ${event.active ? 'Inactive' : 'Active'} successfully`);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // Filter & search
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !searchQuery ||
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(event.id).includes(searchQuery);

      return matchesSearch;
    });
  }, [events, searchQuery]);

  return (
    <div className="events-page">
      {/* Notification Toast */}
      {notification && (
        <div className={`toast toast--${notification.type}`}>
          {notification.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamationTriangle />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="events-page__header">
        <div>
          <h1 className="events-page__title">
            <HiOutlineCalendar className="events-page__title-icon" />
            Events Management
          </h1>
          <p className="events-page__subtitle">
            Manage upcoming and past events
          </p>
        </div>
        <button className="btn-primary" onClick={handleCreateNew}>
          <HiPlus /> Add New Event
        </button>
      </div>

      {/* Toolbar */}
      <div className="events-toolbar">
        <div className="events-toolbar__search">
          <HiOutlineMagnifyingGlass className="events-toolbar__search-icon" />
          <input
            type="text"
            className="events-toolbar__search-input"
            placeholder="Search by title, location, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="events-toolbar__search-clear"
              onClick={() => setSearchQuery('')}
            >
              <HiOutlineXMark />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="events-table-skeleton">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="events-table-skeleton__row">
              <div className="skeleton-bar" style={{ width: '40px' }} />
              <div className="skeleton-bar" style={{ width: '200px' }} />
              <div className="skeleton-bar" style={{ width: '120px' }} />
              <div className="skeleton-bar" style={{ width: '100px' }} />
              <div className="skeleton-bar" style={{ width: '80px' }} />
              <div className="skeleton-bar" style={{ width: '60px' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="events-error">
          <HiOutlineExclamationTriangle />
          <p>{error}</p>
          <button onClick={fetchEvents} className="btn-secondary">Retry</button>
        </div>
      ) : (
        <div className="events-table-wrapper">
          <table className="events-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Date</th>
                <th>Location</th>
                <th>Attendees</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="events-table__empty">
                    No events found matching your search.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="events-table__row">
                    <td className="events-table__id">#{event.id}</td>
                    <td className="events-table__title" title={event.title}>
                      {event.title}
                    </td>
                    <td className="events-table__date">{event.date}</td>
                    <td className="events-table__location">{event.location}</td>
                    <td>{event.attendees || '—'}</td>
                    <td>
                      <span 
                        className={`status-badge ${event.active ? 'status-badge--active' : 'status-badge--inactive'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleActive(event)}
                        title={`Click to mark as ${event.active ? 'Inactive' : 'Active'}`}
                      >
                        {event.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="events-table__actions">
                        <button
                          className="action-btn action-btn--edit"
                          onClick={() => handleEdit(event)}
                          title="Edit Event"
                        >
                          <HiOutlinePencilSquare />
                        </button>
                        <button
                          className="action-btn action-btn--delete"
                          onClick={() => setDeleteConfirm(event)}
                          title="Delete Event"
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
        <div className="events-page__footer">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      )}

      {/* ===== Create / Edit Modal ===== */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowEventModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal__close"
              onClick={() => !submitting && setShowEventModal(false)}
            >
              <HiOutlineXMark />
            </button>
            
            <h2 style={{ marginBottom: '16px' }}>{isEditing ? 'Edit Event' : 'Create New Event'}</h2>
            
            <form onSubmit={handleSubmit} className="event-form">
              <div className="form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  name="title" 
                  value={eventForm.title} 
                  onChange={handleInputChange} 
                  className="form-input" 
                  required 
                  placeholder="e.g., Rise And Thrive – Nolka"
                />
              </div>

              <div className="form-group">
                <label>Date (Text formatting)</label>
                <input 
                  type="text" 
                  name="date" 
                  value={eventForm.date} 
                  onChange={handleInputChange} 
                  className="form-input" 
                  required 
                  placeholder="e.g., ১৫ নভেম্বর ২০২৪"
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  name="location" 
                  value={eventForm.location} 
                  onChange={handleInputChange} 
                  className="form-input" 
                  required 
                  placeholder="e.g., বরিশাল"
                />
              </div>

              <div className="form-group">
                <label>Attendees Info</label>
                <input 
                  type="text" 
                  name="attendees" 
                  value={eventForm.attendees} 
                  onChange={handleInputChange} 
                  className="form-input" 
                  placeholder="e.g., 250+ অংশগ্রহণকারী"
                />
              </div>

              <div className="form-group">
                <label>Registration URL</label>
                <input 
                  type="url" 
                  name="registrationUrl" 
                  value={eventForm.registrationUrl} 
                  onChange={handleInputChange} 
                  className="form-input" 
                  placeholder="https://example.com/register"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-group">
                  <input 
                    type="checkbox" 
                    name="active" 
                    checked={eventForm.active} 
                    onChange={handleInputChange} 
                  />
                  <span>Active Event</span>
                </label>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowEventModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : (isEditing ? 'Update Event' : 'Create Event')}
                </button>
              </div>
            </form>
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
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Delete Event</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                Are you sure you want to delete <strong>{deleteConfirm.title}</strong>?
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

export default Events;
