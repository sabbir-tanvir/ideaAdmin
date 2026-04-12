import { useState, useRef } from 'react';
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
  const [lessonForm, setLessonForm] = useState({ title: '' });
  const [lessonVideoFile, setLessonVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({
    percent: 0,
    loaded: 0,
    total: 0,
    speedBps: 0,
    secondsLeft: null
  });
  const videoRef = useRef(null);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'module'|'lesson', id, title }

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
    setLessonForm({ title: '' });
    setLessonVideoFile(null);
    setUploadProgress({ percent: 0, loaded: 0, total: 0, speedBps: 0, secondsLeft: null });
    setShowLessonModal(true);
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setLessonVideoFile(file);
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
    
    const fd = new FormData();
    fd.append('title', lessonForm.title);
    fd.append('video', lessonVideoFile);

    setLoading(true);
    setUploadProgress({
      percent: 0,
      loaded: 0,
      total: lessonVideoFile.size || 0,
      speedBps: 0,
      secondsLeft: null
    });

    try {
      // POST /courses/module/:moduleId/lesson
      const res = await API.post(`/courses/module/${activeModule}/lesson`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded || 0;
          const total = progressEvent.total || lessonVideoFile.size || 0;
          const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

          // Axios v1 may provide rate/estimated directly. If unavailable, we still show percent + bytes.
          const speedBps = progressEvent.rate || 0;
          const secondsLeft = Number.isFinite(progressEvent.estimated)
            ? progressEvent.estimated
            : (speedBps > 0 && total > loaded ? (total - loaded) / speedBps : null);

          setUploadProgress({ percent, loaded, total, speedBps, secondsLeft });
        }
      });
      if (res.data.success || res.status === 200 || res.status === 201) {
        setUploadProgress((prev) => ({ ...prev, percent: 100, loaded: prev.total || prev.loaded }));
        showNotification('Lesson added successfully');
        setShowLessonModal(false);
        // Force expand the module that got a new lesson
        setExpandedModules((prev) => ({ ...prev, [activeModule]: true }));
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to add lesson', 'error');
    } finally {
      setLoading(false);
      setUploadProgress({ percent: 0, loaded: 0, total: 0, speedBps: 0, secondsLeft: null });
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
                            <button className="curriculum-action-btn curriculum-action-btn--edit shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedLessonForQuizzes(lesson); }} title="Manage Quizzes" style={{ color: 'var(--color-accent)' }}>
                              <HiOutlineAcademicCap />
                            </button>
                            <button className="curriculum-action-btn curriculum-action-btn--delete shrink-0" onClick={(e) => confirmDelete(e, 'lesson', lesson)} title="Delete Lesson">
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
            <button className="modal__close" onClick={() => setShowLessonModal(false)}>
              <HiOutlineXMark />
            </button>
            <h2 className="modal__title">Add Lesson</h2>
            <form className="create-form" onSubmit={submitLesson}>
              <div className="create-form__field">
                <label>Lesson Title *</label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="e.g. Getting Started"
                  autoFocus
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
                      <button type="button" className="upload-preview__remove" style={{ position: 'static' }} onClick={() => setLessonVideoFile(null)}>
                        <HiOutlineXMark />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-zone" onClick={() => videoRef.current?.click()}>
                    <HiOutlineCloudArrowUp className="upload-zone__icon" />
                    <p className="upload-zone__text">Click to set video</p>
                    <span className="upload-zone__hint">MP4, WebM formats</span>
                  </div>
                )}
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={handleVideoSelect}
                />
              </div>

              {loading && lessonVideoFile && (
                <div className="lesson-upload-progress" role="status" aria-live="polite">
                  <div className="lesson-upload-progress__header">
                    <span>Uploading video...</span>
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
                      {formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total || lessonVideoFile.size || 0)}
                    </span>
                    <span>
                      {uploadProgress.speedBps > 0 ? `${formatBytes(uploadProgress.speedBps)}/s` : 'Calculating speed...'}
                    </span>
                    <span>
                      {uploadProgress.percent >= 100 ? 'Finalizing...' : formatEta(uploadProgress.secondsLeft)}
                    </span>
                  </div>
                </div>
              )}

              <div className="create-form__actions">
                <button type="button" className="create-form__cancel" onClick={() => setShowLessonModal(false)} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="create-form__submit" disabled={loading}>
                  {loading ? <span className="login__spinner" /> : 'Upload Lesson'}
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
