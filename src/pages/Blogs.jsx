import { useState, useEffect, useMemo, useRef } from 'react';
import API from '../api/axios';
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineFunnel,
  HiOutlineArrowLeft,
  HiOutlinePhoto,
  HiOutlineCalendarDays,
  HiOutlineLink,
  HiOutlineTag,
  HiOutlineCloudArrowUp,
} from 'react-icons/hi2';
import '../styles/blogs.css';

// ========== Helpers ==========
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

// Helper to get full URL for images
const getFullUrl = (path) => {
  if (!path) return null;
  // Replace Windows backslashes with forward slashes for URLs
  const normalizedPath = path.replace(/\\/g, '/');
  if (normalizedPath.startsWith('blob:') || normalizedPath.startsWith('http')) return normalizedPath;
  return normalizedPath.startsWith('/')
    ? `https://api.idealessons.com${normalizedPath}`
    : `https://api.idealessons.com${normalizedPath}`;
};

// Helper to get cover URL from blog object
const getCoverUrl = (blog) => {
  const path = blog?.coverImage?.url || blog?.mainPhoto || null;
  return getFullUrl(path);
};

console.log(getCoverUrl);


// ========== Main Component ==========
const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState(null);

  // Detail view
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create / Edit modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    tags: '',
  });

  // File upload states
  const [mainPhotoFile, setMainPhotoFile] = useState(null);
  const [mainPhotoPreview, setMainPhotoPreview] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]); // new File objects
  const [galleryPreviews, setGalleryPreviews] = useState([]); // blob URLs for new files
  const [existingGallery, setExistingGallery] = useState([]); // {id, url} from API
  const [removedGalleryIds, setRemovedGalleryIds] = useState([]); // IDs to remove on edit
  const mainPhotoRef = useRef(null);
  const galleryRef = useRef(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---- Fetch ----
  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/blogs/all');
      if (res.data.success) {
        setBlogs(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlogs(); }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ---- Auto slug ----
  const generateSlug = (title) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleTitleChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: formMode === 'create' ? generateSlug(val) : prev.slug,
    }));
  };

  // ---- Create ----
  const openCreateModal = () => {
    setFormMode('create');
    setFormData({ title: '', slug: '', description: '', tags: '' });
    setMainPhotoFile(null);
    setMainPhotoPreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setExistingGallery([]);
    setRemovedGalleryIds([]);
    setShowFormModal(true);
  };

  // ---- File helpers ----
  const handleMainPhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMainPhotoFile(file);
    setMainPhotoPreview(URL.createObjectURL(file));
  };

  const removeMainPhoto = () => {
    setMainPhotoFile(null);
    setMainPhotoPreview(null);
    if (mainPhotoRef.current) mainPhotoRef.current.value = '';
  };

  const handleGallerySelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGalleryFiles((prev) => [...prev, ...files]);
    setGalleryPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    if (galleryRef.current) galleryRef.current.value = '';
  };

  const removeNewGalleryItem = (index) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingGalleryItem = (galleryItem) => {
    setExistingGallery((prev) => prev.filter((g) => g.id !== galleryItem.id));
    setRemovedGalleryIds((prev) => [...prev, galleryItem.id]);
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('title', formData.title);
    fd.append('slug', formData.slug || generateSlug(formData.title));
    fd.append('description', formData.description);
    const tags = formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    tags.forEach((tag) => fd.append('tags', tag));
    if (mainPhotoFile) {
      fd.append('coverImage', mainPhotoFile);
    }
    galleryFiles.forEach((file) => {
      fd.append('gallery', file);
    });
    if (removedGalleryIds.length > 0) {
      fd.append('removeGalleryIds', removedGalleryIds.join(','));
    }
    return fd;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      showNotification('Title and description are required', 'error');
      return;
    }
    try {
      setFormLoading(true);
      const fd = buildFormData();
      const res = await API.post('/blogs', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success || res.data.data) {
        fetchBlogs();
        setShowFormModal(false);
        showNotification('Blog created successfully');
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to create blog', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // ---- Edit ----
  const openEditModal = (blog) => {
    setFormMode('edit');
    setFormData({
      id: blog.id,
      title: blog.title || '',
      slug: blog.slug || '',
      description: blog.description || '',
      tags: (blog.tags || []).join(', '),
    });
    // Reset file states for edit
    setMainPhotoFile(null);
    setMainPhotoPreview(blog.coverImage?.url || blog.mainPhoto || null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setRemovedGalleryIds([]);
    // Store existing gallery items with their IDs
    setExistingGallery(
      (blog.gallery || []).filter((g) => typeof g === 'object' && g.id).map((g) => ({ id: g.id, url: g.url }))
    );
    setShowFormModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showNotification('Title is required', 'error');
      return;
    }
    try {
      setFormLoading(true);
      const fd = buildFormData();
      await API.put(`/blogs/${formData.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchBlogs();
      setShowFormModal(false);
      if (selectedBlog?.id === formData.id) setSelectedBlog(null);
      showNotification('Blog updated successfully');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update blog', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await API.delete(`/blogs/${deleteTarget.id}`);
      setBlogs((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (selectedBlog?.id === deleteTarget.id) setSelectedBlog(null);
      showNotification('Blog deleted successfully');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete blog', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---- Publish / Unpublish ----
  const togglePublish = async (blog) => {
    try {
      await API.patch(`/blogs/${blog.id}/publish`, { published: !blog.published });
      setBlogs((prev) =>
        prev.map((b) => (b.id === blog.id ? { ...b, published: !b.published } : b))
      );
      showNotification(`Blog ${blog.published ? 'unpublished' : 'published'} successfully`);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // ---- View detail ----
  const viewBlogDetail = async (blog) => {
    try {
      setDetailLoading(true);
      const res = await API.get(`/blogs/id/${blog.id}`);
      setSelectedBlog(res.data.data || res.data);
    } catch {
      setSelectedBlog(blog);
    } finally {
      setDetailLoading(false);
    }
  };

  // ---- Filter & search ----
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesSearch =
        !searchQuery ||
        blog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.slug?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PUBLISHED' && blog.published) ||
        (statusFilter === 'DRAFT' && !blog.published);
      return matchesSearch && matchesStatus;
    });
  }, [blogs, searchQuery, statusFilter]);

  // ==================== BLOG DETAIL VIEW ====================
  if (selectedBlog) {
    const blog = selectedBlog;
    return (
      <div className="blogs-page">
        {notification && (
          <div className={`toast toast--${notification.type}`}>
            {notification.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamationTriangle />}
            <span>{notification.message}</span>
          </div>
        )}

        <button className="blog-detail__back" onClick={() => setSelectedBlog(null)}>
          <HiOutlineArrowLeft /> Back to Blogs
        </button>

        <div className="blog-detail__card">
          {/* Cover image */}
          <div className="blog-detail__cover-wrap">
            {getCoverUrl(blog) ? (
              <img src={getCoverUrl(blog)} alt={blog.title} className="blog-detail__cover" />
            ) : (
              <div className="blog-detail__cover-placeholder">
                <HiOutlinePhoto />
                <span>No cover image</span>
              </div>
            )}
          </div>

          <div className="blog-detail__body">
            <div className="blog-detail__top-row">
              <span className={`blog-status-badge ${blog.published ? 'blog-status-badge--published' : 'blog-status-badge--draft'}`}>
                {blog.published ? 'Published' : 'Draft'}
              </span>
              <div className="blog-detail__actions-row">
                <button className="blog-detail__action-btn blog-detail__action-btn--publish" onClick={() => togglePublish(blog)}>
                  {blog.published ? 'Unpublish' : 'Publish'}
                </button>
                <button className="blog-detail__action-btn blog-detail__action-btn--edit" onClick={() => { setSelectedBlog(null); openEditModal(blog); }}>
                  <HiOutlinePencilSquare /> Edit
                </button>
                <button className="blog-detail__action-btn blog-detail__action-btn--delete" onClick={() => setDeleteTarget(blog)}>
                  <HiOutlineTrash /> Delete
                </button>
              </div>
            </div>

            <h1 className="blog-detail__title">{blog.title}</h1>

            <div className="blog-detail__meta-row">
              <span><HiOutlineLink /> {blog.slug}</span>
              <span><HiOutlineCalendarDays /> {formatDate(blog.createdAt)}</span>
            </div>

            <div className="blog-detail__section">
              <h3>Description</h3>
              <p>{blog.description || 'No description.'}</p>
            </div>

            {blog.tags && blog.tags.length > 0 && (
              <div className="blog-detail__section">
                <h3><HiOutlineTag /> Tags</h3>
                <div className="blog-detail__tags">
                  {blog.tags.map((tag, i) => (
                    <span key={i} className="blog-tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="blog-detail__section">
              <h3><HiOutlinePhoto /> Gallery</h3>
              {blog.gallery && blog.gallery.length > 0 ? (
                <div className="blog-detail__gallery">
                  {blog.gallery.map((img, i) => (
                    <img
                      key={i}
                      src={getFullUrl(typeof img === 'string' ? img : img.url)}
                      alt={`Gallery ${i + 1}`}
                      className="blog-detail__gallery-img"
                    />
                  ))}
                </div>
              ) : (
                <div className="blog-detail__gallery-empty">
                  <HiOutlinePhoto />
                  <span>No gallery images</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete confirm modal */}
        {deleteTarget && (
          <div className="modal-overlay" onClick={() => !deleteLoading && setDeleteTarget(null)}>
            <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
              <div className="delete-confirm">
                <div className="delete-confirm__icon"><HiOutlineTrash /></div>
                <h3>Delete Blog</h3>
                <p>Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This action cannot be undone.</p>
                <div className="delete-confirm__actions">
                  <button className="delete-confirm__btn delete-confirm__btn--cancel" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>Cancel</button>
                  <button className="delete-confirm__btn delete-confirm__btn--delete" onClick={handleDelete} disabled={deleteLoading}>
                    {deleteLoading ? <span className="login__spinner" /> : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== BLOGS LIST VIEW ====================
  return (
    <div className="blogs-page">
      {notification && (
        <div className={`toast toast--${notification.type}`}>
          {notification.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamationTriangle />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="blogs-page__header">
        <div>
          <h1 className="blogs-page__title">
            <HiOutlineDocumentText className="blogs-page__title-icon" />
            Blog Management
          </h1>
          <p className="blogs-page__subtitle">
            {blogs.length} blog{blogs.length !== 1 ? 's' : ''} on the platform
          </p>
        </div>
        <button className="blogs-page__add-btn" onClick={openCreateModal} id="add-blog-btn">
          <HiOutlinePlus /> New Blog
        </button>
      </div>

      {/* Toolbar */}
      <div className="blogs-toolbar">
        <div className="blogs-toolbar__search">
          <HiOutlineMagnifyingGlass className="blogs-toolbar__search-icon" />
          <input
            type="text"
            className="blogs-toolbar__search-input"
            placeholder="Search by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="blogs-search-input"
          />
          {searchQuery && (
            <button className="blogs-toolbar__search-clear" onClick={() => setSearchQuery('')}>
              <HiOutlineXMark />
            </button>
          )}
        </div>

        <div className="blogs-toolbar__filters">
          <HiOutlineFunnel className="blogs-toolbar__filter-icon" />
          {['ALL', 'PUBLISHED', 'DRAFT'].map((status) => (
            <button
              key={status}
              className={`blogs-toolbar__filter-btn ${statusFilter === status ? 'blogs-toolbar__filter-btn--active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'ALL' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Blog Table */}
      {loading ? (
        <div className="blogs-table-skeleton">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="blogs-table-skeleton__row">
              <div className="skeleton-bar" style={{ width: '5%', height: '14px' }} />
              <div className="skeleton-bar" style={{ width: '35%', height: '14px' }} />
              <div className="skeleton-bar" style={{ width: '20%', height: '14px' }} />
              <div className="skeleton-bar" style={{ width: '10%', height: '14px' }} />
              <div className="skeleton-bar" style={{ width: '12%', height: '14px' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="blogs-error">
          <HiOutlineExclamationTriangle />
          <p>{error}</p>
          <button onClick={fetchBlogs}>Retry</button>
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className="blogs-empty">
          <HiOutlineDocumentText />
          <p>{searchQuery || statusFilter !== 'ALL' ? 'No blogs match your filters' : 'No blogs yet'}</p>
        </div>
      ) : (
        <div className="blogs-table-wrapper">
          <table className="blogs-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBlogs.map((blog) => (
                <tr key={blog.id} className="blogs-table__row">
                  <td className="blogs-table__id">#{blog.id}</td>
                  <td>
                    <div className="blogs-table__title-cell">
                      {getCoverUrl(blog) ? (
                        <img src={getCoverUrl(blog)} alt="" className="blogs-table__thumb" />
                      ) : (
                        <div className="blogs-table__thumb-placeholder">
                          <HiOutlineDocumentText />
                        </div>
                      )}
                      <span className="blogs-table__title">{blog.title}</span>
                    </div>
                  </td>
                  <td className="blogs-table__slug">{blog.slug}</td>
                  <td>
                    <span
                      className={`blog-status-badge ${blog.published ? 'blog-status-badge--published' : 'blog-status-badge--draft'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => togglePublish(blog)}
                      title={`Click to ${blog.published ? 'unpublish' : 'publish'}`}
                    >
                      {blog.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="blogs-table__date">{formatDate(blog.createdAt)}</td>
                  <td>
                    <div className="blogs-table__actions">
                      <button className="action-btn action-btn--view" title="View" onClick={() => viewBlogDetail(blog)}>
                        <HiOutlineEye />
                      </button>
                      <button className="action-btn action-btn--edit" title="Edit" onClick={() => openEditModal(blog)}>
                        <HiOutlinePencilSquare />
                      </button>
                      <button className="action-btn action-btn--delete" title="Delete" onClick={() => setDeleteTarget(blog)}>
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="blogs-page__footer">Showing {filteredBlogs.length} of {blogs.length} blogs</p>

      {/* ===== Delete confirm modal ===== */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleteLoading && setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm">
              <div className="delete-confirm__icon"><HiOutlineTrash /></div>
              <h3>Delete Blog</h3>
              <p>Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This action cannot be undone.</p>
              <div className="delete-confirm__actions">
                <button className="delete-confirm__btn delete-confirm__btn--cancel" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>Cancel</button>
                <button className="delete-confirm__btn delete-confirm__btn--delete" onClick={handleDelete} disabled={deleteLoading}>
                  {deleteLoading ? <span className="login__spinner" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Create / Edit modal ===== */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => !formLoading && setShowFormModal(false)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowFormModal(false)}>
              <HiOutlineXMark />
            </button>

            <h2 className="modal__title">
              {formMode === 'create' ? 'Create New Blog' : 'Edit Blog'}
            </h2>

            <form className="create-form" onSubmit={formMode === 'create' ? handleCreate : handleEdit}>
              <div className="create-form__field">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Blog title..."
                  id="blog-title-input"
                />
              </div>

              <div className="create-form__field">
                <label>Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated-slug"
                  id="blog-slug-input"
                />
              </div>

              <div className="create-form__field">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Write the blog description..."
                  rows={4}
                  id="blog-desc-input"
                />
              </div>

              <div className="create-form__field">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="nodejs, backend, tutorial"
                  id="blog-tags-input"
                />
              </div>

              {/* Main Photo Upload */}
              <div className="create-form__field">
                <label>Cover Photo</label>
                {mainPhotoPreview ? (
                  <div className="upload-preview">
                    <img src={getFullUrl(mainPhotoPreview)} alt="Cover" className="upload-preview__img" />
                    <button type="button" className="upload-preview__remove" onClick={removeMainPhoto}>
                      <HiOutlineXMark />
                    </button>
                  </div>
                ) : (
                  <div className="upload-zone" onClick={() => mainPhotoRef.current?.click()}>
                    <HiOutlineCloudArrowUp className="upload-zone__icon" />
                    <p className="upload-zone__text">Click to upload cover photo</p>
                    <span className="upload-zone__hint">JPG, PNG, WebP supported</span>
                  </div>
                )}
                <input
                  ref={mainPhotoRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleMainPhotoSelect}
                  id="blog-photo-input"
                />
              </div>

              {/* Gallery Upload */}
              <div className="create-form__field">
                <label>Gallery Images</label>
                {/* Existing gallery items (from API, have IDs) */}
                {(existingGallery.length > 0 || galleryPreviews.length > 0) && (
                  <div className="upload-gallery-grid">
                    {existingGallery.map((item) => (
                      <div key={`existing-${item.id}`} className="upload-gallery-item">
                        <img src={getFullUrl(item.url)} alt={`Gallery`} className="upload-gallery-item__img" />
                        <button type="button" className="upload-gallery-item__remove" onClick={() => removeExistingGalleryItem(item)}>
                          <HiOutlineXMark />
                        </button>
                      </div>
                    ))}
                    {/* New gallery files */}
                    {galleryPreviews.map((src, i) => (
                      <div key={`new-${i}`} className="upload-gallery-item">
                        <img src={src} alt={`New ${i + 1}`} className="upload-gallery-item__img" />
                        <button type="button" className="upload-gallery-item__remove" onClick={() => removeNewGalleryItem(i)}>
                          <HiOutlineXMark />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="upload-zone upload-zone--sm" onClick={() => galleryRef.current?.click()}>
                  <HiOutlinePlus className="upload-zone__icon" />
                  <p className="upload-zone__text">Add gallery images</p>
                </div>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleGallerySelect}
                  id="blog-gallery-input"
                />
              </div>

              <div className="create-form__actions">
                <button type="button" className="create-form__cancel" onClick={() => setShowFormModal(false)} disabled={formLoading}>
                  Cancel
                </button>
                <button type="submit" className="create-form__submit" disabled={formLoading} id="blog-form-submit">
                  {formLoading ? <span className="login__spinner" /> : (formMode === 'create' ? 'Create Blog' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blogs;
