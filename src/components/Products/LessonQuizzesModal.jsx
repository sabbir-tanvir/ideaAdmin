import { useState, useEffect } from 'react';
import API from '../../api/axios';
import {
  HiOutlineXMark,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineAcademicCap
} from 'react-icons/hi2';

const LessonQuizzesModal = ({ lesson, onClose }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [notification, setNotification] = useState(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('add'); // 'add' or 'edit'
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    question: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correctAnswer: '',
    videoCheckpoint: '',
    point: 10
  });

  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch Quizzes
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get(`/quizzes/lesson/${lesson.id}`);
      if (res.data && res.data.success) {
        setQuizzes(res.data.data);
      } else {
        setQuizzes(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lesson?.id) {
      fetchQuizzes();
    }
  }, [lesson]);

  const showNotificationMsg = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Open Add Form
  const handleAddQuiz = () => {
    setFormMode('add');
    setFormData({
      id: null,
      question: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correctAnswer: '',
      videoCheckpoint: '',
      point: 10
    });
    setShowForm(true);
  };

  // Open Edit Form
  const handleEditQuiz = (quiz) => {
    setFormMode('edit');
    
    let correctOptKey = '';
    if (quiz.options && quiz.options.length > 0) {
      if (quiz.correctAnswer === quiz.options[0]) correctOptKey = 'option1';
      else if (quiz.correctAnswer === quiz.options[1]) correctOptKey = 'option2';
      else if (quiz.correctAnswer === quiz.options[2]) correctOptKey = 'option3';
      else if (quiz.correctAnswer === quiz.options[3]) correctOptKey = 'option4';
    }

    setFormData({
      id: quiz.id,
      question: quiz.question || '',
      option1: quiz.options?.[0] || '',
      option2: quiz.options?.[1] || '',
      option3: quiz.options?.[2] || '',
      option4: quiz.options?.[3] || '',
      correctAnswer: correctOptKey,
      videoCheckpoint: quiz.videoCheckpoint || '',
      point: quiz.point || 10
    });
    setShowForm(true);
  };

  // Validate form
  const validateForm = () => {
    if (!formData.question.trim()) return 'Question is required';
    if (!formData.option1.trim() || !formData.option2.trim()) return 'At least 2 options are required';
    if (!formData.correctAnswer) return 'Please select the correct answer';
    
    // Check if the correct answer matches one of the provided options
    const targetVal = formData[formData.correctAnswer];
    if (!targetVal || !targetVal.trim()) return 'The selected correct answer option is empty';

    return null;
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errMsg = validateForm();
    if (errMsg) {
      showNotificationMsg(errMsg, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const options = [
        formData.option1.trim(),
        formData.option2.trim(),
        formData.option3.trim(),
        formData.option4.trim()
      ].filter(Boolean);

      const payload = {
        lessonId: lesson.id,
        question: formData.question.trim(),
        options: options,
        correctAnswer: formData[formData.correctAnswer].trim(),
        point: Number(formData.point),
      };

      if (formData.videoCheckpoint) {
        payload.videoCheckpoint = Number(formData.videoCheckpoint);
      }

      if (formMode === 'add') {
        const res = await API.post('/quizzes', payload);
        const newQuiz = res.data?.data || res.data;
        if (newQuiz && newQuiz.id) {
          setQuizzes([...quizzes, newQuiz]);
        } else {
          fetchQuizzes();
        }
        showNotificationMsg('Quiz added successfully');
      } else {
        await API.put(`/quizzes/${formData.id}`, payload);
        setQuizzes(prev => prev.map(q => q.id === formData.id ? { ...q, ...payload } : q));
        showNotificationMsg('Quiz updated successfully');
      }
      setShowForm(false);
    } catch (err) {
      showNotificationMsg(err.response?.data?.message || 'Failed to save quiz', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Quiz
  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await API.delete(`/quizzes/${deleteTarget}`);
      setQuizzes(prev => prev.filter(q => q.id !== deleteTarget));
      showNotificationMsg('Quiz deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      showNotificationMsg(err.response?.data?.message || 'Failed to delete quiz', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !submitting && onClose()}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={() => !submitting && onClose()}>
          <HiOutlineXMark />
        </button>

        {/* Global Modal Header */}
        <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <HiOutlineAcademicCap style={{ color: 'var(--color-accent)' }} /> Manage Quizzes
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Lesson: <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{lesson?.title}</span>
          </p>
        </div>

        {notification && (
          <div className={`toast toast--${notification.type}`} style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)' }}>
            {notification.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamationTriangle />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Form View vs List View */}
        {showForm ? (
          <form className="create-form" onSubmit={handleSubmit}>
            <div className="create-form__field">
              <label>Question *</label>
              <textarea
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="What is the capital of France?"
                rows={3}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="create-form__field">
                <label>Option 1 *</label>
                <input
                  type="text"
                  value={formData.option1}
                  onChange={(e) => setFormData({ ...formData, option1: e.target.value })}
                  placeholder="Paris"
                  required
                />
              </div>
              <div className="create-form__field">
                <label>Option 2 *</label>
                <input
                  type="text"
                  value={formData.option2}
                  onChange={(e) => setFormData({ ...formData, option2: e.target.value })}
                  placeholder="London"
                  required
                />
              </div>
              <div className="create-form__field">
                <label>Option 3</label>
                <input
                  type="text"
                  value={formData.option3}
                  onChange={(e) => setFormData({ ...formData, option3: e.target.value })}
                  placeholder="Berlin"
                />
              </div>
              <div className="create-form__field">
                <label>Option 4</label>
                <input
                  type="text"
                  value={formData.option4}
                  onChange={(e) => setFormData({ ...formData, option4: e.target.value })}
                  placeholder="Madrid"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'start' }}>
              <div className="create-form__field">
                <label>Correct Answer *</label>
                <select
                  value={formData.correctAnswer}
                  onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                >
                  <option value="" disabled>Select Correct Option</option>
                  <option value="option1">Option 1 {formData.option1 ? `(${formData.option1})` : ''}</option>
                  <option value="option2">Option 2 {formData.option2 ? `(${formData.option2})` : ''}</option>
                  <option value="option3">Option 3 {formData.option3 ? `(${formData.option3})` : ''}</option>
                  <option value="option4">Option 4 {formData.option4 ? `(${formData.option4})` : ''}</option>
                </select>
              </div>

              <div className="create-form__field">
                <label>Video Checkpoint (seconds)</label>
                <input
                  type="number"
                  value={formData.videoCheckpoint}
                  onChange={(e) => setFormData({ ...formData, videoCheckpoint: e.target.value })}
                  placeholder="120"
                />
              </div>

              <div className="create-form__field">
                <label>Points</label>
                <input
                  type="number"
                  value={formData.point}
                  onChange={(e) => setFormData({ ...formData, point: e.target.value })}
                  placeholder="10"
                  required
                />
              </div>
            </div>

            <div className="create-form__actions" style={{ marginTop: '24px' }}>
              <button type="button" className="create-form__cancel" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="create-form__submit" disabled={submitting}>
                {submitting ? <span className="login__spinner" /> : (formMode === 'add' ? 'Save Quiz' : 'Update Quiz')}
              </button>
            </div>
          </form>
        ) : (
          /* List View */
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button className="products-page__add-btn" onClick={handleAddQuiz}>
                <HiOutlinePlus /> Add New Quiz
              </button>
            </div>

            {loading ? (
               <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                 Loading quizzes...
               </div>
            ) : error ? (
               <div className="products-error">
                 <HiOutlineExclamationTriangle />
                 <p>{error}</p>
                 <button onClick={fetchQuizzes}>Retry</button>
               </div>
            ) : quizzes.length === 0 ? (
               <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                 No quizzes found for this lesson.
               </div>
            ) : (
               <div className="quiz-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto' }}>
                 {quizzes.map((quiz) => (
                   <div key={quiz.id} className="quiz-item" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                     
                     <div style={{ flex: 1, paddingRight: '16px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                         <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{quiz.question}</span>
                         <span className="level-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '0.7rem' }}>
                           {quiz.point || 10} pts
                         </span>
                         {quiz.videoCheckpoint != null && (
                           <span className="level-badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', fontSize: '0.7rem' }}>
                             @ {quiz.videoCheckpoint}s
                           </span>
                         )}
                       </div>
                       
                       <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                         {quiz.options?.map((opt, i) => (
                           <li key={i} style={{ color: opt === quiz.correctAnswer ? 'var(--color-success)' : 'inherit', fontWeight: opt === quiz.correctAnswer ? 600 : 400 }}>
                             {opt} {opt === quiz.correctAnswer && '(Correct)'}
                           </li>
                         ))}
                       </ol>
                     </div>

                     <div className="module-card__action-btns" style={{ display: 'flex', gap: '6px' }}>
                       <button className="curriculum-action-btn curriculum-action-btn--edit" onClick={() => handleEditQuiz(quiz)} title="Edit Quiz">
                         <HiOutlinePencilSquare />
                       </button>
                       <button className="curriculum-action-btn curriculum-action-btn--delete" onClick={() => setDeleteTarget(quiz.id)} title="Delete Quiz">
                         <HiOutlineTrash />
                       </button>
                     </div>

                   </div>
                 ))}
               </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Nested Modal */}
        {deleteTarget && (
          <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => !submitting && setDeleteTarget(null)}>
            <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
              <div className="delete-confirm" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', color: 'var(--color-danger)', marginBottom: '16px' }}><HiOutlineExclamationTriangle /></div>
                <h3>Delete Quiz</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Are you sure you want to delete this quiz?</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={submitting}>Cancel</button>
                  <button className="btn-primary" style={{ background: 'var(--color-danger)' }} onClick={executeDelete} disabled={submitting}>
                    {submitting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonQuizzesModal;
