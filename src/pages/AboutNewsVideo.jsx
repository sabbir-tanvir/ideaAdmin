import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../api/axios';
import {
  HiOutlineTv,
  HiOutlineNewspaper,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineEye,
  HiOutlineCloudArrowUp,
  HiOutlineArrowPath,
  HiOutlinePlay,
  HiOutlineCalendarDays,
  HiOutlineCheck,
  HiOutlineLink,
} from 'react-icons/hi2';
import '../styles/newsVideo.css';

// ---- URL & Media Helpers ----
const getFullUrl = (path) => {
  if (!path) return null;
  const normalized = path.replace(/\\/g, '/');
  if (normalized.startsWith('blob:') || normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }
  return normalized.startsWith('/')
    ? `https://api.idealessons.com${normalized}`
    : `https://api.idealessons.com/${normalized}`;
};

const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

const getYouTubeThumbnail = (url) => {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

const detectPlatform = (url) => {
  if (!url) return 'YouTube';
  if (url.includes('youtu.be') || url.includes('youtube.com')) return 'YouTube';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook';
  return 'Other';
};

const PLATFORMS = ['YouTube', 'Facebook', 'Television', 'Other'];

// ============================================
// MAIN COMPONENT: AboutNewsVideo
// ============================================
const AboutNewsVideo = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'newspaper-clips' ? 'newspaper-clips' : 'tv-media';

  // ---- TV Media State ----
  const [tvMediaList, setTvMediaList] = useState([]);
  const [tvLoading, setTvLoading] = useState(false);
  const [tvSearch, setTvSearch] = useState('');
  const [tvPlatformFilter, setTvPlatformFilter] = useState('ALL');
  const [tvStatusFilter, setTvStatusFilter] = useState('ALL');

  // TV Modal State
  const [showTvModal, setShowTvModal] = useState(false);
  const [tvModalMode, setTvModalMode] = useState('add'); // 'add' or 'edit'
  const [tvForm, setTvForm] = useState({
    id: null,
    channel: '',
    topic: '',
    link: '',
    platform: 'YouTube',
    isAvailable: true,
  });

  // ---- Newspaper Clips State ----
  const [newspaperList, setNewspaperList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSearch, setNewsSearch] = useState('');
  const [newsStatusFilter, setNewsStatusFilter] = useState('ALL');
  const [newsPage, setNewsPage] = useState(1);
  const [newsTotalPages, setNewsTotalPages] = useState(1);
  const [newsTotalCount, setNewsTotalCount] = useState(0);
  const newsLimit = 8;

  // Newspaper Modal State
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [newsModalMode, setNewsModalMode] = useState('add'); // 'add' or 'edit'
  const [newsForm, setNewsForm] = useState({
    id: null,
    title: '',
    date: '',
    isAvailable: true,
  });
  const [newsImageFile, setNewsImageFile] = useState(null);
  const [newsImagePreview, setNewsImagePreview] = useState(null);
  const newsFileRef = useRef(null);

  // ---- Shared Modals & Notifications ----
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'tv' | 'news', data }
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Lightbox State
  const [lightboxData, setLightboxData] = useState(null); // { url, title, date }

  // Video Preview Modal State
  const [activeVideo, setActiveVideo] = useState(null); // { url, title, platform }

  // Toast notifier
  const showToast = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // ---- Fetch TV Media ----
  const fetchTvMedia = useCallback(async () => {
    setTvLoading(true);
    try {
      const res = await API.get('/tv-media');
      const data = res.data.data || res.data || [];
      setTvMediaList(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch TV media reports', 'error');
    } finally {
      setTvLoading(false);
    }
  }, [showToast]);

  // ---- Fetch Newspaper Clips ----
  const fetchNewspaperClips = useCallback(async (page = newsPage) => {
    setNewsLoading(true);
    try {
      const query = new URLSearchParams();
      query.append('page', page);
      query.append('limit', newsLimit);

      const res = await API.get(`/newspaper-clips?${query.toString()}`);
      const data = res.data;
      if (data.data) {
        setNewspaperList(data.data);
        setNewsTotalPages(data.totalPages || Math.ceil((data.total || data.count || data.data.length) / newsLimit) || 1);
        setNewsTotalCount(data.total || data.count || data.data.length);
      } else if (Array.isArray(data)) {
        setNewspaperList(data);
        setNewsTotalPages(Math.ceil(data.length / newsLimit) || 1);
        setNewsTotalCount(data.length);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch newspaper clips', 'error');
    } finally {
      setNewsLoading(false);
    }
  }, [newsPage, showToast]);

  // Load data on mount & tab/page changes
  useEffect(() => {
    fetchTvMedia();
  }, [fetchTvMedia]);

  useEffect(() => {
    fetchNewspaperClips(newsPage);
  }, [fetchNewspaperClips, newsPage]);

  // Tab switcher
  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  // ============================================
  // TV Media Handlers
  // ============================================
  const openAddTvModal = () => {
    setTvModalMode('add');
    setTvForm({
      id: null,
      channel: '',
      topic: '',
      link: '',
      platform: 'YouTube',
      isAvailable: true,
    });
    setShowTvModal(true);
  };

  const openEditTvModal = (item) => {
    setTvModalMode('edit');
    setTvForm({
      id: item.id,
      channel: item.channel || '',
      topic: item.topic || '',
      link: item.link || '',
      platform: item.platform || detectPlatform(item.link),
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
    });
    setShowTvModal(true);
  };

  const handleTvLinkChange = (url) => {
    const detected = detectPlatform(url);
    setTvForm((prev) => ({
      ...prev,
      link: url,
      platform: detected !== 'Other' ? detected : prev.platform,
    }));
  };

  const handleTvSubmit = async (e) => {
    e.preventDefault();
    if (!tvForm.channel.trim() || !tvForm.topic.trim() || !tvForm.link.trim()) {
      showToast('Please fill in channel, topic, and link URL', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        channel: tvForm.channel.trim(),
        topic: tvForm.topic.trim(),
        link: tvForm.link.trim(),
        platform: tvForm.platform,
        isAvailable: tvForm.isAvailable,
      };

      if (tvModalMode === 'add') {
        await API.post('/tv-media', payload);
        showToast('TV Media Report created successfully!');
      } else {
        await API.put(`/tv-media/${tvForm.id}`, payload);
        showToast('TV Media Report updated successfully!');
      }
      setShowTvModal(false);
      fetchTvMedia();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save TV media report', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleTvAvailability = async (item) => {
    const updatedStatus = !item.isAvailable;
    // Optimistic UI update
    setTvMediaList((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, isAvailable: updatedStatus } : it))
    );

    try {
      await API.put(`/tv-media/${item.id}`, {
        channel: item.channel,
        topic: item.topic,
        link: item.link,
        platform: item.platform,
        isAvailable: updatedStatus,
      });
      showToast(`Status updated to ${updatedStatus ? 'Active' : 'Inactive'}`);
    } catch (err) {
      // Revert on failure
      setTvMediaList((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isAvailable: item.isAvailable } : it))
      );
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // ============================================
  // Newspaper Clips Handlers
  // ============================================
  const openAddNewsModal = () => {
    setNewsModalMode('add');
    setNewsForm({
      id: null,
      title: '',
      date: new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }),
      isAvailable: true,
    });
    setNewsImageFile(null);
    setNewsImagePreview(null);
    if (newsFileRef.current) newsFileRef.current.value = '';
    setShowNewsModal(true);
  };

  const openEditNewsModal = (item) => {
    setNewsModalMode('edit');
    setNewsForm({
      id: item.id,
      title: item.title || '',
      date: item.date || '',
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
    });
    setNewsImageFile(null);
    setNewsImagePreview(item.image?.url ? getFullUrl(item.image.url) : null);
    if (newsFileRef.current) newsFileRef.current.value = '';
    setShowNewsModal(true);
  };

  const handleNewsImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewsImageFile(file);
    setNewsImagePreview(URL.createObjectURL(file));
  };

  const removeNewsImage = () => {
    setNewsImageFile(null);
    setNewsImagePreview(null);
    if (newsFileRef.current) newsFileRef.current.value = '';
  };

  const handleNewsSubmit = async (e) => {
    e.preventDefault();
    if (!newsForm.title.trim()) {
      showToast('Please enter a newspaper clipping title', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', newsForm.title.trim());
      if (newsForm.date) fd.append('date', newsForm.date.trim());
      fd.append('isAvailable', String(newsForm.isAvailable));

      if (newsImageFile) {
        fd.append('image', newsImageFile);
      }

      if (newsModalMode === 'add') {
        await API.post('/newspaper-clips', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Newspaper Clip added successfully!');
      } else {
        await API.put(`/newspaper-clips/${newsForm.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Newspaper Clip updated successfully!');
      }

      setShowNewsModal(false);
      fetchNewspaperClips(newsPage);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save newspaper clip', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleNewsAvailability = async (item) => {
    const updatedStatus = !item.isAvailable;
    // Optimistic UI update
    setNewspaperList((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, isAvailable: updatedStatus } : it))
    );

    try {
      const fd = new FormData();
      fd.append('title', item.title);
      fd.append('date', item.date || '');
      fd.append('isAvailable', String(updatedStatus));

      await API.put(`/newspaper-clips/${item.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast(`Status updated to ${updatedStatus ? 'Active' : 'Inactive'}`);
    } catch (err) {
      // Revert on failure
      setNewspaperList((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isAvailable: item.isAvailable } : it))
      );
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // ============================================
  // Delete Execution Handler
  // ============================================
  const confirmDelete = (type, data) => {
    setDeleteTarget({ type, data });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      if (deleteTarget.type === 'tv') {
        await API.delete(`/tv-media/${deleteTarget.data.id}`);
        showToast('TV Media report deleted successfully');
        fetchTvMedia();
      } else {
        await API.delete(`/newspaper-clips/${deleteTarget.data.id}`);
        showToast('Newspaper clip deleted successfully');
        fetchNewspaperClips(newsPage);
      }
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // Filtered Lists
  // ============================================
  const filteredTvMedia = tvMediaList.filter((item) => {
    const matchesSearch =
      tvSearch === '' ||
      item.channel?.toLowerCase().includes(tvSearch.toLowerCase()) ||
      item.topic?.toLowerCase().includes(tvSearch.toLowerCase());

    const matchesPlatform =
      tvPlatformFilter === 'ALL' ||
      item.platform?.toLowerCase() === tvPlatformFilter.toLowerCase();

    const matchesStatus =
      tvStatusFilter === 'ALL' ||
      (tvStatusFilter === 'ACTIVE' && item.isAvailable) ||
      (tvStatusFilter === 'INACTIVE' && !item.isAvailable);

    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const filteredNewspaper = newspaperList.filter((item) => {
    const matchesSearch =
      newsSearch === '' ||
      item.title?.toLowerCase().includes(newsSearch.toLowerCase()) ||
      item.date?.toLowerCase().includes(newsSearch.toLowerCase());

    const matchesStatus =
      newsStatusFilter === 'ALL' ||
      (newsStatusFilter === 'ACTIVE' && item.isAvailable) ||
      (newsStatusFilter === 'INACTIVE' && !item.isAvailable);

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const activeTvCount = tvMediaList.filter((i) => i.isAvailable).length;
  const activeNewsCount = newspaperList.filter((i) => i.isAvailable).length;

  return (
    <div className="news-video-page">
      {/* Toast Notification */}
      {notification && (
        <div className={`nv-toast nv-toast--${notification.type}`}>
          {notification.type === 'success' ? <HiCheckCircle size={20} /> : <HiOutlineExclamationTriangle size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="news-video-page__header">
        <div className="news-video-page__title-area">
          <h1 className="news-video-page__title">
            <HiOutlineTv className="news-video-page__title-icon" />
            About — News & Video
          </h1>
          <p className="news-video-page__subtitle">
            Manage TV media broadcasts, video reports, and newspaper clippings displayed on the public website.
          </p>
        </div>

        <div className="news-video-page__actions">
          {currentTab === 'tv-media' ? (
            <button className="btn-primary" onClick={openAddTvModal} id="add-tv-report-btn">
              <HiOutlinePlus /> Add TV Report
            </button>
          ) : (
            <button className="btn-primary" onClick={openAddNewsModal} id="add-news-clip-btn">
              <HiOutlinePlus /> Add Newspaper Clip
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="nv-stats-grid">
        <div className="nv-stat-card">
          <div className="nv-stat-card__icon-wrap nv-stat-card__icon-wrap--tv">
            <HiOutlineTv />
          </div>
          <div className="nv-stat-card__info">
            <span className="nv-stat-card__label">TV Media Reports</span>
            <span className="nv-stat-card__value">{tvMediaList.length}</span>
          </div>
        </div>

        <div className="nv-stat-card">
          <div className="nv-stat-card__icon-wrap nv-stat-card__icon-wrap--news">
            <HiOutlineNewspaper />
          </div>
          <div className="nv-stat-card__info">
            <span className="nv-stat-card__label">Newspaper Clips</span>
            <span className="nv-stat-card__value">{newsTotalCount || newspaperList.length}</span>
          </div>
        </div>

        <div className="nv-stat-card">
          <div className="nv-stat-card__icon-wrap nv-stat-card__icon-wrap--active">
            <HiOutlineCheck />
          </div>
          <div className="nv-stat-card__info">
            <span className="nv-stat-card__label">Total Active Items</span>
            <span className="nv-stat-card__value">{activeTvCount + activeNewsCount}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="nv-tabs-container">
        <nav className="nv-tabs-nav" aria-label="Media Types">
          <button
            type="button"
            className={`nv-tab-btn ${currentTab === 'tv-media' ? 'nv-tab-btn--active' : ''}`}
            onClick={() => handleTabChange('tv-media')}
            id="tab-btn-tv-media"
          >
            <HiOutlineTv className="nv-tab-btn__icon" />
            <span>TV Media Reports</span>
            <span className="nv-tab-btn__badge">{tvMediaList.length}</span>
          </button>

          <button
            type="button"
            className={`nv-tab-btn ${currentTab === 'newspaper-clips' ? 'nv-tab-btn--active' : ''}`}
            onClick={() => handleTabChange('newspaper-clips')}
            id="tab-btn-newspaper-clips"
          >
            <HiOutlineNewspaper className="nv-tab-btn__icon" />
            <span>Newspaper Clips</span>
            <span className="nv-tab-btn__badge">{newsTotalCount || newspaperList.length}</span>
          </button>
        </nav>

        <div className="nv-toolbar__right">
          <button
            className="btn-secondary"
            onClick={() => (currentTab === 'tv-media' ? fetchTvMedia() : fetchNewspaperClips(newsPage))}
            title="Refresh Data"
            disabled={tvLoading || newsLoading}
          >
            <HiOutlineArrowPath className={(tvLoading || newsLoading) ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: TV MEDIA REPORTS */}
      {/* ==================================================== */}
      {currentTab === 'tv-media' && (
        <>
          {/* TV Filter Toolbar */}
          <div className="nv-toolbar">
            <div className="nv-toolbar__left">
              <div className="nv-search-box">
                <HiOutlineMagnifyingGlass className="nv-search-box__icon" />
                <input
                  type="text"
                  className="nv-search-box__input"
                  placeholder="Search by channel or topic..."
                  value={tvSearch}
                  onChange={(e) => setTvSearch(e.target.value)}
                  id="search-tv-input"
                />
              </div>

              <select
                className="nv-filter-select"
                value={tvPlatformFilter}
                onChange={(e) => setTvPlatformFilter(e.target.value)}
                id="filter-tv-platform"
              >
                <option value="ALL">All Platforms</option>
                <option value="YouTube">YouTube</option>
                <option value="Facebook">Facebook</option>
                <option value="Television">Television</option>
                <option value="Other">Other</option>
              </select>

              <select
                className="nv-filter-select"
                value={tvStatusFilter}
                onChange={(e) => setTvStatusFilter(e.target.value)}
                id="filter-tv-status"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Hidden Only</option>
              </select>
            </div>
          </div>

          {/* TV Content List */}
          {tvLoading ? (
            <div className="nv-loading-state">
              <div className="nv-spinner" />
              <p>Loading TV media reports...</p>
            </div>
          ) : filteredTvMedia.length === 0 ? (
            <div className="nv-empty-state">
              <HiOutlineTv className="nv-empty-state__icon" />
              <h3 className="nv-empty-state__title">No TV Media Reports Found</h3>
              <p className="nv-empty-state__desc">
                {tvSearch || tvPlatformFilter !== 'ALL' || tvStatusFilter !== 'ALL'
                  ? 'No reports match your search criteria.'
                  : 'Start by adding your first TV media broadcast or interview report.'}
              </p>
              <button className="btn-primary" onClick={openAddTvModal}>
                <HiOutlinePlus /> Add TV Report
              </button>
            </div>
          ) : (
            <div className="tv-media-grid">
              {filteredTvMedia.map((item) => {
                const ytId = getYouTubeId(item.link);
                const thumb = ytId ? getYouTubeThumbnail(item.link) : null;
                const platform = (item.platform || detectPlatform(item.link)).toLowerCase();

                return (
                  <div key={item.id} className={`tv-card ${!item.isAvailable ? 'tv-card--unavailable' : ''}`}>
                    {/* Media Thumbnail */}
                    <div
                      className="tv-card__media"
                      onClick={() => {
                        if (ytId) {
                          setActiveVideo({ url: item.link, title: item.topic, platform: 'YouTube', ytId });
                        } else {
                          window.open(item.link, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      title="Click to play / view video"
                    >
                      {thumb ? (
                        <img src={thumb} alt={item.topic} className="tv-card__thumb" loading="lazy" />
                      ) : (
                        <div className="tv-card__thumb-fallback">
                          <HiOutlineTv />
                          <span style={{ fontSize: '0.8rem' }}>{item.channel}</span>
                        </div>
                      )}

                      <div className="tv-card__play-overlay">
                        <div className="tv-card__play-btn">
                          <HiOutlinePlay />
                        </div>
                      </div>

                      <span className={`tv-card__platform-badge tv-card__platform-badge--${platform}`}>
                        {item.platform || 'Video'}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="tv-card__body">
                      <span className="tv-card__channel-tag">
                        <HiOutlineTv /> {item.channel}
                      </span>
                      <h3 className="tv-card__topic" title={item.topic}>
                        {item.topic}
                      </h3>

                      <div className="tv-card__meta">
                        <span>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nv-icon-btn"
                          title="Open external link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <HiOutlineArrowTopRightOnSquare />
                        </a>
                      </div>
                    </div>

                    {/* Footer / Controls */}
                    <div className="tv-card__footer">
                      <button
                        type="button"
                        className={`status-pill ${item.isAvailable ? 'status-pill--active' : 'status-pill--inactive'}`}
                        onClick={() => toggleTvAvailability(item)}
                        title="Click to toggle visibility"
                      >
                        <span style={{ fontSize: '0.65rem' }}>●</span>
                        {item.isAvailable ? 'Active' : 'Hidden'}
                      </button>

                      <div className="tv-card__actions">
                        <button
                          type="button"
                          className="nv-icon-btn nv-icon-btn--edit"
                          onClick={() => openEditTvModal(item)}
                          title="Edit report"
                        >
                          <HiOutlinePencilSquare />
                        </button>
                        <button
                          type="button"
                          className="nv-icon-btn nv-icon-btn--delete"
                          onClick={() => confirmDelete('tv', item)}
                          title="Delete report"
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
        </>
      )}

      {/* ==================================================== */}
      {/* TAB 2: NEWSPAPER CLIPS */}
      {/* ==================================================== */}
      {currentTab === 'newspaper-clips' && (
        <>
          {/* Newspaper Filter Toolbar */}
          <div className="nv-toolbar">
            <div className="nv-toolbar__left">
              <div className="nv-search-box">
                <HiOutlineMagnifyingGlass className="nv-search-box__icon" />
                <input
                  type="text"
                  className="nv-search-box__input"
                  placeholder="Search by newspaper title or date..."
                  value={newsSearch}
                  onChange={(e) => setNewsSearch(e.target.value)}
                  id="search-news-input"
                />
              </div>

              <select
                className="nv-filter-select"
                value={newsStatusFilter}
                onChange={(e) => setNewsStatusFilter(e.target.value)}
                id="filter-news-status"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Hidden Only</option>
              </select>
            </div>
          </div>

          {/* Newspaper Content List */}
          {newsLoading ? (
            <div className="nv-loading-state">
              <div className="nv-spinner" />
              <p>Loading newspaper clips...</p>
            </div>
          ) : filteredNewspaper.length === 0 ? (
            <div className="nv-empty-state">
              <HiOutlineNewspaper className="nv-empty-state__icon" />
              <h3 className="nv-empty-state__title">No Newspaper Clips Found</h3>
              <p className="nv-empty-state__desc">
                {newsSearch || newsStatusFilter !== 'ALL'
                  ? 'No newspaper clips match your search criteria.'
                  : 'Start by uploading your first newspaper clip image and article details.'}
              </p>
              <button className="btn-primary" onClick={openAddNewsModal}>
                <HiOutlinePlus /> Add Newspaper Clip
              </button>
            </div>
          ) : (
            <>
              <div className="newspaper-grid">
                {filteredNewspaper.map((item) => {
                  const imageUrl = item.image?.url ? getFullUrl(item.image.url) : null;

                  return (
                    <div key={item.id} className="news-clip-card">
                      {/* Image Thumbnail */}
                      <div
                        className="news-clip-card__img-wrap"
                        onClick={() =>
                          setLightboxData({
                            url: imageUrl,
                            title: item.title,
                            date: item.date,
                          })
                        }
                        title="Click to view full image"
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.title}
                            className="news-clip-card__img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="tv-card__thumb-fallback">
                            <HiOutlineNewspaper />
                            <span style={{ fontSize: '0.8rem' }}>No image</span>
                          </div>
                        )}

                        <div className="news-clip-card__zoom-badge">
                          <HiOutlineEye />
                          <span>Preview Clip</span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="news-clip-card__body">
                        <h3 className="news-clip-card__title" title={item.title}>
                          {item.title}
                        </h3>

                        {item.date && (
                          <span className="news-clip-card__date">
                            <HiOutlineCalendarDays /> {item.date}
                          </span>
                        )}
                      </div>

                      {/* Footer / Controls */}
                      <div className="news-clip-card__footer">
                        <button
                          type="button"
                          className={`status-pill ${item.isAvailable ? 'status-pill--active' : 'status-pill--inactive'}`}
                          onClick={() => toggleNewsAvailability(item)}
                          title="Click to toggle visibility"
                        >
                          <span style={{ fontSize: '0.65rem' }}>●</span>
                          {item.isAvailable ? 'Active' : 'Hidden'}
                        </button>

                        <div className="tv-card__actions">
                          <button
                            type="button"
                            className="nv-icon-btn"
                            onClick={() =>
                              setLightboxData({
                                url: imageUrl,
                                title: item.title,
                                date: item.date,
                              })
                            }
                            title="Preview image"
                          >
                            <HiOutlineEye />
                          </button>
                          <button
                            type="button"
                            className="nv-icon-btn nv-icon-btn--edit"
                            onClick={() => openEditNewsModal(item)}
                            title="Edit clip"
                          >
                            <HiOutlinePencilSquare />
                          </button>
                          <button
                            type="button"
                            className="nv-icon-btn nv-icon-btn--delete"
                            onClick={() => confirmDelete('news', item)}
                            title="Delete clip"
                          >
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {newsTotalPages > 1 && (
                <div className="nv-pagination">
                  <div className="nv-pagination__info">
                    Page {newsPage} of {newsTotalPages} ({newsTotalCount} total clips)
                  </div>
                  <div className="nv-pagination__controls">
                    <button
                      className="nv-pagination__btn"
                      onClick={() => setNewsPage((p) => Math.max(p - 1, 1))}
                      disabled={newsPage <= 1}
                    >
                      Previous
                    </button>
                    <span className="nv-pagination__page-indicator">{newsPage}</span>
                    <button
                      className="nv-pagination__btn"
                      onClick={() => setNewsPage((p) => Math.min(p + 1, newsTotalPages))}
                      disabled={newsPage >= newsTotalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ==================================================== */}
      {/* TV MEDIA ADD / EDIT MODAL */}
      {/* ==================================================== */}
      {showTvModal && (
        <div className="modal-overlay" onClick={() => !actionLoading && setShowTvModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                <HiOutlineTv />
                {tvModalMode === 'add' ? 'Add TV Media Report' : 'Edit TV Media Report'}
              </h2>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShowTvModal(false)}
                disabled={actionLoading}
              >
                <HiOutlineXMark />
              </button>
            </div>

            <form onSubmit={handleTvSubmit}>
              <div className="modal__body">
                <div className="form-group">
                  <label htmlFor="tv-channel">TV Channel Name *</label>
                  <input
                    id="tv-channel"
                    type="text"
                    className="form-input"
                    placeholder="e.g. চ্যানেল আই, একাত্তর টিভি, যমুনা টিভি"
                    value={tvForm.channel}
                    onChange={(e) => setTvForm({ ...tvForm, channel: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tv-topic">Topic / Title *</label>
                  <input
                    id="tv-topic"
                    type="text"
                    className="form-input"
                    placeholder="e.g. জীবন যেখানে যেমন - আমাদের স্যার"
                    value={tvForm.topic}
                    onChange={(e) => setTvForm({ ...tvForm, topic: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tv-link">Video Link URL *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="tv-link"
                      type="url"
                      className="form-input"
                      placeholder="https://youtu.be/... or https://facebook.com/..."
                      value={tvForm.link}
                      onChange={(e) => handleTvLinkChange(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="tv-platform">Platform</label>
                    <select
                      id="tv-platform"
                      className="form-select"
                      value={tvForm.platform}
                      onChange={(e) => setTvForm({ ...tvForm, platform: e.target.value })}
                    >
                      {PLATFORMS.map((plat) => (
                        <option key={plat} value={plat}>
                          {plat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ justifyContent: 'center' }}>
                    <label>Visibility Status</label>
                    <label className="checkbox-toggle">
                      <input
                        type="checkbox"
                        checked={tvForm.isAvailable}
                        onChange={(e) => setTvForm({ ...tvForm, isAvailable: e.target.checked })}
                      />
                      <span>Active (visible on website)</span>
                    </label>
                  </div>
                </div>

                {/* Video Preview inside modal if YouTube */}
                {getYouTubeId(tvForm.link) && (
                  <div className="form-group">
                    <label>Thumbnail Preview</label>
                    <div style={{ borderRadius: '8px', overflow: 'hidden', maxHeight: '180px' }}>
                      <img
                        src={getYouTubeThumbnail(tvForm.link)}
                        alt="Preview"
                        style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal__footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowTvModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : tvModalMode === 'add' ? 'Create Report' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* NEWSPAPER CLIPS ADD / EDIT MODAL */}
      {/* ==================================================== */}
      {showNewsModal && (
        <div className="modal-overlay" onClick={() => !actionLoading && setShowNewsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                <HiOutlineNewspaper />
                {newsModalMode === 'add' ? 'Add Newspaper Clip' : 'Edit Newspaper Clip'}
              </h2>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShowNewsModal(false)}
                disabled={actionLoading}
              >
                <HiOutlineXMark />
              </button>
            </div>

            <form onSubmit={handleNewsSubmit}>
              <div className="modal__body">
                <div className="form-group">
                  <label htmlFor="news-title">Article Title / Caption *</label>
                  <input
                    id="news-title"
                    type="text"
                    className="form-input"
                    placeholder="e.g. দৈনিক প্রথম আলো - বিশেষ প্রতিবেদন"
                    value={newsForm.title}
                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="news-date">Publication Date</label>
                    <input
                      id="news-date"
                      type="text"
                      className="form-input"
                      placeholder="e.g. ১৫ মে, ২০২২ or 15 May, 2022"
                      value={newsForm.date}
                      onChange={(e) => setNewsForm({ ...newsForm, date: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ justifyContent: 'center' }}>
                    <label>Visibility Status</label>
                    <label className="checkbox-toggle">
                      <input
                        type="checkbox"
                        checked={newsForm.isAvailable}
                        onChange={(e) => setNewsForm({ ...newsForm, isAvailable: e.target.checked })}
                      />
                      <span>Active (visible on website)</span>
                    </label>
                  </div>
                </div>

                {/* Newspaper Clipping Image Upload */}
                <div className="form-group">
                  <label>Newspaper Clipping Image</label>
                  <input
                    type="file"
                    ref={newsFileRef}
                    onChange={handleNewsImageSelect}
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                  />

                  {newsImagePreview ? (
                    <div className="nv-upload-preview">
                      <img src={newsImagePreview} alt="Clip Preview" className="nv-upload-preview__img" />
                      <button
                        type="button"
                        className="nv-upload-preview__remove"
                        onClick={removeNewsImage}
                        title="Remove image"
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  ) : (
                    <div className="nv-upload-zone" onClick={() => newsFileRef.current?.click()}>
                      <HiOutlineCloudArrowUp className="nv-upload-zone__icon" />
                      <p className="nv-upload-zone__title">Click to upload clipping photo</p>
                      <span className="nv-upload-zone__hint">JPG, PNG, or WebP format</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal__footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowNewsModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : newsModalMode === 'add' ? 'Add Newspaper Clip' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ==================================================== */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !actionLoading && setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div
                style={{
                  fontSize: '3rem',
                  color: 'var(--color-danger)',
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <HiOutlineTrash />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700 }}>
                Delete {deleteTarget.type === 'tv' ? 'TV Media Report' : 'Newspaper Clip'}?
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 24px 0', fontSize: '0.9rem' }}>
                Are you sure you want to delete{' '}
                <strong>
                  {deleteTarget.type === 'tv' ? deleteTarget.data.topic : deleteTarget.data.title}
                </strong>
                ? This action cannot be undone.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDeleteTarget(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary btn-danger"
                  onClick={executeDelete}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* LIGHTBOX FOR NEWSPAPER CLIPS */}
      {/* ==================================================== */}
      {lightboxData && (
        <div className="lightbox-overlay" onClick={() => setLightboxData(null)}>
          <button
            type="button"
            className="lightbox-close-btn"
            onClick={() => setLightboxData(null)}
            title="Close viewer"
          >
            <HiOutlineXMark />
          </button>

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {lightboxData.url ? (
              <img src={lightboxData.url} alt={lightboxData.title} className="lightbox-img" />
            ) : (
              <div style={{ color: '#fff', padding: '40px' }}>No image available</div>
            )}
            <div className="lightbox-caption">
              <h4 className="lightbox-caption__title">{lightboxData.title}</h4>
              {lightboxData.date && <p className="lightbox-caption__date">{lightboxData.date}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* VIDEO PREVIEW MODAL (YouTube) */}
      {/* ==================================================== */}
      {activeVideo && (
        <div className="modal-overlay" onClick={() => setActiveVideo(null)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title" style={{ fontSize: '1rem' }}>
                <HiOutlinePlay /> {activeVideo.title}
              </h3>
              <button type="button" className="modal__close" onClick={() => setActiveVideo(null)}>
                <HiOutlineXMark />
              </button>
            </div>
            <div className="modal__body" style={{ padding: '0', background: '#000' }}>
              <div className="video-modal-wrapper">
                <iframe
                  className="video-modal-iframe"
                  src={`https://www.youtube.com/embed/${activeVideo.ytId}?autoplay=1`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutNewsVideo;
