import { useState, useRef } from 'react';
import * as tus from 'tus-js-client';
import API from '../../api/axios';
import {
  HiOutlineAcademicCap,
  HiOutlineChevronDown,
  HiOutlineFilm,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineCloudArrowUp
} from 'react-icons/hi2';
import LessonQuizzesModal from './LessonQuizzesModal';

const formatDuration = (seconds) => {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatEta = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'a few seconds';
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return secs === 60 ? `${mins + 1}m left` : `${mins}m ${secs}s left`;
};

// Helper to extract duration in seconds from video file before upload
const getVideoDuration = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
};

const CourseCurriculum = ({ course, onUpdate, showNotification }) => {
  const [loading, setLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  // Module Modal
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleMode, setModuleMode] = useState('add'); // 'add' or 'edit'
  const [activeModule, setActiveModule] = useState(null);
  const [moduleForm, setModuleForm] = useState({ title: '', sortOrder: '' });

  // Lesson Modal
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', isPreview: false });
  const [lessonVideoFile, setLessonVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({
    percent: 0,
    loaded: 0,
    total: 0,
    speedBps: 0,
    secondsLeft: null,
    statusMessage: ''
  });
  const videoRef = useRef(null);
  const tusUploadRef = useRef(null);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'module'|'lesson', id, title }

  // Edit Lesson Modal
  const [showEditLessonModal, setShowEditLessonModal] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null);
  const [editLessonForm, setEditLessonForm] = useState({ title: '', sortOrder: '', isPreview: false });

  // Quizzes Modal
  const [selectedLessonForQuizzes, setSelectedLessonForQuizzes] = useState(null);

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  // ---- MODULE Actions ----
  const openAddModule = () => {
    setModuleMode('add');
    setActiveModule(null);
    setModuleForm({ title: '', sortOrder: '' });
    setShowModuleModal(true);
  };

  const openEditModule = (e, module) => {
    e.stopPropagation();
    setModuleMode('edit');
    setActiveModule(module);
    setModuleForm({ title: module.title || '', sortOrder: module.sortOrder || '' });
    setShowModuleModal(true);
  };

  const submitModule = async (e) => {
    e.preventDefault();
    if (!moduleForm.title.trim()) {
      showNotification('Module title is required', 'error');
      return;
    }
    setLoading(true);
    try {
      if (moduleMode === 'add') {
        const res = await API.post(`/courses/${course.id}/module`, { title: moduleForm.title });
        if (res.data.success || res.status === 200 || res.status === 201) {
          showNotification('Module added successfully');
          setShowModuleModal(false);
          if (onUpdate) onUpdate();
        }
      } else if (moduleMode === 'edit') {
        // PUT /courses/module/:id -> { sortOrder: 3, title: '...'}
        // Based on user prompt, PUT /courses/module/:id accepts sortOrder. We pass title too just in case.
        const payload = { sortOrder: Number(moduleForm.sortOrder) };
        if (moduleForm.title !== activeModule.title) payload.title = moduleForm.title;
        
        const res = await API.put(`/courses/module/${activeModule.id}`, payload);
        if (res.data.success || res.status === 200) {
          showNotification('Module updated successfully');
          setShowModuleModal(false);
          if (onUpdate) onUpdate();
        }
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save module', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ---- LESSON Actions ----
  const openAddLesson = (e, moduleId) => {
    e.stopPropagation();
    setActiveModule(moduleId);
    setLessonForm({ title: '', isPreview: false });
    setLessonVideoFile(null);
    setUploadProgress({
      percent: 0,
      loaded: 0,
      total: 0,
      speedBps: 0,
      secondsLeft: null,
      statusMessage: ''
    });
    setShowLessonModal(true);
  };

  const openEditLesson = (e, lesson) => {
    e.stopPropagation();
    setActiveLesson(lesson);
    setEditLessonForm({
      title: lesson.title || '',
      sortOrder: lesson.sortOrder ?? '',
      isPreview: Boolean(lesson.isPreview)
    });
    setShowEditLessonModal(true);
  };

  const submitEditLesson = async (e) => {
    e.preventDefault();
    if (!editLessonForm.title.trim()) {
      showNotification('Lesson title is required', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: editLessonForm.title.trim(),
        isPreview: Boolean(editLessonForm.isPreview)
      };
      if (editLessonForm.sortOrder !== '') {
        payload.sortOrder = Number(editLessonForm.sortOrder);
      }

      const res = await API.put(`/courses/lesson/${activeLesson.id}`, payload);
      if (res.data?.success || res.status === 200) {
        showNotification('Lesson updated successfully');
        setShowEditLessonModal(false);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update lesson', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setLessonVideoFile(file);
  };

  const handleCancelUpload = () => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    setLoading(false);
    setUploadProgress({
      percent: 0,
      loaded: 0,
      total: 0,
      speedBps: 0,
      secondsLeft: null,
      statusMessage: ''
    });
    setShowLessonModal(false);
  };

  const submitLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) {
      showNotification('Lesson title is required', 'error');
      return;
    }
    if (!lessonVideoFile) {
      showNotification('Video file is required', 'error');
      return;
    }

    setLoading(true);
    setUploadProgress({
      percent: 0,
      loaded: 0,
      total: lessonVideoFile.size || 0,
      speedBps: 0,
      secondsLeft: null,
      statusMessage: 'Extracting video metadata...'
    });

    try {
      // 1. Extract duration in browser
      const duration = await getVideoDuration(lessonVideoFile);

      setUploadProgress((prev) => ({
        ...prev,
        statusMessage: 'Requesting upload signature...'
      }));

      // 2. Request upload signature from Backend
      const sigRes = await API.post('/courses/bunny/signature', {
        title: lessonForm.title
      });
      const sigData = sigRes.data?.data || sigRes.data;
      const { videoId, libraryId, expirationTime, signature, videoUrl } = sigData || {};

      if (!videoId || !libraryId || !signature) {
        throw new Error('Failed to obtain upload signature from server');
      }

      setUploadProgress((prev) => ({
        ...prev,
        statusMessage: 'Uploading video to Bunny CDN...'
      }));

      let lastLoaded = 0;
      let lastTime = Date.now();

      // 3. Initiate TUS direct upload to Bunny Stream
      const upload = new tus.Upload(lessonVideoFile, {
        endpoint: 'https://video.bunnycdn.com/tusupload',
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          AuthorizationSignature: signature,
          AuthorizationExpire: expirationTime,
          VideoId: videoId,
          LibraryId: libraryId
        },
        metadata: {
          filetype: lessonVideoFile.type || 'video/mp4',
          title: lessonForm.title
        },
        onError: (error) => {
          console.error('Bunny Upload Error:', error);
          showNotification(error?.message || 'Video upload failed. Please try again.', 'error');
          setLoading(false);
          tusUploadRef.current = null;
        },
        onProgress: (bytesSent, bytesTotal) => {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000;
          const bytesDiff = bytesSent - lastLoaded;

          let currentSpeed = 0;
          if (timeDiff > 0.3) {
            currentSpeed = bytesDiff / timeDiff;
            lastLoaded = bytesSent;
            lastTime = currentTime;
          }

          const percent = bytesTotal > 0 ? Math.min(100, Math.round((bytesSent / bytesTotal) * 100)) : 0;
          const secondsLeft = currentSpeed > 0 && bytesTotal > bytesSent ? (bytesTotal - bytesSent) / currentSpeed : null;

          setUploadProgress((prev) => ({
            ...prev,
            percent,
            loaded: bytesSent,
            total: bytesTotal,
            speedBps: currentSpeed || prev.speedBps,
            secondsLeft: secondsLeft !== null ? secondsLeft : prev.secondsLeft,
            statusMessage: percent >= 100 ? 'Finalizing Bunny upload...' : 'Uploading video to Bunny CDN...'
          }));
        },
        onSuccess: async () => {
          setUploadProgress((prev) => ({
            ...prev,
            percent: 100,
            loaded: prev.total,
            statusMessage: 'Saving lesson details...'
          }));

          try {
            // 4. Save Lesson Record to Backend DB as JSON
            const saveRes = await API.post(`/courses/module/${activeModule}/lesson`, {
              title: lessonForm.title,
              video_id: videoId,
              library_id: libraryId,
              videoUrl: videoUrl || `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}`,
              duration: duration || 0,
              isPreview: Boolean(lessonForm.isPreview)
            });

            if (saveRes.data?.success || saveRes.status === 200 || saveRes.status === 201) {
              showNotification('Lesson added successfully');
              setShowLessonModal(false);
              setExpandedModules((prev) => ({ ...prev, [activeModule]: true }));
              if (onUpdate) onUpdate();
            } else {
              showNotification(saveRes.data?.message || 'Failed to save lesson record', 'error');
            }
          } catch (saveErr) {
            console.error('Save lesson error:', saveErr);
            showNotification(saveErr.response?.data?.message || saveErr.message || 'Failed to save lesson record', 'error');
          } finally {
            setLoading(false);
            tusUploadRef.current = null;
            setUploadProgress({
              percent: 0,
              loaded: 0,
              total: 0,
              speedBps: 0,
              secondsLeft: null,
              statusMessage: ''
            });
          }
        }
      });

      tusUploadRef.current = upload;
      upload.start();
    } catch (err) {
      console.error('Upload initiation error:', err);
      showNotification(err.response?.data?.message || err.message || 'Something went wrong starting upload', 'error');
      setLoading(false);
      tusUploadRef.current = null;
    }
  };

  // ---- DELETE Actions ----
  const confirmDelete = (e, type, item) => {
    e.stopPropagation();
    setDeleteTarget({ type, id: item.id, title: item.title });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      if (deleteTarget.type === 'module') {
        await API.delete(`/courses/module/${deleteTarget.id}`);
        showNotification('Module deleted successfully');
      } else if (deleteTarget.type === 'lesson') {
        await API.delete(`/courses/lesson/${deleteTarget.id}`);
        showNotification('Lesson deleted successfully');
      }
      setDeleteTarget(null);
      if (onUpdate) onUpdate();
    } catch (err) {
      showNotification(err.response?.data?.message || `Failed to delete ${deleteTarget.type}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const sortedModules = [...(course.modules || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="course-curriculum">
      <div className="course-curriculum__header-row">
        <h2 className="course-detail__section-title">
          <HiOutlineAcademicCap /> Course Curriculum
        </h2>
        <button className="products-page__add-btn course-curriculum__add-btn" onClick={openAddModule}>
          <HiOutlinePlus /> Add Module
        </button>
      </div>

      {sortedModules.length === 0 ? (
        <div className="course-detail__empty">
          <p>No modules added yet.</p>
        </div>
      ) : (
        <div className="modules-list">
          {sortedModules.map((module) => {
            const sortedLessons = [...(module.lessons || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            const isExpanded = expandedModules[module.id];

            return (
              <div key={module.id} className="module-card">
                <div
                  className="module-card__header"
                  onClick={() => toggleModule(module.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="module-card__left">
                    <span className="module-card__order">{module.sortOrder || '-'}</span>
                    <div>
                      <h3 className="module-card__title">{module.title}</h3>
                      <p className="module-card__meta">
                        {sortedLessons.length} lessons
                        {sortedLessons.length > 0 && ` • ${formatDuration(sortedLessons.reduce((a, l) => a + (l.duration || 0), 0))}`}
                      </p>
                    </div>
                  </div>
                  <div className="module-card__actions">
                    <div className="module-card__action-btns">
                      <button className="curriculum-action-btn curriculum-action-btn--add" onClick={(e) => openAddLesson(e, module.id)} title="Add Lesson">
                        <HiOutlinePlus />
                      </button>
                      <button className="curriculum-action-btn curriculum-action-btn--edit" onClick={(e) => openEditModule(e, module)} title="Edit Module">
                        <HiOutlinePencilSquare />
                      </button>
                      <button className="curriculum-action-btn curriculum-action-btn--delete" onClick={(e) => confirmDelete(e, 'module', module)} title="Delete Module">
                        <HiOutlineTrash />
                      </button>
                    </div>
                    <span className={`module-card__chevron ${isExpanded ? 'module-card__chevron--open' : ''}`}>
                      <HiOutlineChevronDown />
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="module-card__lessons">
                    {sortedLessons.length === 0 ? (
                      <p className="module-card__empty">No lessons in this module.</p>
                    ) : (
                      sortedLessons.map((lesson) => (
                        <div key={lesson.id} className="lesson-row">
                          <div className="lesson-row__left">
                            <HiOutlineFilm className="lesson-row__icon" />
                            <div>
                              <p className="lesson-row__title">{lesson.title}</p>
                              <span className="lesson-row__duration">{formatDuration(lesson.duration)}</span>
                            </div>
                          </div>
                          <div className="lesson-row__right">
                            {lesson.isPreview && (
                              <span className="preview-badge">Preview</span>
                            )}
                            <button
                              className="curriculum-action-btn curriculum-action-btn--edit shrink-0"
                              onClick={(e) => openEditLesson(e, lesson)}
                              title="Edit Lesson"
                            >
                              <HiOutlinePencilSquare />
                            </button>
                            <button
                              className="curriculum-action-btn curriculum-action-btn--edit shrink-0"
                              onClick={(e) => { e.stopPropagation(); setSelectedLessonForQuizzes(lesson); }}
                              title="Manage Quizzes"
                              style={{ color: 'var(--color-accent)' }}
                            >
                              <HiOutlineAcademicCap />
                            </button>
                            <button
                              className="curriculum-action-btn curriculum-action-btn--delete shrink-0"
                              onClick={(e) => confirmDelete(e, 'lesson', lesson)}
                              title="Delete Lesson"
                            >
                              <HiOutlineTrash />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- ADD/EDIT MODULE MODAL --- */}
      {showModuleModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowModuleModal(false)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowModuleModal(false)}>
              <HiOutlineXMark />
            </button>
            <h2 className="modal__title">{moduleMode === 'add' ? 'Add Module' : 'Edit Module'}</h2>
            <form className="create-form" onSubmit={submitModule}>
              <div className="create-form__field">
                <label>Module Title *</label>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  placeholder="e.g. Introduction"
                  autoFocus
                />
              </div>
              {moduleMode === 'edit' && (
                <div className="create-form__field">
                  <label>Sort Order</label>
                  <input
                    type="number"
                    value={moduleForm.sortOrder}
                    onChange={(e) => setModuleForm({ ...moduleForm, sortOrder: e.target.value })}
                    placeholder="e.g. 1"
                  />
                </div>
              )}
              <div className="create-form__actions">
                <button type="button" className="create-form__cancel" onClick={() => setShowModuleModal(false)} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="create-form__submit" disabled={loading}>
                  {loading ? <span className="login__spinner" /> : (moduleMode === 'add' ? 'Add Module' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD LESSON MODAL --- */}
      {showLessonModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowLessonModal(false)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={loading ? handleCancelUpload : () => setShowLessonModal(false)}>
              <HiOutlineXMark />
            </button>
            <h2 className="modal__title">Add Lesson</h2>
            <form className="create-form" onSubmit={submitLesson}>
              <div className="create-form__field">
                <label>Lesson Title *</label>
                <input
                  type="text"
                  value={lessonForm.title}
                  disabled={loading}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="e.g. Getting Started"
                  autoFocus
                  required
                />
              </div>
              <div className="create-form__field">
                <label>Video File *</label>
                {lessonVideoFile ? (
                  <div className="upload-preview" style={{ padding: '12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)'}}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                        <HiOutlineFilm style={{ marginRight: '6px', verticalAlign: 'middle' }}/>
                        {lessonVideoFile.name}
                      </span>
                      <button
                        type="button"
                        className="upload-preview__remove"
                        style={{ position: 'static' }}
                        disabled={loading}
                        onClick={() => setLessonVideoFile(null)}
                      >
                        <HiOutlineXMark />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-zone" onClick={() => !loading && videoRef.current?.click()}>
                    <HiOutlineCloudArrowUp className="upload-zone__icon" />
                    <p className="upload-zone__text">Click to set video</p>
                    <span className="upload-zone__hint">MP4, WebM formats</span>
                  </div>
                )}
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/*"
                  disabled={loading}
                  style={{ display: 'none' }}
                  onChange={handleVideoSelect}
                />
              </div>

              <div className="create-form__field">
                <label className="checkbox-group" style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={lessonForm.isPreview}
                    disabled={loading}
                    onChange={(e) => setLessonForm({ ...lessonForm, isPreview: e.target.checked })}
                  />
                  <span>Allow preview without enrollment</span>
                </label>
              </div>

              {loading && (
                <div className="lesson-upload-progress" role="status" aria-live="polite">
                  <div className="lesson-upload-progress__header">
                    <span>{uploadProgress.statusMessage || 'Uploading video to Bunny CDN...'}</span>
                    <strong>{uploadProgress.percent}%</strong>
                  </div>
                  <div className="lesson-upload-progress__track" aria-hidden="true">
                    <div
                      className="lesson-upload-progress__bar"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                  <div className="lesson-upload-progress__meta">
                    <span>
                      {formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total || lessonVideoFile?.size || 0)}
                    </span>
                    <span>
                      {uploadProgress.speedBps > 0 ? `${formatBytes(uploadProgress.speedBps)}/s` : '—'}
                    </span>
                    <span>
                      {uploadProgress.percent >= 100 ? 'Finalizing...' : formatEta(uploadProgress.secondsLeft)}
                    </span>
                  </div>
                </div>
              )}

              <div className="create-form__actions">
                <button
                  type="button"
                  className="create-form__cancel"
                  onClick={loading ? handleCancelUpload : () => setShowLessonModal(false)}
                >
                  {loading ? 'Cancel Upload' : 'Cancel'}
                </button>
                <button type="submit" className="create-form__submit" disabled={loading}>
                  {loading ? <span className="login__spinner" /> : 'Add Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT LESSON MODAL --- */}
      {showEditLessonModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowEditLessonModal(false)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setShowEditLessonModal(false)} disabled={loading}>
              <HiOutlineXMark />
            </button>
            <h2 className="modal__title">Edit Lesson</h2>
            <form className="create-form" onSubmit={submitEditLesson}>
              <div className="create-form__field">
                <label>Lesson Title *</label>
                <input
                  type="text"
                  value={editLessonForm.title}
                  disabled={loading}
                  onChange={(e) => setEditLessonForm({ ...editLessonForm, title: e.target.value })}
                  placeholder="Enter lesson title"
                  autoFocus
                  required
                />
              </div>

              <div className="create-form__field">
                <label>Sort Order</label>
                <input
                  type="number"
                  value={editLessonForm.sortOrder}
                  disabled={loading}
                  onChange={(e) => setEditLessonForm({ ...editLessonForm, sortOrder: e.target.value })}
                  placeholder="e.g. 1"
                  min="0"
                />
              </div>

              <div className="create-form__field">
                <label className="checkbox-group" style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editLessonForm.isPreview}
                    disabled={loading}
                    onChange={(e) => setEditLessonForm({ ...editLessonForm, isPreview: e.target.checked })}
                  />
                  <span>Allow preview without enrollment</span>
                </label>
              </div>

              <div className="create-form__actions">
                <button
                  type="button"
                  className="create-form__cancel"
                  onClick={() => setShowEditLessonModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="create-form__submit" disabled={loading}>
                  {loading ? <span className="login__spinner" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !loading && setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm">
              <div className="delete-confirm__icon"><HiOutlineTrash /></div>
              <h3>Delete {deleteTarget.type === 'module' ? 'Module' : 'Lesson'}</h3>
              <p>Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This action cannot be undone.</p>
              <div className="delete-confirm__actions">
                <button className="delete-confirm__btn delete-confirm__btn--cancel" onClick={() => setDeleteTarget(null)} disabled={loading}>Cancel</button>
                <button className="delete-confirm__btn delete-confirm__btn--delete" onClick={executeDelete} disabled={loading}>
                  {loading ? <span className="login__spinner" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- LESSON QUIZZES MODAL --- */}
      {selectedLessonForQuizzes && (
        <LessonQuizzesModal
          lesson={selectedLessonForQuizzes}
          onClose={() => setSelectedLessonForQuizzes(null)}
        />
      )}
    </div>
  );
};

export default CourseCurriculum;
