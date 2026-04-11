import { useState, useEffect, useMemo, useRef } from "react";
import API from "../api/axios";
import CourseCurriculum from "../components/Products/CourseCurriculum";
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineEye,
  HiOutlineClock,
  HiOutlineAcademicCap,
  HiOutlineLanguage,
  HiOutlineCurrencyDollar,
  HiOutlineBookOpen,
  HiOutlinePlayCircle,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineFunnel,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowLeft,
  HiOutlineFilm,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineCloudArrowUp,
  HiOutlinePhoto,
} from "react-icons/hi2";

import "../styles/products.css";

// Helper to get full URL for images
const getFullUrl = (path) => {
  if (!path) return null;
  const normalizedPath = path.replace(/\\/g, "/");
  if (normalizedPath.startsWith("blob:") || normalizedPath.startsWith("http"))
    return normalizedPath;
  return normalizedPath.startsWith("/")
    ? `https://www.idealessons.com${normalizedPath}`
    : `https://www.idealessons.com${normalizedPath}`;
};

// ========== Helper functions ==========
const formatDuration = (seconds) => {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const getLevelColor = (level) => {
  switch (level?.toUpperCase()) {
    case "BEGINNER":
      return "#10b981";
    case "INTERMEDIATE":
      return "#f59e0b";
    case "ADVANCED":
      return "#ef4444";
    default:
      return "#818cf8";
  }
};

const getStatusBadgeClass = (status) => {
  switch (status?.toUpperCase()) {
    case "PUBLISHED":
      return "status-badge--published";
    case "DRAFT":
      return "status-badge--draft";
    default:
      return "status-badge--default";
  }
};

// ========== Main Component ==========
const Products = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [notification, setNotification] = useState(null);

  // Detail view
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Create/Edit form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const thumbnailRef = useRef(null);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    duration: "",
    level: "BEGINNER",
    language: "English",
    price: "",
    status: "DRAFT",
  });

  const handleThumbnailSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const clearThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailRef.current) thumbnailRef.current.value = "";
  };

  // Fetch courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/courses");
      if (res.data.success) {
        setCourses(res.data.data);
        setSelectedCourse((prev) =>
          prev ? res.data.data.find((c) => c.id === prev.id) || prev : null,
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Create / Edit course
  const openEditModal = (course) => {
    setEditingCourseId(course.id);
    setCreateForm({
      title: course.title || "",
      description: course.description || "",
      duration: course.duration || "",
      level: course.level || "BEGINNER",
      language: course.language || "English",
      price: course.price || "",
      status: course.status || "DRAFT",
    });
    setThumbnailFile(null);
    setThumbnailPreview(course.thumbnail || null);
    setShowCreateModal(true);
  };

  const openCreateModal = () => {
    setEditingCourseId(null);
    setCreateForm({
      title: "",
      description: "",
      duration: "",
      level: "BEGINNER",
      language: "English",
      price: "",
      status: "DRAFT",
    });
    clearThumbnail();
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.description.trim()) {
      showNotification("Please fill in all required fields", "error");
      return;
    }
    try {
      setCreateLoading(true);
      const fd = new FormData();
      fd.append("title", createForm.title);
      fd.append("description", createForm.description);
      fd.append("duration", Number(createForm.duration) || 0);
      fd.append("price", Number(createForm.price) || 0);
      fd.append("level", createForm.level);
      fd.append("language", createForm.language);
      fd.append("status", createForm.status);
      if (thumbnailFile) {
        fd.append("thumbnail", thumbnailFile);
      }

      if (editingCourseId) {
        const res = await API.put(`/courses/${editingCourseId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data.success) {
          showNotification("Course updated successfully");
          setShowCreateModal(false);
          fetchCourses();
        }
      } else {
        const res = await API.post("/courses", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data.success) {
          showNotification("Course created successfully");
          setShowCreateModal(false);
          fetchCourses();
        }
      }
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to save course",
        "error",
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const executeDeleteCourse = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      await API.delete(`/courses/${deleteTarget.id}`);
      showNotification("Course deleted successfully");
      setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (selectedCourse?.id === deleteTarget.id) setSelectedCourse(null);
      setDeleteTarget(null);
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to delete course",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter & search
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        !searchQuery ||
        course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel =
        levelFilter === "ALL" || course.level === levelFilter;
      const matchesStatus =
        statusFilter === "ALL" || course.status === statusFilter;
      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [courses, searchQuery, levelFilter, statusFilter]);

  // Stats
  const totalModules = (course) => course.modules?.length || 0;
  const totalLessons = (course) =>
    course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;

  // ==================== COURSE DETAIL VIEW ====================
  if (selectedCourse) {
    const course = selectedCourse;

    return (
      <div className="products-page">
        {notification && (
          <div className={`toast toast--${notification.type}`}>
            {notification.type === "success" ? (
              <HiOutlineCheckCircle />
            ) : (
              <HiOutlineExclamationTriangle />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Actions header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <button
            className="course-detail__back"
            onClick={() => setSelectedCourse(null)}
            style={{ marginBottom: 0 }}
          >
            <HiOutlineArrowLeft /> Back to Courses
          </button>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              className="btn btn--outline"
              onClick={() => openEditModal(course)}
              style={{
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
              }}
            >
              <HiOutlinePencilSquare /> Edit Course
            </button>
            <button
              className="btn btn--danger"
              onClick={() => setDeleteTarget(course)}
              style={{
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
              }}
            >
              <HiOutlineTrash /> Delete
            </button>
          </div>
        </div>

        {/* Course header */}
        <div className="course-detail__header">
          <div className="course-detail__thumb-wrap">
            {course.thumbnail ? (
              <img
                src={getFullUrl(course.thumbnail)}
                alt={course.title}
                className="course-detail__thumb"
              />
            ) : (
              <div className="course-detail__thumb-placeholder">
                <HiOutlineBookOpen />
              </div>
            )}
          </div>
          <div className="course-detail__info">
            <div className="course-detail__badges">
              <span
                className={`status-badge ${getStatusBadgeClass(course.status)}`}
              >
                {course.status}
              </span>
              <span
                className="level-badge"
                style={{
                  color: getLevelColor(course.level),
                  background: `${getLevelColor(course.level)}18`,
                }}
              >
                {course.level}
              </span>
            </div>
            <h1 className="course-detail__title">{course.title}</h1>
            <p className="course-detail__desc">{course.description}</p>
            <div className="course-detail__meta">
              <span>
                <HiOutlineClock /> {formatDuration(course.duration)}
              </span>
              <span>
                <HiOutlineLanguage /> {course.language}
              </span>
              <span>
                <HiOutlineCurrencyDollar /> ৳{course.price}
              </span>
              <span>
                <HiOutlineBookOpen /> {totalModules(course)} modules
              </span>
              <span>
                <HiOutlinePlayCircle /> {totalLessons(course)} lessons
              </span>
            </div>
          </div>
        </div>

        {/* Modules & Lessons */}
        <CourseCurriculum
          course={course}
          onUpdate={fetchCourses}
          showNotification={showNotification}
        />

        {/* ===== Create/Edit Modal (shared) ===== */}
        {showCreateModal && (
          <div
            className="modal-overlay"
            onClick={() => !createLoading && setShowCreateModal(false)}
          >
            <div
              className="modal modal--lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal__close"
                onClick={() => setShowCreateModal(false)}
              >
                <HiOutlineXMark />
              </button>
              <h2 className="modal__title">
                {editingCourseId ? "Edit Course" : "Create New Course"}
              </h2>
              <form className="create-form" onSubmit={handleSubmit}>
                <div className="create-form__field">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, title: e.target.value })
                    }
                    placeholder="Course title"
                    autoFocus
                  />
                </div>
                <div className="create-form__field">
                  <label>Thumbnail</label>
                  {thumbnailPreview ? (
                    <div
                      className="upload-preview"
                      style={{ position: "relative" }}
                    >
                      <img
                        src={getFullUrl(thumbnailPreview)}
                        alt="Thumbnail"
                        style={{
                          width: "100%",
                          maxHeight: "160px",
                          objectFit: "cover",
                          borderRadius: "var(--radius-md)",
                        }}
                      />
                      <button
                        type="button"
                        className="upload-preview__remove"
                        onClick={clearThumbnail}
                      >
                        <HiOutlineXMark />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="upload-zone"
                      onClick={() => thumbnailRef.current?.click()}
                    >
                      <HiOutlineCloudArrowUp className="upload-zone__icon" />
                      <p className="upload-zone__text">
                        Click to upload thumbnail
                      </p>
                      <span className="upload-zone__hint">JPG, PNG, WebP</span>
                    </div>
                  )}
                  <input
                    ref={thumbnailRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleThumbnailSelect}
                  />
                </div>
                <div className="create-form__field">
                  <label>Description *</label>
                  <textarea
                    rows="3"
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Course description"
                  />
                </div>
                <div className="create-form__row">
                  <div className="create-form__field">
                    <label>Duration (seconds)</label>
                    <input
                      type="number"
                      value={createForm.duration}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          duration: e.target.value,
                        })
                      }
                      placeholder="e.g. 3600"
                    />
                  </div>
                  <div className="create-form__field">
                    <label>Price</label>
                    <input
                      type="number"
                      value={createForm.price}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, price: e.target.value })
                      }
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>
                <div className="create-form__row">
                  <div className="create-form__field">
                    <label>Level</label>
                    <select
                      value={createForm.level}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, level: e.target.value })
                      }
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div className="create-form__field">
                    <label>Language</label>
                    <input
                      type="text"
                      value={createForm.language}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          language: e.target.value,
                        })
                      }
                      placeholder="e.g. English"
                    />
                  </div>
                  <div className="create-form__field">
                    <label>Status</label>
                    <select
                      value={createForm.status}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, status: e.target.value })
                      }
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                  </div>
                </div>
                <div className="create-form__actions">
                  <button
                    type="button"
                    className="create-form__cancel"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="create-form__submit"
                    disabled={createLoading}
                  >
                    {createLoading ? (
                      <span className="login__spinner" />
                    ) : editingCourseId ? (
                      "Save Changes"
                    ) : (
                      "Create Course"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Delete Confirm Modal ===== */}
        {deleteTarget && (
          <div
            className="modal-overlay"
            onClick={() => !loading && setDeleteTarget(null)}
          >
            <div
              className="modal modal--sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="delete-confirm">
                <div className="delete-confirm__icon">
                  <HiOutlineExclamationTriangle />
                </div>
                <h3>Delete Course</h3>
                <p>
                  Are you sure you want to delete{" "}
                  <strong>{deleteTarget.title}</strong>? This will permanently
                  remove all associated modules and lessons.
                </p>
                <div className="delete-confirm__actions">
                  <button
                    className="delete-confirm__btn delete-confirm__btn--cancel"
                    onClick={() => setDeleteTarget(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="delete-confirm__btn delete-confirm__btn--delete"
                    onClick={executeDeleteCourse}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="login__spinner" />
                    ) : (
                      "Delete Course"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== COURSES LIST VIEW ====================
  return (
    <div className="products-page">
      {notification && (
        <div className={`toast toast--${notification.type}`}>
          {notification.type === "success" ? (
            <HiOutlineCheckCircle />
          ) : (
            <HiOutlineExclamationTriangle />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="products-page__header">
        <div>
          <h1 className="products-page__title">
            <HiOutlineBookOpen className="products-page__title-icon" />
            Courses Management
          </h1>
          <p className="products-page__subtitle">
            {courses.length} course{courses.length !== 1 ? "s" : ""} on the
            platform
          </p>
        </div>
        <button
          className="products-page__add-btn"
          onClick={openCreateModal}
          id="add-course-btn"
        >
          <HiOutlinePlus /> Add Course
        </button>
      </div>

      {/* Toolbar */}
      <div className="products-toolbar">
        <div className="products-toolbar__search">
          <HiOutlineMagnifyingGlass className="products-toolbar__search-icon" />
          <input
            type="text"
            className="products-toolbar__search-input"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="courses-search-input"
          />
          {searchQuery && (
            <button
              className="products-toolbar__search-clear"
              onClick={() => setSearchQuery("")}
            >
              <HiOutlineXMark />
            </button>
          )}
        </div>

        <div className="products-toolbar__filters">
          <HiOutlineFunnel className="products-toolbar__filter-icon" />
          {["ALL", "BEGINNER", "INTERMEDIATE", "ADVANCED"].map((level) => (
            <button
              key={level}
              className={`products-toolbar__filter-btn ${levelFilter === level ? "products-toolbar__filter-btn--active" : ""}`}
              onClick={() => setLevelFilter(level)}
            >
              {level === "ALL" ? "All Levels" : level}
            </button>
          ))}
          <span className="products-toolbar__divider" />
          {["ALL", "PUBLISHED", "DRAFT"].map((status) => (
            <button
              key={status}
              className={`products-toolbar__filter-btn ${statusFilter === status ? "products-toolbar__filter-btn--active" : ""}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === "ALL" ? "All Status" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Course Cards */}
      {loading ? (
        <div className="courses-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="course-card course-card--skeleton">
              <div className="course-card__thumb-skeleton" />
              <div className="course-card__body-skeleton">
                <div
                  className="skeleton-bar"
                  style={{ width: "70%", height: "16px" }}
                />
                <div
                  className="skeleton-bar"
                  style={{ width: "100%", height: "12px" }}
                />
                <div
                  className="skeleton-bar"
                  style={{ width: "50%", height: "12px" }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="products-error">
          <HiOutlineExclamationTriangle />
          <p>{error}</p>
          <button onClick={fetchCourses}>Retry</button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="products-empty">
          <HiOutlineBookOpen />
          <p>No courses found</p>
        </div>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="course-card"
              onClick={() => setSelectedCourse(course)}
            >
              {/* Thumbnail */}
              <div className="course-card__thumb-wrap">
                {course.thumbnail ? (
                  <img
                    src={getFullUrl(course.thumbnail)}
                    alt={course.title}
                    className="course-card__thumb"
                  />
                ) : (
                  <div className="course-card__thumb-placeholder">
                    <HiOutlineBookOpen />
                  </div>
                )}
                <span
                  className={`status-badge status-badge--float ${getStatusBadgeClass(course.status)}`}
                >
                  {course.status}
                </span>
              </div>

              {/* Body */}
              <div className="course-card__body">
                <div className="course-card__top">
                  <span
                    className="level-badge"
                    style={{
                      color: getLevelColor(course.level),
                      background: `${getLevelColor(course.level)}18`,
                    }}
                  >
                    {course.level}
                  </span>
                  <span className="course-card__price">৳{course.price}</span>
                </div>

                <h3 className="course-card__title">{course.title}</h3>
                <p className="course-card__desc">{course.description}</p>

                <div className="course-card__stats">
                  <span>
                    <HiOutlineClock /> {formatDuration(course.duration)}
                  </span>
                  <span>
                    <HiOutlineBookOpen /> {totalModules(course)} modules
                  </span>
                  <span>
                    <HiOutlinePlayCircle /> {totalLessons(course)} lessons
                  </span>
                </div>

                <div className="course-card__footer">
                  <span className="course-card__language">
                    <HiOutlineLanguage /> {course.language}
                  </span>
                  <button className="course-card__view-btn">
                    <HiOutlineEye /> View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Create Course Modal ===== */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => !createLoading && setShowCreateModal(false)}
        >
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal__close"
              onClick={() => setShowCreateModal(false)}
            >
              <HiOutlineXMark />
            </button>

            <h2 className="modal__title">
              {editingCourseId ? "Edit Course" : "Create New Course"}
            </h2>

            <form className="create-form" onSubmit={handleSubmit}>
              <div className="create-form__field">
                <label>Title *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  placeholder="e.g. Spoken English Mastery"
                  id="course-title-input"
                />
              </div>

              <div className="create-form__field">
                <label>Description *</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the course..."
                  rows={3}
                  id="course-desc-input"
                />
              </div>

              <div className="create-form__field">
                <label>Thumbnail</label>
                {thumbnailPreview ? (
                  <div
                    className="upload-preview"
                    style={{ position: "relative" }}
                  >
                    <img
                      src={getFullUrl(thumbnailPreview)}
                      alt="Thumbnail"
                      style={{
                        width: "100%",
                        maxHeight: "160px",
                        objectFit: "cover",
                        borderRadius: "var(--radius-md)",
                      }}
                    />
                    <button
                      type="button"
                      className="upload-preview__remove"
                      onClick={clearThumbnail}
                    >
                      <HiOutlineXMark />
                    </button>
                  </div>
                ) : (
                  <div
                    className="upload-zone"
                    onClick={() => thumbnailRef.current?.click()}
                  >
                    <HiOutlineCloudArrowUp className="upload-zone__icon" />
                    <p className="upload-zone__text">
                      Click to upload thumbnail
                    </p>
                    <span className="upload-zone__hint">JPG, PNG, WebP</span>
                  </div>
                )}
                <input
                  ref={thumbnailRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleThumbnailSelect}
                />
              </div>

              <div className="create-form__row create-form__row--3">
                <div className="create-form__field">
                  <label>Duration (seconds)</label>
                  <input
                    type="number"
                    value={createForm.duration}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, duration: e.target.value })
                    }
                    placeholder="7200"
                    id="course-duration-input"
                  />
                </div>
                <div className="create-form__field">
                  <label>Price (৳)</label>
                  <input
                    type="number"
                    value={createForm.price}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, price: e.target.value })
                    }
                    placeholder="2200"
                    id="course-price-input"
                  />
                </div>
                <div className="create-form__field">
                  <label>Language</label>
                  <input
                    type="text"
                    value={createForm.language}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, language: e.target.value })
                    }
                    placeholder="English"
                    id="course-lang-input"
                  />
                </div>
              </div>

              <div className="create-form__row">
                <div className="create-form__field">
                  <label>Level</label>
                  <select
                    value={createForm.level}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, level: e.target.value })
                    }
                    id="course-level-select"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                <div className="create-form__field">
                  <label>Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, status: e.target.value })
                    }
                    id="course-status-select"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
              </div>

              <div className="create-form__actions">
                <button
                  type="button"
                  className="create-form__cancel"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="create-form__submit"
                  disabled={createLoading}
                  id="create-course-submit"
                >
                  {createLoading ? (
                    <span className="login__spinner" />
                  ) : editingCourseId ? (
                    "Save Changes"
                  ) : (
                    "Create Course"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete Confirm Modal ===== */}
      {deleteTarget && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setDeleteTarget(null)}
        >
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm">
              <div className="delete-confirm__icon">
                <HiOutlineExclamationTriangle />
              </div>
              <h3>Delete Course</h3>
              <p>
                Are you sure you want to delete{" "}
                <strong>{deleteTarget.title}</strong>? This will permanently
                remove all associated modules and lessons.
              </p>
              <div className="delete-confirm__actions">
                <button
                  className="delete-confirm__btn delete-confirm__btn--cancel"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className="delete-confirm__btn delete-confirm__btn--delete"
                  onClick={executeDeleteCourse}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="login__spinner" />
                  ) : (
                    "Delete Course"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
