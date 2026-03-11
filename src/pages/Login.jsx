import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import '../styles/login.css';

const Login = () => {
  const { login, token } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="login">
      {/* Animated background */}
      <div className="login__bg">
        <div className="login__bg-orb login__bg-orb--1" />
        <div className="login__bg-orb login__bg-orb--2" />
        <div className="login__bg-orb login__bg-orb--3" />
      </div>

      <div className="login__card">
        <div className="login__header">
          <div className="login__logo">💡</div>
          <h1 className="login__title">Idea Admin</h1>
          <p className="login__subtitle">Sign in to your admin dashboard</p>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          {error && (
            <div className="login__error" id="login-error">
              <span>{error}</span>
            </div>
          )}

          <div className="login__field">
            <label className="login__label" htmlFor="email">Email</label>
            <div className="login__input-wrapper">
              <HiOutlineEnvelope className="login__input-icon" />
              <input
                id="email"
                type="email"
                className="login__input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login__field">
            <label className="login__label" htmlFor="password">Password</label>
            <div className="login__input-wrapper">
              <HiOutlineLockClosed className="login__input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="login__input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login__eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login__submit"
            disabled={loading}
            id="login-submit-btn"
          >
            {loading ? (
              <span className="login__spinner" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
