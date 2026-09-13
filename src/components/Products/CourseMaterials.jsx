import { useState, useEffect, useMemo, useRef } from 'react';
import API from '../../api/axios';
import {
  HiOutlineFolderArrowDown,
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineArrowDownTray,
  HiOutlineArrowTopRightOnSquare,
  HiOutlinePaperClip,
  HiOutlineDocumentText,
  HiOutlineArchiveBox,
  HiOutlineGlobeAlt,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath
} from 'react-icons/hi2';

// Format file size helper
const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

// URL resolver helper for backend uploads
const resolveFullUrl = (path) => {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/');
  if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('blob:')) {
    return normalized;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.idealessons.com/api/v1';
  const serverOrigin = apiBase.replace(/\/api(\/v\d+)?\/?$/, '');
  return `${serverOrigin}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

// Icon resolver based on mimeType, fileName or type
const getMaterialIcon = (item) => {
  if (item.type === 'LINK') {
    return {
      icon: <HiOutlineGlobeAlt />,
      colorClass: 'material-icon--link',
      label: 'LINK'
    };
  }

  const name = (item.fileName || item.fileUrl || '').toLowerCase();
  const mime = (item.mimeType || '').toLowerCase();

  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return {
      icon: <HiOutlineDocumentText />,
      colorClass: 'material-icon--pdf',
      label: 'PDF'
    };
  }
  if (
    mime.includes('zip') ||
    mime.includes('rar') ||
    mime.includes('tar') ||
    mime.includes('7z') ||
    name.endsWith('.zip') ||
    name.endsWith('.rar') ||
    name.endsWith('.tar.gz')
  ) {
    return {
      icon: <HiOutlineArchiveBox />,
      colorClass: 'material-icon--archive',
      label: 'ZIP'
    };
  }
  if (
    mime.includes('word') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx') ||
    name.endsWith('.txt') ||
    name.endsWith('.rtf')
  ) {
    return {
      icon: <HiOutlineDocumentText />,
      colorClass: 'material-icon--doc',
      label: 'DOC'
    };
  }

  return {
    icon: <HiOutlinePaperClip />,
    colorClass: 'material-icon--file',
    label: 'FILE'
  };
};

const CourseMaterials = ({ course, showNotification }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'FILE' | 'LINK'

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [saving, setSaving] = useState(false);

  // Form State
  const initialFormState = {
    id: null,
    title: '',
    type: 'FILE', // 'FILE' | 'LINK'
    externalUrl: '',
    description: '',
    isFree: false,
    sortOrder: 0,
    file: null,
    existingFileName: '',
    existingFileUrl: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    material: null,
    deleting: false
  });

  // Fetch Materials
  const fetchMaterials = async () => {
    if (!course?.id) return;
    try {
      setLoading(true);
      setError('');
      // Try admin route first, fall back to standard route if needed
      let res;
      try {
        res = await API.get(`/courses/${course.id}/materials/admin`);
      } catch (err) {
        if (err.response?.status === 404) {
          res = await API.get(`/courses/${course.id}/materials`);
        } else {
          throw err;
        }
      }

      if (res?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        // Sort by sortOrder ascending, then createdAt descending
        list.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        setMaterials(list);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch course materials';
      setError(msg);
      if (showNotification) showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [course?.id]);

  // Filtered List
  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      // Type filter
      if (typeFilter !== 'ALL' && item.type !== typeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchFile = item.fileName?.toLowerCase().includes(q);
        const matchUrl = item.externalUrl?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchFile || matchUrl;
      }
      return true;
    });
  }, [materials, typeFilter, searchQuery]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setModalMode('add');
    // Calculate default sort order: max order + 1
    const maxOrder = materials.reduce((max, m) => Math.max(max, m.sortOrder || 0), 0);
    setFormData({
      ...initialFormState,
      sortOrder: maxOrder + 1
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (material) => {
    setModalMode('edit');
    setFormData({
      id: material.id,
      title: material.title || '',
      type: material.type || 'FILE',
      externalUrl: material.externalUrl || '',
      description: material.description || '',
      isFree: Boolean(material.isFree),
      sortOrder: material.sortOrder ?? 0,
      file: null,
      existingFileName: material.fileName || (material.fileUrl ? material.fileUrl.split('/').pop() : ''),
      existingFileUrl: material.fileUrl || ''
    });
    setShowModal(true);
  };

  // Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        if (showNotification) showNotification('File size exceeds the 100MB limit', 'error');
        return;
      }
      setFormData((prev) => ({ ...prev, file }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        if (showNotification) showNotification('File size exceeds the 100MB limit', 'error');
        return;
      }
      setFormData((prev) => ({ ...prev, file }));
    }
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      if (showNotification) showNotification('Please enter a title for the material', 'error');
      return;
    }

    if (formData.type === 'FILE') {
      if (modalMode === 'add' && !formData.file) {
        if (showNotification) showNotification('Please select a file to upload', 'error');
        return;
      }
    } else if (formData.type === 'LINK') {
      if (!formData.externalUrl.trim()) {
        if (showNotification) showNotification('Please provide a valid external URL', 'error');
        return;
      }
    }

    try {
      setSaving(true);

      if (formData.type === 'FILE') {
        const fd = new FormData();
        fd.append('title', formData.title.trim());
        fd.append('type', 'FILE');
        fd.append('description', formData.description?.trim() || '');
        fd.append('isFree', String(Boolean(formData.isFree)));
        fd.append('sortOrder', String(formData.sortOrder ?? 0));
        if (formData.file) {
          fd.append('file', formData.file);
        }

        if (modalMode === 'add') {
          await API.post(`/courses/${course.id}/materials`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (showNotification) showNotification('Course material uploaded successfully', 'success');
        } else {
          await API.put(`/courses/materials/${formData.id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (showNotification) showNotification('Course material updated successfully', 'success');
        }
      } else {
        // LINK type
        const payload = {
          title: formData.title.trim(),
          type: 'LINK',
          externalUrl: formData.externalUrl.trim(),
          description: formData.description?.trim() || '',
          isFree: Boolean(formData.isFree),
          sortOrder: Number(formData.sortOrder) || 0
        };

        if (modalMode === 'add') {
          await API.post(`/courses/${course.id}/materials`, payload);
          if (showNotification) showNotification('External link material added successfully', 'success');
        } else {
          await API.put(`/courses/materials/${formData.id}`, payload);
          if (showNotification) showNotification('External link material updated successfully', 'success');
        }
      }

      setShowModal(false);
      fetchMaterials();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save course material';
      if (showNotification) showNotification(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteModal.material?.id) return;
    try {
      setDeleteModal((prev) => ({ ...prev, deleting: true }));
      await API.delete(`/courses/materials/${deleteModal.material.id}`);
      if (showNotification) showNotification('Course material deleted successfully', 'success');
      setDeleteModal({ open: false, material: null, deleting: false });
      fetchMaterials();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete course material';
      if (showNotification) showNotification(msg, 'error');
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  return (
    <div className="course-materials">
      {/* Header & Controls */}
      <div className="course-materials__header">
        <div className="course-materials__title-group">
          <h3 className="course-materials__title">
            <HiOutlineFolderArrowDown /> Course Materials
          </h3>
          <span className="course-materials__count-badge">
            {materials.length} {materials.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="course-materials__actions">
          <button className="products-btn products-btn--primary" onClick={handleOpenAdd}>
            <HiOutlinePlus /> Add Material
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="course-materials__toolbar">
        <div className="course-materials__search">
          <HiOutlineMagnifyingGlass className="course-materials__search-icon" />
          <input
            type="text"
            className="course-materials__search-input"
            placeholder="Search materials by title, description, or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="course-materials__search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <HiOutlineXMark />
            </button>
          )}
        </div>

        <div className="course-materials__type-pills">
          <button
            className={`course-materials__type-pill ${typeFilter === 'ALL' ? 'course-materials__type-pill--active' : ''}`}
            onClick={() => setTypeFilter('ALL')}
          >
            All ({materials.length})
          </button>
          <button
            className={`course-materials__type-pill ${typeFilter === 'FILE' ? 'course-materials__type-pill--active' : ''}`}
            onClick={() => setTypeFilter('FILE')}
          >
            Files ({materials.filter((m) => m.type === 'FILE').length})
          </button>
          <button
            className={`course-materials__type-pill ${typeFilter === 'LINK' ? 'course-materials__type-pill--active' : ''}`}
            onClick={() => setTypeFilter('LINK')}
          >
            Links ({materials.filter((m) => m.type === 'LINK').length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="course-materials__loading">
          <HiOutlineArrowPath className="spinner" />
          <p>Loading course materials...</p>
        </div>
      ) : error ? (
        <div className="course-materials__error">
          <HiOutlineExclamationTriangle />
          <p>{error}</p>
          <button onClick={fetchMaterials}>Retry</button>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="course-materials__empty">
          <HiOutlineFolderArrowDown />
          <h4>{searchQuery || typeFilter !== 'ALL' ? 'No materials match your filters' : 'No course materials yet'}</h4>
          <p>
            {searchQuery || typeFilter !== 'ALL'
              ? 'Try changing or clearing your search filters'
              : 'Add downloadable resources, PDFs, starter code repositories, or external links for this course.'}
          </p>
          {!searchQuery && typeFilter === 'ALL' && (
            <button className="products-btn products-btn--primary" onClick={handleOpenAdd}>
              <HiOutlinePlus /> Add First Material
            </button>
          )}
        </div>
      ) : (
        <div className="course-materials__grid">
          {filteredMaterials.map((item) => {
            const iconMeta = getMaterialIcon(item);
            const isFile = item.type === 'FILE';
            const resourceUrl = isFile ? resolveFullUrl(item.fileUrl) : item.externalUrl;

            return (
              <div key={item.id} className="material-card">
                <div className="material-card__header">
                  <div className={`material-card__icon ${iconMeta.colorClass}`}>
                    {iconMeta.icon}
                  </div>

                  <div className="material-card__badges">
                    {item.isFree && (
                      <span className="material-badge material-badge--free" title="Visible to prospective non-enrolled students">
                        Free Preview
                      </span>
                    )}
                    <span className={`material-badge material-badge--${item.type?.toLowerCase()}`}>
                      {item.type}
                    </span>
                  </div>
                </div>

                <div className="material-card__body">
                  <h4 className="material-card__title" title={item.title}>
                    {item.title}
                  </h4>
                  {item.description ? (
                    <p className="material-card__desc">{item.description}</p>
                  ) : (
                    <p className="material-card__desc material-card__desc--empty">No description provided</p>
                  )}

                  <div className="material-card__meta">
                    {isFile ? (
                      <>
                        <span className="material-card__meta-item" title={item.fileName || 'Uploaded file'}>
                          <HiOutlinePaperClip /> {item.fileName || 'Attachment'}
                        </span>
                        {item.fileSize ? (
                          <span className="material-card__meta-item">
                            {formatBytes(item.fileSize)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="material-card__meta-item material-card__meta-link" title={item.externalUrl}>
                        <HiOutlineGlobeAlt /> {item.externalUrl ? item.externalUrl.replace(/^https?:\/\//, '') : 'External Link'}
                      </span>
                    )}
                    <span className="material-card__meta-order">
                      Order #{item.sortOrder ?? 0}
                    </span>
                  </div>
                </div>

                <div className="material-card__footer">
                  {resourceUrl ? (
                    <a
                      href={resourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="material-card__btn material-card__btn--view"
                      title={isFile ? 'Download / View file' : 'Open external link'}
                    >
                      {isFile ? (
                        <>
                          <HiOutlineArrowDownTray /> Download
                        </>
                      ) : (
                        <>
                          <HiOutlineArrowTopRightOnSquare /> Open Link
                        </>
                      )}
                    </a>
                  ) : (
                    <span className="material-card__btn material-card__btn--disabled">Unavailable</span>
                  )}

                  <div className="material-card__manage-btns">
                    <button
                      className="material-card__action-btn"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit material"
                    >
                      <HiOutlinePencilSquare />
                    </button>
                    <button
                      className="material-card__action-btn material-card__action-btn--delete"
                      onClick={() => setDeleteModal({ open: true, material: item, deleting: false })}
                      title="Delete material"
                    >
                      <HiOutlineTrash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Create / Edit Material Modal ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => !saving && setShowModal(false)}>
              <HiOutlineXMark />
            </button>
            <h2 className="modal__title">
              {modalMode === 'add' ? 'Add Course Material' : 'Edit Course Material'}
            </h2>

            <form className="create-form" onSubmit={handleSubmit}>
              {/* Type Switcher Tabs */}
              <div className="material-form__type-toggle">
                <button
                  type="button"
                  className={`material-form__toggle-btn ${formData.type === 'FILE' ? 'material-form__toggle-btn--active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, type: 'FILE' }))}
                >
                  <HiOutlinePaperClip /> Upload File
                </button>
                <button
                  type="button"
                  className={`material-form__toggle-btn ${formData.type === 'LINK' ? 'material-form__toggle-btn--active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, type: 'LINK' }))}
                >
                  <HiOutlineGlobeAlt /> External Link
                </button>
              </div>

              {/* Title */}
              <div className="create-form__field">
                <label>
                  Material Title <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Official Course Syllabus, Starter Code, Figma Design"
                  required
                  autoFocus
                />
              </div>

              {/* File Upload Section */}
              {formData.type === 'FILE' && (
                <div className="create-form__field">
                  <label>
                    File {modalMode === 'add' && <span className="required-star">*</span>}
                    <span className="field-hint">(Max 100MB — PDF, ZIP, DOCX, etc.)</span>
                  </label>

                  <div
                    className={`material-dropzone ${isDragOver ? 'material-dropzone--active' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />

                    {formData.file ? (
                      <div className="material-dropzone__selected">
                        <HiOutlineCheckCircle className="dropzone-success-icon" />
                        <div className="dropzone-file-info">
                          <span className="dropzone-file-name">{formData.file.name}</span>
                          <span className="dropzone-file-size">
                            {formatBytes(formData.file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="dropzone-replace-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          Change File
                        </button>
                      </div>
                    ) : modalMode === 'edit' && formData.existingFileName ? (
                      <div className="material-dropzone__selected">
                        <HiOutlineDocumentText className="dropzone-current-icon" />
                        <div className="dropzone-file-info">
                          <span className="dropzone-current-label">Current File:</span>
                          <span className="dropzone-file-name">{formData.existingFileName}</span>
                        </div>
                        <button
                          type="button"
                          className="dropzone-replace-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          Replace File
                        </button>
                      </div>
                    ) : (
                      <div className="material-dropzone__placeholder">
                        <HiOutlineFolderArrowDown className="dropzone-upload-icon" />
                        <p className="dropzone-text">
                          <strong>Click to choose a file</strong> or drag and drop here
                        </p>
                        <span className="dropzone-sub">PDF, ZIP, DOCX, Sheets, Code, Images (up to 100MB)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* External Link Section */}
              {formData.type === 'LINK' && (
                <div className="create-form__field">
                  <label>
                    External URL <span className="required-star">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.externalUrl}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                    placeholder="https://github.com/... or https://drive.google.com/..."
                    required={formData.type === 'LINK'}
                  />
                  <span className="field-hint">Enter direct link to GitHub repository, Google Drive folder, Figma file, etc.</span>
                </div>
              )}

              {/* Description */}
              <div className="create-form__field">
                <label>Description / Note (Optional)</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide brief instructions or details about what this resource contains..."
                />
              </div>

              {/* Row for Sort Order & Free Preview toggle */}
              <div className="create-form__row">
                <div className="create-form__field">
                  <label>Display Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
                    placeholder="0"
                  />
                  <span className="field-hint">Lower numbers appear first in the list</span>
                </div>

                <div className="create-form__field material-checkbox-field">
                  <label className="material-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isFree}
                      onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                    />
                    <span className="material-checkbox-custom"></span>
                    <div className="material-checkbox-text">
                      <strong>Free Preview Access</strong>
                      <p>Allow prospective visitors and non-enrolled students to view/download this material</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="modal__actions">
                <button
                  type="button"
                  className="products-btn products-btn--secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="products-btn products-btn--primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <HiOutlineArrowPath className="spinner" /> Saving...
                    </>
                  ) : modalMode === 'add' ? (
                    'Add Material'
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {deleteModal.open && (
        <div className="modal-overlay" onClick={() => !deleteModal.deleting && setDeleteModal({ open: false, material: null, deleting: false })}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal">
              <div className="delete-modal__icon">
                <HiOutlineTrash />
              </div>
              <h3 className="delete-modal__title">Delete Material?</h3>
              <p className="delete-modal__text">
                Are you sure you want to delete <strong>"{deleteModal.material?.title}"</strong>?
                {deleteModal.material?.type === 'FILE' && ' The associated file will also be permanently removed from disk.'}
                {' '}This action cannot be undone.
              </p>
              <div className="delete-modal__actions">
                <button
                  className="products-btn products-btn--secondary"
                  onClick={() => setDeleteModal({ open: false, material: null, deleting: false })}
                  disabled={deleteModal.deleting}
                >
                  Cancel
                </button>
                <button
                  className="products-btn products-btn--danger"
                  onClick={handleDeleteConfirm}
                  disabled={deleteModal.deleting}
                >
                  {deleteModal.deleting ? 'Deleting...' : 'Delete Material'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseMaterials;
