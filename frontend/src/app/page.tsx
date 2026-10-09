'use client';

import { useState, useRef, useEffect } from 'react';

interface Question {
  question_type: string;
  question_text: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

export interface SkillItem {
  id: string;
  name: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  importance: 'Critical' | 'High' | 'Medium' | 'Nice-to-Have';
  question_type: 'MCQ' | 'Short_Answer' | 'Scenario' | 'Coding';
  benchmark_score: number;
  desired_score?: number;
  weight: number;
  description: string;
}

export interface DimensionItem {
  id: string;
  name: string;
  description: string;
  weight: number;
  desired_score?: number;
  color: string;
  skills: SkillItem[];
}

export interface RecruiterNotificationItem {
  id: number;
  invitation_id: number | null;
  report_id: number | null;
  type: string;
  title: string;
  message: string;
  candidate_name: string | null;
  candidate_email: string | null;
  job_title: string | null;
  score_percentage: number | null;
  is_read: boolean;
  created_at: string | null;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export interface AlertPopupItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration: number;
}

function AlertToastItem({
  alert,
  onDismiss,
}: {
  alert: AlertPopupItem;
  onDismiss: (id: string) => void;
}) {
  const [remainingPercent, setRemainingPercent] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (alert.duration <= 0) return;

    let elapsed = 0;
    const intervalMs = 50;

    const timer = setInterval(() => {
      if (isPausedRef.current) return;

      elapsed += intervalMs;
      const pct = Math.max(0, 100 - (elapsed / alert.duration) * 100);
      setRemainingPercent(pct);

      if (elapsed >= alert.duration) {
        clearInterval(timer);
        onDismissRef.current(alert.id);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [alert.id, alert.duration]);

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={`ta-popup-toast ${alert.type}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
    >
      <div className="ta-popup-body">
        <div className="ta-popup-icon-badge">
          <span>{iconMap[alert.type]}</span>
        </div>
        <div className="ta-popup-content">
          <div className="ta-popup-title">
            <span>{alert.title}</span>
          </div>
          <p className="ta-popup-message">{alert.message}</p>
        </div>
        <button
          type="button"
          className="ta-popup-close"
          onClick={() => onDismiss(alert.id)}
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
      {alert.duration > 0 && (
        <div className="ta-popup-progress">
          <div
            className="ta-popup-progress-bar"
            style={{ width: `${remainingPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  // --- Global Consistent High-Visibility Alert Popups ---
  const [alerts, setAlerts] = useState<AlertPopupItem[]>([]);

  const showAlert = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    title?: string,
    duration: number = 4500
  ) => {
    const defaultTitles: Record<string, string> = {
      success: 'Success',
      error: 'Action Failed',
      warning: 'Attention Required',
      info: 'Information',
    };
    const id = 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newAlert: AlertPopupItem = {
      id,
      type,
      title: title || defaultTitles[type] || 'Notification',
      message,
      duration,
    };
    setAlerts((prev) => [...prev.slice(-3), newAlert]);
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const showSuccess = (msg: string, title?: string) => showAlert(msg, 'success', title || 'Success');
  const showError = (msg: string, title?: string) => showAlert(msg, 'error', title || 'Action Failed');
  const showWarning = (msg: string, title?: string) => showAlert(msg, 'warning', title || 'Attention Required');
  const showInfo = (msg: string, title?: string) => showAlert(msg, 'info', title || 'Information');

  // Override browser native alert() in component scope so ANY alert automatically
  // triggers this high-visibility, consistent popup!
  const alert = (msg: string) => {
    showWarning(msg);
  };

  // --- Auth state ---
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{
    id: number;
    email: string;
    full_name: string | null;
    organization_name: string | null;
    role?: string;
    must_reset_password?: boolean;
  } | null>(null);
  const [authChecked, setAuthChecked] = useState(false); // avoids a flash of the login form before localStorage is checked
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<'recruiter' | 'hr' | 'account_manager' | 'admin'>('recruiter');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerOrgName, setRegisterOrgName] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPw, setShowForgotNewPw] = useState(false);
  const [showForgotConfirmPw, setShowForgotConfirmPw] = useState(false);

  // Candidate Portal & Auth state
  const [authPortalTab, setAuthPortalTab] = useState<'recruiter' | 'candidate'>('recruiter');
  const [candidateAuthMode, setCandidateAuthMode] = useState<'login' | 'register'>('login');
  const [candidateFullName, setCandidateFullName] = useState('');
  const [candidateLoginEmail, setCandidateLoginEmail] = useState('');
  const [candidateLoginPassword, setCandidateLoginPassword] = useState('');
  const [showCandidatePassword, setShowCandidatePassword] = useState(false);
  const [candidateMyAssessments, setCandidateMyAssessments] = useState<any[]>([]);
  const [loadingMyAssessments, setLoadingMyAssessments] = useState(false);
  const [candidateMyReports, setCandidateMyReports] = useState<any[]>([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);
  const [candidateViewingReport, setCandidateViewingReport] = useState<any | null>(null);
  const [loadingCandidateReportDetail, setLoadingCandidateReportDetail] = useState(false);
  const [candidateReportModalOpen, setCandidateReportModalOpen] = useState(false);

  // Mandatory temporary password reset state
  const [resetTempPassword, setResetTempPassword] = useState('');
  const [resetTempConfirm, setResetTempConfirm] = useState('');
  const [resetTempLoading, setResetTempLoading] = useState(false);
  const [resetTempError, setResetTempError] = useState('');
  const [showResetTempPw, setShowResetTempPw] = useState(false);
  const [showResetTempConfirm, setShowResetTempConfirm] = useState(false);

  // Executive Dashboard & Admin Analytics state
  const [adminMonth, setAdminMonth] = useState(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${yr}-${mo}`;
  });
  const [adminYear, setAdminYear] = useState(() => new Date().getFullYear());
  const [adminStats, setAdminStats] = useState<any>(null);
  const [loadingAdminStats, setLoadingAdminStats] = useState(false);

  const [recruitersList, setRecruitersList] = useState<any[]>([]);
  const [loadingRecruitersList, setLoadingRecruitersList] = useState(false);
  const [recruiterSearch, setRecruiterSearch] = useState('');
  const [recruiterRoleFilter, setRecruiterRoleFilter] = useState<string>('all');

  const [yearlyPerformanceData, setYearlyPerformanceData] = useState<any>(null);
  const [loadingYearlyPerf, setLoadingYearlyPerf] = useState(false);

  const [togglingOnboardId, setTogglingOnboardId] = useState<number | null>(null);

  // Wraps fetch() to attach the Authorization header automatically -
  // every existing API call in this file was updated to use this instead
  // of calling fetch() directly.
  const authFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('ta_token') : null);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  };

  // FastAPI error bodies come in two shapes: {detail: "some string"} for
  // errors we raise ourselves, or {detail: [{msg, loc, type}, ...]} for
  // automatic request validation errors (e.g. a missing/empty required
  // field). Passing the array form straight into `new Error()` stringifies
  // it as "[object Object]" - this normalizes either shape into readable text.
  const extractErrorMessage = (errBody: any, fallback: string): string => {
    const detail = errBody?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d?.msg || JSON.stringify(d)).join('; ');
    }
    return fallback;
  };

  // On page load, check for a saved token and validate it against the
  // backend before showing the main app.
  useEffect(() => {
    const saved = localStorage.getItem('ta_token');
    if (!saved) {
      setAuthChecked(true);
      return;
    }
    fetch('http://localhost:8000/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${saved}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then((user) => {
        setAuthToken(saved);
        setAuthUser(user);
        setOrganizationName(user?.organization_name || '');
        setProfileOrgName(user?.organization_name || '');
        setProfileFullName(user?.full_name || '');
        const isExec = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'account_manager';
        if (isExec) {
          setActiveNav('adminDashboard');
          fetchReports(true);
        } else if (user?.role === 'candidate') {
          setActiveNav('candidatePortal');
          fetchCandidateAssessments(saved);
          fetchCandidateReports(saved);
        } else {
          setActiveNav('dashboard');
          fetchReports(true);
        }
      })
      .catch(() => {
        localStorage.removeItem('ta_token');
      })
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = async () => {
    setAuthError('');
    setLogoutMessage('');
    setResetSuccess('');
    if (!loginEmail.trim()) return setAuthError('Please enter your email.');
    if (!loginPassword) return setAuthError('Please enter your password.');

    setAuthLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', loginEmail.trim()); // OAuth2PasswordRequestForm spec uses "username" for the email
      formData.append('password', loginPassword);

      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errBody, 'Login failed.'));
      }
      const data = await res.json();
      localStorage.setItem('ta_token', data.access_token);
      setAuthToken(data.access_token);
      setAuthUser(data.user);
      setOrganizationName(data.user?.organization_name || '');
      setProfileOrgName(data.user?.organization_name || '');
      setProfileFullName(data.user?.full_name || '');
      const isExec = data.user?.role === 'admin' || data.user?.role === 'hr' || data.user?.role === 'account_manager';
      if (isExec) {
        setActiveNav('adminDashboard');
        fetchReports(true);
      } else if (data.user?.role === 'candidate') {
        setActiveNav('candidatePortal');
        fetchCandidateAssessments(data.access_token);
        fetchCandidateReports(data.access_token);
      } else {
        setActiveNav('dashboard');
        fetchReports(true);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCandidateLogin = async () => {
    setAuthError('');
    setLogoutMessage('');
    setResetSuccess('');
    if (!candidateLoginEmail.trim()) return setAuthError('Please enter your candidate email.');
    if (!candidateLoginPassword) return setAuthError('Please enter your password.');

    setAuthLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', candidateLoginEmail.trim());
      formData.append('password', candidateLoginPassword);

      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errBody, 'Candidate login failed. Please verify credentials.'));
      }
      const data = await res.json();
      localStorage.setItem('ta_token', data.access_token);
      setAuthToken(data.access_token);
      setAuthUser(data.user);
      setActiveNav('candidatePortal');
      showSuccess(`Welcome back, ${data.user?.full_name || 'Candidate'}!`, 'Candidate Portal');
      fetchCandidateAssessments(data.access_token);
      fetchCandidateReports(data.access_token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Candidate login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCandidateRegister = async () => {
    setAuthError('');
    setLogoutMessage('');
    setResetSuccess('');
    if (!candidateLoginEmail.trim()) return setAuthError('Please enter your candidate email.');
    if (candidateLoginPassword.length < 6) {
      return setAuthError('Password must be at least 6 characters.');
    }

    setAuthLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/register-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: candidateLoginEmail.trim(),
          password: candidateLoginPassword,
          full_name: candidateFullName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errBody, 'Candidate account registration failed.'));
      }
      const data = await res.json();
      localStorage.setItem('ta_token', data.access_token);
      setAuthToken(data.access_token);
      setAuthUser(data.user);
      setActiveNav('candidatePortal');
      showSuccess(`Account created! Welcome, ${data.user?.full_name || 'Candidate'}.`, 'Account Activated');
      fetchCandidateAssessments(data.access_token);
      fetchCandidateReports(data.access_token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Candidate registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchCandidateAssessments = async (explicitToken?: string) => {
    const token = explicitToken || authToken || (typeof window !== 'undefined' ? localStorage.getItem('ta_token') : null);
    if (!token) return;
    setLoadingMyAssessments(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/candidate/my-assessments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCandidateMyAssessments(Array.isArray(data) ? data : (data.assessments || []));
    } catch (err) {
      console.error('Error fetching candidate assessments:', err);
    } finally {
      setLoadingMyAssessments(false);
    }
  };

  const fetchCandidateReports = async (explicitToken?: string) => {
    const token = explicitToken || authToken || (typeof window !== 'undefined' ? localStorage.getItem('ta_token') : null);
    if (!token) return;
    setLoadingMyReports(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/candidate/my-reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCandidateMyReports(Array.isArray(data) ? data : (data.reports || []));
    } catch (err) {
      console.error('Error fetching candidate reports:', err);
    } finally {
      setLoadingMyReports(false);
    }
  };

  const openCandidateReportModal = async (reportId: number) => {
    setLoadingCandidateReportDetail(true);
    setCandidateReportModalOpen(true);
    setCandidateViewingReport(null);
    try {
      const res = await authFetch(`http://localhost:8000/api/v1/candidate/my-reports/${reportId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to load evaluation report details');
      }
      const data = await res.json();
      setCandidateViewingReport(data);
    } catch (err: any) {
      showError(err.message || 'Could not load report details.', 'Report Error');
    } finally {
      setLoadingCandidateReportDetail(false);
    }
  };

  const openCandidatePublicReportModal = async (token: string) => {
    setLoadingCandidateReportDetail(true);
    setCandidateReportModalOpen(true);
    setCandidateViewingReport(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/assessment/public-report/${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to load evaluation report');
      }
      const data = await res.json();
      setCandidateViewingReport(data);
    } catch (err: any) {
      showError(err.message || 'Could not load evaluation report.', 'Report Error');
    } finally {
      setLoadingCandidateReportDetail(false);
    }
  };

  const handleRegister = async () => {
    setAuthError('');
    setLogoutMessage('');
    setResetSuccess('');
    if (!registerEmail.trim()) return setAuthError('Please enter your email.');
    if (registerPassword && registerPassword.length < 8) {
      return setAuthError('Password must be at least 8 characters if specified.');
    }

    setAuthLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', registerEmail.trim());
      if (registerPassword) formData.append('password', registerPassword);
      formData.append('role', registerRole);
      if (registerFullName) formData.append('full_name', registerFullName);
      if (registerOrgName) formData.append('organization_name', registerOrgName);

      const res = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errBody, 'Registration failed.'));
      }
      const data = await res.json();
      const createdEmail = registerEmail.trim();

      // Clear registration inputs
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterFullName('');
      setRegisterOrgName('');

      // Redirect to login page
      setAuthMode('login');
      setLoginEmail(createdEmail);
      setLoginPassword('');

      if (data.must_reset_password) {
        setResetSuccess(
          `Account created for ${createdEmail}! A temporary password has been dispatched to your email. Please enter your email and temporary password to log in and set your permanent password.`
        );
        showSuccess(
          `Account created for ${createdEmail}! Temporary password dispatched to inbox. Please log in with your temporary password.`,
          'Account Created'
        );
      } else {
        setResetSuccess(
          `Account created successfully for ${createdEmail}! You can now log in with your chosen password.`
        );
        showSuccess(
          `Account created for ${createdEmail}! Please log in with your password.`,
          'Account Created'
        );
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setAuthError('');
    setLogoutMessage('');
    setResetSuccess('');

    const email = forgotEmail.trim();
    if (!email) return setAuthError('Please enter your email address.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setAuthError('Please enter a valid email address.');
    if (!forgotNewPassword) return setAuthError('Please enter a new password.');
    if (forgotNewPassword.length < 8) return setAuthError('Password must be at least 8 characters.');
    if (forgotNewPassword !== forgotConfirmPassword) return setAuthError('Passwords do not match.');

    setAuthLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('new_password', forgotNewPassword);

      const res = await fetch('http://localhost:8000/api/v1/auth/forgot-password', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errBody, 'Password reset failed.'));
      }
      const data = await res.json();
      setResetSuccess(data.message || 'Password reset successfully. You can now log in with your new password.');
      setLoginEmail(email);
      setLoginPassword('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setAuthMode('login');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    // Brief pause so the loading state is actually visible - logout itself
    // is just clearing local state, but an instant transition with no
    // feedback reads as "did that even work?"
    await new Promise((resolve) => setTimeout(resolve, 400));
    localStorage.removeItem('ta_token');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ta_job_match');
      sessionStorage.removeItem('ta_multi_match_results');
    }
    setJobMatchResult(null);
    setMultiMatchResults([]);
    setAuthToken(null);
    setAuthUser(null);
    setOrganizationName('');
    setRegisterOrgName('');
    setProfileOrgName('');
    setProfileFullName('');
    setLoginEmail('');
    setLoginPassword('');
    setForgotEmail('');
    setResetTempPassword('');
    setResetTempConfirm('');
    setReports([]);
    setNotifications([]);
    setUnreadNotifCount(0);
    setActiveNav('dashboard');
    setRecruiterRoleFilter('all');
    setRecruiterSearch('');
    setLoggingOut(false);
    setLogoutMessage('You have been successfully logged out.');
    setResetSuccess('');
  };

  // --- Profile Settings state ---
  const [profileFullName, setProfileFullName] = useState('');
  const [profileOrgName, setProfileOrgName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  // Prefill the profile form whenever the logged-in user's data changes
  // (initial login, or after a save).
  useEffect(() => {
    if (authUser) {
      setProfileFullName(authUser.full_name || '');
      setProfileOrgName(authUser.organization_name || '');
    }
  }, [authUser]);

  const handleUpdateProfile = async () => {
    setProfileMessage('');
    setProfileError('');
    setProfileSaving(true);
    try {
      const formData = new FormData();
      formData.append('full_name', profileFullName);
      formData.append('organization_name', profileOrgName);

      const res = await authFetch('http://localhost:8000/api/v1/auth/me', {
        method: 'PUT',
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errBody, 'Failed to update profile.'));
      }
      const updated = await res.json();
      setAuthUser(updated);
      setOrganizationName(updated.organization_name || ''); // reflect immediately - was only updating on next page load before
      setProfileMessage('Profile updated.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // --- Change Password state ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Real-time password strength - recomputed on every render from
  // newPassword, so the checklist/bar update as the user types.
  const pwRules = [
    { label: 'Include uppercase & lowercase characters', met: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
    { label: 'Include at least 1 number & 1 symbol', met: /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword) },
    { label: 'At least 8 characters long', met: newPassword.length >= 8 },
    { label: 'Use at least 4 unique characters', met: new Set(newPassword).size >= 4 },
    { label: 'No spaces', met: newPassword.length > 0 && !/\s/.test(newPassword) },
  ];
  const pwScore = pwRules.filter((r) => r.met).length;
  const pwStrengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];
  const pwStrengthColors = ['#d92d20', '#d92d20', '#b56b00', '#b56b00', '#1f8f5f', '#1f8f5f'];
  const pwStrengthLabel = pwStrengthLabels[pwScore];
  const pwStrengthColor = pwStrengthColors[pwScore];

  // Avatar dropdown (Profile / Change Password)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const displayName = authUser?.full_name || authUser?.email || '';
  const initials = (authUser?.full_name || authUser?.email || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const handleChangePassword = async () => {
    setPasswordMessage('');
    setPasswordError('');
    if (!currentPassword) return setPasswordError('Please enter your current password.');
    if (newPassword.length < 8) return setPasswordError('New password must be at least 8 characters.');
    if (newPassword !== confirmNewPassword) return setPasswordError('New passwords do not match.');

    setPasswordSaving(true);
    try {
      const formData = new FormData();
      formData.append('current_password', currentPassword);
      formData.append('new_password', newPassword);

      const res = await authFetch('http://localhost:8000/api/v1/auth/change-password', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errBody, 'Failed to change password.'));
      }
      setPasswordMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  type NavSection =
    | 'dashboard'
    | 'source'
    | 'dimensions'
    | 'match'
    | 'generate'
    | 'assessment'
    | 'reports'
    | 'notifications'
    | 'tech'
    | 'profile'
    | 'changePassword'
    | 'adminDashboard'
    | 'recruitersList'
    | 'yearlyPerformance'
    | 'candidatePortal'
    | 'candidateReports';

  // Section titles dictionary for human-friendly labels & back button references
  const navTitles: Record<NavSection, string> = {
    dashboard: 'Recruiter Dashboard',
    adminDashboard: 'Executive Dashboard',
    recruitersList: 'Total Recruiters Directory',
    yearlyPerformance: 'Yearly Performance & Analytics',
    candidatePortal: 'My Assessments',
    candidateReports: 'My Evaluation Reports',
    source: 'Upload JD',
    dimensions: 'Dimensions & Skills',
    match: 'Job Match',
    generate: 'Assessment Config',
    assessment: 'Candidate Assessment',
    reports: 'Evaluation Reports',
    notifications: 'Notifications',
    tech: 'Tech Stack & R&D',
    profile: 'Profile',
    changePassword: 'Change Password',
  };

  // Previous menu navigation strictly based on the sidebar menu sequence
  const previousMenuMap: Record<NavSection, NavSection> = {
    adminDashboard: 'adminDashboard',
    recruitersList: 'adminDashboard',
    yearlyPerformance: 'recruitersList',
    dashboard: 'dashboard',
    candidatePortal: 'candidatePortal',
    candidateReports: 'candidatePortal',
    source: 'dashboard',
    dimensions: 'source',
    match: 'dimensions',
    generate: 'match',
    assessment: 'generate',
    reports: 'assessment',
    notifications: 'reports',
    tech: 'notifications',
    profile: 'dashboard',
    changePassword: 'profile',
  };

  // Sidebar navigation - which section is currently visible
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [navLoading, setNavLoading] = useState(false);

  // Switches sections with a visible loading state.
  const goTo = (section: NavSection) => {
    setProfileMenuOpen(false);
    if (authUser?.role === 'admin' && section === 'dashboard') {
      section = 'adminDashboard';
    }
    if (authUser?.role === 'candidate' && (section === 'dashboard' || section === 'adminDashboard')) {
      section = 'candidatePortal';
    }
    if (section === activeNav) return;
    setNavLoading(true);
    if (section === 'candidatePortal') {
      fetchCandidateAssessments().finally(() => {
        setActiveNav(section);
        setNavLoading(false);
      });
    } else if (section === 'candidateReports') {
      fetchCandidateReports().finally(() => {
        setActiveNav(section);
        setNavLoading(false);
      });
    } else if (section === 'reports') {
      fetchReports(true).finally(() => {
        setActiveNav(section);
        setNavLoading(false);
      });
    } else if (section === 'notifications') {
      fetchNotifications(true).finally(() => {
        setActiveNav(section);
        setNavLoading(false);
      });
    } else if (section === 'dimensions') {
      fetchSkillMatrix().finally(() => {
        setActiveNav(section);
        setNavLoading(false);
      });
    } else if (section === 'adminDashboard') {
      fetchAdminDashboardStats().finally(() => {
        setActiveNav(section);
        setNavLoading(false);
      });
    } else if (section === 'recruitersList') {
      fetchRecruitersList().finally(() => {
        setActiveNav(section);
        setNavLoading(false);
      });
    } else if (section === 'yearlyPerformance') {
      fetchYearlyPerformance().finally(() => {
        setActiveNav(section);
        setNavLoading(false);
      });
    } else {
      setTimeout(() => {
        setActiveNav(section);
        setNavLoading(false);
      }, 220);
    }
  };

  const fetchAdminDashboardStats = async (monthOverride?: string) => {
    const targetMonth = monthOverride || adminMonth;
    setLoadingAdminStats(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/v1/admin/dashboard-stats?month=${targetMonth}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await res.json();
      setAdminStats(data);
    } catch (e) {
      console.error('Error fetching admin dashboard stats:', e);
    } finally {
      setLoadingAdminStats(false);
    }
  };

  const fetchRecruitersList = async (monthOverride?: string, yearOverride?: number, roleOverride?: string) => {
    const targetMonth = monthOverride !== undefined ? monthOverride : adminMonth;
    const targetYear = yearOverride !== undefined ? yearOverride : adminYear;
    const targetRole = roleOverride !== undefined ? roleOverride : recruiterRoleFilter;
    setLoadingRecruitersList(true);
    try {
      const roleParam = targetRole && targetRole !== 'all' ? `&role=${targetRole}` : '';
      const res = await authFetch(`http://localhost:8000/api/v1/admin/recruiters-list?month=${targetMonth}&year=${targetYear}${roleParam}`);
      if (!res.ok) throw new Error('Failed to fetch recruiters list');
      const data = await res.json();
      setRecruitersList(data.recruiters || []);
    } catch (e) {
      console.error('Error fetching recruiters list:', e);
    } finally {
      setLoadingRecruitersList(false);
    }
  };

  const fetchYearlyPerformance = async (yearOverride?: number) => {
    const targetYear = yearOverride || adminYear;
    setLoadingYearlyPerf(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/v1/admin/yearly-performance?year=${targetYear}`);
      if (!res.ok) throw new Error('Failed to fetch yearly performance');
      const data = await res.json();
      setYearlyPerformanceData(data);
    } catch (e) {
      console.error('Error fetching yearly performance:', e);
    } finally {
      setLoadingYearlyPerf(false);
    }
  };

  const handleExportYearlyPerformance = async (yearOverride?: number) => {
    const targetYear = yearOverride || adminYear;
    try {
      const res = await authFetch(`http://localhost:8000/api/v1/admin/export-yearly-performance?year=${targetYear}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yearly_performance_${targetYear}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess(`Yearly performance CSV for ${targetYear} downloaded successfully.`);
    } catch (e) {
      showError('Failed to export yearly performance CSV.');
    }
  };

  const handleToggleOnboard = async (reportId: number, currentStatus: boolean) => {
    setTogglingOnboardId(reportId);
    try {
      const formData = new FormData();
      formData.append('report_id', String(reportId));
      formData.append('is_onboarded', String(!currentStatus));

      const res = await authFetch('http://localhost:8000/api/v1/assessment/toggle-onboard', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(err, 'Failed to update onboarded status.'));
      }
      const data = await res.json();
      const updatedStatus = data.is_onboarded;

      setReports((prev) =>
        prev.map((r) => (r.report_id === reportId ? { ...r, is_onboarded: updatedStatus } : r))
      );
      if (selectedReport && selectedReport.report_id === reportId) {
        setSelectedReport((prev: any) => (prev ? { ...prev, is_onboarded: updatedStatus } : prev));
      }
      showSuccess(
        updatedStatus ? 'Candidate marked as onboarded!' : 'Candidate onboard status removed.',
        'Status Updated'
      );

      // Refresh admin suite stats if loaded
      if (adminStats) {
        fetchAdminDashboardStats();
      }
      if (recruitersList && recruitersList.length > 0) {
        fetchRecruitersList();
      }
      if (yearlyPerformanceData) {
        fetchYearlyPerformance();
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not update onboarded status');
    } finally {
      setTogglingOnboardId(null);
    }
  };

  const handleResetTemporaryPassword = async () => {
    setResetTempError('');
    if (!resetTempPassword) {
      setResetTempError('Please enter your new password.');
      return;
    }
    if (resetTempPassword.length < 8) {
      setResetTempError('Password must be at least 8 characters long.');
      return;
    }
    if (resetTempPassword !== resetTempConfirm) {
      setResetTempError('Passwords do not match.');
      return;
    }

    setResetTempLoading(true);
    try {
      const formData = new FormData();
      formData.append('new_password', resetTempPassword);

      const res = await authFetch('http://localhost:8000/api/v1/auth/reset-temporary-password', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(err, 'Failed to reset password.'));
      }
      const data = await res.json();
      setAuthUser(data.user);
      setOrganizationName(data.user?.organization_name || '');
      setProfileOrgName(data.user?.organization_name || '');
      setProfileFullName(data.user?.full_name || '');
      setResetTempPassword('');
      setResetTempConfirm('');
      showSuccess('Password reset successfully! You now have full access to your portal.', 'Welcome');
    } catch (e) {
      setResetTempError(e instanceof Error ? e.message : 'Failed to reset password.');
    } finally {
      setResetTempLoading(false);
    }
  };

  // Auto-fetch data on activeNav change
  useEffect(() => {
    if (!authToken || !authUser) return;
    if (activeNav === 'adminDashboard') {
      fetchAdminDashboardStats();
    } else if (activeNav === 'recruitersList') {
      fetchRecruitersList();
    } else if (activeNav === 'yearlyPerformance') {
      fetchYearlyPerformance();
    } else if (activeNav === 'dimensions') {
      fetchSkillMatrix();
    }
  }, [activeNav, authToken, authUser]);

  const previousSection = (authUser?.role === 'admin' && (previousMenuMap[activeNav] === 'dashboard' || previousMenuMap[activeNav] === 'assessment'))
    ? 'adminDashboard'
    : (previousMenuMap[activeNav] || (authUser?.role === 'admin' ? 'adminDashboard' : 'dashboard'));
  const previousSectionName = navTitles[previousSection];

  const goBack = () => {
    goTo(previousSection);
  };

  // Organization Name - dynamically prefilled and strictly bound to the
  // authenticated user's account. Updates whenever authUser changes.
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    setOrganizationName(authUser?.organization_name || '');
    setProfileOrgName(authUser?.organization_name || '');
    setProfileFullName(authUser?.full_name || '');
  }, [authUser]);

  // Ingestion State
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);

  // Assessment Configuration State
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [numSets, setNumSets] = useState(1);
  const [numCandidates, setNumCandidates] = useState(1);
  const [shuffleQuestionsOpt, setShuffleQuestionsOpt] = useState(false);
  const [shuffleOptionsOpt, setShuffleOptionsOpt] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Candidate taking the currently active set
  const [candidateName, setCandidateName] = useState('');

  // Employer eligibility check - manually entered and self-attested by
  // the recruiter after checking LinkedIn themselves (no automated
  // verification - LinkedIn's API requires partner approval we don't
  // have, and scraping violates their ToS).
  interface EmployerEntry {
    company_name: string;
    employee_count: number;
    linkedin_verified: boolean;
  }
  const [previousEmployers, setPreviousEmployers] = useState<EmployerEntry[]>([]);

  const addEmployer = () => {
    setPreviousEmployers((prev) => [...prev, { company_name: '', employee_count: 0, linkedin_verified: false }]);
  };
  const updateEmployer = (idx: number, field: keyof EmployerEntry, value: string | number | boolean) => {
    setPreviousEmployers((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };
  const removeEmployer = (idx: number) => {
    setPreviousEmployers((prev) => prev.filter((_, i) => i !== idx));
  };

  // Client-side preview of eligibility, mirroring the backend's logic, so
  // the recruiter sees the status before submitting.
  const employerEligibilityPreview = (): 'yes' | 'unverified' | 'no' | null => {
    if (previousEmployers.length === 0) return null;
    const anyTooSmall = previousEmployers.some((e) => e.linkedin_verified && e.employee_count <= 50);
    if (anyTooSmall) return 'no';
    const allVerified = previousEmployers.every((e) => e.linkedin_verified);
    return allVerified ? 'yes' : 'unverified';
  };

  // Assessment & Evaluation State
  const [evaluating, setEvaluating] = useState(false);

  // Each generated set carries its own questions, in-progress answers,
  // computed evaluations, and submission status - kept independent so
  // submitting one set never affects the others.
  interface SetData {
    assessmentId: number | null;
    questions: Question[];
    candidateAnswers: { [key: number]: string };
    evaluations: { [key: number]: any };
    submitted: boolean;
  }
  const [questionSets, setQuestionSets] = useState<SetData[]>([]);
  const [activeSetIndex, setActiveSetIndex] = useState(0);

  // Derived view of whichever set is currently active - not separate
  // state, so there's nothing to fall out of sync with questionSets.
  const activeSet = questionSets[activeSetIndex];
  const questions = activeSet?.questions || [];
  const candidateAnswers = activeSet?.candidateAnswers || {};
  const evaluations = activeSet?.evaluations || {};

  // DB linkage - set once source material is ingested
  const [sourceId, setSourceId] = useState<number | null>(null);

  // ============================================================================
  // Dimensions & Skills Matrix State & Handlers
  // ============================================================================
  const defaultDimensionsList: DimensionItem[] = [
    {
      id: 'dim-1',
      name: 'Backend & API Architecture',
      description: 'Server-side design, REST/GraphQL APIs, business logic execution, data integrity, and error contracts.',
      weight: 30,
      desired_score: 80,
      color: '#2563eb',
      skills: [
        {
          id: 'sk-1',
          name: 'RESTful API Architecture & Design',
          proficiency: 'Advanced',
          importance: 'Critical',
          question_type: 'MCQ',
          benchmark_score: 75,
          desired_score: 85,
          weight: 35,
          description: 'HTTP status codes, idempotency, API versioning, serialization, and contract design.'
        },
        {
          id: 'sk-2',
          name: 'Server Frameworks (FastAPI / Node / Django)',
          proficiency: 'Advanced',
          importance: 'Critical',
          question_type: 'Short_Answer',
          benchmark_score: 70,
          desired_score: 80,
          weight: 35,
          description: 'Routing, middleware, async handlers, and database ORM integration.'
        },
        {
          id: 'sk-3',
          name: 'Async I/O & Concurrency Patterns',
          proficiency: 'Intermediate',
          importance: 'High',
          question_type: 'Scenario',
          benchmark_score: 65,
          desired_score: 75,
          weight: 30,
          description: 'Coroutines, event loops, race condition avoidance, and thread pooling.'
        }
      ]
    },
    {
      id: 'dim-2',
      name: 'Frontend & Interactive UX',
      description: 'Component architecture, responsive layouts, web accessibility, and reactive client state.',
      weight: 25,
      desired_score: 80,
      color: '#7c3aed',
      skills: [
        {
          id: 'sk-4',
          name: 'Modern React & Hook Lifecycle',
          proficiency: 'Advanced',
          importance: 'Critical',
          question_type: 'MCQ',
          benchmark_score: 75,
          desired_score: 85,
          weight: 40,
          description: 'Custom hooks, re-render avoidance, memoization, and component boundaries.'
        },
        {
          id: 'sk-5',
          name: 'TypeScript & Type Safety',
          proficiency: 'Intermediate',
          importance: 'High',
          question_type: 'Short_Answer',
          benchmark_score: 70,
          desired_score: 80,
          weight: 30,
          description: 'Generics, interfaces, utility types, and strict type checking.'
        },
        {
          id: 'sk-6',
          name: 'Responsive CSS & WCAG Accessibility',
          proficiency: 'Intermediate',
          importance: 'Medium',
          question_type: 'MCQ',
          benchmark_score: 65,
          desired_score: 75,
          weight: 30,
          description: 'CSS Grid, Flexbox, semantic HTML5, and screen-reader standards.'
        }
      ]
    },
    {
      id: 'dim-3',
      name: 'Database & Data Persistence',
      description: 'Relational data modeling, query planning, indexing strategies, and transactional consistency.',
      weight: 25,
      desired_score: 80,
      color: '#059669',
      skills: [
        {
          id: 'sk-7',
          name: 'SQL & Relational Schema Modeling',
          proficiency: 'Advanced',
          importance: 'Critical',
          question_type: 'MCQ',
          benchmark_score: 75,
          desired_score: 85,
          weight: 50,
          description: 'Normalization, constraints, multi-table joins, and foreign key cascades.'
        },
        {
          id: 'sk-8',
          name: 'Indexing & Query Performance Tuning',
          proficiency: 'Intermediate',
          importance: 'High',
          question_type: 'Scenario',
          benchmark_score: 65,
          desired_score: 75,
          weight: 50,
          description: 'B-tree index structures, EXPLAIN analysis, and eliminating sequential scans.'
        }
      ]
    },
    {
      id: 'dim-4',
      name: 'System Design & Technical Communication',
      description: 'Scalable cloud architectures, distributed resilience, and articulating engineering trade-offs.',
      weight: 20,
      desired_score: 75,
      color: '#d97706',
      skills: [
        {
          id: 'sk-9',
          name: 'Distributed Systems & Microservices',
          proficiency: 'Intermediate',
          importance: 'High',
          question_type: 'Scenario',
          benchmark_score: 65,
          desired_score: 75,
          weight: 50,
          description: 'Caching layers, message brokers, decoupled services, and fault tolerance.'
        },
        {
          id: 'sk-10',
          name: 'Technical Articulation & Stakeholder Clarity',
          proficiency: 'Advanced',
          importance: 'Critical',
          question_type: 'Short_Answer',
          benchmark_score: 75,
          desired_score: 80,
          weight: 50,
          description: 'Explaining technical trade-offs and architectural decisions with precision and clarity.'
        }
      ]
    }
  ];

  const [skillMatrixRoleTitle, setSkillMatrixRoleTitle] = useState('Full-Stack Software Engineer');
  const [matrixDimensions, setMatrixDimensions] = useState<DimensionItem[]>(defaultDimensionsList);
  const [matrixDbId, setMatrixDbId] = useState<number | null>(null);
  const [matrixLastSaved, setMatrixLastSaved] = useState<string | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [aiExtractingMatrix, setAiExtractingMatrix] = useState(false);

  // Filters
  const [dimSearchTerm, setDimSearchTerm] = useState('');
  const [filterDimId, setFilterDimId] = useState('all');
  const [filterProficiency, setFilterProficiency] = useState('all');
  const [filterImportance, setFilterImportance] = useState('all');

  // Modals
  const [dimModalOpen, setDimModalOpen] = useState(false);
  const [editingDimId, setEditingDimId] = useState<string | null>(null);
  const [dimFormName, setDimFormName] = useState('');
  const [dimFormDesc, setDimFormDesc] = useState('');
  const [dimFormWeight, setDimFormWeight] = useState(25);
  const [dimFormDesiredScore, setDimFormDesiredScore] = useState(80);
  const [dimFormColor, setDimFormColor] = useState('#2563eb');

  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [skillModalDimId, setSkillModalDimId] = useState<string>('');
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillFormName, setSkillFormName] = useState('');
  const [skillFormProficiency, setSkillFormProficiency] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'>('Intermediate');
  const [skillFormImportance, setSkillFormImportance] = useState<'Critical' | 'High' | 'Medium' | 'Nice-to-Have'>('High');
  const [skillFormQuestionType, setSkillFormQuestionType] = useState<'MCQ' | 'Short_Answer' | 'Scenario' | 'Coding'>('MCQ');
  const [skillFormBenchmark, setSkillFormBenchmark] = useState(70);
  const [skillFormDesiredScore, setSkillFormDesiredScore] = useState(80);
  const [skillFormWeight, setSkillFormWeight] = useState(25);
  const [skillFormDesc, setSkillFormDesc] = useState('');

  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Template Manager & Editor states
  const [tplEditorOpen, setTplEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [tplFormRoleTitle, setTplFormRoleTitle] = useState('');
  const [tplFormDesc, setTplFormDesc] = useState('');
  const [tplFormDimensions, setTplFormDimensions] = useState<DimensionItem[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);

  // Quick "Save Current Matrix As Template" modal
  const [saveAsTplModalOpen, setSaveAsTplModalOpen] = useState(false);
  const [saveAsTplTitle, setSaveAsTplTitle] = useState('');
  const [saveAsTplDesc, setSaveAsTplDesc] = useState('');
  const [savingAsTpl, setSavingAsTpl] = useState(false);

  const [aiExtractModalOpen, setAiExtractModalOpen] = useState(false);
  const [aiExtractPromptText, setAiExtractPromptText] = useState('');
  const [aiExtractRoleInput, setAiExtractRoleInput] = useState('');

  const fetchSkillMatrix = async (srcId?: number) => {
    setLoadingMatrix(true);
    try {
      const targetSourceId = srcId !== undefined ? srcId : sourceId;
      const url = targetSourceId
        ? `http://localhost:8000/api/v1/dimensions-skills?source_id=${targetSourceId}`
        : 'http://localhost:8000/api/v1/dimensions-skills';
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.role_title) setSkillMatrixRoleTitle(data.role_title);
        if (data.dimensions && Array.isArray(data.dimensions) && data.dimensions.length > 0) {
          setMatrixDimensions(data.dimensions);
        }
        if (data.id) setMatrixDbId(data.id);
        if (data.updated_at) setMatrixLastSaved(data.updated_at);
      }
    } catch (err) {
      console.error('Error fetching skill matrix:', err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const handleSaveSkillMatrix = async () => {
    setSavingMatrix(true);
    try {
      const payload = {
        role_title: skillMatrixRoleTitle,
        dimensions: matrixDimensions,
        source_material_id: sourceId,
      };
      const res = await authFetch('http://localhost:8000/api/v1/dimensions-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save skill matrix');
      const data = await res.json();
      setMatrixDbId(data.id);
      setMatrixLastSaved(new Date().toISOString());
      showSuccess('Dimensions & Skills Matrix successfully saved and synced to your profile!', 'Matrix Saved');
    } catch (err: any) {
      showError(err.message || 'Failed to save matrix', 'Save Error');
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleFetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await authFetch('http://localhost:8000/api/v1/dimensions-skills/templates');
      if (res.ok) {
        const data = await res.json();
        setAvailableTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleApplyTemplate = (tpl: any) => {
    if (tpl.role_title) setSkillMatrixRoleTitle(tpl.role_title);
    if (tpl.dimensions) setMatrixDimensions(tpl.dimensions);
    setTplModalOpen(false);
    showSuccess(`Applied "${tpl.role_title}" standard evaluation template!`, 'Template Applied');
  };

  const handleOpenCreateTemplate = () => {
    setEditingTemplateId(null);
    setTplFormRoleTitle('New Role Template');
    setTplFormDesc('');
    setTplFormDimensions([
      {
        id: `dim-${Date.now()}-1`,
        name: 'Technical Competencies',
        description: 'Core programming language, frameworks, and engineering standards.',
        weight: 50,
        desired_score: 80,
        color: '#2563eb',
        skills: [
          {
            id: `sk-${Date.now()}-1`,
            name: 'Core Fundamentals & Algorithms',
            proficiency: 'Advanced',
            importance: 'Critical',
            question_type: 'MCQ',
            benchmark_score: 70,
            desired_score: 85,
            weight: 50,
            description: 'Core language semantics, best practices, and runtime model.'
          },
          {
            id: `sk-${Date.now()}-2`,
            name: 'Applied Problem Solving & Debugging',
            proficiency: 'Intermediate',
            importance: 'High',
            question_type: 'Scenario',
            benchmark_score: 65,
            desired_score: 80,
            weight: 50,
            description: 'Debugging, logic, and operational troubleshooting.'
          }
        ]
      },
      {
        id: `dim-${Date.now()}-2`,
        name: 'System Architecture & Scalability',
        description: 'System design, modular boundaries, caching, and scalability.',
        weight: 30,
        desired_score: 75,
        color: '#7c3aed',
        skills: [
          {
            id: `sk-${Date.now()}-3`,
            name: 'System Architecture & Microservices Design',
            proficiency: 'Intermediate',
            importance: 'High',
            question_type: 'Short_Answer',
            benchmark_score: 70,
            desired_score: 75,
            weight: 100,
            description: 'Modular design patterns, caching, scalability, and maintainability.'
          }
        ]
      },
      {
        id: `dim-${Date.now()}-3`,
        name: 'Professional Communication & Collaboration (Mandatory)',
        description: 'Technical articulation, stakeholder alignment, and cross-functional team collaboration.',
        weight: 20,
        desired_score: 75,
        color: '#0284c7',
        skills: [
          {
            id: `sk-${Date.now()}-4`,
            name: 'Technical Articulation & Stakeholder Communication',
            proficiency: 'Intermediate',
            importance: 'Critical',
            question_type: 'Short_Answer',
            benchmark_score: 70,
            desired_score: 80,
            weight: 50,
            description: 'Explaining technical concepts, documenting requirements, and status updates.'
          },
          {
            id: `sk-${Date.now()}-5`,
            name: 'Cross-Functional Collaboration & Team Feedback',
            proficiency: 'Intermediate',
            importance: 'High',
            question_type: 'Scenario',
            benchmark_score: 70,
            desired_score: 75,
            weight: 50,
            description: 'Participating in design reviews, receiving feedback, and cross-team alignment.'
          }
        ]
      }
    ]);
    setTplEditorOpen(true);
  };

  const handleOpenEditTemplate = (tpl: any) => {
    setEditingTemplateId(tpl.id);
    setTplFormRoleTitle(tpl.role_title);
    setTplFormDesc(tpl.description || '');
    setTplFormDimensions(JSON.parse(JSON.stringify(tpl.dimensions || [])));
    setTplEditorOpen(true);
  };

  const handleSaveRoleTemplate = async () => {
    if (!tplFormRoleTitle.trim()) {
      showWarning('Please enter a role template title', 'Title Required');
      return;
    }
    if (!tplFormDimensions.length) {
      showWarning('Please add at least one dimension to this template', 'Dimension Required');
      return;
    }
    setSavingTemplate(true);
    try {
      const payload = {
        role_title: tplFormRoleTitle.trim(),
        description: tplFormDesc.trim(),
        dimensions: tplFormDimensions,
      };
      const url = editingTemplateId
        ? `http://localhost:8000/api/v1/dimensions-skills/templates/${editingTemplateId}`
        : 'http://localhost:8000/api/v1/dimensions-skills/templates';
      const method = editingTemplateId ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save role template');
      }
      const data = await res.json();
      showSuccess(data.message || 'Role template saved successfully!', 'Template Saved');
      setTplEditorOpen(false);
      handleFetchTemplates();
    } catch (err: any) {
      showError(err.message || 'Error saving template', 'Save Failed');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteRoleTemplate = async (templateId: number, tplName: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${tplName}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingTemplateId(templateId);
    try {
      const res = await authFetch(`http://localhost:8000/api/v1/dimensions-skills/templates/${templateId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to delete template');
      }
      showSuccess(`Template "${tplName}" deleted successfully.`, 'Template Deleted');
      handleFetchTemplates();
    } catch (err: any) {
      showError(err.message || 'Failed to delete template', 'Delete Failed');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const handleOpenSaveAsModal = () => {
    setSaveAsTplTitle(skillMatrixRoleTitle || 'Custom Role Template');
    setSaveAsTplDesc(`Standardized evaluation matrix for ${skillMatrixRoleTitle || 'this role'}`);
    setSaveAsTplModalOpen(true);
  };

  const handleConfirmSaveAsTemplate = async () => {
    if (!saveAsTplTitle.trim()) {
      showWarning('Please enter a role template name', 'Name Required');
      return;
    }
    setSavingAsTpl(true);
    try {
      const payload = {
        role_title: saveAsTplTitle.trim(),
        description: saveAsTplDesc.trim(),
        dimensions: matrixDimensions,
      };
      const res = await authFetch('http://localhost:8000/api/v1/dimensions-skills/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save template');
      }
      showSuccess(`Role template "${saveAsTplTitle}" saved to your templates library!`, 'Template Saved');
      setSaveAsTplModalOpen(false);
      handleFetchTemplates();
    } catch (err: any) {
      showError(err.message || 'Failed to save matrix as template', 'Save Error');
    } finally {
      setSavingAsTpl(false);
    }
  };

  const handleAddTplDimension = () => {
    const newDim: DimensionItem = {
      id: `dim-${Date.now()}`,
      name: 'New Dimension',
      description: '',
      weight: 25,
      desired_score: 80,
      color: '#2563eb',
      skills: [
        {
          id: `sk-${Date.now()}`,
          name: 'Core Skill',
          proficiency: 'Intermediate',
          importance: 'High',
          question_type: 'MCQ',
          benchmark_score: 70,
          desired_score: 80,
          weight: 100,
          description: '',
        }
      ]
    };
    setTplFormDimensions(prev => [...prev, newDim]);
  };

  const handleRemoveTplDimension = (dimIndex: number) => {
    setTplFormDimensions(prev => prev.filter((_, idx) => idx !== dimIndex));
  };

  const handleUpdateTplDimension = (dimIndex: number, field: string, value: any) => {
    setTplFormDimensions(prev => prev.map((d, idx) => idx === dimIndex ? { ...d, [field]: value } : d));
  };

  const handleAddTplSkill = (dimIndex: number) => {
    const newSkill: SkillItem = {
      id: `sk-${Date.now()}`,
      name: 'New Skill',
      proficiency: 'Intermediate',
      importance: 'High',
      question_type: 'MCQ',
      benchmark_score: 70,
      desired_score: 80,
      weight: 25,
      description: '',
    };
    setTplFormDimensions(prev => prev.map((d, idx) => idx === dimIndex ? {
      ...d,
      skills: [...d.skills, newSkill]
    } : d));
  };

  const handleRemoveTplSkill = (dimIndex: number, skillIndex: number) => {
    setTplFormDimensions(prev => prev.map((d, idx) => idx === dimIndex ? {
      ...d,
      skills: d.skills.filter((_, sIdx) => sIdx !== skillIndex)
    } : d));
  };

  const handleUpdateTplSkill = (dimIndex: number, skillIndex: number, field: string, value: any) => {
    setTplFormDimensions(prev => prev.map((d, idx) => idx === dimIndex ? {
      ...d,
      skills: d.skills.map((s, sIdx) => sIdx === skillIndex ? { ...s, [field]: value } : s)
    } : d));
  };

  const handleRunAIExtraction = async () => {
    setAiExtractingMatrix(true);
    try {
      const payload = {
        content: aiExtractPromptText || extractedText || '',
        role_title: aiExtractRoleInput || skillMatrixRoleTitle || topic || '',
        source_id: sourceId,
      };
      const res = await authFetch('http://localhost:8000/api/v1/dimensions-skills/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('AI extraction encountered an error.');
      const data = await res.json();
      if (data.role_title) setSkillMatrixRoleTitle(data.role_title);
      if (data.dimensions && Array.isArray(data.dimensions) && data.dimensions.length > 0) {
        setMatrixDimensions(data.dimensions);
      }
      setAiExtractModalOpen(false);
      showSuccess('AI successfully extracted tailored evaluation dimensions and competencies!', 'AI Extraction Complete');
    } catch (err: any) {
      showError(err.message || 'Failed to extract dimensions via AI', 'AI Extraction Error');
    } finally {
      setAiExtractingMatrix(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      role_title: skillMatrixRoleTitle,
      dimensions: matrixDimensions,
      exported_at: new Date().toISOString(),
    }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `${skillMatrixRoleTitle.replace(/[^a-zA-Z0-9]/g, '_')}_dimensions_skills.json`);
    dlAnchorElem.click();
    showSuccess('Exported matrix as JSON.', 'Export Ready');
  };

  const handleExportCSV = () => {
    let csv = "Dimension,Dimension Weight (%),Desired Score (%),Skill Name,Proficiency,Importance,Question Type,Desired Score (%),Passing Benchmark (%),Skill Weight (%),Description\n";
    matrixDimensions.forEach(dim => {
      dim.skills.forEach(s => {
        csv += `"${dim.name}","${dim.weight}%","${dim.desired_score || 75}%","${s.name}","${s.proficiency}","${s.importance}","${s.question_type}","${s.desired_score || s.benchmark_score || 75}%","${s.benchmark_score}%","${s.weight}%","${(s.description || '').replace(/"/g, '""')}"\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skillMatrixRoleTitle.replace(/[^a-zA-Z0-9]/g, '_')}_skills.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Exported skills matrix as CSV.', 'Export Ready');
  };

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.role_title) setSkillMatrixRoleTitle(parsed.role_title);
        if (parsed.dimensions && Array.isArray(parsed.dimensions)) {
          setMatrixDimensions(parsed.dimensions);
          showSuccess('Imported dimensions & skills matrix successfully!', 'Import Complete');
        } else {
          showError('Invalid file format: missing dimensions array.', 'Import Error');
        }
      } catch (err) {
        showError('Failed to parse JSON file.', 'Import Error');
      }
    };
    reader.readAsText(file);
  };

  const handleOpenAddDimModal = () => {
    setEditingDimId(null);
    setDimFormName('');
    setDimFormDesc('');
    setDimFormWeight(25);
    setDimFormDesiredScore(80);
    setDimFormColor('#2563eb');
    setDimModalOpen(true);
  };

  const handleOpenEditDimModal = (dim: DimensionItem) => {
    setEditingDimId(dim.id);
    setDimFormName(dim.name);
    setDimFormDesc(dim.description);
    setDimFormWeight(dim.weight);
    setDimFormDesiredScore(dim.desired_score || 80);
    setDimFormColor(dim.color || '#2563eb');
    setDimModalOpen(true);
  };

  const handleSaveDimModal = () => {
    if (!dimFormName.trim()) {
      showWarning('Please enter a dimension name', 'Name Required');
      return;
    }
    if (editingDimId) {
      setMatrixDimensions(prev => prev.map(d => d.id === editingDimId ? {
        ...d,
        name: dimFormName.trim(),
        description: dimFormDesc.trim(),
        weight: Number(dimFormWeight),
        desired_score: Number(dimFormDesiredScore) || 75,
        color: dimFormColor,
      } : d));
      showSuccess(`Updated dimension "${dimFormName}".`, 'Dimension Updated');
    } else {
      const newDim: DimensionItem = {
        id: `dim-${Date.now()}`,
        name: dimFormName.trim(),
        description: dimFormDesc.trim(),
        weight: Number(dimFormWeight),
        desired_score: Number(dimFormDesiredScore) || 75,
        color: dimFormColor,
        skills: [],
      };
      setMatrixDimensions(prev => [...prev, newDim]);
      showSuccess(`Added new dimension "${dimFormName}".`, 'Dimension Added');
    }
    setDimModalOpen(false);
  };

  const handleDeleteDim = (dimId: string) => {
    const dim = matrixDimensions.find(d => d.id === dimId);
    if (!dim) return;
    if (window.confirm(`Are you sure you want to delete dimension "${dim.name}" and all its skills?`)) {
      setMatrixDimensions(prev => prev.filter(d => d.id !== dimId));
      showSuccess(`Deleted dimension "${dim.name}".`, 'Dimension Removed');
    }
  };

  const handleOpenAddSkillModal = (dimId?: string) => {
    setSkillModalDimId(dimId || (matrixDimensions[0]?.id ?? ''));
    setEditingSkillId(null);
    setSkillFormName('');
    setSkillFormProficiency('Intermediate');
    setSkillFormImportance('High');
    setSkillFormQuestionType('MCQ');
    setSkillFormBenchmark(70);
    setSkillFormDesiredScore(80);
    setSkillFormWeight(25);
    setSkillFormDesc('');
    setSkillModalOpen(true);
  };

  const handleOpenEditSkillModal = (dimId: string, skill: SkillItem) => {
    setSkillModalDimId(dimId);
    setEditingSkillId(skill.id);
    setSkillFormName(skill.name);
    setSkillFormProficiency(skill.proficiency);
    setSkillFormImportance(skill.importance);
    setSkillFormQuestionType(skill.question_type);
    setSkillFormBenchmark(skill.benchmark_score);
    setSkillFormDesiredScore(skill.desired_score ?? (skill.benchmark_score || 80));
    setSkillFormWeight(skill.weight);
    setSkillFormDesc(skill.description || '');
    setSkillModalOpen(true);
  };

  const handleSaveSkillModal = () => {
    if (!skillFormName.trim()) {
      showWarning('Please enter a skill name', 'Name Required');
      return;
    }
    const targetDimId = skillModalDimId || matrixDimensions[0]?.id;
    if (!targetDimId) {
      showWarning('Please select a valid dimension for this skill', 'Dimension Required');
      return;
    }

    if (editingSkillId) {
      setMatrixDimensions(prev => prev.map(d => {
        if (d.id === targetDimId) {
          return {
            ...d,
            skills: d.skills.map(s => s.id === editingSkillId ? {
              ...s,
              name: skillFormName.trim(),
              proficiency: skillFormProficiency,
              importance: skillFormImportance,
              question_type: skillFormQuestionType,
              benchmark_score: Number(skillFormBenchmark),
              desired_score: Number(skillFormDesiredScore) || 75,
              weight: Number(skillFormWeight),
              description: skillFormDesc.trim(),
            } : s)
          };
        }
        return d;
      }));
      showSuccess(`Updated skill "${skillFormName}".`, 'Skill Updated');
    } else {
      const newSkill: SkillItem = {
        id: `skill-${Date.now()}`,
        name: skillFormName.trim(),
        proficiency: skillFormProficiency,
        importance: skillFormImportance,
        question_type: skillFormQuestionType,
        benchmark_score: Number(skillFormBenchmark),
        desired_score: Number(skillFormDesiredScore) || 75,
        weight: Number(skillFormWeight),
        description: skillFormDesc.trim(),
      };
      setMatrixDimensions(prev => prev.map(d => {
        if (d.id === targetDimId) {
          return { ...d, skills: [...d.skills, newSkill] };
        }
        return d;
      }));
      showSuccess(`Added skill "${skillFormName}".`, 'Skill Added');
    }
    setSkillModalOpen(false);
  };

  const handleDeleteSkill = (dimId: string, skillId: string) => {
    setMatrixDimensions(prev => prev.map(d => {
      if (d.id === dimId) {
        return { ...d, skills: d.skills.filter(s => s.id !== skillId) };
      }
      return d;
    }));
    showSuccess('Skill removed from dimension.', 'Skill Deleted');
  };

  // Candidate Resume + Job Match state (supports multiple resumes)
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [uploadedResumes, setUploadedResumes] = useState<Array<{ resume_id: number; filename: string; candidate_name?: string }>>([]);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const [resumeText, setResumeText] = useState('');
  const [loadingResume, setLoadingResume] = useState(false);
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [analyzingMatch, setAnalyzingMatch] = useState(false);
  const [selectedCandidateResumeId, setSelectedCandidateResumeId] = useState<number | null>(null);

  interface JobMatchResult {
    job_match_id?: number;
    resume_id?: number;
    filename?: string;
    candidate_name?: string;
    candidate_email?: string;
    match_score: number;
    matched_skills: string[];
    skill_gaps: string[];
    seniority_assessment: string;
  }

  const [jobMatchResult, setJobMatchResult] = useState<JobMatchResult | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('ta_job_match');
      if (saved) {
        try { return JSON.parse(saved); } catch { return null; }
      }
    }
    return null;
  });

  const [multiMatchResults, setMultiMatchResults] = useState<JobMatchResult[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('ta_multi_match_results');
      if (saved) {
        try { return JSON.parse(saved); } catch { return []; }
      }
    }
    return [];
  });

  // Multi-candidate selection for assessments
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [candidateEmails, setCandidateEmails] = useState<{ [resumeId: number]: string }>({});

  // Assessment invitations state
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [sendingInvitations, setSendingInvitations] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<number | null>(null);
  const [resendingEmailId, setResendingEmailId] = useState<number | null>(null);
  const [previewEmailData, setPreviewEmailData] = useState<any | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Assessment submission method selection modal state
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<'recruiter' | 'candidate'>('recruiter');
  const [modalCandidateName, setModalCandidateName] = useState('');
  const [modalCandidateEmail, setModalCandidateEmail] = useState('');
  const [copiedCredsCandidateId, setCopiedCredsCandidateId] = useState<number | string | null>(null);

  // Public candidate assessment taking state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [candidateAssessmentData, setCandidateAssessmentData] = useState<any | null>(null);
  const [loadingCandidateAssessment, setLoadingCandidateAssessment] = useState(false);
  const [candidateAssessmentAnswers, setCandidateAssessmentAnswers] = useState<{ [qIdx: number]: string }>({});
  const [submittingCandidateAssessment, setSubmittingCandidateAssessment] = useState(false);
  const [candidateAssessmentResult, setCandidateAssessmentResult] = useState<any | null>(null);
  const [candidateSessionClosed, setCandidateSessionClosed] = useState(false);
  const [candidateTimerSeconds, setCandidateTimerSeconds] = useState<number | null>(null);
  const candidateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const candidateAnswersRef = useRef<{ [qIdx: number]: string }>({});
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (jobMatchResult) {
        sessionStorage.setItem('ta_job_match', JSON.stringify(jobMatchResult));
      } else {
        sessionStorage.removeItem('ta_job_match');
      }
    }
  }, [jobMatchResult]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (multiMatchResults.length > 0) {
        sessionStorage.setItem('ta_multi_match_results', JSON.stringify(multiMatchResults));
      } else {
        sessionStorage.removeItem('ta_multi_match_results');
      }
    }
  }, [multiMatchResults]);

  // Assessment timer - counts down during the Candidate Assessment step and
  // auto-submits when it reaches zero. Started once questions are generated.
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const timerHandleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Past Reports State
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [loadingReportDetail, setLoadingReportDetail] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [singleExportMenuOpen, setSingleExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const singleExportMenuRef = useRef<HTMLDivElement>(null);

  // Recruiter In-App Notifications State
  const [notifications, setNotifications] = useState<RecruiterNotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const prevNotifIdsRef = useRef<Set<number>>(new Set());
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Close export dropdowns on click outside
  useEffect(() => {
    const handleClickOutsideExport = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
      if (singleExportMenuRef.current && !singleExportMenuRef.current.contains(e.target as Node)) {
        setSingleExportMenuOpen(false);
      }
    };
    if (exportMenuOpen || singleExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutsideExport);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideExport);
    };
  }, [exportMenuOpen, singleExportMenuOpen]);

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutsideNotif = (e: MouseEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    if (notifMenuOpen) {
      document.addEventListener('mousedown', handleClickOutsideNotif);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideNotif);
    };
  }, [notifMenuOpen]);

  const fetchReports = async (silent = false) => {
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('ta_token') : null);
    if (!token) return;
    setLoadingReports(true);
    try {
      const res = await authFetch('http://localhost:8000/api/v1/reports');
      if (!res.ok) {
        if (res.status === 401) return;
        throw new Error('Failed to load past reports.');
      }
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      if (!silent) showError('Failed to load past candidate reports. Please verify backend service.', 'Connection Error');
    } finally {
      setLoadingReports(false);
    }
  };

  // Multiple export formats supported: CSV (Spreadsheet), PDF (Printable), JSON (Data), TXT (Executive Summary)
  type ExportFormat = 'csv' | 'json' | 'pdf' | 'txt';

  const handleExportReports = (format: ExportFormat = 'csv', targetReportList?: any[]) => {
    const listToExport = targetReportList || (selectedReportIds.length > 0
      ? reports.filter((r) => selectedReportIds.includes(r.report_id))
      : reports);

    if (!listToExport || listToExport.length === 0) {
      showWarning('No evaluation reports available to export. Please generate and submit an evaluation first.', 'No Reports to Export');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    setExportMenuOpen(false);

    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const rowsHtml = listToExport.map((r, i) => {
          const scorePct = r.score_percentage != null
            ? r.score_percentage
            : (Number(r.max_score) > 0 ? Math.round((Number(r.total_score) / Number(r.max_score)) * 100) : 0);
          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: 600;">#${i + 1}</td>
              <td style="padding: 10px 12px;"><strong>${r.candidate_name || 'Anonymous'}</strong></td>
              <td style="padding: 10px 12px;">${r.source || 'Role Assessment'}</td>
              <td style="padding: 10px 12px; font-weight: 700; color: ${scorePct >= 75 ? '#059669' : scorePct >= 50 ? '#d97706' : '#dc2626'};">${scorePct}% (${r.total_score}/${r.max_score})</td>
              <td style="padding: 10px 12px;">${r.job_knowledge_match != null ? Math.round(r.job_knowledge_match) + '%' : '—'}</td>
              <td style="padding: 10px 12px;">${r.communication_score != null ? Math.round(r.communication_score) + '%' : '—'}</td>
              <td style="padding: 10px 12px;">${r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
            </tr>
          `;
        }).join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Candidate Evaluation Reports - ${timestamp}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 32px; color: #1e293b; line-height: 1.4; }
              h1 { font-size: 22px; margin-bottom: 4px; color: #0f172a; }
              p { font-size: 13px; color: #64748b; margin-top: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13.5px; }
              th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
              @media print { .no-print { display: none !important; } }
            </style>
          </head>
          <body>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <div>
                <h1>Candidate Evaluation Summary Report</h1>
                <p>Organization: ${organizationName || 'TalentAssess AI'} · Export Date: ${timestamp} · Total Candidates: ${listToExport.length}</p>
              </div>
              <button class="no-print" onclick="window.print()" style="padding:9px 18px; background:#0077b5; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:700; font-size:13px;">Print / Save PDF</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Candidate Name</th>
                  <th>Role / Source</th>
                  <th>Score</th>
                  <th>Job Knowledge</th>
                  <th>Communication</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 350);
      }
      return;
    }

    if (format === 'txt') {
      const lines = [
        '===============================================================',
        'CANDIDATE EVALUATION REPORTS SUMMARY',
        `Organization: ${organizationName || 'TalentAssess AI'}`,
        `Exported On: ${new Date().toLocaleString()}`,
        `Total Reports: ${listToExport.length}`,
        '===============================================================',
        ''
      ];

      listToExport.forEach((r, idx) => {
        const scorePct = r.score_percentage != null
          ? r.score_percentage
          : (Number(r.max_score) > 0 ? Math.round((Number(r.total_score) / Number(r.max_score)) * 100) : 0);

        lines.push(`[${idx + 1}] Candidate: ${r.candidate_name || 'Anonymous'}`);
        lines.push(`    Report ID: #${r.report_id}`);
        lines.push(`    Role / Source: ${r.source || 'Role Assessment'}`);
        lines.push(`    Date: ${r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}`);
        lines.push(`    Total Score: ${r.total_score}/${r.max_score} (${scorePct}%)`);
        lines.push(`    Job Knowledge: ${r.job_knowledge_match != null ? Math.round(r.job_knowledge_match) + '%' : 'N/A'}`);
        lines.push(`    Communication: ${r.communication_score != null ? Math.round(r.communication_score) + '%' : 'N/A'}`);
        lines.push(`    Employer Criteria: ${r.meets_employer_criteria || 'N/A'}`);
        lines.push('---------------------------------------------------------------');
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', URL.createObjectURL(blob));
      downloadAnchor.setAttribute('download', `Candidate_Evaluation_Reports_${timestamp}.txt`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(listToExport, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `Candidate_Evaluation_Reports_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    // Default CSV
    const headers = [
      'Report ID',
      'Candidate Name',
      'Organization',
      'Job Role / Source',
      'Difficulty',
      'Question Type',
      'Date Submitted',
      'Total Score',
      'Max Score',
      'Score Percentage (%)',
      'Job Knowledge Score (%)',
      'Communication Score (%)',
      'Employer Verified'
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = listToExport.map((r) => {
      const scorePct = r.score_percentage != null
        ? r.score_percentage
        : (Number(r.max_score) > 0 ? Math.round((Number(r.total_score) / Number(r.max_score)) * 100) : 0);

      return [
        escapeCsv(r.report_id),
        escapeCsv(r.candidate_name || 'Anonymous Candidate'),
        escapeCsv(r.organization_name || organizationName || ''),
        escapeCsv(r.source || 'Role Assessment'),
        escapeCsv(r.difficulty || 'N/A'),
        escapeCsv(r.question_type || 'N/A'),
        escapeCsv(r.created_at ? new Date(r.created_at).toLocaleString() : ''),
        escapeCsv(r.total_score),
        escapeCsv(r.max_score),
        escapeCsv(`${scorePct}%`),
        escapeCsv(r.job_knowledge_match != null ? `${Math.round(r.job_knowledge_match)}%` : 'N/A'),
        escapeCsv(r.communication_score != null ? `${Math.round(r.communication_score)}%` : 'N/A'),
        escapeCsv(r.meets_employer_criteria || 'N/A')
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `Candidate_Evaluation_Reports_${timestamp}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export single candidate report
  const handleExportSingleReport = (report: any, format: ExportFormat = 'csv') => {
    if (!report) return;
    const cName = (report.candidate_name || 'Candidate').replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    setSingleExportMenuOpen(false);

    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const qs = report.questions?.questions || [];
        const questionsHtml = qs.map((q: Question, idx: number) => {
          const ev = report.evaluations?.[idx];
          const ans = report.candidate_answers?.[idx];
          return `
            <div style="margin-top: 14px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <p style="margin: 0 0 6px; font-weight: 600; font-size: 13.5px;">${idx + 1}. ${q.question_text}</p>
              <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Candidate Answer:</strong> ${ans || '(no answer)'}</p>
              ${ev ? `
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 12.5px;">
                  <strong style="color: #6a2c91;">Score: ${ev.overall_score}</strong> · <span>Feedback: ${ev.feedback}</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Evaluation Report - ${report.candidate_name || 'Candidate'}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 32px; color: #1e293b; line-height: 1.4; }
              h1 { font-size: 22px; margin-bottom: 4px; color: #0f172a; }
              p { font-size: 13px; color: #64748b; margin-top: 0; }
              @media print { .no-print { display: none !important; } }
            </style>
          </head>
          <body>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <div>
                <h1>Candidate Evaluation Report: ${report.candidate_name || 'Candidate'}</h1>
                <p>Report #${report.report_id} · Role: ${report.source || 'Role Assessment'} · Date: ${report.created_at ? new Date(report.created_at).toLocaleDateString() : timestamp}</p>
              </div>
              <button class="no-print" onclick="window.print()" style="padding:9px 18px; background:#0077b5; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:700; font-size:13px;">Print / Save PDF</button>
            </div>
            <div style="display:flex; gap:20px; background:#f1f5f9; padding:12px 18px; border-radius:8px; margin-bottom:18px;">
              <div><strong>Score:</strong> ${report.total_score}/${report.max_score} (${report.score_percentage || 0}%)</div>
              <div><strong>Job Knowledge:</strong> ${report.job_knowledge_match != null ? Math.round(report.job_knowledge_match) + '%' : '—'}</div>
              <div><strong>Communication:</strong> ${report.communication_score != null ? Math.round(report.communication_score) + '%' : '—'}</div>
            </div>
            <div>
              <h3>Questions & AI Evaluation</h3>
              ${questionsHtml}
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 350);
      }
      return;
    }

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `Evaluation_Report_${cName}_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    if (format === 'txt') {
      const scorePct = report.score_percentage != null
        ? report.score_percentage
        : (Number(report.max_score) > 0 ? Math.round((Number(report.total_score) / Number(report.max_score)) * 100) : 0);

      const lines = [
        '===============================================================',
        `CANDIDATE EVALUATION REPORT: ${report.candidate_name || 'Candidate'}`,
        `Report ID: #${report.report_id}`,
        `Organization: ${report.organization_name || organizationName || 'TalentAssess AI'}`,
        `Role: ${report.source || 'Role Assessment'}`,
        `Date: ${report.created_at ? new Date(report.created_at).toLocaleString() : timestamp}`,
        `Total Score: ${report.total_score}/${report.max_score} (${scorePct}%)`,
        `Job Knowledge: ${report.job_knowledge_match != null ? Math.round(report.job_knowledge_match) + '%' : 'N/A'}`,
        `Communication: ${report.communication_score != null ? Math.round(report.communication_score) + '%' : 'N/A'}`,
        '===============================================================',
        '',
        'QUESTIONS & EVALUATIONS:'
      ];

      const qs = report.questions?.questions || [];
      qs.forEach((q: Question, idx: number) => {
        const ev = report.evaluations?.[idx];
        const ans = report.candidate_answers?.[idx];
        lines.push(`\n[Question ${idx + 1}] ${q.question_text}`);
        lines.push(`Candidate Answer: ${ans || '(no answer)'}`);
        if (ev) {
          lines.push(`Score: ${ev.overall_score}`);
          lines.push(`Feedback: ${ev.feedback}`);
        }
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', URL.createObjectURL(blob));
      downloadAnchor.setAttribute('download', `Evaluation_Report_${cName}_${timestamp}.txt`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    // Default CSV
    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const scorePct = report.score_percentage != null
      ? report.score_percentage
      : (Number(report.max_score) > 0 ? Math.round((Number(report.total_score) / Number(report.max_score)) * 100) : 0);

    const summaryRows = [
      ['Report ID', escapeCsv(report.report_id)].join(','),
      ['Candidate Name', escapeCsv(report.candidate_name || 'Anonymous')].join(','),
      ['Organization', escapeCsv(report.organization_name || organizationName || '')].join(','),
      ['Role / Source', escapeCsv(report.source || 'Role Assessment')].join(','),
      ['Date', escapeCsv(report.created_at ? new Date(report.created_at).toLocaleString() : '')].join(','),
      ['Total Score', escapeCsv(`${report.total_score} / ${report.max_score} (${scorePct}%)`)].join(','),
      ['Job Knowledge Match', escapeCsv(report.job_knowledge_match != null ? `${Math.round(report.job_knowledge_match)}%` : 'N/A')].join(','),
      ['Communication Score', escapeCsv(report.communication_score != null ? `${Math.round(report.communication_score)}%` : 'N/A')].join(','),
      '',
      ['Question Number', 'Question Text', 'Candidate Answer', 'AI Score', 'AI Feedback'].join(',')
    ];

    const qs = report.questions?.questions || [];
    const questionRows = qs.map((q: Question, idx: number) => {
      const ev = report.evaluations?.[idx];
      const ans = report.candidate_answers?.[idx];
      return [
        escapeCsv(idx + 1),
        escapeCsv(q.question_text),
        escapeCsv(ans || '(no answer)'),
        escapeCsv(ev?.overall_score ?? 'N/A'),
        escapeCsv(ev?.feedback ?? 'N/A')
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([...summaryRows, ...questionRows].join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `Evaluation_Report_${cName}_${timestamp}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Fetch the latest job match results from the backend for the current user/source
  const fetchLatestJobMatch = async (srcId?: number) => {
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('ta_token') : null);
    if (!token) return;
    try {
      const url = srcId
        ? `http://localhost:8000/api/v1/job-match/latest?source_id=${srcId}`
        : 'http://localhost:8000/api/v1/job-match/latest';
      const res = await authFetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        setMultiMatchResults(data.results);
        setJobMatchResult(data.results[0]);
        if (!candidateName && data.results[0]?.candidate_name) {
          setCandidateName(data.results[0].candidate_name);
        }
      } else {
        // Backend has no job match results for current user (fresh/new database)
        setMultiMatchResults([]);
        setJobMatchResult(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('ta_job_match');
          sessionStorage.removeItem('ta_multi_match_results');
        }
      }
    } catch {
      // background sync
    }
  };

  // Fetch assessment invitations sent to candidates
  const fetchInvitations = async () => {
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('ta_token') : null);
    if (!token) return;
    setLoadingInvitations(true);
    try {
      const res = await authFetch('http://localhost:8000/api/v1/assessment/invitations');
      if (!res.ok) return;
      const data = await res.json();
      setInvitations(Array.isArray(data) ? data : []);
    } catch {
      // background
    } finally {
      setLoadingInvitations(false);
    }
  };

  // Fetch recruiter in-app notifications
  const fetchNotifications = async (initialLoad = false) => {
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('ta_token') : null);
    if (!token) return;
    setLoadingNotifications(true);
    try {
      const res = await authFetch('http://localhost:8000/api/v1/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const notifs: RecruiterNotificationItem[] = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(notifs);
      setUnreadNotifCount(typeof data.unread_count === 'number' ? data.unread_count : notifs.filter(n => !n.is_read).length);

      // Detect newly arrived notifications to trigger real-time alert toast
      if (!initialLoad && prevNotifIdsRef.current.size > 0) {
        const newUnread = notifs.filter(n => !n.is_read && !prevNotifIdsRef.current.has(n.id));
        if (newUnread.length > 0) {
          newUnread.forEach(n => {
            const candidateInfo = n.candidate_name || 'Candidate';
            const roleInfo = n.job_title ? ` for ${n.job_title}` : '';
            const scoreInfo = n.score_percentage != null ? ` (${n.score_percentage}%)` : '';
            showSuccess(
              `${candidateInfo} has completed and submitted their assessment${roleInfo}${scoreInfo}!`,
              '🔔 Candidate Assessment Submitted'
            );
          });
          // Also automatically refresh invitations and reports in background
          fetchInvitations();
          fetchReports(false);
        }
      }

      // Track known notification ids
      prevNotifIdsRef.current = new Set(notifs.map(n => n.id));
    } catch {
      // background sync
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkNotificationRead = async (notifId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await authFetch(`http://localhost:8000/api/v1/notifications/${notifId}/read`, {
        method: 'POST',
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
        setUnreadNotifCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const res = await authFetch('http://localhost:8000/api/v1/notifications/mark-all-read', {
        method: 'POST',
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadNotifCount(0);
        showSuccess('All notifications marked as read.', 'Notifications Updated');
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleDeleteNotification = async (notifId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await authFetch(`http://localhost:8000/api/v1/notifications/${notifId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications(prev => {
          const target = prev.find(n => n.id === notifId);
          if (target && !target.is_read) {
            setUnreadNotifCount(c => Math.max(0, c - 1));
          }
          return prev.filter(n => n.id !== notifId);
        });
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleOpenNotificationReport = async (notif: RecruiterNotificationItem) => {
    if (!notif.is_read) {
      handleMarkNotificationRead(notif.id);
    }
    setNotifMenuOpen(false);
    if (notif.report_id) {
      goTo('reports');
      await viewReport(notif.report_id);
    } else {
      goTo('reports');
    }
  };

  // Internal helper to submit candidate assessment (used by manual submit and auto-submit on timer expiry)
  const submitCandidateAssessmentInternal = async (token: string, answers: { [qIdx: number]: string }) => {
    setSubmittingCandidateAssessment(true);
    try {
      const formData = new FormData();
      formData.append('invite_token', token);
      formData.append('candidate_answers', JSON.stringify(answers));

      const headers: Record<string, string> = {};
      const savedToken = authToken || (typeof window !== 'undefined' ? localStorage.getItem('ta_token') : null);
      if (savedToken) {
        headers['Authorization'] = `Bearer ${savedToken}`;
      }

      const res = await fetch('http://localhost:8000/api/v1/assessment/submit-candidate-assessment', {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Submission failed');
      }
      const data = await res.json();
      setCandidateAssessmentResult(data);

      // Stop countdown timer
      if (candidateTimerRef.current) {
        clearInterval(candidateTimerRef.current);
        candidateTimerRef.current = null;
      }
      // Remove draft answers and timer from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ta_draft_answers_' + token);
        localStorage.removeItem('ta_timer_expiry_' + token);
      }
      showSuccess('Your assessment has been evaluated and submitted successfully!', 'Assessment Submitted');
      if (savedToken) {
        fetchCandidateAssessments(savedToken);
        fetchCandidateReports(savedToken);
      }
    } catch (err: any) {
      showError(err.message || 'Error submitting assessment. Please try again.', 'Submission Error');
    } finally {
      setSubmittingCandidateAssessment(false);
    }
  };

  // Submit assessment as candidate via invite token
  const handleCandidateSubmit = async () => {
    if (!inviteToken) return;
    await submitCandidateAssessmentInternal(inviteToken, candidateAssessmentAnswers);
  };

  // Keep candidateAnswersRef updated with latest answers for interval closures
  useEffect(() => {
    candidateAnswersRef.current = candidateAssessmentAnswers;
  }, [candidateAssessmentAnswers]);

  // Real-time auto-save candidate answers to localStorage
  useEffect(() => {
    if (!inviteToken || !candidateAssessmentData || candidateAssessmentData.submitted || candidateAssessmentResult) {
      return;
    }
    if (Object.keys(candidateAssessmentAnswers).length === 0) {
      return;
    }

    setIsSavingDraft(true);
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ta_draft_answers_' + inviteToken, JSON.stringify(candidateAssessmentAnswers));
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSavedTime(timeStr);
        }
      } catch (e) {
        console.error('Error auto-saving draft answers:', e);
      } finally {
        setIsSavingDraft(false);
      }
    }, 500);

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [candidateAssessmentAnswers, inviteToken, candidateAssessmentData, candidateAssessmentResult]);

  // Clean up candidate timer on unmount
  useEffect(() => {
    return () => {
      if (candidateTimerRef.current) {
        clearInterval(candidateTimerRef.current);
        candidateTimerRef.current = null;
      }
    };
  }, []);

  // Load public candidate assessment when accessed via invite link
  const loadCandidateAssessment = async (token: string) => {
    setLoadingCandidateAssessment(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/assessment/invitation/${token}`);
      if (!res.ok) {
        throw new Error('Assessment invitation link is invalid or has expired.');
      }
      const data = await res.json();
      setCandidateAssessmentData(data);

      if (data.submitted) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ta_draft_answers_' + token);
          localStorage.removeItem('ta_timer_expiry_' + token);
        }
        return;
      }

      // Check and restore draft answers from localStorage if available
      if (typeof window !== 'undefined') {
        const savedDraft = localStorage.getItem('ta_draft_answers_' + token);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
              setCandidateAssessmentAnswers(parsed);
              candidateAnswersRef.current = parsed;
              const now = new Date();
              setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
              showInfo('Restored your previously saved draft responses from your current browser session.', 'Draft Restored');
            }
          } catch (e) {
            console.error('Failed to parse saved draft answers:', e);
          }
        }
      }

      // Initialize or resume countdown timer with localStorage expiry persistence
      const durationMin = data.duration_minutes || 15;
      let remainingSec = durationMin * 60;

      if (typeof window !== 'undefined') {
        const savedExpiry = localStorage.getItem('ta_timer_expiry_' + token);
        if (savedExpiry) {
          const expTime = parseInt(savedExpiry, 10);
          remainingSec = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
        } else {
          const targetExpiry = Date.now() + durationMin * 60 * 1000;
          localStorage.setItem('ta_timer_expiry_' + token, targetExpiry.toString());
          remainingSec = durationMin * 60;
        }
      }

      setCandidateTimerSeconds(remainingSec);

      if (remainingSec <= 0) {
        showWarning('Assessment time limit has expired! Submitting your answers now.', 'Time Expired');
        await submitCandidateAssessmentInternal(token, candidateAnswersRef.current);
        return;
      }

      // Start countdown interval
      if (candidateTimerRef.current) clearInterval(candidateTimerRef.current);
      candidateTimerRef.current = setInterval(() => {
        if (typeof window === 'undefined') return;
        const expStr = localStorage.getItem('ta_timer_expiry_' + token);
        if (!expStr) return;
        const expTime = parseInt(expStr, 10);
        const leftSec = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
        setCandidateTimerSeconds(leftSec);

        if (leftSec <= 0) {
          if (candidateTimerRef.current) {
            clearInterval(candidateTimerRef.current);
            candidateTimerRef.current = null;
          }
          showWarning('Assessment time limit has expired! Submitting your answers now.', 'Time Expired');
          submitCandidateAssessmentInternal(token, candidateAnswersRef.current);
        }
      }, 1000);

    } catch (err: any) {
      showError(err.message || 'Error loading assessment. Link may be invalid or expired.', 'Assessment Load Error');
    } finally {
      setLoadingCandidateAssessment(false);
    }
  };

  // Detect invite_token in query param for candidate public assessment taking,
  // or view_report query param for recruiter deep-linking from email alerts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('invite_token');
      if (token) {
        setInviteToken(token);
        loadCandidateAssessment(token);
      }
      const viewReportId = params.get('view_report');
      if (viewReportId) {
        const rId = parseInt(viewReportId, 10);
        if (!isNaN(rId)) {
          goTo('reports');
          viewReport(rId);
        }
      }
    }
  }, []);

  // Auto-load reports, latest job matches, invitations, and notifications on page load or whenever authToken becomes available
  useEffect(() => {
    fetchReports(true);
    fetchLatestJobMatch();
    fetchInvitations();
    fetchNotifications(true);
  }, [authToken]);

  // Periodic polling for notifications and real-time candidate submission alerts (every 5 seconds + window focus)
  useEffect(() => {
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('ta_token') : null);
    if (!token) return;

    // Refresh immediately when window gains focus
    const handleFocus = () => {
      fetchNotifications(false);
      fetchInvitations();
    };
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [authToken]);

  // Handler to dispatch assessment invitations to selected candidates
  const handleSendInvitations = async (targetCandidates?: any[], explicitAssessmentId?: number | null) => {
    const activeAssessmentId = explicitAssessmentId || questionSets[activeSetIndex]?.assessmentId || (questionSets[0]?.assessmentId ?? null);
    if (!activeAssessmentId) {
      showWarning('Please generate an assessment first before sending candidate invitations.', 'Assessment Required');
      return;
    }

    const candidatePayload = (targetCandidates || selectedCandidateIds.map(id => {
      const match = multiMatchResults.find(m => m.resume_id === id);
      const cName = match?.candidate_name || `Candidate #${id}`;
      const defaultEmail = match?.candidate_email || `${cName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`;
      return {
        resume_id: id,
        candidate_name: cName,
        candidate_email: candidateEmails[id] || defaultEmail
      };
    }));

    if (candidatePayload.length === 0) {
      showWarning('Please select at least one candidate to invite.', 'Candidate Required');
      return;
    }

    setSendingInvitations(true);
    try {
      const formData = new FormData();
      formData.append('assessment_id', activeAssessmentId.toString());
      formData.append('candidates', JSON.stringify(candidatePayload));
      formData.append('duration_minutes', durationMinutes.toString());

      const res = await authFetch('http://localhost:8000/api/v1/assessment/invite-candidates', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to send candidate invitations.');
      const data = await res.json();
      await fetchInvitations();
      if (data.smtp_configured) {
        showSuccess(`Generated links and sent automated email invitations with user login credentials to ${data.total_invited} candidate(s)!`, 'Invitations & Credentials Dispatched');
      } else {
        showWarning(
          `Generated ${data.total_invited} candidate assessment link(s) and user login account(s). Note: SMTP server is not yet configured in backend/.env, so emails were not sent automatically. Candidate credentials and direct links are displayed on each card below!`,
          'Links & Login Created (SMTP Not Configured)'
        );
      }
    } catch (err: any) {
      showError(err.message || 'Error sending invitations.', 'Dispatch Error');
    } finally {
      setSendingInvitations(false);
    }
  };

  const getMailtoUrl = (inv: any) => {
    const candidateName = inv.candidate_name || 'Candidate';
    const jobTitle = inv.job_title || 'Role Assessment';
    const org = inv.organization_name || organizationName || 'TalentAssess AI';
    const numQ = inv.num_questions || 5;
    const diff = inv.difficulty || 'Standard';
    const duration = inv.duration_minutes || 15;
    const link = inv.invitation_link || (inv.invitation_token ? `http://localhost:3000?invite_token=${inv.invitation_token}` : 'http://localhost:3000');
    const portalUrl = inv.candidate_portal_url || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const loginEmail = inv.candidate_login_email || inv.candidate_email;
    const tempPass = inv.candidate_temp_password || '(Password generated - check portal)';

    const subject = encodeURIComponent(`Assessment Invitation & Login Credentials: ${jobTitle} - ${org}`);

    const bodyText = [
      `Dear ${candidateName},`,
      ``,
      `You have been invited by ${org} to complete an online candidate evaluation assessment for the ${jobTitle} position.`,
      ``,
      `ASSESSMENT OVERVIEW:`,
      `• Position: ${jobTitle}`,
      `• Organization: ${org}`,
      `• Number of Questions: ${numQ}`,
      `• Difficulty: ${diff}`,
      `• Time Limit: ${duration} Minutes (Live Countdown)`,
      `• Feature: Real-Time Auto-Save enabled`,
      ``,
      `TO START YOUR ASSESSMENT DIRECTLY:`,
      `${link}`,
      ``,
      `YOUR CANDIDATE USER LOGIN CREDENTIALS:`,
      `• Candidate Portal: ${portalUrl}`,
      `• Username / Email: ${loginEmail}`,
      `• Temporary Password: ${tempPass}`,
      ``,
      `IMPORTANT CANDIDATE INSTRUCTIONS:`,
      `1. Please complete the assessment in one sitting from a quiet environment.`,
      `2. The ${duration}-minute countdown timer begins once you open the assessment link.`,
      `3. Your answers are automatically saved in real time as you type or select answers.`,
      `4. When the timer hits 00:00, your assessment will be submitted automatically.`,
      `5. You may also login to the candidate portal anytime to view your status and reports.`,
      ``,
      `If you have questions or encounter any issues, please contact the recruiting team at ${org}.`,
      ``,
      `Best regards,`,
      `Recruitment Team`,
      `${org}`,
      `Powered by TalentAssess AI`
    ].join('\r\n');

    const body = encodeURIComponent(bodyText);
    return `mailto:${inv.candidate_email}?subject=${subject}&body=${body}`;
  };

  const handleResendEmail = async (invitationId: number) => {
    setResendingEmailId(invitationId);
    try {
      const formData = new FormData();
      formData.append('invitation_id', invitationId.toString());
      const res = await authFetch('http://localhost:8000/api/v1/assessment/resend-invitation', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(err, 'Failed to resend invitation email.'));
      }
      const data = await res.json();
      await fetchInvitations();
      if (data.success) {
        showSuccess(`Assessment invitation email resent successfully to ${data.candidate_email}!`, 'Email Sent');
      } else {
        showWarning(
          `Could not send email automatically: ${data.message || 'SMTP is not configured in backend/.env'}. Please click "✉ Email Candidate" to send via your local email client.`,
          'Email Delivery Notice'
        );
      }
    } catch (err: any) {
      showError(err.message || 'Error resending email.', 'Resend Failed');
    } finally {
      setResendingEmailId(null);
    }
  };

  const handleCopyInviteLink = (invite: any) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(invite.invitation_link);
      setCopiedInviteId(invite.invitation_id);
      showInfo(`Copied test link for ${invite.candidate_name} to clipboard.`, 'Link Copied');
      setTimeout(() => setCopiedInviteId(null), 2500);
    }
  };

  const handleCopyCandidateCredentials = (inv: any) => {
    const loginEmail = inv.candidate_login_email || inv.candidate_email;
    const tempPass = inv.candidate_temp_password || '(Auto-Provisioned)';
    const link = inv.invitation_link || (inv.invitation_token ? `http://localhost:3000?invite_token=${inv.invitation_token}` : 'http://localhost:3000');
    const portalUrl = inv.candidate_portal_url || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    const credsText = [
      `═══════════════════════════════════════════════════════`,
      `TALENTASSESS AI - CANDIDATE ASSESSMENT & LOGIN CREDENTIALS`,
      `═══════════════════════════════════════════════════════`,
      `Candidate: ${inv.candidate_name}`,
      `Portal Login URL: ${portalUrl}`,
      `Username / Email: ${loginEmail}`,
      `Temporary Password: ${tempPass}`,
      `Direct Assessment Link: ${link}`,
      `═══════════════════════════════════════════════════════`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(credsText);
      const copyKey = inv.invitation_id || inv.candidate_resume_id || 'copied';
      setCopiedCredsCandidateId(copyKey);
      showSuccess(`Copied assessment link & login credentials for ${inv.candidate_name} to clipboard!`, 'Credentials Copied');
      setTimeout(() => setCopiedCredsCandidateId(null), 3000);
    }
  };

  const handlePreviewInvitationEmail = async (inv: any) => {
    setPreviewLoadingId(inv.invitation_id);
    try {
      const res = await authFetch(`http://localhost:8000/api/v1/assessment/invitation-preview/${inv.invitation_id}`);
      if (!res.ok) throw new Error('Failed to load email preview.');
      const data = await res.json();
      setPreviewEmailData(data);
    } catch (err: any) {
      showError(err.message || 'Error loading email preview.', 'Preview Error');
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const handleCopyEmailHtml = async () => {
    if (!previewEmailData?.html_body) return;
    try {
      if (typeof window !== 'undefined' && navigator.clipboard && (window as any).ClipboardItem) {
        const blob = new Blob([previewEmailData.html_body], { type: 'text/html' });
        const textBlob = new Blob([previewEmailData.text_body || ''], { type: 'text/plain' });
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({
            'text/html': blob,
            'text/plain': textBlob,
          })
        ]);
      } else {
        await navigator.clipboard.writeText(previewEmailData.html_body);
      }
      setCopiedHtml(true);
      showSuccess('Formatted HTML email template copied to clipboard! You can paste directly into Outlook or Gmail compose.', 'Template Copied');
      setTimeout(() => setCopiedHtml(false), 3000);
    } catch {
      await navigator.clipboard.writeText(previewEmailData.html_body);
      setCopiedHtml(true);
      showSuccess('HTML email code copied to clipboard.', 'Copied');
      setTimeout(() => setCopiedHtml(false), 3000);
    }
  };

  // Computed match percentage metrics based on results (applicable for multiple resumes)
  const validMultiScores = multiMatchResults.filter(
    (r) => typeof r.match_score === 'number' && !isNaN(r.match_score)
  );
  const multiAvgScore =
    validMultiScores.length > 0
      ? validMultiScores.reduce((acc, r) => acc + r.match_score, 0) / validMultiScores.length
      : null;
  const multiTopScore =
    validMultiScores.length > 0
      ? Math.max(...validMultiScores.map((r) => r.match_score))
      : null;
  const topMatchCandidate =
    validMultiScores.length > 0
      ? validMultiScores.find((r) => r.match_score === multiTopScore)
      : null;

  // Helper to verify if a report has genuine, successfully evaluated scores
  // (not failed or empty evaluation records with 0 scores and null metrics).
  const isReportSuccessful = (r: any): boolean => {
    if (!r) return false;
    const total = Number(r.total_score);
    const max = Number(r.max_score);
    if (isNaN(total) || isNaN(max) || max <= 0) return false;
    if (r.evaluations && typeof r.evaluations === 'object') {
      const evals = Object.values(r.evaluations) as any[];
      if (evals.length > 0 && evals.every((e: any) => e?.feedback === 'Evaluation failed.')) {
        return false;
      }
    }
    return true;
  };

  const successfulReports = reports.filter(isReportSuccessful);
  const latestSuccessfulReport = successfulReports[0] || null;
  const isAssessmentInProgress = questions.length > 0 && !activeSet?.submitted;

  const viewReport = async (reportId: number) => {
    setLoadingReportDetail(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/v1/reports/${reportId}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setSelectedReport(data);
    } catch {
      showError('Failed to load report details. Please try again.', 'Report Load Error');
    } finally {
      setLoadingReportDetail(false);
    }
  };

  // Fisher-Yates shuffle - returns a new array, doesn't mutate the input
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Switch which generated set is currently being viewed/answered.
  // Answers/evaluations are stored per-set, so this is just a pointer
  // change - nothing to clear or copy.
  const switchToSet = (idx: number) => {
    if (!questionSets[idx]) return;
    setActiveSetIndex(idx);
  };

  // Update a single answer within the currently active set only.
  const updateAnswer = (qIdx: number, value: string) => {
    setQuestionSets((prev) =>
      prev.map((s, i) =>
        i === activeSetIndex ? { ...s, candidateAnswers: { ...s.candidateAnswers, [qIdx]: value } } : s
      )
    );
  };

  // 1. Ingestion: Job Description/Resume upload, or
  // typed Role / Skill Area
  const handleIngest = async () => {
    if (organizationName.trim() === '') {
      showWarning('Please enter your organization name first.', 'Organization Required');
      return;
    }

    setLoadingContent(true);
    // Fresh content means the previous question sets (and any answers/
    // evaluations tied to them) are no longer relevant - and any resume
    // match analysis was against the OLD job description, so it's stale too.
    setQuestionSets([]);
    setActiveSetIndex(0);
    setResumeId(null);
    setResumeFile(null);
    setResumeFiles([]);
    setUploadedResumes([]);
    setJobMatchResult(null);
    setMultiMatchResults([]);
    setSelectedCandidateResumeId(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ta_job_match');
      sessionStorage.removeItem('ta_multi_match_results');
    }
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organization_name', organizationName);

        const res = await authFetch('http://localhost:8000/api/v1/content/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          let message = `Upload failed (HTTP ${res.status}).`;
          try {
            const errBody = await res.json();
            if (errBody?.detail) message = errBody.detail;
          } catch {
            // Response wasn't JSON (e.g. a raw 500 page) - fall back to the generic message above.
          }
          throw new Error(message);
        }
        const data = await res.json();
        const extracted = data.extracted_text_preview || 'Content processed.';
        setExtractedText(extracted);
        const newSrcId = data.source_id ?? null;
        setSourceId(newSrcId);
        setAiExtractPromptText(extracted);
        showSuccess('Job description ingested and content extracted successfully! Review or customize your Dimensions & Skills blueprint next.', 'JD Processed');
        if (newSrcId) {
          fetchSkillMatrix(newSrcId);
        }
        goTo('dimensions');
      } else if (topic) {
        const formData = new FormData();
        formData.append('topic', topic);
        formData.append('organization_name', organizationName);
        const res = await authFetch('http://localhost:8000/api/v1/content/topic', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          let message = `Failed to process role/skill area (HTTP ${res.status}).`;
          try {
            const errBody = await res.json();
            if (errBody?.detail) message = errBody.detail;
          } catch {
            // Response wasn't JSON - fall back to the generic message above.
          }
          throw new Error(message);
        }
        const data = await res.json();
        setExtractedText(topic);
        const newSrcId = data.source_id ?? null;
        setSourceId(newSrcId);
        setAiExtractPromptText(topic);
        const inferredRole = topic.split('\n')[0].replace(/^(generate|job description|role|hiring for):?\s*/i, '').slice(0, 80).trim();
        if (inferredRole) {
          setSkillMatrixRoleTitle(inferredRole);
          setAiExtractRoleInput(inferredRole);
        }
        showSuccess('Role / Skill topic ingested successfully! Review or customize your Dimensions & Skills blueprint next.', 'Topic Processed');
        if (newSrcId) {
          fetchSkillMatrix(newSrcId);
        }
        goTo('dimensions');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error extracting content.', 'Extraction Error');
    } finally {
      setLoadingContent(false);
    }
  };

  // 1b. Candidate Resume ingestion - single or multiple files or pasted text
  const handleResumeIngest = async () => {
    if (sourceId === null) {
      showWarning('Please process the job description/source material first.', 'Job Description Required');
      return;
    }
    if (resumeFiles.length === 0 && !resumeFile && !resumeText.trim()) {
      showWarning('Please select one or more resume files, or paste resume text.', 'Resumes Required');
      return;
    }

    setLoadingResume(true);
    setJobMatchResult(null);
    setMultiMatchResults([]);
    try {
      if (resumeFiles.length > 0) {
        const formData = new FormData();
        formData.append('source_id', sourceId.toString());
        resumeFiles.forEach((f) => formData.append('files', f));

        const res = await authFetch('http://localhost:8000/api/v1/candidate/resume/upload-multiple', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(`Resume upload failed (HTTP ${res.status}).`);
        const data = await res.json();
        setUploadedResumes(data);
        if (data.length > 0) {
          setResumeId(data[0].resume_id);
          setSelectedCandidateResumeId(data[0].resume_id);
          if (data[0].candidate_name && !candidateName) {
            setCandidateName(data[0].candidate_name);
          }
        }
      } else if (resumeFile) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        formData.append('source_id', sourceId.toString());
        if (candidateName) formData.append('candidate_name', candidateName);

        const res = await authFetch('http://localhost:8000/api/v1/candidate/resume/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(`Resume upload failed (HTTP ${res.status}).`);
        const data = await res.json();
        setResumeId(data.resume_id ?? null);
        setUploadedResumes([{ resume_id: data.resume_id, filename: data.filename || resumeFile.name, candidate_name: candidateName || 'Candidate' }]);
        setSelectedCandidateResumeId(data.resume_id ?? null);
      } else {
        const formData = new FormData();
        formData.append('resume_text', resumeText);
        formData.append('source_id', sourceId.toString());
        if (candidateName) formData.append('candidate_name', candidateName);

        const res = await authFetch('http://localhost:8000/api/v1/candidate/resume/text', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(`Resume submission failed (HTTP ${res.status}).`);
        const data = await res.json();
        setResumeId(data.resume_id ?? null);
        setUploadedResumes([{ resume_id: data.resume_id, filename: 'Pasted Resume', candidate_name: candidateName || 'Candidate' }]);
        setSelectedCandidateResumeId(data.resume_id ?? null);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error processing resumes.', 'Resume Processing Error');
    } finally {
      setLoadingResume(false);
    }
  };

  // 1c. AI Job-Candidate Match Analysis - handles multiple resumes or single resume at once
  const handleAnalyzeMatch = async () => {
    if (sourceId === null) {
      showWarning('Please process the job description first.', 'Job Description Required');
      return;
    }
    const targetIds = uploadedResumes.map((r) => r.resume_id);
    if (targetIds.length === 0) {
      if (resumeId !== null) targetIds.push(resumeId);
      else {
        showWarning('Please process resume(s) first before analyzing match.', 'Resumes Required');
        return;
      }
    }

    setAnalyzingMatch(true);
    try {
      const formData = new FormData();
      formData.append('source_id', sourceId.toString());
      formData.append('resume_ids', JSON.stringify(targetIds));

      const res = await authFetch('http://localhost:8000/api/v1/job-match/analyze-batch', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Match analysis failed (HTTP ${res.status}).`);
      const data: JobMatchResult[] = await res.json();
      setMultiMatchResults(data);
      if (data.length > 0) {
        setJobMatchResult(data[0]);
        setSelectedCandidateResumeId(data[0].resume_id ?? null);
        if (data[0].candidate_name && !candidateName) {
          setCandidateName(data[0].candidate_name);
        }
        const initialEmails: { [resumeId: number]: string } = {};
        const strongIds: number[] = [];
        data.forEach((item) => {
          if (item.resume_id) {
            if (item.candidate_email) {
              initialEmails[item.resume_id] = item.candidate_email;
            }
            if (item.match_score >= 75) {
              strongIds.push(item.resume_id);
            }
          }
        });
        setCandidateEmails((prev) => ({ ...initialEmails, ...prev }));
        if (strongIds.length > 0) {
          setSelectedCandidateIds(strongIds);
        } else if (data[0].resume_id) {
          setSelectedCandidateIds([data[0].resume_id]);
        }
        showSuccess(`Analyzed ${data.length} candidate profile(s) against Job Description!`, 'Match Analysis Complete');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error analyzing job match.', 'Match Analysis Error');
    } finally {
      setAnalyzingMatch(false);
    }
  };

  // Assessment timer helpers
  const stopTimer = () => {
    if (timerHandleRef.current) {
      clearInterval(timerHandleRef.current);
      timerHandleRef.current = null;
    }
  };

  const startTimer = (minutes: number) => {
    stopTimer();
    setTimerSeconds(minutes * 60);
    timerHandleRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Auto-submit when the timer hits zero.
  useEffect(() => {
    if (timerSeconds === 0) {
      stopTimer();
      handleSubmitAssessment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSeconds]);

  // 2. Assessment Generation & Submission Selection
  const generateQuestionsCore = async (): Promise<number | null> => {
    if (!extractedText) {
      showWarning('Please upload a file or enter a role/skill area first in Upload JD!', 'JD Content Required');
      return null;
    }
    if (numQuestions <= 0) {
      showWarning('Please enter a number of questions greater than 0.', 'Invalid Configuration');
      return null;
    }
    if (!difficulty) {
      showWarning('Please select a difficulty.', 'Difficulty Required');
      return null;
    }
    if (!questionType) {
      showWarning('Please select a question type.', 'Question Type Required');
      return null;
    }
    if (numSets < 1) {
      showWarning('Please enter at least 1 set.', 'Invalid Question Sets');
      return null;
    }
    setGenerating(true);
    try {
      const newSets: SetData[] = [];
      let lastAssessmentId: number | null = null;

      // Generate each set with its own request - the backend already
      // varies its output per call (see generator.py's variation_seed),
      // so distinct sets naturally differ in content, not just order.
      for (let s = 0; s < numSets; s++) {
        const formData = new FormData();
        formData.append('content', extractedText);
        formData.append('num_questions', numQuestions.toString());
        formData.append('difficulty', difficulty);
        formData.append('question_type', questionType);
        if (sourceId !== null) formData.append('source_id', sourceId.toString());

        const res = await authFetch('http://localhost:8000/api/v1/questions/generate', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        let qs: Question[] = data.questions || [];

        if (shuffleQuestionsOpt) qs = shuffleArray(qs);
        if (shuffleOptionsOpt) {
          qs = qs.map((q) =>
            q.options && q.options.length > 0 ? { ...q, options: shuffleArray(q.options) } : q
          );
        }

        if (data.assessment_id) lastAssessmentId = data.assessment_id;

        newSets.push({
          assessmentId: data.assessment_id ?? null,
          questions: qs,
          candidateAnswers: {},
          evaluations: {},
          submitted: false,
        });
      }

      setQuestionSets(newSets);
      setActiveSetIndex(0);
      startTimer(durationMinutes);
      showSuccess(`Successfully generated ${newSets.length} assessment question set(s)!`, 'Questions Ready');
      return lastAssessmentId;
    } catch (err) {
      showError('Failed to generate questions. Please verify connection and try again.', 'Generation Failed');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  // Open the submission method selection modal
  const handleOpenSubmissionModal = () => {
    if (!extractedText) {
      showWarning('Please upload a file or enter a role/skill area first in Upload JD!', 'JD Content Required');
      return;
    }
    if (numQuestions <= 0) {
      showWarning('Please enter a number of questions greater than 0.', 'Invalid Configuration');
      return;
    }
    if (!difficulty) {
      showWarning('Please select a difficulty.', 'Difficulty Required');
      return;
    }
    if (!questionType) {
      showWarning('Please select a question type.', 'Question Type Required');
      return;
    }

    // Pre-populate candidate info if available
    if (selectedCandidateIds.length > 0) {
      const match = multiMatchResults.find((m) => m.resume_id === selectedCandidateIds[0]);
      if (match) {
        setModalCandidateName(match.candidate_name || '');
        setModalCandidateEmail(candidateEmails[selectedCandidateIds[0]] || match.candidate_email || '');
      }
    } else if (candidateName) {
      setModalCandidateName(candidateName);
    }

    setSubmissionModalOpen(true);
  };

  // Onclick generate assessment handler
  const handleGenerateQuestions = async () => {
    handleOpenSubmissionModal();
  };

  // Option 1: Recruiter In-Person Submission -> Goes to candidate assessment
  const handleProceedRecruiterSubmission = async () => {
    setSubmissionModalOpen(false);
    if (questionSets.length > 0) {
      goTo('assessment');
      return;
    }
    const assessId = await generateQuestionsCore();
    if (assessId !== null || questionSets.length > 0) {
      goTo('assessment');
    }
  };

  // Option 2: Candidate Submission -> Creates user login, sends email with link & credentials, displays link
  const handleProceedCandidateSubmission = async () => {
    let assessId = questionSets[activeSetIndex]?.assessmentId || (questionSets[0]?.assessmentId ?? null);
    if (!assessId) {
      assessId = await generateQuestionsCore();
      if (!assessId) {
        showError('Could not generate assessment questions. Cannot dispatch candidate invitations.', 'Generation Error');
        return;
      }
    }

    let targets: any[] = [];
    if (selectedCandidateIds.length > 0) {
      targets = selectedCandidateIds.map((id) => {
        const match = multiMatchResults.find((m) => m.resume_id === id);
        const cName = match?.candidate_name || `Candidate #${id}`;
        const defaultEmail = match?.candidate_email || `${cName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`;
        return {
          resume_id: id,
          candidate_name: cName,
          candidate_email: candidateEmails[id] || defaultEmail,
        };
      });
    } else if (modalCandidateEmail.trim()) {
      targets = [{
        resume_id: null,
        candidate_name: modalCandidateName.trim() || 'Candidate',
        candidate_email: modalCandidateEmail.trim(),
      }];
    } else {
      showWarning('Please enter a candidate email address or select candidates in Job Match to dispatch invitations.', 'Candidate Email Required');
      return;
    }

    setSubmissionModalOpen(false);
    await handleSendInvitations(targets, assessId);

    // Scroll to candidate invitations section
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const el = document.getElementById('candidate-invitations-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  // 1-Click Generate Questions and Dispatch Invitations to All Selected Candidates
  const handleGenerateAndSendInvitations = async () => {
    if (!extractedText) {
      showWarning('Please upload a file or enter a role/skill area first in Upload JD!', 'JD Content Required');
      return;
    }
    if (numQuestions <= 0) {
      showWarning('Please enter a number of questions greater than 0.', 'Invalid Configuration');
      return;
    }
    if (!difficulty) {
      showWarning('Please select a difficulty.', 'Difficulty Required');
      return;
    }
    if (!questionType) {
      showWarning('Please select a question type.', 'Question Type Required');
      return;
    }

    const targetCandidates = selectedCandidateIds.map((id) => {
      const match = multiMatchResults.find((m) => m.resume_id === id);
      const cName = match?.candidate_name || `Candidate #${id}`;
      const defaultEmail = match?.candidate_email || `${cName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`;
      return {
        resume_id: id,
        candidate_name: cName,
        candidate_email: candidateEmails[id] || defaultEmail,
      };
    });

    if (targetCandidates.length === 0) {
      showWarning('Please select at least one candidate first in Job Match.', 'Candidate Required');
      return;
    }

    setGenerating(true);
    setSendingInvitations(true);
    try {
      const formData = new FormData();
      formData.append('content', extractedText);
      formData.append('num_questions', numQuestions.toString());
      formData.append('difficulty', difficulty);
      formData.append('question_type', questionType);
      if (sourceId !== null) formData.append('source_id', sourceId.toString());

      const res = await authFetch('http://localhost:8000/api/v1/questions/generate', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to generate assessment questions.');
      const data = await res.json();
      let qs: Question[] = data.questions || [];

      if (shuffleQuestionsOpt) qs = shuffleArray(qs);
      if (shuffleOptionsOpt) {
        qs = qs.map((q) =>
          q.options && q.options.length > 0 ? { ...q, options: shuffleArray(q.options) } : q
        );
      }

      setQuestionSets([{
        assessmentId: data.assessment_id ?? null,
        questions: qs,
        candidateAnswers: {},
        evaluations: {},
        submitted: false,
      }]);
      setActiveSetIndex(0);

      // Immediately dispatch invitations using the freshly created assessment
      const inviteFormData = new FormData();
      inviteFormData.append('assessment_id', data.assessment_id.toString());
      inviteFormData.append('candidates', JSON.stringify(targetCandidates));
      inviteFormData.append('duration_minutes', durationMinutes.toString());

      const inviteRes = await authFetch('http://localhost:8000/api/v1/assessment/invite-candidates', {
        method: 'POST',
        body: inviteFormData,
      });
      if (!inviteRes.ok) throw new Error('Assessment generated, but failed to dispatch invitations.');
      const inviteData = await inviteRes.json();
      await fetchInvitations();
      if (inviteData.smtp_configured) {
        showSuccess(`Assessment generated and invitation emails dispatched to ${inviteData.total_invited} candidate(s)!`, 'Invitations & Emails Dispatched');
      } else {
        showWarning(
          `Assessment generated and ${inviteData.total_invited} candidate links created. Note: SMTP server is not yet configured in backend/.env, so automated emails could not be sent. You can click "✉ Email Candidate" or copy test links to send manually.`,
          'Assessment & Links Created (SMTP Not Configured)'
        );
      }
    } catch (err: any) {
      showError(err.message || 'Error generating assessment and dispatching invitations.', 'Generation Error');
    } finally {
      setGenerating(false);
      setSendingInvitations(false);
    }
  };

  // 3. Candidate Assessment Submission & Evaluation
  const handleSubmitAssessment = async () => {
    if (candidateName.trim() === '') {
      showWarning('Please enter the candidate/employee name before submitting.', 'Candidate Name Required');
      return;
    }

    stopTimer();
    setTimerSeconds(null);

    const activeIdx = activeSetIndex;
    const activeQuestions = questionSets[activeIdx]?.questions || [];
    const activeAnswers = questionSets[activeIdx]?.candidateAnswers || {};
    const activeAssessmentId = questionSets[activeIdx]?.assessmentId ?? null;

    setEvaluating(true);
    const results: { [key: number]: any } = {};

    for (let i = 0; i < activeQuestions.length; i++) {
      const q = activeQuestions[i];
      const answer = activeAnswers[i] || '';

      if (q.question_type === 'MCQ') {
        const isCorrect = answer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
        results[i] = {
          overall_score: isCorrect ? 1 : 0,
          feedback: isCorrect ? 'Correct answer!' : `Incorrect. Correct choice is: ${q.correct_answer}`,
        };
      } else {
        try {
          const formData = new FormData();
          formData.append('question', q.question_text);
          formData.append('reference_answer', q.correct_answer);
          formData.append('user_answer', answer);
          formData.append('max_marks', '10');

          const res = await authFetch('http://localhost:8000/api/v1/assessment/evaluate-subjective', {
            method: 'POST',
            body: formData,
          });
          const evalData = await res.json();
          results[i] = evalData;
        } catch {
          results[i] = { overall_score: 0, feedback: 'Evaluation failed.' };
        }
      }
    }

    // Check if all questions failed evaluation (e.g. AI service or network failure).
    // In that case, do not save a corrupted 0/null report to the database.
    const evalList = Object.values(results);
    const allEvalFailed = evalList.length > 0 && evalList.every((r: any) => r?.feedback === 'Evaluation failed.');
    if (allEvalFailed) {
      showError('AI evaluation encountered a service error and could not complete scoring. An invalid report with 0 marks was not generated. Please check connection and try submitting again.', 'Evaluation Incomplete');
      return;
    }

    // Update only the active set's evaluations/submitted flag - other
    // sets (and their in-progress answers) are left completely untouched,
    // so switching to Set 1 after submitting Set 2 still works.
    const updatedSets = questionSets.map((s, i) =>
      i === activeIdx ? { ...s, evaluations: results, submitted: true } : s
    );
    setQuestionSets(updatedSets);
    setEvaluating(false);

    // Persist the completed report so it can be viewed later under Past
    // Reports. Only attempt this if we actually have an assessment_id -
    // otherwise there's nothing in the DB to link the report to.
    if (activeAssessmentId !== null) {
      try {
        const formData = new FormData();
        formData.append('assessment_id', activeAssessmentId.toString());
        formData.append('candidate_name', candidateName);
        formData.append('candidate_answers', JSON.stringify(activeAnswers));
        formData.append('evaluations', JSON.stringify(results));
        if (previousEmployers.length > 0) {
          formData.append('previous_employers', JSON.stringify(previousEmployers));
        }
        const submitRes = await authFetch('http://localhost:8000/api/v1/assessment/submit-report', {
          method: 'POST',
          body: formData,
        });
        if (!submitRes.ok) {
          throw new Error('Submit report request failed.');
        }
        const submitData = await submitRes.json().catch(() => null);
        await fetchReports(true); // refresh list so the new report shows up right away
        await fetchNotifications(true); // refresh notifications so bell & notification list update immediately
        await fetchInvitations(); // refresh candidate invitations list
        showSuccess('Assessment evaluation submitted and recorded to reports!', 'Evaluation Completed');
        goTo('reports');
        if (submitData?.report_id) {
          viewReport(submitData.report_id); // open the just-submitted report directly
        }
      } catch {
        showWarning('Evaluation completed, but saving the report failed. Your results above are still valid for this session.', 'Report Persistence Warning');
      }
    }

    // Only reset "Source Material" and "Assessment Generation" once EVERY
    // generated set has been submitted - otherwise the remaining
    // unsubmitted sets would become unreachable.
    const allSubmitted = updatedSets.length > 0 && updatedSets.every((s) => s.submitted);
    if (allSubmitted) {
      handleRemoveFile();
      setTopic('');
      setExtractedText('');
      setSourceId(null);
      setQuestionSets([]);
      setActiveSetIndex(0);
      setOrganizationName('');
      setCandidateName('');
      setPreviousEmployers([]);
      setResumeFile(null);
      setResumeFiles([]);
      setUploadedResumes([]);
      if (resumeFileInputRef.current) resumeFileInputRef.current.value = '';
      setResumeText('');
      setResumeId(null);
      // jobMatchResult is intentionally NOT cleared here - the Dashboard
      // shows it as the most recent match score, and clearing it on every
      // completed cycle made that stat go blank right after finishing an
      // assessment even though a match had just been analyzed. It still
      // gets cleared when a genuinely new job description is ingested
      // (see handleIngest), which is the correct invalidation point.
      handleResetControls();
    }
  };

  // Reset Assessment Generation Controls back to defaults
  const handleResetControls = () => {
    setNumQuestions(5);
    setDifficulty('');
    setQuestionType('');
    setNumSets(1);
    setNumCandidates(1);
    setShuffleQuestionsOpt(false);
    setShuffleOptionsOpt(false);
    setDurationMinutes(15);
  };

  // Remove the currently selected file (before it's been processed)
  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Candidate accessing via direct assessment invitation link
  if (inviteToken) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fc', fontFamily: 'Inter, Arial, sans-serif', padding: '30px 20px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ background: '#132247', color: '#fff', padding: '20px 28px', borderRadius: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#fff', padding: '4px 10px', borderRadius: 8 }}>
                <img src="/pamten_logo.png" alt="Logo" style={{ height: 30, width: 'auto', display: 'block' }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.2px' }}>
                  {candidateAssessmentData?.organization_name || 'TalentAssess AI'}
                </div>
                <div style={{ fontSize: 12.5, color: '#9aa5b8', marginTop: 2 }}>
                  Online Candidate Evaluation · {candidateAssessmentData?.job_title || 'Role Assessment'}
                </div>
              </div>
            </div>
            {candidateAssessmentData && !candidateAssessmentData.submitted && !candidateAssessmentResult && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Real-Time Auto-Save Status Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12.5,
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: isSavingDraft ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                  border: isSavingDraft ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(34, 197, 94, 0.3)',
                  color: isSavingDraft ? '#fef08a' : '#86efac',
                  fontWeight: 500,
                  transition: 'all 0.25s ease'
                }}>
                  <span style={{ fontSize: 13 }}>{isSavingDraft ? '💾' : '✓'}</span>
                  <span>
                    {isSavingDraft
                      ? 'Auto-saving draft...'
                      : lastSavedTime
                        ? `Auto-saved (${lastSavedTime})`
                        : 'Auto-save active'}
                  </span>
                </div>

                {/* Dynamic Countdown Timer */}
                <div
                  className="ta-timer"
                  style={{
                    background: (candidateTimerSeconds !== null && candidateTimerSeconds <= 120) ? '#fee2e2' : 'rgba(255,255,255,0.14)',
                    color: (candidateTimerSeconds !== null && candidateTimerSeconds <= 120) ? '#b91c1c' : '#fff',
                    border: (candidateTimerSeconds !== null && candidateTimerSeconds <= 120) ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.25)',
                    fontWeight: 700,
                    fontSize: 14,
                    padding: '6px 14px',
                    borderRadius: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: (candidateTimerSeconds !== null && candidateTimerSeconds <= 120) ? '0 0 10px rgba(239,68,68,0.4)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: 14 }}>⏱</span>
                  <span>
                    {candidateTimerSeconds !== null ? (
                      <>
                        {Math.floor(candidateTimerSeconds / 60).toString().padStart(2, '0')}:{(candidateTimerSeconds % 60).toString().padStart(2, '0')}
                        <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.9, marginLeft: 4 }}>Remaining</span>
                      </>
                    ) : (
                      '15:00 Time Limit'
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {loadingCandidateAssessment ? (
            <div className="ta-card" style={{ textAlign: 'center', padding: 40 }}>
              <span className="ta-spinner dark" style={{ width: 24, height: 24 }}></span>
              <p style={{ marginTop: 12, color: '#64748b' }}>Loading your assessment...</p>
            </div>
          ) : candidateAssessmentResult || candidateAssessmentData?.submitted ? (
            candidateSessionClosed ? (
              <div className="ta-card" style={{ textAlign: 'center', padding: '52px 28px' }}>
                <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
                <h2 style={{ color: '#0f172a', margin: '0 0 10px', fontSize: 24, fontWeight: 700 }}>Assessment Session Concluded</h2>
                <p className="ta-muted" style={{ maxWidth: 520, margin: '0 auto 22px', fontSize: 15, lineHeight: 1.6 }}>
                  Thank you, <strong>{candidateAssessmentResult?.candidate_name || candidateAssessmentData?.candidate_name}</strong>. Your assessment responses and evaluation results have been safely submitted and recorded with the hiring team.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', fontSize: 13.5, fontWeight: 500, marginBottom: 16 }}>
                  <span>🔒</span>
                  <span>Assessment Completed & Locked · You may now safely close this browser window or tab.</span>
                </div>
              </div>
            ) : (
              <div className="ta-card" style={{ textAlign: 'center', padding: '44px 28px' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                <h2 style={{ color: '#111625', margin: '0 0 10px' }}>Assessment Submitted Successfully!</h2>
                <p className="ta-muted" style={{ maxWidth: 540, margin: '0 auto 20px', fontSize: 14.5 }}>
                  Thank you, <strong>{candidateAssessmentResult?.candidate_name || candidateAssessmentData?.candidate_name}</strong>. Your answers have been AI-evaluated and your score has been recorded directly to the recruiter dashboard.
                </p>
                <div style={{ display: 'inline-flex', gap: 28, background: '#f8fafc', padding: '18px 32px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 26 }}>
                  <div>
                    <div className="ta-label" style={{ fontSize: 11, color: '#64748b' }}>Score Percentage</div>
                    <strong style={{ fontSize: 28, color: '#1f8f5f', display: 'block', marginTop: 4 }}>
                      {candidateAssessmentResult?.score_percentage ?? candidateAssessmentData?.score_percentage}%
                    </strong>
                  </div>
                  <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 28 }}>
                    <div className="ta-label" style={{ fontSize: 11, color: '#64748b' }}>Score Marks</div>
                    <strong style={{ fontSize: 28, color: '#1e293b', display: 'block', marginTop: 4 }}>
                      {candidateAssessmentResult?.total_score ?? candidateAssessmentData?.total_score} / {candidateAssessmentResult?.max_score ?? candidateAssessmentData?.max_score}
                    </strong>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      className="ta-btn"
                      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', padding: '10px 24px', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)' }}
                      onClick={() => {
                        if (candidateAssessmentResult?.report_id) {
                          openCandidateReportModal(candidateAssessmentResult.report_id);
                        } else if (inviteToken) {
                          openCandidatePublicReportModal(inviteToken);
                        } else if (candidateAssessmentData?.invitation_token) {
                          openCandidatePublicReportModal(candidateAssessmentData.invitation_token);
                        }
                      }}
                    >
                      📊 View Detailed Evaluation Report
                    </button>

                    {authUser?.role === 'candidate' ? (
                      <button
                        className="ta-btn secondary"
                        style={{ padding: '10px 22px', fontWeight: 600, fontSize: 14 }}
                        onClick={() => {
                          setInviteToken(null);
                          setActiveNav('candidatePortal');
                          fetchCandidateAssessments();
                          fetchCandidateReports();
                        }}
                      >
                        ← Go to Candidate Portal
                      </button>
                    ) : (
                      <button
                        className="ta-btn secondary"
                        style={{ padding: '10px 22px', fontWeight: 600, fontSize: 13.5 }}
                        onClick={() => {
                          setInviteToken(null);
                          setAuthPortalTab('candidate');
                          setCandidateAuthMode('register');
                          if (candidateAssessmentResult?.candidate_name || candidateAssessmentData?.candidate_name) {
                            setCandidateFullName(candidateAssessmentResult?.candidate_name || candidateAssessmentData?.candidate_name || '');
                          }
                          if (candidateAssessmentData?.candidate_email) {
                            setCandidateLoginEmail(candidateAssessmentData.candidate_email);
                          }
                        }}
                      >
                        👤 Candidate Login / Sign Up
                      </button>
                    )}

                    <button
                      className="ta-btn secondary"
                      style={{ padding: '10px 20px', fontWeight: 600, fontSize: 13.5, color: '#64748b' }}
                      onClick={() => {
                        try { window.close(); } catch (e) {}
                        setCandidateSessionClosed(true);
                      }}
                    >
                      ✓ Exit Assessment
                    </button>
                  </div>

                  <span style={{ fontSize: 12.5, color: '#64748b' }}>
                    Your assessment has been evaluated. You can review your detailed report above or access it anytime in your Candidate Portal.
                  </span>
                </div>
              </div>
            )
          ) : candidateAssessmentData ? (
            <div>
              <div className="ta-card" style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#111625' }}>
                      Candidate: {candidateAssessmentData.candidate_name}
                    </h2>
                    <p className="ta-muted ta-small" style={{ margin: 0 }}>
                      Difficulty: <strong>{candidateAssessmentData.difficulty}</strong> · {candidateAssessmentData.num_questions} Questions
                    </p>
                  </div>
                  <span className="ta-pill" style={{ fontSize: 12, padding: '5px 12px' }}>
                    📧 {candidateAssessmentData.candidate_email}
                  </span>
                </div>
              </div>

              {/* Real-Time Auto-Save Reassurance Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#065f46',
                marginBottom: 16
              }}>
                <span style={{ fontSize: 16 }}>🛡️</span>
                <div style={{ lineHeight: 1.4 }}>
                  <strong>Real-Time Auto-Save Active:</strong> Your responses are automatically saved in this browser as you type. If you reload or accidentally close the tab, your answers will be restored. When the timer reaches 00:00, your assessment will be submitted automatically.
                </div>
              </div>

              {/* Questions List */}
              {candidateAssessmentData.questions?.map((q: any, qIdx: number) => (
                <div key={qIdx} className="ta-card ta-question" style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 12 }}>
                    Question {qIdx + 1} of {candidateAssessmentData.num_questions}
                    <span className="ta-pill" style={{ marginLeft: 8, fontSize: 11 }}>{q.question_type}</span>
                  </div>
                  <p style={{ fontSize: 14.5, color: '#334155', lineHeight: 1.5, marginBottom: 16 }}>
                    {q.question_text}
                  </p>

                  {q.question_type === 'MCQ' && q.options && q.options.length > 0 ? (
                    <div className="ta-options">
                      {q.options.map((opt: string, optIdx: number) => {
                        const isSelected = candidateAssessmentAnswers[qIdx] === opt;
                        return (
                          <label
                            key={optIdx}
                            style={{
                              background: isSelected ? '#f0f9ff' : '#fff',
                              borderColor: isSelected ? '#00a3e0' : '#e0e5ed'
                            }}
                          >
                            <input
                              type="radio"
                              name={`candidate_q_${qIdx}`}
                              value={opt}
                              checked={isSelected}
                              onChange={() => setCandidateAssessmentAnswers(prev => ({ ...prev, [qIdx]: opt }))}
                              style={{ marginRight: 10 }}
                            />
                            <span style={{ fontSize: 13.5, color: '#1e293b' }}>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <textarea
                        rows={4}
                        className="ta-input"
                        placeholder="Type your response here..."
                        value={candidateAssessmentAnswers[qIdx] || ''}
                        onChange={(e) => setCandidateAssessmentAnswers(prev => ({ ...prev, [qIdx]: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 24, marginBottom: 40 }}>
                <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>💾</span>
                  <span>
                    {isSavingDraft
                      ? 'Saving latest answers...'
                      : lastSavedTime
                        ? `All responses auto-saved locally (${lastSavedTime})`
                        : 'Responses are automatically saved locally'}
                  </span>
                </div>
                <button
                  className="ta-btn"
                  style={{ padding: '12px 28px', fontSize: 15, fontWeight: 700 }}
                  disabled={submittingCandidateAssessment}
                  onClick={handleCandidateSubmit}
                >
                  {submittingCandidateAssessment ? (
                    <><span className="ta-spinner"></span>Submitting & Evaluating Answers...</>
                  ) : (
                    'Submit Assessment →'
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {/* Global High-Visibility Consistent Alert Popups */}
        {alerts.length > 0 && (
          <div className="ta-popup-toast-container" aria-live="polite">
            {alerts.map((item) => (
              <AlertToastItem key={item.id} alert={item} onDismiss={dismissAlert} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Still checking localStorage/validating the saved token - avoid a
  // flash of the login form for users who are actually already logged in.
  if (!authChecked) {
    return (
      <div className="ta-app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p className="ta-muted">Loading...</p>
      </div>
    );
  }

  // Not logged in - show Login/Register/Forgot Password instead of the main app.
  if (!authToken) {
    return (
      <div className="ta-app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="ta-card" style={{ width: 420, padding: 32, boxShadow: '0 8px 32px rgba(106, 44, 145, 0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '8px 18px', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 12 }}>
              <img src="/pamten_logo.png" alt="PamTen" style={{ height: 44, width: 'auto', display: 'block' }} />
            </div>
            <div className="ta-logo" style={{ color: '#111625', fontSize: 22, fontWeight: 800 }}>TalentAssess AI</div>
            <div className="ta-logo-sub" style={{ color: '#657084', margin: 0 }}>Recruitment Assessment Platform</div>
          </div>

          {/* Top Portal Switcher: Recruiter / Staff vs Candidate Portal */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 10, marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => { setAuthPortalTab('recruiter'); setAuthError(''); setResetSuccess(''); }}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                borderRadius: 7,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: authPortalTab === 'recruiter' ? '#ffffff' : 'transparent',
                color: authPortalTab === 'recruiter' ? '#0f172a' : '#64748b',
                boxShadow: authPortalTab === 'recruiter' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              💼 Recruiter / Staff
            </button>
            <button
              type="button"
              onClick={() => { setAuthPortalTab('candidate'); setAuthError(''); setResetSuccess(''); }}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                borderRadius: 7,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: authPortalTab === 'candidate' ? '#0284c7' : 'transparent',
                color: authPortalTab === 'candidate' ? '#ffffff' : '#64748b',
                boxShadow: authPortalTab === 'candidate' ? '0 2px 6px rgba(2,132,199,0.25)' : 'none',
              }}
            >
              🎓 Candidate Portal
            </button>
          </div>

          {authPortalTab === 'candidate' ? (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => { setCandidateAuthMode('login'); setAuthError(''); setResetSuccess(''); }}
                  className={`ta-btn ${candidateAuthMode === 'login' ? '' : 'secondary'}`}
                  style={{ flex: 1, fontSize: 13, padding: '8px 10px' }}
                >
                  Candidate Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setCandidateAuthMode('register'); setAuthError(''); setResetSuccess(''); }}
                  className={`ta-btn ${candidateAuthMode === 'register' ? '' : 'secondary'}`}
                  style={{ flex: 1, fontSize: 13, padding: '8px 10px' }}
                >
                  Create Account
                </button>
              </div>

              {logoutMessage && (
                <p className="ta-good ta-small" style={{ marginBottom: 12 }}>{logoutMessage}</p>
              )}
              {resetSuccess && (
                <div style={{ background: '#e8f7ee', border: '1px solid #a3e6b9', color: '#177245', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>✓</span>
                  <span>{resetSuccess}</span>
                </div>
              )}
              {authError && (
                <div style={{ background: '#fee4e2', border: '1px solid #fca5a5', color: '#a1291f', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
                  <span>{authError}</span>
                </div>
              )}

              {candidateAuthMode === 'login' ? (
                <>
                  <p className="ta-muted ta-small" style={{ margin: '0 0 14px', lineHeight: 1.5 }}>
                    Sign in to access your assigned tests and review all your evaluation reports.
                  </p>
                  <div className="ta-label">Email Address</div>
                  <input
                    type="email"
                    value={candidateLoginEmail}
                    onChange={(e) => setCandidateLoginEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCandidateLogin(); }}
                    placeholder="candidate@example.com"
                    className="ta-input"
                    style={{ marginBottom: 12 }}
                  />
                  <div className="ta-label">Password</div>
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <input
                      type={showCandidatePassword ? 'text' : 'password'}
                      value={candidateLoginPassword}
                      onChange={(e) => setCandidateLoginPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCandidateLogin(); }}
                      placeholder="Enter your password"
                      className="ta-input"
                      style={{ paddingRight: 38 }}
                    />
                    <span
                      onClick={() => setShowCandidatePassword((v) => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 15, userSelect: 'none', opacity: 0.65 }}
                      title={showCandidatePassword ? 'Hide password' : 'Show password'}
                    >
                      {showCandidatePassword ? '🙈' : '👁'}
                    </span>
                  </div>
                  <button
                    onClick={handleCandidateLogin}
                    disabled={authLoading}
                    className="ta-btn"
                    style={{ width: '100%', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', fontWeight: 700 }}
                  >
                    {authLoading ? <><span className="ta-spinner"></span>Signing In...</> : 'Sign In to Candidate Portal'}
                  </button>
                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <span style={{ fontSize: 12.5, color: '#64748b' }}>
                      Don't have a candidate account?{' '}
                      <button
                        type="button"
                        onClick={() => { setCandidateAuthMode('register'); setAuthError(''); }}
                        style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Create One Here
                      </button>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="ta-muted ta-small" style={{ margin: '0 0 14px', lineHeight: 1.5 }}>
                    Create an account to submit assessments and permanently save all your AI evaluation reports.
                  </p>
                  <div className="ta-label">Full Name</div>
                  <input
                    type="text"
                    value={candidateFullName}
                    onChange={(e) => setCandidateFullName(e.target.value)}
                    placeholder="e.g. Alex Taylor"
                    className="ta-input"
                    style={{ marginBottom: 12 }}
                  />
                  <div className="ta-label">Email Address</div>
                  <input
                    type="email"
                    value={candidateLoginEmail}
                    onChange={(e) => setCandidateLoginEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="ta-input"
                    style={{ marginBottom: 12 }}
                  />
                  <div className="ta-label">Create Password (at least 6 characters)</div>
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <input
                      type={showCandidatePassword ? 'text' : 'password'}
                      value={candidateLoginPassword}
                      onChange={(e) => setCandidateLoginPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCandidateRegister(); }}
                      placeholder="At least 6 characters"
                      className="ta-input"
                      style={{ paddingRight: 38 }}
                    />
                    <span
                      onClick={() => setShowCandidatePassword((v) => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 15, userSelect: 'none', opacity: 0.65 }}
                      title={showCandidatePassword ? 'Hide password' : 'Show password'}
                    >
                      {showCandidatePassword ? '🙈' : '👁'}
                    </span>
                  </div>
                  <button
                    onClick={handleCandidateRegister}
                    disabled={authLoading}
                    className="ta-btn"
                    style={{ width: '100%', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', fontWeight: 700 }}
                  >
                    {authLoading ? <><span className="ta-spinner"></span>Creating Account...</> : 'Create Candidate Account & Start'}
                  </button>
                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <span style={{ fontSize: 12.5, color: '#64748b' }}>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setCandidateAuthMode('login'); setAuthError(''); }}
                        style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Sign In
                      </button>
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {authMode !== 'forgot' ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  <button
                    onClick={() => { setAuthMode('login'); setAuthError(''); setResetSuccess(''); }}
                    className={`ta-btn ${authMode === 'login' ? '' : 'secondary'}`}
                    style={{ flex: 1 }}
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => { setAuthMode('register'); setAuthError(''); setLogoutMessage(''); setResetSuccess(''); }}
                    className={`ta-btn ${authMode === 'register' ? '' : 'secondary'}`}
                    style={{ flex: 1 }}
                  >
                    Register
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid #edf2f7' }}>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className="ta-back-btn"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    <span className="arrow">←</span> Back to Log In
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#657084', textTransform: 'uppercase', letterSpacing: 0.5 }}>Password Recovery</span>
                </div>
              )}

          {logoutMessage && (
            <p className="ta-good ta-small" style={{ marginBottom: 12 }}>{logoutMessage}</p>
          )}
          {resetSuccess && (
            <div style={{ background: '#e8f7ee', border: '1px solid #a3e6b9', color: '#177245', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>✓</span>
              <span>{resetSuccess}</span>
            </div>
          )}
          {authError && (
            <div style={{ background: '#fee4e2', border: '1px solid #fca5a5', color: '#a1291f', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
              <span>{authError}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <>
              <div className="ta-label">Email</div>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                placeholder="name@company.com"
                className="ta-input"
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <div className="ta-label" style={{ marginBottom: 0 }}>Password</div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot');
                    setAuthError('');
                    setLogoutMessage('');
                    setResetSuccess('');
                    setForgotEmail(loginEmail);
                    setForgotNewPassword('');
                    setForgotConfirmPassword('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#00a3e0',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative', marginBottom: 18 }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                  placeholder="••••••••"
                  className="ta-input"
                  style={{ paddingRight: 38 }}
                />
                <span
                  onClick={() => setShowLoginPassword((v) => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 15, userSelect: 'none', opacity: 0.65 }}
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? '🙈' : '👁'}
                </span>
              </div>
              <button onClick={handleLogin} disabled={authLoading} className="ta-btn" style={{ width: '100%' }}>
                {authLoading ? <><span className="ta-spinner"></span>Logging In...</> : 'Log In'}
              </button>
            </>
          ) : authMode === 'register' ? (
            <>
              <div className="ta-label">Account Role</div>
              <select
                value={registerRole}
                onChange={(e) => setRegisterRole(e.target.value as any)}
                className="ta-select"
                style={{ marginBottom: 12, fontWeight: 600 }}
              >
                <option value="account_manager">Account Manager</option>
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
                <option value="recruiter">Recruiter</option>
              </select>

              <div className="ta-label">Full Name</div>
              <input
                type="text"
                value={registerFullName}
                onChange={(e) => setRegisterFullName(e.target.value)}
                placeholder="Jane Doe"
                className="ta-input"
                style={{ marginBottom: 12 }}
              />
              <div className="ta-label">Organization Name</div>
              <input
                type="text"
                value={registerOrgName}
                onChange={(e) => setRegisterOrgName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="ta-input"
                style={{ marginBottom: 12 }}
              />
              <div className="ta-label">Email</div>
              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="name@company.com"
                className="ta-input"
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div className="ta-label" style={{ margin: 0 }}>Temporary Password (8 Characters)</div>
                <button
                  type="button"
                  onClick={() => {
                    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
                    const lower = 'abcdefghijkmnopqrstuvwxyz';
                    const digits = '23456789';
                    const specials = '!@#$%&*?';
                    const chosen = [
                      upper[Math.floor(Math.random() * upper.length)],
                      lower[Math.floor(Math.random() * lower.length)],
                      digits[Math.floor(Math.random() * digits.length)],
                      specials[Math.floor(Math.random() * specials.length)],
                    ];
                    const allPool = (upper + lower + digits + specials).split('').filter((c) => !chosen.includes(c));
                    for (let i = 0; i < 4; i++) {
                      const idx = Math.floor(Math.random() * allPool.length);
                      chosen.push(allPool.splice(idx, 1)[0]);
                    }
                    chosen.sort(() => Math.random() - 0.5);
                    setRegisterPassword(chosen.join(''));
                    setShowRegisterPassword(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#00a3e0',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Generate unique 8-character password with alphabets, numbers & special characters"
                >
                  🎲 Auto-Generate (8 Chars)
                </button>
              </div>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(); }}
                  placeholder="8 chars (alphabets, numbers, symbols) or leave blank"
                  className="ta-input"
                  style={{ paddingRight: 38 }}
                />
                <span
                  onClick={() => setShowRegisterPassword((v) => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 15, userSelect: 'none', opacity: 0.65 }}
                  title={showRegisterPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegisterPassword ? '🙈' : '👁'}
                </span>
              </div>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#0369a1', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>📧</span>
                <span>An 8-character temporary password (unique combination of alphabets, numbers & special characters) will be emailed to the user. Upon initial login, they will be required to reset it.</span>
              </div>
              <button onClick={handleRegister} disabled={authLoading} className="ta-btn" style={{ width: '100%' }}>
                {authLoading ? <><span className="ta-spinner"></span>Creating Account & Dispatching Email...</> : 'Create Account'}
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#111625' }}>Reset Password</h3>
                <p className="ta-muted ta-small" style={{ margin: 0 }}>
                  Enter your account email and specify a new password.
                </p>
              </div>

              <div className="ta-label">Account Email</div>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword(); }}
                placeholder="name@company.com"
                className="ta-input"
                style={{ marginBottom: 12 }}
              />

              <div className="ta-label">New Password</div>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  type={showForgotNewPw ? 'text' : 'password'}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword(); }}
                  placeholder="At least 8 characters"
                  className="ta-input"
                  style={{ paddingRight: 38 }}
                />
                <span
                  onClick={() => setShowForgotNewPw((v) => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 15, userSelect: 'none', opacity: 0.65 }}
                  title={showForgotNewPw ? 'Hide password' : 'Show password'}
                >
                  {showForgotNewPw ? '🙈' : '👁'}
                </span>
              </div>

              <div className="ta-label">Confirm New Password</div>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  type={showForgotConfirmPw ? 'text' : 'password'}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword(); }}
                  placeholder="Re-enter new password"
                  className="ta-input"
                  style={{ paddingRight: 38 }}
                />
                <span
                  onClick={() => setShowForgotConfirmPw((v) => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 15, userSelect: 'none', opacity: 0.65 }}
                  title={showForgotConfirmPw ? 'Hide password' : 'Show password'}
                >
                  {showForgotConfirmPw ? '🙈' : '👁'}
                </span>
              </div>

              {/* Password checks helper */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: forgotNewPassword.length >= 8 ? '#1f8f5f' : '#64748b', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>{forgotNewPassword.length >= 8 ? '✓' : '○'}</span>
                  <span>Minimum 8 characters</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: forgotNewPassword && forgotNewPassword === forgotConfirmPassword ? '#1f8f5f' : '#64748b' }}>
                  <span style={{ fontWeight: 700 }}>{forgotNewPassword && forgotNewPassword === forgotConfirmPassword ? '✓' : '○'}</span>
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                onClick={handleForgotPassword}
                disabled={authLoading}
                className="ta-btn"
                style={{ width: '100%', marginBottom: 10 }}
              >
                {authLoading ? <><span className="ta-spinner"></span>Resetting Password...</> : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className="ta-btn secondary"
                style={{ width: '100%' }}
              >
                Cancel & Return to Log In
              </button>
            </>
          )}
            </>
          )}
        </div>
        {/* Global High-Visibility Consistent Alert Popups */}
        {alerts.length > 0 && (
          <div className="ta-popup-toast-container" aria-live="polite">
            {alerts.map((item) => (
              <AlertToastItem key={item.id} alert={item} onDismiss={dismissAlert} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Mandatory First-Time Login Password Reset Intercept Screen
  if (authUser?.must_reset_password) {
    return (
      <div
        className="ta-auth-container"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0c1833 0%, #172a5a 50%, #291a45 100%)',
          padding: '24px 16px',
        }}
      >
        <div
          className="ta-card"
          style={{
            maxWidth: 450,
            width: '100%',
            padding: 32,
            borderRadius: 16,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            background: '#ffffff',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div
              style={{
                display: 'inline-flex',
                background: '#f8fafc',
                padding: '10px 18px',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                marginBottom: 16,
              }}
            >
              <img src="/pamten_logo.png" alt="PamTen" style={{ height: 34, width: 'auto' }} />
            </div>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 20,
                background: '#fee2e2',
                color: '#991b1b',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Security Requirement
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
              Set Permanent Password
            </h2>
            <p className="ta-muted ta-small" style={{ margin: 0, lineHeight: 1.4 }}>
              Welcome, <strong>{authUser.full_name || authUser.email}</strong>. Because your account was configured with a temporary credential, you must establish a permanent password before continuing.
            </p>
          </div>

          {resetTempError && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #f87171',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#991b1b',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>⚠️</span>
              <span>{resetTempError}</span>
            </div>
          )}

          <div className="ta-label">New Permanent Password</div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={showResetTempPw ? 'text' : 'password'}
              value={resetTempPassword}
              onChange={(e) => setResetTempPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="ta-input"
              style={{ paddingRight: 38 }}
            />
            <span
              onClick={() => setShowResetTempPw((v) => !v)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                fontSize: 15,
                opacity: 0.65,
                userSelect: 'none',
              }}
            >
              {showResetTempPw ? '🙈' : '👁'}
            </span>
          </div>

          <div className="ta-label">Confirm New Password</div>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input
              type={showResetTempConfirm ? 'text' : 'password'}
              value={resetTempConfirm}
              onChange={(e) => setResetTempConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleResetTemporaryPassword();
              }}
              placeholder="Confirm new password"
              className="ta-input"
              style={{ paddingRight: 38 }}
            />
            <span
              onClick={() => setShowResetTempConfirm((v) => !v)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                fontSize: 15,
                opacity: 0.65,
                userSelect: 'none',
              }}
            >
              {showResetTempConfirm ? '🙈' : '👁'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetTemporaryPassword}
            disabled={resetTempLoading}
            className="ta-btn"
            style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700 }}
          >
            {resetTempLoading ? (
              <>
                <span className="ta-spinner"></span> Updating Credentials...
              </>
            ) : (
              'Save Password & Access Portal →'
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 12.5,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Log out and sign in with a different account
            </button>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="ta-popup-toast-container" aria-live="polite">
            {alerts.map((item) => (
              <AlertToastItem key={item.id} alert={item} onDismiss={dismissAlert} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const userRole = authUser?.role || 'recruiter';
  const isExecutive = userRole === 'admin' || userRole === 'hr' || userRole === 'account_manager';

  return (
    <div className="ta-app">
      {navLoading && (
        <div className="ta-nav-loading">
          <span className="ta-spinner dark"></span>
        </div>
      )}
      <aside className="ta-side">
        <div className="ta-side-header">
          <div className="ta-logo-box">
            <img src="/pamten_logo.png" alt="PamTen" style={{ height: 32, width: 'auto', display: 'block' }} />
          </div>
          <div className="ta-logo">TalentAssess AI</div>
          <div className="ta-logo-sub">
            {userRole === 'candidate' ? 'Candidate Assessment Portal' : 'Recruitment Assessment Platform'}
          </div>
        </div>

        <div className="ta-side-nav">
          {userRole === 'candidate' ? (
            <>
              <div style={{ marginTop: 14, padding: '10px 10px 4px', fontSize: 10, fontWeight: 800, color: '#93c5fd', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Candidate Workspace
              </div>
              <div
                className={`ta-nav ${activeNav === 'candidatePortal' ? 'active' : ''}`}
                onClick={() => goTo('candidatePortal')}
                style={{ display: 'flex', alignItems: 'center', gap: 9 }}
              >
                <span>📝</span>
                <span>My Assessments</span>
              </div>
              <div
                className={`ta-nav ${activeNav === 'candidateReports' ? 'active' : ''}`}
                onClick={() => goTo('candidateReports')}
                style={{ display: 'flex', alignItems: 'center', gap: 9 }}
              >
                <span>📊</span>
                <span>My Evaluation Reports</span>
              </div>
            </>
          ) : (
            <>
              {/* Executive Section for Admin, HR, Account Manager */}
              {isExecutive && (
                <>
                  <div style={{ marginTop: 16, padding: '8px 10px 4px', fontSize: 10, fontWeight: 800, color: '#93c5fd', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Executive Suite
                  </div>
                  <div className={`ta-nav ${activeNav === 'adminDashboard' ? 'active' : ''}`} onClick={() => goTo('adminDashboard')}>
                    Executive Dashboard
                  </div>
                  <div className={`ta-nav ${activeNav === 'recruitersList' ? 'active' : ''}`} onClick={() => goTo('recruitersList')}>
                    Recruiters Directory
                  </div>
                  <div className={`ta-nav ${activeNav === 'yearlyPerformance' ? 'active' : ''}`} onClick={() => goTo('yearlyPerformance')}>
                    Yearly Performance
                  </div>
                </>
              )}

              {/* Recruiter Workflow Menus (Available to Recruiter, HR, and Account Manager) */}
              {userRole !== 'admin' && (
                <>
                  {isExecutive && (
                    <div style={{ marginTop: 14, padding: '10px 10px 4px', fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.8, textTransform: 'uppercase', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      Recruitment Operations
                    </div>
                  )}
                  <div className={`ta-nav ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={() => goTo('dashboard')}>
                    {isExecutive ? 'Recruiter Dashboard' : 'Dashboard'}
                  </div>
                  <div className={`ta-nav ${activeNav === 'source' ? 'active' : ''}`} onClick={() => goTo('source')}>Upload JD</div>
                  <div className={`ta-nav ${activeNav === 'dimensions' ? 'active' : ''}`} onClick={() => goTo('dimensions')}>Dimensions & Skills</div>
                  <div className={`ta-nav ${activeNav === 'match' ? 'active' : ''}`} onClick={() => goTo('match')}>Job Match</div>
                  <div className={`ta-nav ${activeNav === 'generate' ? 'active' : ''}`} onClick={() => goTo('generate')}>Assessment Config</div>
                  <div className={`ta-nav ${activeNav === 'assessment' ? 'active' : ''}`} onClick={() => goTo('assessment')}>Candidate Assessment</div>
                </>
              )}

              {/* Common Menus */}
              {userRole === 'admin' && (
                <div style={{ padding: '10px 10px 2px', fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Candidate Oversight
                </div>
              )}
              <div className={`ta-nav ${activeNav === 'reports' ? 'active' : ''}`} onClick={() => goTo('reports')}>
                Evaluation Reports
              </div>
              <div
                className={`ta-nav ${activeNav === 'notifications' ? 'active' : ''}`}
                onClick={() => goTo('notifications')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>Notifications</span>
                <span className={`ta-side-badge ${unreadNotifCount > 0 ? 'has-unread' : 'is-zero'}`}>
                  {unreadNotifCount}
                </span>
              </div>
              <div className={`ta-nav ${activeNav === 'tech' ? 'active' : ''}`} onClick={() => goTo('tech')}>Tech Stack & R&D</div>
            </>
          )}
        </div>

        <div className="ta-side-footer">
          <div className="ta-profile-wrapper" ref={profileMenuRef}>
            <div
              onClick={() => setProfileMenuOpen((o) => !o)}
              className="ta-profile-btn"
              style={{ background: profileMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            >
              <div className="ta-avatar">{initials}</div>
              <div style={{ overflow: 'hidden' }}>
                <span className="ta-profile-name">{displayName}</span>
                <span style={{ fontSize: 10, color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5, display: 'block' }}>
                  {userRole === 'account_manager' ? 'Account Manager' : userRole}
                </span>
              </div>
            </div>
            {profileMenuOpen && (
              <div className="ta-dropdown ta-dropdown-up">
                <div className="ta-dropdown-item" onClick={() => { setProfileMenuOpen(false); goTo('profile'); }}>Profile</div>
                <div className="ta-dropdown-item" onClick={() => { setProfileMenuOpen(false); goTo('changePassword'); }}>Change Password</div>
              </div>
            )}
          </div>

          <div className="ta-nav ta-nav-logout" onClick={loggingOut ? undefined : handleLogout} style={{ cursor: loggingOut ? 'default' : 'pointer', opacity: loggingOut ? 0.6 : 1 }}>
            {loggingOut ? <><span className="ta-spinner"></span>Logging Out...</> : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout</span>
              </>
            )}
          </div>
        </div>
      </aside>

      <main className="ta-main">
        {/* Universal Breadcrumbs & Sidebar-Sequence Back Redirection Header */}
        <div style={{ marginBottom: 20 }}>
          {activeNav !== 'dashboard' && activeNav !== 'adminDashboard' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="ta-breadcrumbs">
                <span className="crumb" onClick={() => goTo(userRole === 'admin' ? 'adminDashboard' : 'dashboard')}>
                  {userRole === 'admin' ? 'Executive Dashboard' : 'Dashboard'}
                </span>
                {previousSection !== 'dashboard' && previousSection !== 'adminDashboard' && (
                  <>
                    <span className="separator">›</span>
                    <span className="crumb" onClick={() => goTo(previousSection)}>
                      {navTitles[previousSection]}
                    </span>
                  </>
                )}
                <span className="separator">›</span>
                <span className="current">{navTitles[activeNav]}</span>
              </div>
              {activeNav !== 'reports' && (
                <button onClick={goBack} className="ta-back-btn" title={`Back to ${previousSectionName}`}>
                  <span className="arrow">←</span> Back to {previousSectionName}
                </button>
              )}
            </div>
          )}
          <div className="ta-top" style={{ marginBottom: 0 }}>
            <h1>
              {activeNav === 'dashboard' && (isExecutive ? 'Recruiter Operations Dashboard' : 'TalentAssess AI')}
              {activeNav === 'candidatePortal' && 'Candidate Portal — My Assigned Assessments'}
              {activeNav === 'candidateReports' && 'Candidate Portal — My Evaluation Reports'}
              {activeNav === 'adminDashboard' && 'Executive Management Dashboard'}
              {activeNav === 'recruitersList' && 'Total Recruiters Directory & Metrics'}
              {activeNav === 'yearlyPerformance' && 'Yearly Performance & Annual Analytics'}
              {activeNav === 'source' && 'Upload JD'}
              {activeNav === 'dimensions' && 'Define Dimensions & Skills Matrix'}
              {activeNav === 'match' && 'Job–Candidate Match'}
              {activeNav === 'generate' && 'Assessment Generation Controls'}
              {activeNav === 'assessment' && 'Candidate Assessment'}
              {activeNav === 'reports' && 'Candidate Evaluation Reports'}
              {activeNav === 'notifications' && 'Notifications & Candidate Alerts'}
              {activeNav === 'tech' && 'Tech Stack & R&D'}
              {activeNav === 'profile' && 'Profile'}
              {activeNav === 'changePassword' && 'Change Password'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                className="ta-badge"
                style={{
                  background:
                    userRole === 'admin'
                      ? '#fee2e2'
                      : userRole === 'hr'
                      ? '#e0e7ff'
                      : userRole === 'account_manager'
                      ? '#fef3c7'
                      : userRole === 'candidate'
                      ? '#d1fae5'
                      : '#e0f2fe',
                  color:
                    userRole === 'admin'
                      ? '#991b1b'
                      : userRole === 'hr'
                      ? '#3730a3'
                      : userRole === 'account_manager'
                      ? '#92400e'
                      : userRole === 'candidate'
                      ? '#065f46'
                      : '#075985',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                }}
              >
                {userRole === 'account_manager' ? 'Account Mgr' : userRole === 'candidate' ? 'Candidate' : userRole}
              </span>
              <span className="ta-badge">
                {userRole === 'candidate' ? (authUser?.email || 'Candidate Account') : (authUser?.organization_name || organizationName || 'No organization set')}
              </span>

              {/* Recruiter In-App Notification Center */}
              <div className="ta-notif-wrapper" ref={notifMenuRef}>
                <button
                  type="button"
                  className={`ta-notif-btn ${notifMenuOpen ? 'active' : ''}`}
                  onClick={() => setNotifMenuOpen(prev => !prev)}
                  title={unreadNotifCount > 0 ? `${unreadNotifCount} unread candidate assessment notification(s)` : '0 unread notifications'}
                  aria-label="Candidate Notifications"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span className={`ta-notif-badge ${unreadNotifCount > 0 ? 'has-unread' : 'is-zero'}`}>
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                </button>

                {notifMenuOpen && (
                  <div className="ta-notif-dropdown">
                    <div className="ta-notif-header">
                      <div className="ta-notif-header-title">
                        <span>Candidate Alerts</span>
                        {unreadNotifCount > 0 && (
                          <span className="ta-notif-count-pill">{unreadNotifCount} New</span>
                        )}
                      </div>
                      {unreadNotifCount > 0 && (
                        <button
                          type="button"
                          className="ta-notif-mark-all-btn"
                          onClick={handleMarkAllNotificationsRead}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="ta-notif-list">
                      {notifications.length === 0 ? (
                        <div className="ta-notif-empty">
                          <div className="ta-notif-empty-icon">🔔</div>
                          <div className="ta-notif-empty-title">No notifications yet</div>
                          <p className="ta-notif-empty-sub">
                            You will receive instant alerts here as soon as candidates complete and submit their assessments.
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const isUnread = !n.is_read;
                          const cInitials = (n.candidate_name || 'Candidate')
                            .split(/\s+/)
                            .map((w) => w[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();
                          const scoreTier = (n.score_percentage ?? 0) >= 75 ? 'high' : ((n.score_percentage ?? 0) >= 50 ? 'medium' : 'low');

                          return (
                            <div
                              key={n.id}
                              className={`ta-notif-item ${isUnread ? 'unread' : 'read'}`}
                              onClick={() => handleOpenNotificationReport(n)}
                            >
                              <div className="ta-notif-avatar">{cInitials}</div>
                              <div className="ta-notif-content">
                                <div className="ta-notif-candidate">
                                  <span>{n.candidate_name || 'Candidate'}</span>
                                  {isUnread ? (
                                    <span className="ta-notif-status-badge unread">● NEW</span>
                                  ) : (
                                    <span className="ta-notif-status-badge read">✓ Read</span>
                                  )}
                                </div>
                                <div className="ta-notif-role">
                                  {n.job_title || 'Assessment Completed'}
                                </div>
                                <div className="ta-notif-footer-row">
                                  {n.score_percentage != null ? (
                                    <span className={`ta-notif-score-pill ${scoreTier}`}>
                                      ★ {n.score_percentage}% Score
                                    </span>
                                  ) : <span />}
                                  <span className="ta-notif-time">{formatRelativeTime(n.created_at)}</span>
                                </div>
                                <div className="ta-notif-actions">
                                  <button
                                    type="button"
                                    className="ta-notif-view-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenNotificationReport(n);
                                    }}
                                  >
                                    View Report →
                                  </button>
                                  {isUnread && (
                                    <button
                                      type="button"
                                      className="ta-notif-mark-single-btn"
                                      onClick={(e) => handleMarkNotificationRead(n.id, e)}
                                      title="Mark as read"
                                    >
                                      Mark Read
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="ta-notif-delete-btn"
                                    onClick={(e) => handleDeleteNotification(n.id, e)}
                                    title="Dismiss notification"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="ta-notif-footer">
                      <span
                        className="ta-notif-footer-link"
                        onClick={() => {
                          setNotifMenuOpen(false);
                          goTo('notifications');
                        }}
                      >
                        View All Notifications →
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- Executive Dashboard ---------------- */}
        {activeNav === 'adminDashboard' && (
          <div>
            {/* Top Control Bar with Month Filter & Refresh */}
            <div className="ta-card" style={{ marginBottom: 18, padding: '16px 22px', background: '#fff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>Executive Recruitment Dashboard</h2>
                  <p className="ta-muted ta-small" style={{ margin: 0 }}>
                    Real-time recruiter pipeline metrics, candidate submissions, and onboarding performance.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="ta-label" style={{ margin: 0, fontSize: 12 }}>Filter Period:</span>
                    <input
                      type="month"
                      value={adminMonth}
                      onChange={(e) => {
                        setAdminMonth(e.target.value);
                        fetchAdminDashboardStats(e.target.value);
                      }}
                      className="ta-input"
                      style={{ padding: '7px 12px', fontSize: 13, width: 'auto', fontWeight: 600 }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchAdminDashboardStats()}
                    disabled={loadingAdminStats}
                    className="ta-btn secondary"
                    style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>↻</span>
                    <span>{loadingAdminStats ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo('yearlyPerformance')}
                    className="ta-btn"
                    style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>📅</span>
                    <span>Yearly Performance & Export</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Key KPI Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
              {/* Top Recruiter Card */}
              <div className="ta-card" style={{ padding: '20px', position: 'relative', overflow: 'hidden', borderLeft: '4px solid #f59e0b', background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span className="ta-label" style={{ color: '#b45309', fontWeight: 700, margin: 0 }}>🏆 Top Recruiter ({adminMonth})</span>
                  <span style={{ fontSize: 20 }}>🥇</span>
                </div>
                {adminStats?.top_recruiter ? (
                  <>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#1e293b' }}>
                      {adminStats.top_recruiter.name}
                    </h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {adminStats.top_recruiter.email}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="ta-pill" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 700, margin: 0 }}>
                        {adminStats.top_recruiter.submissions ?? adminStats.top_recruiter.submissions_count ?? 0} Submissions
                      </span>
                      <span className="ta-pill" style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, margin: 0 }}>
                        {adminStats.top_recruiter.onboards ?? adminStats.top_recruiter.onboards_count ?? 0} Onboarded
                      </span>
                      <span className="ta-pill" style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 700, margin: 0 }}>
                        {adminStats.top_recruiter.conversion_rate}% Placement
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="ta-muted" style={{ fontSize: 13, margin: '14px 0 0' }}>No submissions recorded for this month.</p>
                )}
              </div>

              {/* Total Submissions Card */}
              <div className="ta-card" style={{ padding: '20px', borderLeft: '4px solid #00a3e0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span className="ta-label" style={{ color: '#0284c7', fontWeight: 700, margin: 0 }}>Total Submissions</span>
                  <span style={{ fontSize: 20 }}>📋</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1.1, marginBottom: 6 }}>
                  {loadingAdminStats ? '...' : (adminStats?.total_submissions ?? 0)}
                </div>
                <p className="ta-muted ta-small" style={{ margin: 0 }}>
                  Assessments submitted in {adminMonth}
                </p>
              </div>

              {/* Total Onboards Card */}
              <div className="ta-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span className="ta-label" style={{ color: '#059669', fontWeight: 700, margin: 0 }}>Total Onboards</span>
                  <span style={{ fontSize: 20 }}>🤝</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#059669', lineHeight: 1.1, marginBottom: 6 }}>
                  {loadingAdminStats ? '...' : (adminStats?.total_onboards ?? 0)}
                </div>
                <p className="ta-muted ta-small" style={{ margin: 0 }}>
                  Candidates hired & onboarded in {adminMonth}
                </p>
              </div>

              {/* Conversion Rate Card */}
              <div className="ta-card" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span className="ta-label" style={{ color: '#4f46e5', fontWeight: 700, margin: 0 }}>Placement / Conversion</span>
                  <span style={{ fontSize: 20 }}>🎯</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#4f46e5', lineHeight: 1.1, marginBottom: 6 }}>
                  {loadingAdminStats ? '...' : `${adminStats?.conversion_rate ?? 0}%`}
                </div>
                <div className="ta-progress" style={{ height: 6, margin: '6px 0 6px', background: '#e0e7ff' }}>
                  <span style={{ width: `${Math.min(100, adminStats?.conversion_rate || 0)}%`, background: '#4f46e5' }} />
                </div>
                <p className="ta-muted ta-small" style={{ margin: 0 }}>
                  Submissions converted to hires
                </p>
              </div>
            </div>

            {/* Quick Navigation Action Banner */}
            <div className="ta-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '16px 20px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>⚡</span>
                <div>
                  <strong style={{ display: 'block', fontSize: 14, color: '#0f172a' }}>Management Quick Navigation</strong>
                  <span className="ta-muted ta-small">Access detailed recruiter breakdown directories or export performance data</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => goTo('recruitersList')}
                  className="ta-btn"
                  style={{ fontSize: 13, padding: '8px 16px' }}
                >
                  👥 View Total Recruiters List
                </button>
                <button
                  type="button"
                  onClick={() => goTo('yearlyPerformance')}
                  className="ta-btn secondary"
                  style={{ fontSize: 13, padding: '8px 16px' }}
                >
                  📊 Yearly Performance Report
                </button>
                <button
                  type="button"
                  onClick={() => goTo('reports')}
                  className="ta-btn secondary"
                  style={{ fontSize: 13, padding: '8px 16px' }}
                >
                  📋 Candidate Reports Oversight
                </button>
              </div>
            </div>

            {/* Recent Candidate Submissions & Activity for the Month */}
            <div className="ta-card" style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    Recent Candidate Submissions ({adminMonth})
                  </h3>
                  <p className="ta-muted ta-small" style={{ margin: '2px 0 0' }}>
                    Latest completed evaluations with real-time onboarding status
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goTo('reports')}
                  className="ta-btn secondary"
                  style={{ fontSize: 12, padding: '5px 12px' }}
                >
                  View All in Reports →
                </button>
              </div>

              {!adminStats?.recent_activity || adminStats.recent_activity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                  <p style={{ margin: 0, fontSize: 14 }}>No candidate submissions recorded for {adminMonth}.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <th style={{ padding: '10px 12px' }}>Candidate Name</th>
                        <th style={{ padding: '10px 12px' }}>Job Role / Tech</th>
                        <th style={{ padding: '10px 12px' }}>Recruiter</th>
                        <th style={{ padding: '10px 12px' }}>Score</th>
                        <th style={{ padding: '10px 12px' }}>Submitted Date</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Onboard Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.recent_activity.map((act: any) => (
                        <tr key={act.report_id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .15s' }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>
                            {act.candidate_name || 'Anonymous Candidate'}
                          </td>
                          <td style={{ padding: '12px', color: '#334155' }}>
                            {act.job_title || 'Untitled Assessment'}
                          </td>
                          <td style={{ padding: '12px', color: '#475569' }}>
                            {act.recruiter_name || act.recruiter_email || '—'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontWeight: 700, color: act.score >= 70 ? '#16a34a' : act.score >= 50 ? '#d97706' : '#dc2626' }}>
                              {act.score}%
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#64748b', fontSize: 12 }}>
                            {act.submitted_at ? new Date(act.submitted_at).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {act.is_onboarded ? (
                              <span className="ta-pill" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontWeight: 700 }}>
                                ✓ Onboarded
                              </span>
                            ) : (
                              <span className="ta-pill" style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                                In Evaluation
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleOnboard(act.report_id, !!act.is_onboarded)}
                              disabled={togglingOnboardId === act.report_id}
                              className={`ta-btn ${act.is_onboarded ? 'secondary' : ''}`}
                              style={{
                                fontSize: 11.5,
                                padding: '5px 12px',
                                background: act.is_onboarded ? '#f1f5f9' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                color: act.is_onboarded ? '#334155' : '#fff',
                                border: act.is_onboarded ? '1px solid #cbd5e1' : 'none',
                                cursor: 'pointer',
                              }}
                              title={act.is_onboarded ? 'Click to remove onboarded status' : 'Mark candidate as onboarded'}
                            >
                              {togglingOnboardId === act.report_id ? 'Updating...' : act.is_onboarded ? 'Remove Onboard' : 'Mark Onboarded'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- Total Recruiters List ---------------- */}
        {activeNav === 'recruitersList' && (
          <div>
            <div className="ta-card" style={{ marginBottom: 18, padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>Total Recruiters Directory & Performance</h2>
                  <p className="ta-muted ta-small" style={{ margin: 0 }}>
                    Overview of platform team members with monthly submissions, confirmed onboards, and placement conversion rates.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="ta-label" style={{ margin: 0, fontSize: 12 }}>Month:</span>
                    <input
                      type="month"
                      value={adminMonth}
                      onChange={(e) => {
                        setAdminMonth(e.target.value);
                        fetchRecruitersList(e.target.value, adminYear, recruiterRoleFilter);
                      }}
                      className="ta-input"
                      style={{ padding: '7px 12px', fontSize: 13, width: 'auto', fontWeight: 600 }}
                    />
                  </div>

                  {/* Role Dropdown Filter: Admin has Account Manager, HR, Recruiter; Account Manager has HR, Recruiter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="ta-label" style={{ margin: 0, fontSize: 12 }}>Role Filter:</span>
                    <select
                      value={recruiterRoleFilter}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setRecruiterRoleFilter(newRole);
                        fetchRecruitersList(adminMonth, adminYear, newRole);
                      }}
                      className="ta-select"
                      style={{ padding: '7px 12px', fontSize: 13, width: 'auto', fontWeight: 600, minWidth: 155 }}
                    >
                      {userRole === 'admin' && (
                        <>
                          <option value="all">All Roles</option>
                          <option value="account_manager">Account Manager</option>
                          <option value="hr">HR</option>
                          <option value="recruiter">Recruiter</option>
                        </>
                      )}
                      {userRole === 'account_manager' && (
                        <>
                          <option value="all">All (HR & Recruiter)</option>
                          <option value="hr">HR</option>
                          <option value="recruiter">Recruiter</option>
                        </>
                      )}
                      {userRole === 'hr' && (
                        <>
                          <option value="recruiter">Recruiter</option>
                        </>
                      )}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => goTo('yearlyPerformance')}
                    className="ta-btn"
                    style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>📅</span>
                    <span>Yearly Performance & Export</span>
                  </button>
                </div>
              </div>

              {/* Search filter input & Quick Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                <input
                  type="text"
                  value={recruiterSearch}
                  onChange={(e) => setRecruiterSearch(e.target.value)}
                  placeholder="🔍 Search member by name, email, role, or organization..."
                  className="ta-input"
                  style={{ maxWidth: 380, fontSize: 13 }}
                />

                {/* Quick Role Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginRight: 2 }}>Quick Filter:</span>

                  {userRole === 'admin' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRecruiterRoleFilter('all');
                          fetchRecruitersList(adminMonth, adminYear, 'all');
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 16,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: recruiterRoleFilter === 'all' ? '1.5px solid #0077b5' : '1px solid #cbd5e1',
                          background: recruiterRoleFilter === 'all' ? '#e0f2fe' : '#ffffff',
                          color: recruiterRoleFilter === 'all' ? '#0369a1' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        All Roles
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecruiterRoleFilter('account_manager');
                          fetchRecruitersList(adminMonth, adminYear, 'account_manager');
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 16,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: recruiterRoleFilter === 'account_manager' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                          background: recruiterRoleFilter === 'account_manager' ? '#ede9fe' : '#ffffff',
                          color: recruiterRoleFilter === 'account_manager' ? '#6d28d9' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        👔 Account Manager
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecruiterRoleFilter('hr');
                          fetchRecruitersList(adminMonth, adminYear, 'hr');
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 16,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: recruiterRoleFilter === 'hr' ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                          background: recruiterRoleFilter === 'hr' ? '#ccfbf1' : '#ffffff',
                          color: recruiterRoleFilter === 'hr' ? '#0f766e' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        👥 HR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecruiterRoleFilter('recruiter');
                          fetchRecruitersList(adminMonth, adminYear, 'recruiter');
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 16,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: recruiterRoleFilter === 'recruiter' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          background: recruiterRoleFilter === 'recruiter' ? '#e0f2fe' : '#ffffff',
                          color: recruiterRoleFilter === 'recruiter' ? '#0369a1' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        🎯 Recruiter
                      </button>
                    </>
                  )}

                  {userRole === 'account_manager' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRecruiterRoleFilter('all');
                          fetchRecruitersList(adminMonth, adminYear, 'all');
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 16,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: recruiterRoleFilter === 'all' ? '1.5px solid #0077b5' : '1px solid #cbd5e1',
                          background: recruiterRoleFilter === 'all' ? '#e0f2fe' : '#ffffff',
                          color: recruiterRoleFilter === 'all' ? '#0369a1' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        All (HR & Recruiter)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecruiterRoleFilter('hr');
                          fetchRecruitersList(adminMonth, adminYear, 'hr');
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 16,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: recruiterRoleFilter === 'hr' ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                          background: recruiterRoleFilter === 'hr' ? '#ccfbf1' : '#ffffff',
                          color: recruiterRoleFilter === 'hr' ? '#0f766e' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        👥 HR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecruiterRoleFilter('recruiter');
                          fetchRecruitersList(adminMonth, adminYear, 'recruiter');
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 16,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: recruiterRoleFilter === 'recruiter' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          background: recruiterRoleFilter === 'recruiter' ? '#e0f2fe' : '#ffffff',
                          color: recruiterRoleFilter === 'recruiter' ? '#0369a1' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        🎯 Recruiter
                      </button>
                    </>
                  )}

                  {userRole === 'hr' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecruiterRoleFilter('recruiter');
                        fetchRecruitersList(adminMonth, adminYear, 'recruiter');
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 16,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1.5px solid #0284c7',
                        background: '#e0f2fe',
                        color: '#0369a1',
                      }}
                    >
                      🎯 Recruiter
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Recruiters Table */}
            <div className="ta-card">
              {(() => {
                const filteredRecruiters = recruitersList.filter((r: any) => {
                  if (r.role === 'admin') return false;
                  if (userRole === 'account_manager') {
                    if (r.role !== 'hr' && r.role !== 'recruiter') return false;
                    if (recruiterRoleFilter !== 'all' && r.role !== recruiterRoleFilter) return false;
                  } else if (userRole === 'admin') {
                    if (recruiterRoleFilter !== 'all' && r.role !== recruiterRoleFilter) return false;
                  } else if (userRole === 'hr') {
                    if (r.role !== 'recruiter') return false;
                  }

                  const query = recruiterSearch.toLowerCase().trim();
                  if (!query) return true;
                  const nameMatch = (r.full_name || r.name || '').toLowerCase().includes(query);
                  const emailMatch = (r.email || '').toLowerCase().includes(query);
                  const orgMatch = (r.organization_name || r.organization || '').toLowerCase().includes(query);
                  const roleName = r.role === 'account_manager' ? 'account manager' : (r.role || '');
                  const roleMatch = roleName.toLowerCase().includes(query);
                  return nameMatch || emailMatch || orgMatch || roleMatch;
                });

                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span className="ta-muted ta-small">
                        Showing {filteredRecruiters.length} of {recruitersList.length} member(s)
                        {recruiterRoleFilter !== 'all' && (
                          <span style={{ marginLeft: 6, fontWeight: 600, color: '#0077b5' }}>
                            (Role: {recruiterRoleFilter === 'account_manager' ? 'Account Manager' : recruiterRoleFilter === 'hr' ? 'HR' : 'Recruiter'})
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => fetchRecruitersList(adminMonth, adminYear, recruiterRoleFilter)}
                        disabled={loadingRecruitersList}
                        className="ta-btn secondary"
                        style={{ padding: '5px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <span>↻</span>
                        <span>{loadingRecruitersList ? 'Refreshing...' : 'Refresh List'}</span>
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            <th style={{ padding: '10px 12px' }}>Member</th>
                            <th style={{ padding: '10px 12px' }}>Role</th>
                            <th style={{ padding: '10px 12px' }}>Organization</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center' }}>Month Submissions ({adminMonth})</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center' }}>Month Onboards</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center' }}>Month Placement %</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center' }}>Year Submissions ({adminYear})</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center' }}>Year Onboards</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center' }}>Avg Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRecruiters.length === 0 ? (
                            <tr>
                              <td colSpan={9} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                                <div style={{ fontSize: 26, marginBottom: 8 }}>👥</div>
                                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>No members found matching the selected filter</div>
                                <div style={{ fontSize: 12.5 }}>
                                  {recruiterRoleFilter !== 'all' ? `No members with role "${recruiterRoleFilter === 'account_manager' ? 'Account Manager' : recruiterRoleFilter.toUpperCase()}" found.` : 'Try adjusting your search criteria.'}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredRecruiters.map((rec: any, idx: number) => {
                              const isTop = idx === 0 && (rec.monthly_submissions > 0 || rec.yearly_submissions > 0);
                              const recName = rec.full_name || rec.name || 'Member';
                              const recOrg = rec.organization_name || rec.organization || '—';
                              const convRate = rec.conversion_rate ?? rec.monthly_conversion_rate ?? 0;
                              const avgScore = rec.avg_score ?? rec.avg_assessment_score ?? 0;

                              return (
                                <tr key={rec.id || rec.recruiter_id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: isTop ? '#fffdf7' : 'transparent' }}>
                                  <td style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: isTop ? '#f59e0b' : rec.role === 'account_manager' ? '#8b5cf6' : rec.role === 'hr' ? '#0d9488' : '#00a3e0',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 12
                                      }}>
                                        {(recName || rec.email || '?')[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span>{recName}</span>
                                          {isTop && (
                                            <span className="ta-pill" style={{ background: '#fef3c7', color: '#b45309', fontSize: 10, padding: '2px 6px', fontWeight: 700 }}>
                                              ★ Top
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>{rec.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                    {rec.role === 'account_manager' ? (
                                      <span className="ta-pill" style={{ background: '#ede9fe', color: '#6d28d9', fontWeight: 600, border: '1px solid #ddd6fe' }}>
                                        👔 Account Manager
                                      </span>
                                    ) : rec.role === 'hr' ? (
                                      <span className="ta-pill" style={{ background: '#ccfbf1', color: '#0f766e', fontWeight: 600, border: '1px solid #99f6e4' }}>
                                        👥 HR
                                      </span>
                                    ) : rec.role === 'admin' ? (
                                      <span className="ta-pill" style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 600, border: '1px solid #fecaca' }}>
                                        ⚡ Admin
                                      </span>
                                    ) : (
                                      <span className="ta-pill" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 600, border: '1px solid #bae6fd' }}>
                                        🎯 Recruiter
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px', color: '#475569' }}>
                                    {recOrg}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                                    {rec.monthly_submissions ?? 0}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <span className="ta-pill" style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, margin: 0 }}>
                                      {rec.monthly_onboards ?? 0}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <span style={{ fontWeight: 700, color: convRate > 0 ? '#4f46e5' : '#64748b' }}>
                                      {convRate}%
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                                    {rec.yearly_submissions ?? 0}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <span className="ta-pill" style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 700, margin: 0 }}>
                                      {rec.yearly_onboards ?? 0}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <strong style={{ color: avgScore >= 70 ? '#16a34a' : avgScore >= 50 ? '#d97706' : '#64748b' }}>
                                      {avgScore > 0 ? `${avgScore}%` : '—'}
                                    </strong>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ---------------- Yearly Performance & Export ---------------- */}
        {activeNav === 'yearlyPerformance' && (
          <div>
            <div className="ta-card" style={{ marginBottom: 18, padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>
                    Yearly Performance & Annual Analytics ({adminYear})
                  </h2>
                  <p className="ta-muted ta-small" style={{ margin: 0 }}>
                    Comprehensive 12-month evaluation breakdown, annual placement ratios, and top performing recruiters.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="ta-label" style={{ margin: 0, fontSize: 12 }}>Year:</span>
                    <select
                      value={adminYear}
                      onChange={(e) => {
                        const y = Number(e.target.value);
                        setAdminYear(y);
                        fetchYearlyPerformance(y);
                      }}
                      className="ta-select"
                      style={{ padding: '7px 12px', fontSize: 13, width: 'auto', fontWeight: 600 }}
                    >
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                      <option value={2024}>2024</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportYearlyPerformance(adminYear)}
                    className="ta-btn"
                    style={{
                      padding: '8px 18px',
                      fontSize: 13,
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
                    }}
                    title="Export full year performance data to CSV"
                  >
                    <span>📥</span>
                    <span>Export Yearly Performance (CSV)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchYearlyPerformance(adminYear)}
                    disabled={loadingYearlyPerf}
                    className="ta-btn secondary"
                    style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600 }}
                  >
                    <span>↻</span>
                    <span>{loadingYearlyPerf ? 'Loading...' : 'Refresh'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Annual KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
              <div className="ta-card" style={{ padding: '20px', borderLeft: '4px solid #00a3e0' }}>
                <span className="ta-label" style={{ color: '#0284c7', fontWeight: 700, margin: '0 0 6px', display: 'block' }}>Annual Submissions</span>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>
                  {yearlyPerformanceData?.total_submissions ?? 0}
                </div>
                <p className="ta-muted ta-small" style={{ margin: '4px 0 0' }}>Total assessments completed in {adminYear}</p>
              </div>

              <div className="ta-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                <span className="ta-label" style={{ color: '#059669', fontWeight: 700, margin: '0 0 6px', display: 'block' }}>Annual Onboards</span>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#059669' }}>
                  {yearlyPerformanceData?.total_onboards ?? 0}
                </div>
                <p className="ta-muted ta-small" style={{ margin: '4px 0 0' }}>Total candidates successfully hired in {adminYear}</p>
              </div>

              <div className="ta-card" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
                <span className="ta-label" style={{ color: '#4f46e5', fontWeight: 700, margin: '0 0 6px', display: 'block' }}>Overall Placement Rate</span>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#4f46e5' }}>
                  {yearlyPerformanceData?.yearly_conversion_rate ?? yearlyPerformanceData?.overall_conversion_rate ?? 0}%
                </div>
                <p className="ta-muted ta-small" style={{ margin: '4px 0 0' }}>Annual conversion efficiency ratio</p>
              </div>
            </div>

            {/* 12-Month Table Breakdown */}
            <div className="ta-card">
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Monthly Breakdown (January – December {adminYear})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <th style={{ padding: '10px 12px' }}>Month</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Submissions</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Onboards</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Placement %</th>
                      <th style={{ padding: '10px 12px' }}>Top Monthly Recruiter</th>
                      <th style={{ padding: '10px 12px', width: 180 }}>Volume Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(yearlyPerformanceData?.months || []).map((m: any) => {
                      const totalSub = yearlyPerformanceData?.total_submissions || 1;
                      const pctOfAnnual = Math.round(((m.submissions || 0) / (totalSub || 1)) * 100);
                      const hasData = m.submissions > 0;
                      const topRecName = m.top_recruiter_name || m.top_recruiter;
                      return (
                        <tr key={m.month_num} style={{ borderBottom: '1px solid #f1f5f9', background: hasData ? '#f8fafc' : 'transparent' }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: hasData ? '#0f172a' : '#94a3b8' }}>
                            {m.month_name}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: hasData ? 700 : 400, color: hasData ? '#0f172a' : '#94a3b8' }}>
                            {m.submissions}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {m.onboards > 0 ? (
                              <span className="ta-pill" style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, margin: 0 }}>
                                {m.onboards}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>0</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ fontWeight: hasData ? 700 : 400, color: m.conversion_rate > 0 ? '#4f46e5' : '#94a3b8' }}>
                              {m.conversion_rate}%
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {topRecName && topRecName !== '--' ? (
                              <span className="ta-pill" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                                🏆 {topRecName}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div className="ta-progress" style={{ height: 6, background: '#e2e8f0' }}>
                              <span style={{ width: `${pctOfAnnual}%`, background: '#00a3e0' }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Candidate Portal: My Assessments ---------------- */}
        {activeNav === 'candidatePortal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Candidate Welcome Banner */}
            <div className="ta-hero">
              <div className="ta-card" style={{ flex: 2, background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)', border: '1px solid #bae6fd' }}>
                <span className="ta-pill" style={{ background: '#0284c7', color: '#fff', fontWeight: 700, fontSize: 11 }}>
                  🎓 Candidate Workspace
                </span>
                <h2 style={{ color: '#0f172a', margin: '8px 0 6px' }}>
                  Welcome, {authUser?.full_name || 'Candidate'}!
                </h2>
                <p className="ta-muted" style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, maxWidth: 640 }}>
                  Take assigned candidate assessments and track your AI evaluation results in real-time. Once submitted, your detailed question-by-question scoring and feedback become immediately available.
                </p>
              </div>

              <div className="ta-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="ta-label" style={{ fontSize: 11, color: '#64748b' }}>Account Email</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', wordBreak: 'break-all', marginBottom: 12 }}>
                  📧 {authUser?.email}
                </div>
                <button
                  type="button"
                  onClick={() => fetchCandidateAssessments()}
                  disabled={loadingMyAssessments}
                  className="ta-btn secondary"
                  style={{ fontSize: 13, padding: '7px 14px', alignSelf: 'flex-start' }}
                >
                  {loadingMyAssessments ? 'Refreshing...' : '🔄 Refresh Assessments'}
                </button>
              </div>
            </div>

            {/* Candidate KPI Summary Cards */}
            <div className="ta-stats">
              <div className="ta-card ta-stat">
                <div className="ta-stat-num" style={{ color: '#0284c7' }}>
                  {candidateMyAssessments.length}
                </div>
                <div className="ta-stat-label">Total Assigned Assessments</div>
              </div>
              <div className="ta-card ta-stat">
                <div className="ta-stat-num" style={{ color: '#059669' }}>
                  {candidateMyAssessments.filter((a) => a.status === 'submitted').length}
                </div>
                <div className="ta-stat-label">Completed & Evaluated</div>
              </div>
              <div className="ta-card ta-stat">
                <div className="ta-stat-num" style={{ color: '#d97706' }}>
                  {candidateMyAssessments.filter((a) => a.status !== 'submitted').length}
                </div>
                <div className="ta-stat-label">Pending Action</div>
              </div>
              <div className="ta-card ta-stat">
                <div className="ta-stat-num" style={{ color: '#4f46e5' }}>
                  {(() => {
                    const submitted = candidateMyAssessments.filter((a) => a.status === 'submitted' && a.score_percentage != null);
                    if (submitted.length === 0) return '—';
                    const avg = Math.round(submitted.reduce((acc, curr) => acc + curr.score_percentage, 0) / submitted.length);
                    return `${avg}%`;
                  })()}
                </div>
                <div className="ta-stat-label">Average Evaluation Score</div>
              </div>
            </div>

            {/* Candidate Assigned Assessments List */}
            <div className="ta-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, color: '#0f172a' }}>Assigned Assessments</h3>
                  <p className="ta-muted ta-small" style={{ margin: 0 }}>
                    Click "Start Assessment" to launch an active test session, or "View Evaluation Report" for submitted tests.
                  </p>
                </div>
                <span className="ta-pill" style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                  {candidateMyAssessments.length} Assessment{candidateMyAssessments.length === 1 ? '' : 's'}
                </span>
              </div>

              {loadingMyAssessments ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <span className="ta-spinner dark" style={{ width: 24, height: 24 }}></span>
                  <p style={{ marginTop: 12, color: '#64748b' }}>Loading your assessments...</p>
                </div>
              ) : candidateMyAssessments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: 38, marginBottom: 10 }}>📭</div>
                  <h4 style={{ margin: '0 0 6px', color: '#334155', fontSize: 16 }}>No Assessments Assigned Yet</h4>
                  <p className="ta-muted" style={{ maxWidth: 480, margin: '0 auto', fontSize: 13.5 }}>
                    When a recruiter assigns an assessment to your email (<strong>{authUser?.email}</strong>), it will appear here automatically. You can also take assessments directly via invitation links.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {candidateMyAssessments.map((inv: any) => {
                    const isSubmitted = inv.status === 'submitted';
                    return (
                      <div
                        key={inv.invitation_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '18px 20px',
                          background: isSubmitted ? '#ffffff' : '#f8fafc',
                          border: isSubmitted ? '1px solid #e2e8f0' : '1px solid #bae6fd',
                          borderLeft: isSubmitted ? '4px solid #10b981' : '4px solid #0284c7',
                          borderRadius: 10,
                          flexWrap: 'wrap',
                          gap: 16,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                              {inv.job_title}
                            </span>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                background: isSubmitted ? '#ecfdf5' : '#e0f2fe',
                                color: isSubmitted ? '#065f46' : '#0369a1',
                              }}
                            >
                              {isSubmitted ? '✅ Completed & Evaluated' : '⏱ Ready to Start'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#64748b' }}>
                            <span>🏢 {inv.organization_name}</span>
                            <span>⏱ {inv.duration_minutes || 15} Mins</span>
                            <span>❓ {inv.num_questions} Questions</span>
                            {inv.created_at && (
                              <span>📅 {new Date(inv.created_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          {isSubmitted ? (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Score</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>
                                  {inv.score_percentage}%
                                  <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginLeft: 4 }}>
                                    ({inv.total_score}/{inv.max_score})
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="ta-btn"
                                style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', fontSize: 13, padding: '8px 18px', fontWeight: 700 }}
                                onClick={() => {
                                  if (inv.report_id) {
                                    openCandidateReportModal(inv.report_id);
                                  } else if (inv.invitation_token) {
                                    openCandidatePublicReportModal(inv.invitation_token);
                                  }
                                }}
                              >
                                📊 View Evaluation Report
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="ta-btn"
                              style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', fontSize: 13.5, padding: '9px 22px', fontWeight: 700, boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)' }}
                              onClick={() => {
                                setInviteToken(inv.invitation_token);
                                loadCandidateAssessment(inv.invitation_token);
                              }}
                            >
                              🚀 Start Assessment Now
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- Candidate Portal: My Evaluation Reports ---------------- */}
        {activeNav === 'candidateReports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="ta-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 20, color: '#0f172a' }}>My Evaluation Reports</h3>
                <p className="ta-muted ta-small" style={{ margin: 0 }}>
                  Review comprehensive AI scoring, knowledge proficiency matches, and question-by-question evaluations for all your completed assessments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchCandidateReports()}
                disabled={loadingMyReports}
                className="ta-btn secondary"
                style={{ fontSize: 13, padding: '7px 16px' }}
              >
                {loadingMyReports ? 'Refreshing...' : '🔄 Refresh Reports'}
              </button>
            </div>

            {loadingMyReports ? (
              <div className="ta-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span className="ta-spinner dark" style={{ width: 24, height: 24 }}></span>
                <p style={{ marginTop: 12, color: '#64748b' }}>Loading your evaluation reports...</p>
              </div>
            ) : candidateMyReports.length === 0 ? (
              <div className="ta-card" style={{ textAlign: 'center', padding: '52px 24px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>📊</div>
                <h4 style={{ margin: '0 0 6px', color: '#334155', fontSize: 17 }}>No Evaluation Reports Found</h4>
                <p className="ta-muted" style={{ maxWidth: 480, margin: '0 auto 18px', fontSize: 13.5 }}>
                  Once you take and submit an assessment, your AI-graded evaluation report with complete question analysis will appear here.
                </p>
                <button
                  type="button"
                  className="ta-btn"
                  onClick={() => goTo('candidatePortal')}
                  style={{ fontSize: 13 }}
                >
                  View My Assigned Assessments
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                {candidateMyReports.map((r: any) => {
                  const pct = r.score_percentage || 0;
                  const isHigh = pct >= 75;
                  const isMedium = pct >= 50 && pct < 75;
                  return (
                    <div
                      key={r.report_id}
                      className="ta-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderTop: isHigh ? '4px solid #10b981' : isMedium ? '4px solid #f59e0b' : '4px solid #ef4444',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: 16, color: '#0f172a' }}>{r.job_title}</h4>
                            <span style={{ fontSize: 12.5, color: '#64748b' }}>🏢 {r.organization_name}</span>
                          </div>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              fontSize: 14,
                              fontWeight: 800,
                              background: isHigh ? '#ecfdf5' : isMedium ? '#fef3c7' : '#fee2e2',
                              color: isHigh ? '#065f46' : isMedium ? '#92400e' : '#991b1b',
                            }}
                          >
                            {pct}%
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                          <div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Total Score</div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                              {r.total_score} / {r.max_score} marks
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Knowledge Match</div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0284c7' }}>
                              {r.knowledge_score_pct != null ? `${Math.round(r.knowledge_score_pct)}%` : `${pct}%`}
                            </div>
                          </div>
                          {r.communication_score_pct != null && (
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Communication</div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: '#7c3aed' }}>
                                {Math.round(r.communication_score_pct)}%
                              </div>
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Questions</div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                              {r.num_questions} Questions
                            </div>
                          </div>
                        </div>

                        {r.evaluation_summary && (
                          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {r.evaluation_summary}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          📅 {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recently Submitted'}
                        </span>
                        <button
                          type="button"
                          className="ta-btn"
                          style={{ fontSize: 12.5, padding: '7px 16px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', fontWeight: 600 }}
                          onClick={() => openCandidateReportModal(r.report_id)}
                        >
                          📄 View Full Report
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------- Dashboard ---------------- */}
        {activeNav === 'dashboard' && userRole !== 'admin' && userRole !== 'candidate' && (
          <>
            <div className="ta-hero">
              <div className="ta-card">
                <span className="ta-pill">AI-powered recruitment assessment</span>
                <h2>Match, assess and evaluate candidates with AI</h2>
                <p className="ta-muted">Analyze a job description and candidate resume, generate a role-specific assessment with a mandatory communication check, and produce a consolidated candidate report.</p>
                <button className="ta-btn" onClick={() => goTo('source')}>Get Started</button>
              </div>
              <div className="ta-card">
                <div className="ta-label">Flow</div>
                <div className="ta-timeline">
                  <div>01 · JD Ingestion</div>
                  <div>02 · Job Candidate Match</div>
                  <div>03 · Assessment Generation</div>
                  <div>04 · Candidate Assessment</div>
                  <div>05 · AI Evaluation & Report</div>
                </div>
              </div>
            </div>
            <div className="ta-stats">
              <div className="ta-card ta-stat">
                <span className="ta-muted ta-small">Questions in Active Set</span>
                <strong>{questions.length > 0 ? questions.length : (latestSuccessfulReport?.num_questions ?? '--')}</strong>
              </div>
              <div
                className="ta-card ta-stat"
                onClick={() => goTo('match')}
                style={{ cursor: 'pointer' }}
                title="Click to view detailed Job-Candidate Match results"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="ta-muted ta-small">Job Match Percentage</span>
                  {validMultiScores.length > 1 && (
                    <span
                      className="ta-pill"
                      style={{ fontSize: 10.5, padding: '2px 8px', margin: 0, background: 'rgba(0,163,224,0.12)', color: '#0088cc', fontWeight: 600 }}
                    >
                      {validMultiScores.length} Resumes
                    </span>
                  )}
                </div>

                {validMultiScores.length > 1 ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 26, margin: 0, color: '#111625' }}>
                        {Math.round(multiAvgScore!)}%
                      </strong>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#0088cc', background: 'rgba(0,163,224,0.1)', padding: '2px 7px', borderRadius: 10 }}>
                        Avg
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#177245', background: '#e8f7ee', padding: '2px 7px', borderRadius: 10 }}>
                        Top: {Math.round(multiTopScore!)}%
                      </span>
                    </div>
                    <span className="ta-muted ta-small" style={{ fontSize: 11, display: 'block', marginTop: 6, color: '#475569', lineHeight: 1.3 }}>
                      {validMultiScores.length} resumes evaluated · Best fit: <strong style={{ color: '#1e293b' }}>{topMatchCandidate?.candidate_name || topMatchCandidate?.filename || 'Candidate'}</strong>
                    </span>
                  </>
                ) : validMultiScores.length === 1 || (jobMatchResult && typeof jobMatchResult.match_score === 'number' && !isNaN(jobMatchResult.match_score)) ? (
                  <>
                    <strong style={{ fontSize: 26, marginTop: 6 }}>
                      {Math.round((validMultiScores[0] || jobMatchResult!).match_score)}%
                    </strong>
                    <span className="ta-muted ta-small" style={{ fontSize: 11, display: 'block', marginTop: 4, color: '#475569' }}>
                      Candidate: {(validMultiScores[0] || jobMatchResult!).candidate_name || (validMultiScores[0] || jobMatchResult!).filename || 'Match analyzed'}
                    </span>
                  </>
                ) : latestSuccessfulReport?.job_knowledge_match != null ? (
                  <>
                    <strong style={{ fontSize: 26, marginTop: 6 }}>
                      {Math.round(latestSuccessfulReport.job_knowledge_match)}%
                    </strong>
                    <span className="ta-muted ta-small" style={{ fontSize: 11, display: 'block', marginTop: 4, color: '#64748b' }}>
                      From latest evaluated report
                    </span>
                  </>
                ) : (
                  <>
                    <strong style={{ fontSize: 26, marginTop: 6 }}>--</strong>
                    <span className="ta-muted ta-small" style={{ fontSize: 11, display: 'block', marginTop: 4, color: '#8993a4' }}>
                      Analyze in Job Match
                    </span>
                  </>
                )}
              </div>
              <div className="ta-card ta-stat">
                <span className="ta-muted ta-small">Latest Assessment Score</span>
                <strong>
                  {!isAssessmentInProgress && latestSuccessfulReport
                    ? `${latestSuccessfulReport.score_percentage ?? Math.round((Number(latestSuccessfulReport.total_score) / Number(latestSuccessfulReport.max_score)) * 100)}%`
                    : '--'}
                </strong>
                {!isAssessmentInProgress && latestSuccessfulReport ? (
                  <span className="ta-muted ta-small" style={{ fontSize: 11, display: 'block', marginTop: 4, color: '#475569' }}>
                    {latestSuccessfulReport.total_score}/{latestSuccessfulReport.max_score} pts · {latestSuccessfulReport.candidate_name || 'Candidate'}
                  </span>
                ) : (
                  <span className="ta-muted ta-small" style={{ fontSize: 11, display: 'block', marginTop: 4, color: '#8993a4' }}>
                    Visible after evaluation report generated
                  </span>
                )}
              </div>
              <div className="ta-card ta-stat">
                <span className="ta-muted ta-small">Total Reports</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <strong>{successfulReports.length}</strong>
                  {successfulReports.length > 0 && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#0088cc', background: 'rgba(0,163,224,0.1)', padding: '2px 7px', borderRadius: 10 }}>
                      Avg: {Math.round(successfulReports.reduce((acc, r) => acc + (r.score_percentage || ((Number(r.total_score) / Number(r.max_score)) * 100)), 0) / successfulReports.length)}%
                    </span>
                  )}
                </div>
                <span className="ta-muted ta-small" style={{ fontSize: 11, display: 'block', marginTop: 4, color: '#475569' }}>
                  Evaluated candidate reports
                </span>
              </div>
            </div>

            {/* Multiple Resume Percentage Scores Breakdown on Dashboard */}
            {validMultiScores.length > 0 && (
              <div className="ta-card" style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div className="ta-label" style={{ marginBottom: 3, color: '#204a9c' }}>
                      Candidate Match Percentage Results ({validMultiScores.length} {validMultiScores.length === 1 ? 'Resume' : 'Resumes'})
                    </div>
                    <p className="ta-muted ta-small" style={{ margin: 0 }}>
                      {validMultiScores.length > 1
                        ? 'Percentage score and skill alignment for multiple resumes evaluated against the Job Description.'
                        : 'Percentage score and skill alignment evaluated against the Job Description.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="ta-btn secondary"
                      onClick={() => {
                        setMultiMatchResults([]);
                        setJobMatchResult(null);
                        if (typeof window !== 'undefined') {
                          sessionStorage.removeItem('ta_job_match');
                          sessionStorage.removeItem('ta_multi_match_results');
                        }
                      }}
                      style={{ padding: '7px 12px', fontSize: 12.5 }}
                      title="Clear candidate match results"
                    >
                      ✕ Clear
                    </button>
                    <button
                      className="ta-btn secondary"
                      onClick={() => goTo('match')}
                      style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 600 }}
                    >
                      View in Job Match →
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {validMultiScores.map((cand, idx) => {
                    const score = Math.round(cand.match_score);
                    const isHigh = score >= 75;
                    const isMid = score >= 50 && score < 75;
                    const badgeClass = isHigh ? 'high' : isMid ? 'mid' : 'low';
                    const badgeText = isHigh ? 'Strong Fit' : isMid ? 'Moderate Fit' : 'Skill Gap Flagged';

                    return (
                      <div
                        key={cand.job_match_id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          gap: 14,
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, flex: 1 }}>
                          <span
                            className={`ta-rank-badge ${idx === 0 ? 'rank-1' : 'rank-other'}`}
                            style={{ margin: 0 }}
                          >
                            #{idx + 1}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>
                              {cand.candidate_name || cand.filename || `Candidate #${idx + 1}`}
                            </div>
                            {cand.filename && cand.candidate_name && cand.filename !== cand.candidate_name && (
                              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                File: {cand.filename}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Match Percentage & Progress Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 180, flex: 1 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11.5 }}>
                              <span style={{ color: '#64748b', fontWeight: 500 }}>Match Percentage</span>
                              <strong style={{ color: isHigh ? '#177245' : isMid ? '#a6650f' : '#b91c1c', fontSize: 13 }}>
                                {score}%
                              </strong>
                            </div>
                            <div className="ta-bar" style={{ margin: 0, height: 7 }}>
                              <span style={{ width: `${Math.min(score, 100)}%`, background: isHigh ? '#10b981' : isMid ? '#f59e0b' : '#ef4444' }}></span>
                            </div>
                          </div>
                          <span className={`ta-score-badge ${badgeClass}`} style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}>
                            {badgeText}
                          </span>
                        </div>

                        {/* Skills preview & Action */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {cand.matched_skills && cand.matched_skills.length > 0 && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              {cand.matched_skills.slice(0, 2).map((s, si) => (
                                <span key={si} className="ta-chip" style={{ fontSize: 11, padding: '2px 7px', margin: 0 }}>
                                  {s}
                                </span>
                              ))}
                              {cand.matched_skills.length > 2 && (
                                <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>
                                  +{cand.matched_skills.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                          <button
                            className="ta-btn"
                            style={{ padding: '6px 14px', fontSize: 12 }}
                            onClick={() => {
                              if (cand.resume_id) {
                                setSelectedCandidateResumeId(cand.resume_id);
                                setSelectedCandidateIds([cand.resume_id]);
                                setResumeId(cand.resume_id);
                              }
                              if (cand.candidate_name) {
                                setCandidateName(cand.candidate_name);
                              }
                              setJobMatchResult(cand);
                              goTo('generate');
                            }}
                          >
                            Select & Assess
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Candidate Assessment Results & Submissions on Dashboard */}
            {successfulReports.length > 0 && (
              <div className="ta-card" style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div className="ta-label" style={{ marginBottom: 3, color: '#204a9c' }}>
                      Candidate Assessment Results & Submissions ({successfulReports.length})
                    </div>
                    <p className="ta-muted ta-small" style={{ margin: 0 }}>
                      Score percentages and AI evaluation reports submitted by assessed candidates.
                    </p>
                  </div>
                  <button
                    className="ta-btn secondary"
                    onClick={() => goTo('reports')}
                    style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 600 }}
                  >
                    View All Reports →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {successfulReports.slice(0, 5).map((rep) => {
                    const scorePct = rep.score_percentage ?? Math.round((Number(rep.total_score) / Number(rep.max_score)) * 100);
                    const isHigh = scorePct >= 75;
                    const isMid = scorePct >= 50 && scorePct < 75;
                    const badgeClass = isHigh ? 'high' : isMid ? 'mid' : 'low';
                    const badgeText = isHigh ? 'Strong Candidate' : isMid ? 'Potential Match' : 'Review Required';

                    return (
                      <div
                        key={rep.report_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          gap: 14,
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ minWidth: 180, flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>
                            {rep.candidate_name || 'Anonymous Candidate'}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748b' }}>
                            {rep.source ? `Role: ${rep.source}` : 'Assessment evaluation'} · {new Date(rep.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Score Percentage & Progress Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, flex: 1 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11.5 }}>
                              <span style={{ color: '#64748b', fontWeight: 500 }}>
                                Score: {rep.total_score} / {rep.max_score} pts
                              </span>
                              <strong style={{ color: isHigh ? '#177245' : isMid ? '#a6650f' : '#b91c1c', fontSize: 13 }}>
                                {scorePct}%
                              </strong>
                            </div>
                            <div className="ta-bar" style={{ margin: 0, height: 7 }}>
                              <span style={{ width: `${Math.min(scorePct, 100)}%`, background: isHigh ? '#10b981' : isMid ? '#f59e0b' : '#ef4444' }}></span>
                            </div>
                          </div>
                          <span className={`ta-score-badge ${badgeClass}`} style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}>
                            {badgeText}
                          </span>
                        </div>

                        {/* Knowledge & Communication pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {rep.job_knowledge_match != null && (
                            <span className="ta-pill" style={{ fontSize: 11, padding: '3px 8px', margin: 0 }}>
                              Knowledge: {Math.round(rep.job_knowledge_match)}%
                            </span>
                          )}
                          {rep.communication_score != null && (
                            <span className="ta-pill comm" style={{ fontSize: 11, padding: '3px 8px', margin: 0 }}>
                              Comm: {Math.round(rep.communication_score)}%
                            </span>
                          )}
                          <button
                            className="ta-btn secondary"
                            style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600 }}
                            onClick={() => {
                              viewReport(rep.report_id);
                              goTo('reports');
                            }}
                          >
                            View Report
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assessment Invitations Tracker on Dashboard */}
            {invitations.length > 0 && (
              <div className="ta-card" style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div className="ta-label" style={{ marginBottom: 3, color: '#204a9c' }}>
                      Candidate Assessment Invitations Tracker ({invitations.length})
                    </div>
                    <p className="ta-muted ta-small" style={{ margin: 0 }}>
                      Invitations dispatched to candidate emails with submission status and evaluation links.
                    </p>
                  </div>
                  <button
                    className="ta-btn secondary"
                    onClick={() => goTo('generate')}
                    style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 600 }}
                  >
                    Manage Invitations →
                  </button>
                </div>

                <div className="ta-invitation-list">
                  {invitations.map((inv) => (
                    <div key={inv.invitation_id} className="ta-invitation-card" style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: 1 }}>
                        <div className="ta-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                          {inv.candidate_name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <strong style={{ fontSize: 13.5, color: '#1e293b' }}>{inv.candidate_name}</strong>
                          <div style={{ fontSize: 11.5, color: '#64748b' }}>
                            📧 {inv.candidate_email} · {inv.job_title}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                        {inv.status === 'submitted' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="ta-pill ta-badge-submitted" style={{ fontSize: 11, padding: '3px 9px', margin: 0 }}>
                              ✓ Submitted
                            </span>
                            {inv.score_percentage != null && (
                              <strong style={{ fontSize: 13, color: '#1f8f5f' }}>
                                Score: {inv.score_percentage}%
                              </strong>
                            )}
                            {inv.report_id && (
                              <button
                                className="ta-btn secondary"
                                style={{ padding: '4px 10px', fontSize: 11.5 }}
                                onClick={() => {
                                  viewReport(inv.report_id);
                                  goTo('reports');
                                }}
                              >
                                View Report
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {inv.email_sent ? (
                              <span className="ta-pill" style={{ fontSize: 11, padding: '3px 8px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                                ✓ Email Sent
                              </span>
                            ) : inv.email_delivery_status === 'smtp_not_configured' ? (
                              <span className="ta-pill" style={{ fontSize: 11, padding: '3px 8px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }} title="SMTP email server is not configured in backend/.env">
                                ⚠️ SMTP Not Configured
                              </span>
                            ) : inv.email_delivery_status ? (
                              <span className="ta-pill" style={{ fontSize: 11, padding: '3px 8px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }} title={inv.email_delivery_status}>
                                ✕ Email Failed
                              </span>
                            ) : (
                              <span className="ta-pill ta-badge-pending" style={{ fontSize: 11, padding: '3px 8px', margin: 0 }}>
                                ⏳ Pending
                              </span>
                            )}

                            <button
                              type="button"
                              className="ta-btn"
                              style={{
                                padding: '4px 10px',
                                fontSize: 11.5,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: inv.email_sent ? '#f1f5f9' : 'linear-gradient(135deg, #0077b5, #00a3e0)',
                                color: inv.email_sent ? '#334155' : '#ffffff',
                                border: inv.email_sent ? '1px solid #cbd5e1' : 'none',
                                fontWeight: 600,
                              }}
                              disabled={resendingEmailId === inv.invitation_id}
                              onClick={() => handleResendEmail(inv.invitation_id)}
                              title="Send official assessment invitation email (exact same branded HTML template as dispatch)"
                            >
                              {resendingEmailId === inv.invitation_id ? (
                                <>
                                  <span className="ta-spinner" style={{ width: 11, height: 11 }}></span>
                                  Sending...
                                </>
                              ) : inv.email_sent ? (
                                <>↻ Resend Email</>
                              ) : (
                                <>✉ Email Candidate</>
                              )}
                            </button>

                            <button
                              type="button"
                              className="ta-btn secondary"
                              disabled={previewLoadingId === inv.invitation_id}
                              onClick={() => handlePreviewInvitationEmail(inv)}
                              style={{ padding: '4px 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Preview the exact branded invitation email template"
                            >
                              {previewLoadingId === inv.invitation_id ? 'Loading...' : '👁 Preview'}
                            </button>

                            <button
                              type="button"
                              className="ta-copy-btn"
                              style={{ fontSize: 11.5, padding: '4px 9px' }}
                              onClick={() => handleCopyInviteLink(inv)}
                            >
                              {copiedInviteId === inv.invitation_id ? '✓ Copied' : '🔗 Copy Link'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ---------------- 1. JD Ingestion ---------------- */}
        {activeNav === 'source' && (
          <div className="ta-card">
            <div><div className="ta-label">Organization Name</div>
              <input type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter your company/organization name" className="ta-input" style={{ maxWidth: 340, marginBottom: 18 }} />
            </div>

            <div className="ta-grid">
              <div>
                <div className="ta-label">
                  Upload Job Description (PDF, DOCX, PNG)
                  {topic.trim() !== '' && <span className="ta-small" style={{ marginLeft: 8, fontWeight: 400, color: '#8993a4' }}>(clear text to upload a file)</span>}
                </div>
                <div className="ta-drop">
                  <input
                    type="file"
                    ref={fileInputRef}
                    disabled={topic.trim() !== ''}
                    onChange={(e) => {
                      const selected = e.target.files?.[0] || null;
                      setFile(selected);
                      if (selected) setTopic('');
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
                {file && (
                  <div className="ta-kpi" style={{ marginTop: 8, fontSize: 13, background: '#f7f9fc', padding: '8px 12px', borderRadius: 7 }}>
                    <span>{file.name}</span>
                    <button onClick={handleRemoveFile} style={{ border: 0, background: 'none', color: '#d92d20', fontWeight: 700, cursor: 'pointer' }}>✕</button>
                  </div>
                )}
              </div>

              <div>
                <div className="ta-label">
                  Or Describe Role / Skill Area / Paste Job Description
                  {file && <span className="ta-small" style={{ marginLeft: 8, fontWeight: 400, color: '#8993a4' }}>(remove file to use this)</span>}
                </div>
                <textarea
                  rows={7}
                  value={topic}
                  disabled={!!file}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Generate questions for a Senior Backend Engineer role, or paste a job description / skill checklist."
                  className="ta-input"
                />
              </div>
            </div>

            <button onClick={handleIngest} disabled={loadingContent} className="ta-btn" style={{ marginTop: 16 }}>
              {loadingContent ? 'Processing Content...' : 'Process Content'}
            </button>

            {extractedText && (
              <div className="ta-card" style={{ marginTop: 16, background: '#f7f9fc' }}>
                <div className="ta-label">Extracted Preview</div>
                <p className="ta-small ta-muted">{extractedText.slice(0, 400)}{extractedText.length > 400 ? '…' : ''}</p>
              </div>
            )}

            {extractedText && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => goTo('dimensions')}
                  className="ta-btn"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600,
                  }}
                >
                  Proceed to Dimensions & Skills Matrix <span>→</span>
                </button>
                <button
                  type="button"
                  onClick={() => goTo('match')}
                  className="ta-btn secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Skip to Job Match <span>→</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------- 2. Dimensions & Skills Matrix Definition Screen ---------------- */}
        {activeNav === 'dimensions' && (() => {
          const totalWeight = matrixDimensions.reduce((acc, d) => acc + (Number(d.weight) || 0), 0);
          const totalSkills = matrixDimensions.reduce((acc, d) => acc + d.skills.length, 0);
          const criticalSkills = matrixDimensions.reduce((acc, d) => acc + d.skills.filter(s => s.importance === 'Critical').length, 0);
          const avgScore = totalSkills > 0
            ? Math.round(matrixDimensions.reduce((acc, d) => acc + d.skills.reduce((sum, s) => sum + (Number(s.benchmark_score) || 0), 0), 0) / totalSkills)
            : 70;
          const avgDesiredScore = totalSkills > 0
            ? Math.round(matrixDimensions.reduce((acc, d) => acc + d.skills.reduce((sum, s) => sum + (Number(s.desired_score ?? s.benchmark_score) || 75), 0), 0) / totalSkills)
            : 80;

          // Filter dimensions and their nested skills
          const filteredDims = matrixDimensions
            .filter(d => filterDimId === 'all' || d.id === filterDimId)
            .map(d => {
              const matching = d.skills.filter(s => {
                const q = dimSearchTerm.toLowerCase().trim();
                const matchesQ = !q || s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
                const matchesProf = filterProficiency === 'all' || s.proficiency === filterProficiency;
                const matchesImp = filterImportance === 'all' || s.importance === filterImportance;
                return matchesQ && matchesProf && matchesImp;
              });
              return { ...d, skills: matching };
            })
            .filter(d => {
              if (!dimSearchTerm.trim() && filterProficiency === 'all' && filterImportance === 'all') return true;
              return d.skills.length > 0 || d.name.toLowerCase().includes(dimSearchTerm.toLowerCase());
            });

          return (
            <div>
              {/* Screen Header Bar */}
              <div className="ta-card" style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 24 }}>🎯</span>
                      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#0f172a' }}>
                        Define Evaluation Dimensions & Skills Matrix
                      </h2>
                    </div>
                    <p className="ta-muted" style={{ margin: '0 0 12px', fontSize: 13.5 }}>
                      Architect the competency blueprint for candidate assessment. Define evaluation dimensions, skill weights, desired scores, required proficiencies, and passing benchmarks.
                    </p>

                    {/* Target Role Title Config */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Target Role:
                      </span>
                      <input
                        type="text"
                        value={skillMatrixRoleTitle}
                        onChange={(e) => setSkillMatrixRoleTitle(e.target.value)}
                        placeholder="e.g. Senior Full-Stack Engineer"
                        className="ta-input"
                        style={{ maxWidth: 320, padding: '6px 12px', fontSize: 14, fontWeight: 600 }}
                      />
                      {matrixLastSaved ? (
                        <span style={{ fontSize: 12, color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                          ✓ Saved ({formatRelativeTime(matrixLastSaved)})
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#d97706', background: '#fffbeb', padding: '4px 8px', borderRadius: 6, border: '1px solid #fde68a' }}>
                          ● Draft / Standard Preset
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Primary Toolbar Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setAiExtractRoleInput(skillMatrixRoleTitle);
                        setAiExtractPromptText(extractedText || topic || '');
                        setAiExtractModalOpen(true);
                      }}
                      className="ta-btn"
                      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                      title="Auto-extract dimensions and skills using AI from job description"
                    >
                      <span>✨</span> AI Extract from JD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleFetchTemplates();
                        setTplModalOpen(true);
                      }}
                      className="ta-btn secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                      title="Browse, apply, create, or customize standard role templates"
                    >
                      <span>📚</span> Role Templates
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenSaveAsModal}
                      className="ta-btn secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                      title="Save current dimensions & skills matrix as a reusable role template"
                    >
                      <span>📋</span> Save as Role Template
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddDimModal}
                      className="ta-btn secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                    >
                      <span>+</span> Add Dimension
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAddSkillModal()}
                      className="ta-btn secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                    >
                      <span>+</span> Add Skill
                    </button>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        type="button"
                        onClick={handleExportJSON}
                        className="ta-btn secondary"
                        style={{ fontSize: 13, padding: '10px 12px' }}
                        title="Download JSON matrix"
                      >
                        📤 JSON
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="ta-btn secondary"
                      style={{ fontSize: 13, padding: '10px 12px' }}
                      title="Download CSV spreadsheet"
                    >
                      📊 CSV
                    </button>
                    <label
                      className="ta-btn secondary"
                      style={{ fontSize: 13, padding: '10px 12px', cursor: 'pointer', margin: 0 }}
                      title="Import matrix from JSON file"
                    >
                      📥 Import
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImportJSON(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleSaveSkillMatrix}
                      disabled={savingMatrix}
                      className="ta-btn success"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                    >
                      {savingMatrix ? (
                        <><span className="ta-spinner"></span> Saving...</>
                      ) : (
                        <><span>💾</span> Save Matrix</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Weight Balance Progress Stack Bar */}
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #edf2f7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                      Dimension Weight Allocation Balance
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: totalWeight === 100 ? '#16a34a' : totalWeight > 100 ? '#dc2626' : '#d97706' }}>
                      {totalWeight === 100 ? '✓ Balanced: 100%' : `⚠ Total Weight: ${totalWeight}% (Target: 100%)`}
                    </div>
                  </div>

                  <div className="ta-matrix-weight-bar">
                    {matrixDimensions.map((dim) => {
                      const pct = totalWeight > 0 ? (dim.weight / totalWeight) * 100 : 0;
                      return (
                        <div
                          key={dim.id}
                          className="ta-matrix-weight-segment"
                          style={{
                            width: `${pct}%`,
                            background: dim.color || '#2563eb',
                          }}
                          title={`${dim.name}: ${dim.weight}% of total`}
                        />
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 8 }}>
                    {matrixDimensions.map((dim) => (
                      <div key={dim.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: dim.color || '#2563eb', display: 'inline-block' }}></span>
                        <span style={{ fontWeight: 600 }}>{dim.name}</span>
                        <span style={{ color: '#64748b' }}>({dim.weight}%)</span>
                        <span style={{ color: '#7c3aed', fontWeight: 600, fontSize: 11 }}>★ {dim.desired_score || 75}% target</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="ta-stats" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 20 }}>
                <div className="ta-card ta-stat" style={{ padding: '16px 18px', margin: 0 }}>
                  <span className="ta-label" style={{ fontSize: 11 }}>Dimensions</span>
                  <strong style={{ fontSize: 24, color: '#2563eb' }}>{matrixDimensions.length}</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Evaluation Pillars</span>
                </div>
                <div className="ta-card ta-stat" style={{ padding: '16px 18px', margin: 0 }}>
                  <span className="ta-label" style={{ fontSize: 11 }}>Skills Tracked</span>
                  <strong style={{ fontSize: 24, color: '#0f172a' }}>{totalSkills}</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Assessed Competencies</span>
                </div>
                <div className="ta-card ta-stat" style={{ padding: '16px 18px', margin: 0 }}>
                  <span className="ta-label" style={{ fontSize: 11 }}>Weight Sum</span>
                  <strong style={{ fontSize: 24, color: totalWeight === 100 ? '#16a34a' : '#ea580c' }}>
                    {totalWeight}%
                  </strong>
                  <span style={{ fontSize: 12, color: totalWeight === 100 ? '#16a34a' : '#ea580c' }}>
                    {totalWeight === 100 ? '100% Balanced' : 'Adjust to 100%'}
                  </span>
                </div>
                <div className="ta-card ta-stat" style={{ padding: '16px 18px', margin: 0 }}>
                  <span className="ta-label" style={{ fontSize: 11 }}>Critical Skills</span>
                  <strong style={{ fontSize: 24, color: '#dc2626' }}>{criticalSkills}</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Must-Have Core</span>
                </div>
                <div className="ta-card ta-stat" style={{ padding: '16px 18px', margin: 0 }}>
                  <span className="ta-label" style={{ fontSize: 11 }}>Avg Desired Score</span>
                  <strong style={{ fontSize: 24, color: '#7c3aed' }}>{avgDesiredScore}%</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Target Expectation</span>
                </div>
                <div className="ta-card ta-stat" style={{ padding: '16px 18px', margin: 0 }}>
                  <span className="ta-label" style={{ fontSize: 11 }}>Min Pass Benchmark</span>
                  <strong style={{ fontSize: 24, color: '#059669' }}>{avgScore}%</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Passing Threshold</span>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="ta-card" style={{ padding: '14px 18px', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                    <input
                      type="text"
                      placeholder="🔍 Search skills or focus topics..."
                      value={dimSearchTerm}
                      onChange={(e) => setDimSearchTerm(e.target.value)}
                      className="ta-input"
                      style={{ padding: '8px 12px', fontSize: 13.5 }}
                    />
                  </div>
                  <div style={{ width: 190 }}>
                    <select
                      value={filterDimId}
                      onChange={(e) => setFilterDimId(e.target.value)}
                      className="ta-select"
                      style={{ padding: '8px 10px', fontSize: 13 }}
                    >
                      <option value="all">All Dimensions ({matrixDimensions.length})</option>
                      {matrixDimensions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ width: 160 }}>
                    <select
                      value={filterProficiency}
                      onChange={(e) => setFilterProficiency(e.target.value)}
                      className="ta-select"
                      style={{ padding: '8px 10px', fontSize: 13 }}
                    >
                      <option value="all">All Proficiencies</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <div style={{ width: 160 }}>
                    <select
                      value={filterImportance}
                      onChange={(e) => setFilterImportance(e.target.value)}
                      className="ta-select"
                      style={{ padding: '8px 10px', fontSize: 13 }}
                    >
                      <option value="all">All Importance</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Nice-to-Have">Nice-to-Have</option>
                    </select>
                  </div>
                  {(dimSearchTerm || filterDimId !== 'all' || filterProficiency !== 'all' || filterImportance !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setDimSearchTerm('');
                        setFilterDimId('all');
                        setFilterProficiency('all');
                        setFilterImportance('all');
                      }}
                      className="ta-btn secondary"
                      style={{ padding: '8px 12px', fontSize: 12.5 }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Dimensions List & Skills Table */}
              {filteredDims.length === 0 ? (
                <div className="ta-card" style={{ textAlign: 'center', padding: '48px 24px', background: '#fafbfc' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔎</div>
                  <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>No skills or dimensions match the filter</h3>
                  <p className="ta-muted" style={{ margin: '0 0 16px' }}>Try resetting filters or adding new skills to your matrix.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setDimSearchTerm('');
                      setFilterDimId('all');
                      setFilterProficiency('all');
                      setFilterImportance('all');
                    }}
                    className="ta-btn secondary"
                  >
                    Clear Search & Filters
                  </button>
                </div>
              ) : (
                filteredDims.map((dim) => (
                  <div key={dim.id} className="ta-dim-card">
                    {/* Dimension Header */}
                    <div className="ta-dim-header">
                      <div className="ta-dim-title-group">
                        <div className="ta-dim-color-bar" style={{ background: dim.color || '#2563eb' }}></div>
                        <div>
                          <h3 className="ta-dim-title">
                            <span>{dim.name}</span>
                            <span className="ta-weight-badge">
                              {dim.weight}% Weight
                            </span>
                            <span className="ta-weight-badge" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }} title="Desired target score for this dimension">
                              Target: {dim.desired_score || 75}% Score
                            </span>
                            <span className="ta-skill-count-badge">
                              {dim.skills.length} Skill{dim.skills.length !== 1 ? 's' : ''}
                            </span>
                          </h3>
                          {dim.description && <p className="ta-dim-desc">{dim.description}</p>}
                        </div>
                      </div>

                      <div className="ta-dim-actions">
                        <button
                          type="button"
                          onClick={() => handleOpenAddSkillModal(dim.id)}
                          className="ta-btn secondary"
                          style={{ fontSize: 12, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <span>+</span> Add Skill
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditDimModal(dim)}
                          className="ta-action-icon-btn"
                          title="Edit Dimension"
                        >
                          ✏ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDim(dim.id)}
                          className="ta-action-icon-btn danger"
                          title="Delete Dimension"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>

                    {/* Skills Table */}
                    {dim.skills.length === 0 ? (
                      <div style={{ padding: '24px 20px', textAlign: 'center', background: '#fafbfc', color: '#64748b', fontSize: 13 }}>
                        No skills defined under this dimension yet. Click <strong>+ Add Skill</strong> above to define competencies.
                      </div>
                    ) : (
                      <div className="ta-skills-table-wrap">
                        <table className="ta-skills-table">
                          <thead>
                            <tr>
                              <th style={{ width: '28%' }}>Skill & Focus Area</th>
                              <th style={{ width: '12%' }}>Proficiency</th>
                              <th style={{ width: '12%' }}>Importance</th>
                              <th style={{ width: '11%' }}>Format</th>
                              <th style={{ width: '14%' }}>Desired Score</th>
                              <th style={{ width: '13%' }}>Pass Benchmark</th>
                              <th style={{ width: '6%' }}>Weight</th>
                              <th style={{ width: '8%', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dim.skills.map((skill) => {
                              const profClass = skill.proficiency.toLowerCase();
                              const impClass = skill.importance.toLowerCase().replace(/\s+/g, '-');
                              const desired = skill.desired_score ?? skill.benchmark_score ?? 75;
                              return (
                                <tr key={skill.id}>
                                  <td>
                                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                                      {skill.name}
                                    </div>
                                    {skill.description && (
                                      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.35 }}>
                                        {skill.description}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <span className={`ta-prof-badge ${profClass}`}>
                                      {skill.proficiency}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`ta-imp-badge ${impClass}`}>
                                      {skill.importance}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="ta-fmt-badge">
                                      {skill.question_type === 'Short_Answer'
                                        ? 'Short Answer'
                                        : skill.question_type}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ width: 45, height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                        <div
                                          style={{
                                            width: `${desired}%`,
                                            height: '100%',
                                            background: desired >= 80 ? '#7c3aed' : desired >= 65 ? '#2563eb' : '#d97706',
                                          }}
                                        />
                                      </div>
                                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#7c3aed' }}>
                                        {desired}%
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ width: 45, height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                        <div
                                          style={{
                                            width: `${skill.benchmark_score}%`,
                                            height: '100%',
                                            background: skill.benchmark_score >= 75 ? '#16a34a' : skill.benchmark_score >= 60 ? '#2563eb' : '#d97706',
                                          }}
                                        />
                                      </div>
                                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                                        {skill.benchmark_score}%
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                                      {skill.weight}%
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: 6 }}>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditSkillModal(dim.id, skill)}
                                        className="ta-action-icon-btn"
                                        title="Edit Skill"
                                      >
                                        ✏
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSkill(dim.id, skill.id)}
                                        className="ta-action-icon-btn danger"
                                        title="Delete Skill"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Bottom Navigation & Workflow Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => goTo('source')}
                  className="ta-btn secondary"
                >
                  ← Back to Upload JD
                </button>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleSaveSkillMatrix}
                    disabled={savingMatrix}
                    className="ta-btn secondary"
                    style={{ fontWeight: 600 }}
                  >
                    {savingMatrix ? 'Saving...' : '💾 Save Current Blueprint'}
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo('match')}
                    className="ta-btn"
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    Proceed to Job Match <span>→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo('generate')}
                    className="ta-btn success"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    Proceed to Assessment Config <span>→</span>
                  </button>
                </div>
              </div>

              {/* ==================================================================== */}
              {/* MODALS */}
              {/* ==================================================================== */}

              {/* 1. Add / Edit Dimension Modal */}
              {dimModalOpen && (
                <div className="ta-modal-backdrop" onClick={() => setDimModalOpen(false)}>
                  <div className="ta-modal-box" onClick={(e) => e.stopPropagation()}>
                    <div className="ta-modal-header">
                      <h3>{editingDimId ? 'Edit Evaluation Dimension' : 'Add New Evaluation Dimension'}</h3>
                      <button
                        type="button"
                        onClick={() => setDimModalOpen(false)}
                        style={{ border: 0, background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="ta-modal-body">
                      <div style={{ marginBottom: 14 }}>
                        <div className="ta-label">Dimension Name *</div>
                        <input
                          type="text"
                          value={dimFormName}
                          onChange={(e) => setDimFormName(e.target.value)}
                          placeholder="e.g. Core Technical Skills, Cloud & DevOps, Problem Solving"
                          className="ta-input"
                        />
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <div className="ta-label">Description / Evaluation Scope</div>
                        <textarea
                          rows={3}
                          value={dimFormDesc}
                          onChange={(e) => setDimFormDesc(e.target.value)}
                          placeholder="Brief objective of what this dimension assesses in candidates."
                          className="ta-input"
                        />
                      </div>
                      <div className="ta-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                          <div className="ta-label">Weightage in Matrix (%) *</div>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={dimFormWeight}
                            onChange={(e) => setDimFormWeight(Number(e.target.value))}
                            className="ta-input"
                          />
                        </div>
                        <div>
                          <div className="ta-label">Desired Target Score (%) *</div>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={dimFormDesiredScore}
                            onChange={(e) => setDimFormDesiredScore(Number(e.target.value))}
                            placeholder="e.g. 80"
                            className="ta-input"
                          />
                        </div>
                        <div>
                          <div className="ta-label">Badge Accent Color</div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                            {['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5'].map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setDimFormColor(color)}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  background: color,
                                  border: dimFormColor === color ? '3px solid #0f172a' : '2px solid transparent',
                                  cursor: 'pointer',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ta-modal-footer">
                      <button type="button" onClick={() => setDimModalOpen(false)} className="ta-btn secondary">
                        Cancel
                      </button>
                      <button type="button" onClick={handleSaveDimModal} className="ta-btn success">
                        {editingDimId ? 'Update Dimension' : 'Save Dimension'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Add / Edit Skill Modal */}
              {skillModalOpen && (
                <div className="ta-modal-backdrop" onClick={() => setSkillModalOpen(false)}>
                  <div className="ta-modal-box" onClick={(e) => e.stopPropagation()}>
                    <div className="ta-modal-header">
                      <h3>{editingSkillId ? 'Edit Skill Competency' : 'Add New Skill Competency'}</h3>
                      <button
                        type="button"
                        onClick={() => setSkillModalOpen(false)}
                        style={{ border: 0, background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="ta-modal-body">
                      <div style={{ marginBottom: 14 }}>
                        <div className="ta-label">Skill Name *</div>
                        <input
                          type="text"
                          value={skillFormName}
                          onChange={(e) => setSkillFormName(e.target.value)}
                          placeholder="e.g. Python FastAPI, PostgreSQL Indexing, React Hooks"
                          className="ta-input"
                        />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <div className="ta-label">Assign to Dimension *</div>
                        <select
                          value={skillModalDimId}
                          onChange={(e) => setSkillModalDimId(e.target.value)}
                          className="ta-select"
                        >
                          {matrixDimensions.map((d) => (
                            <option key={d.id} value={d.id}>{d.name} ({d.weight}%)</option>
                          ))}
                        </select>
                      </div>

                      <div className="ta-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
                        <div>
                          <div className="ta-label">Required Proficiency</div>
                          <select
                            value={skillFormProficiency}
                            onChange={(e) => setSkillFormProficiency(e.target.value as any)}
                            className="ta-select"
                          >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Expert">Expert</option>
                          </select>
                        </div>
                        <div>
                          <div className="ta-label">Importance / Priority</div>
                          <select
                            value={skillFormImportance}
                            onChange={(e) => setSkillFormImportance(e.target.value as any)}
                            className="ta-select"
                          >
                            <option value="Critical">Critical (Must-Have)</option>
                            <option value="High">High Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="Nice-to-Have">Nice-to-Have</option>
                          </select>
                        </div>
                      </div>

                      <div className="ta-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div>
                          <div className="ta-label">Question Format</div>
                          <select
                            value={skillFormQuestionType}
                            onChange={(e) => setSkillFormQuestionType(e.target.value as any)}
                            className="ta-select"
                          >
                            <option value="MCQ">MCQ (Multiple Choice)</option>
                            <option value="Short_Answer">Short Answer</option>
                            <option value="Scenario">Scenario-Based</option>
                            <option value="Coding">Coding / Practical</option>
                          </select>
                        </div>
                        <div>
                          <div className="ta-label">Desired Target Score (%) *</div>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={skillFormDesiredScore}
                            onChange={(e) => setSkillFormDesiredScore(Number(e.target.value))}
                            placeholder="e.g. 85"
                            className="ta-input"
                          />
                        </div>
                        <div>
                          <div className="ta-label">Min Pass Benchmark (%)</div>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={skillFormBenchmark}
                            onChange={(e) => setSkillFormBenchmark(Number(e.target.value))}
                            className="ta-input"
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <div className="ta-label">Relative Weight within Dimension (%)</div>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={skillFormWeight}
                          onChange={(e) => setSkillFormWeight(Number(e.target.value))}
                          className="ta-input"
                        />
                      </div>

                      <div>
                        <div className="ta-label">Key Focus Topics / Assessment Criteria</div>
                        <textarea
                          rows={2}
                          value={skillFormDesc}
                          onChange={(e) => setSkillFormDesc(e.target.value)}
                          placeholder="e.g. Focus on query optimization, EXPLAIN analyze, and avoiding N+1 queries."
                          className="ta-input"
                        />
                      </div>
                    </div>
                    <div className="ta-modal-footer">
                      <button type="button" onClick={() => setSkillModalOpen(false)} className="ta-btn secondary">
                        Cancel
                      </button>
                      <button type="button" onClick={handleSaveSkillModal} className="ta-btn success">
                        {editingSkillId ? 'Update Skill' : 'Add Skill'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Role Templates Library Modal */}
              {tplModalOpen && (
                <div className="ta-modal-backdrop" onClick={() => setTplModalOpen(false)}>
                  <div className="ta-modal-box" style={{ maxWidth: 840 }} onClick={(e) => e.stopPropagation()}>
                    <div className="ta-modal-header">
                      <div>
                        <h3 style={{ margin: 0 }}>📚 Standard & Custom Role Templates</h3>
                        <p className="ta-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                          Select or customize standardized competency rubrics with predefined weights and target desired scores.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTplModalOpen(false)}
                        style={{ border: 0, background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="ta-modal-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                          Available Templates ({availableTemplates.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTplModalOpen(false);
                            handleOpenCreateTemplate();
                          }}
                          className="ta-btn"
                          style={{
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            fontSize: 12.5,
                            padding: '6px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <span>+</span> Create New Role Template
                        </button>
                      </div>

                      {loadingTemplates ? (
                        <div style={{ textAlign: 'center', padding: '36px 0' }}>
                          <span className="ta-spinner"></span> Loading templates...
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
                          {availableTemplates.map((tpl) => (
                            <div
                              key={tpl.id}
                              className="ta-tpl-card"
                              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                            >
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                                    {tpl.role_title}
                                  </h4>
                                  {tpl.is_system ? (
                                    <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                      🌐 System
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 11, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 7px', borderRadius: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                      👤 Custom
                                    </span>
                                  )}
                                </div>
                                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#64748b', lineHeight: 1.4 }}>
                                  {tpl.description || 'Preconfigured evaluation blueprint with dimensions, skills, and benchmarks.'}
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                                  {(tpl.dimensions || []).map((d: any) => (
                                    <span key={d.id} style={{ fontSize: 11, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', padding: '3px 7px', borderRadius: 6, fontWeight: 600 }}>
                                      {d.name} <strong style={{ color: '#0284c7' }}>({d.weight}%)</strong> <span style={{ color: '#7c3aed' }}>★ {d.desired_score || 75}%</span>
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTplModalOpen(false);
                                      handleOpenEditTemplate(tpl);
                                    }}
                                    className="ta-action-icon-btn"
                                    title="Edit or customize this template"
                                    style={{ fontSize: 12, padding: '4px 8px' }}
                                  >
                                    ✏ Edit
                                  </button>
                                  {!tpl.is_system && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRoleTemplate(tpl.id, tpl.role_title)}
                                      disabled={deletingTemplateId === tpl.id}
                                      className="ta-action-icon-btn danger"
                                      title="Delete custom template"
                                      style={{ fontSize: 12, padding: '4px 8px' }}
                                    >
                                      {deletingTemplateId === tpl.id ? '...' : '🗑'}
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleApplyTemplate(tpl)}
                                  className="ta-btn"
                                  style={{ fontSize: 12, padding: '6px 12px', background: '#0284c7' }}
                                >
                                  Apply to Matrix →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ta-modal-footer">
                      <button type="button" onClick={() => setTplModalOpen(false)} className="ta-btn secondary">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3b. Role Template Builder / Editor Modal */}
              {tplEditorOpen && (
                <div className="ta-modal-backdrop" onClick={() => setTplEditorOpen(false)}>
                  <div className="ta-modal-box" style={{ maxWidth: 880, maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
                    <div className="ta-modal-header">
                      <div>
                        <h3 style={{ margin: 0 }}>
                          {editingTemplateId ? '✏ Edit Role Template' : '✨ Create New Role Template'}
                        </h3>
                        <p className="ta-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                          Configure role metadata, evaluation dimensions, skills, and target desired scores.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTplEditorOpen(false)}
                        style={{ border: 0, background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="ta-modal-body">
                      {/* Template Info */}
                      <div className="ta-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                        <div>
                          <div className="ta-label">Role Template Title *</div>
                          <input
                            type="text"
                            value={tplFormRoleTitle}
                            onChange={(e) => setTplFormRoleTitle(e.target.value)}
                            placeholder="e.g. Senior Data Engineer"
                            className="ta-input"
                          />
                        </div>
                        <div>
                          <div className="ta-label">Template Description</div>
                          <input
                            type="text"
                            value={tplFormDesc}
                            onChange={(e) => setTplFormDesc(e.target.value)}
                            placeholder="Brief description of the role's scope..."
                            className="ta-input"
                          />
                        </div>
                      </div>

                      {/* Dimensions Section */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                          Template Dimensions & Skills ({tplFormDimensions.length})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {(() => {
                            const sumWeight = tplFormDimensions.reduce((acc, d) => acc + (Number(d.weight) || 0), 0);
                            return (
                              <span style={{ fontSize: 12, fontWeight: 700, color: sumWeight === 100 ? '#16a34a' : '#d97706' }}>
                                Weight Sum: {sumWeight}% {sumWeight === 100 ? '✓' : '(Target: 100%)'}
                              </span>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={handleAddTplDimension}
                            className="ta-btn secondary"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                          >
                            + Add Dimension
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {tplFormDimensions.map((dim, dIdx) => (
                          <div
                            key={dim.id || dIdx}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: 10,
                              padding: 14,
                              background: '#f8fafc',
                            }}
                          >
                            {/* Dimension Row Controls */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                              <div>
                                <div className="ta-label" style={{ fontSize: 11, marginBottom: 2 }}>Dimension Name</div>
                                <input
                                  type="text"
                                  value={dim.name}
                                  onChange={(e) => handleUpdateTplDimension(dIdx, 'name', e.target.value)}
                                  className="ta-input"
                                  style={{ padding: '6px 10px', fontSize: 13 }}
                                />
                              </div>
                              <div>
                                <div className="ta-label" style={{ fontSize: 11, marginBottom: 2 }}>Weight (%)</div>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={dim.weight}
                                  onChange={(e) => handleUpdateTplDimension(dIdx, 'weight', Number(e.target.value))}
                                  className="ta-input"
                                  style={{ padding: '6px 10px', fontSize: 13 }}
                                />
                              </div>
                              <div>
                                <div className="ta-label" style={{ fontSize: 11, marginBottom: 2 }}>Desired Score (%)</div>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={dim.desired_score || 75}
                                  onChange={(e) => handleUpdateTplDimension(dIdx, 'desired_score', Number(e.target.value))}
                                  className="ta-input"
                                  style={{ padding: '6px 10px', fontSize: 13 }}
                                />
                              </div>
                              <div>
                                <div className="ta-label" style={{ fontSize: 11, marginBottom: 2 }}>Accent Color</div>
                                <input
                                  type="color"
                                  value={dim.color || '#2563eb'}
                                  onChange={(e) => handleUpdateTplDimension(dIdx, 'color', e.target.value)}
                                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', background: '#fff' }}
                                />
                              </div>
                              <div style={{ paddingTop: 16 }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTplDimension(dIdx)}
                                  className="ta-action-icon-btn danger"
                                  title="Remove Dimension"
                                  style={{ height: 34, width: 34 }}
                                >
                                  🗑
                                </button>
                              </div>
                            </div>

                            {/* Nested Skills in Dimension */}
                            <div style={{ background: '#ffffff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                                  Competencies / Skills ({dim.skills.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddTplSkill(dIdx)}
                                  className="ta-btn secondary"
                                  style={{ fontSize: 11, padding: '3px 8px' }}
                                >
                                  + Add Skill
                                </button>
                              </div>

                              {dim.skills.length === 0 ? (
                                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                                  No skills defined. Click + Add Skill above.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {dim.skills.map((skill, sIdx) => (
                                    <div
                                      key={skill.id || sIdx}
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto',
                                        gap: 8,
                                        alignItems: 'center',
                                        padding: '6px 8px',
                                        background: '#fafbfc',
                                        borderRadius: 6,
                                        border: '1px solid #edf2f7',
                                      }}
                                    >
                                      <div>
                                        <input
                                          type="text"
                                          placeholder="Skill Name"
                                          value={skill.name}
                                          onChange={(e) => handleUpdateTplSkill(dIdx, sIdx, 'name', e.target.value)}
                                          className="ta-input"
                                          style={{ padding: '4px 8px', fontSize: 12 }}
                                        />
                                      </div>
                                      <div>
                                        <select
                                          value={skill.proficiency}
                                          onChange={(e) => handleUpdateTplSkill(dIdx, sIdx, 'proficiency', e.target.value)}
                                          className="ta-select"
                                          style={{ padding: '4px 6px', fontSize: 11.5 }}
                                        >
                                          <option value="Beginner">Beginner</option>
                                          <option value="Intermediate">Intermediate</option>
                                          <option value="Advanced">Advanced</option>
                                          <option value="Expert">Expert</option>
                                        </select>
                                      </div>
                                      <div>
                                        <select
                                          value={skill.importance}
                                          onChange={(e) => handleUpdateTplSkill(dIdx, sIdx, 'importance', e.target.value)}
                                          className="ta-select"
                                          style={{ padding: '4px 6px', fontSize: 11.5 }}
                                        >
                                          <option value="Critical">Critical</option>
                                          <option value="High">High</option>
                                          <option value="Medium">Medium</option>
                                          <option value="Nice-to-Have">Nice-to-Have</option>
                                        </select>
                                      </div>
                                      <div>
                                        <input
                                          type="number"
                                          title="Desired Score (%)"
                                          placeholder="Desired %"
                                          min={1}
                                          max={100}
                                          value={skill.desired_score || 80}
                                          onChange={(e) => handleUpdateTplSkill(dIdx, sIdx, 'desired_score', Number(e.target.value))}
                                          className="ta-input"
                                          style={{ padding: '4px 6px', fontSize: 12, color: '#7c3aed', fontWeight: 600 }}
                                        />
                                      </div>
                                      <div>
                                        <input
                                          type="number"
                                          title="Benchmark Pass (%)"
                                          placeholder="Pass %"
                                          min={0}
                                          max={100}
                                          value={skill.benchmark_score}
                                          onChange={(e) => handleUpdateTplSkill(dIdx, sIdx, 'benchmark_score', Number(e.target.value))}
                                          className="ta-input"
                                          style={{ padding: '4px 6px', fontSize: 12 }}
                                        />
                                      </div>
                                      <div>
                                        <input
                                          type="number"
                                          title="Skill Weight (%)"
                                          placeholder="Weight %"
                                          min={1}
                                          max={100}
                                          value={skill.weight}
                                          onChange={(e) => handleUpdateTplSkill(dIdx, sIdx, 'weight', Number(e.target.value))}
                                          className="ta-input"
                                          style={{ padding: '4px 6px', fontSize: 12 }}
                                        />
                                      </div>
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveTplSkill(dIdx, sIdx)}
                                          className="ta-action-icon-btn danger"
                                          style={{ padding: '3px 6px', fontSize: 11 }}
                                          title="Remove Skill"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="ta-modal-footer">
                      <button type="button" onClick={() => setTplEditorOpen(false)} className="ta-btn secondary">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveRoleTemplate}
                        disabled={savingTemplate}
                        className="ta-btn success"
                      >
                        {savingTemplate ? (
                          <><span className="ta-spinner"></span> Saving Template...</>
                        ) : (
                          editingTemplateId ? 'Update Role Template' : 'Save Role Template'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3c. Quick "Save Current Matrix As Template" Modal */}
              {saveAsTplModalOpen && (
                <div className="ta-modal-backdrop" onClick={() => setSaveAsTplModalOpen(false)}>
                  <div className="ta-modal-box" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
                    <div className="ta-modal-header">
                      <h3>📋 Save Current Matrix as Role Template</h3>
                      <button
                        type="button"
                        onClick={() => setSaveAsTplModalOpen(false)}
                        style={{ border: 0, background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="ta-modal-body">
                      <p className="ta-muted" style={{ margin: '0 0 16px', fontSize: 13.5 }}>
                        Save your configured dimensions, skills, and target desired scores as a reusable role template in your library.
                      </p>

                      <div style={{ marginBottom: 14 }}>
                        <div className="ta-label">Role Template Title *</div>
                        <input
                          type="text"
                          value={saveAsTplTitle}
                          onChange={(e) => setSaveAsTplTitle(e.target.value)}
                          placeholder="e.g. Senior Backend Engineer"
                          className="ta-input"
                        />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <div className="ta-label">Template Description</div>
                        <textarea
                          rows={3}
                          value={saveAsTplDesc}
                          onChange={(e) => setSaveAsTplDesc(e.target.value)}
                          placeholder="Brief description of the role's scope..."
                          className="ta-input"
                        />
                      </div>

                      <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12.5, color: '#334155' }}>
                        📦 <strong>Template Payload:</strong> {matrixDimensions.length} Dimensions, {matrixDimensions.reduce((acc, d) => acc + d.skills.length, 0)} Skills with customized weightages and desired scores.
                      </div>
                    </div>
                    <div className="ta-modal-footer">
                      <button type="button" onClick={() => setSaveAsTplModalOpen(false)} className="ta-btn secondary">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSaveAsTemplate}
                        disabled={savingAsTpl}
                        className="ta-btn success"
                      >
                        {savingAsTpl ? (
                          <><span className="ta-spinner"></span> Saving Template...</>
                        ) : (
                          'Save as Reusable Template'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. AI Auto-Extraction Modal */}
              {aiExtractModalOpen && (
                <div className="ta-modal-backdrop" onClick={() => setAiExtractModalOpen(false)}>
                  <div className="ta-modal-box" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
                    <div className="ta-modal-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>✨</span>
                        <h3 style={{ margin: 0 }}>AI Auto-Extraction of Dimensions & Skills</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiExtractModalOpen(false)}
                        style={{ border: 0, background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="ta-modal-body">
                      <p className="ta-muted" style={{ margin: '0 0 14px', fontSize: 13.5 }}>
                        Antigravity AI analyzes your Job Description or target role requirements, automatically identifying the key evaluation dimensions, essential skills, proficiencies, and normalized weightages.
                      </p>

                      <div style={{ marginBottom: 14 }}>
                        <div className="ta-label">Role Title / Position</div>
                        <input
                          type="text"
                          value={aiExtractRoleInput}
                          onChange={(e) => setAiExtractRoleInput(e.target.value)}
                          placeholder="e.g. Lead Backend Engineer"
                          className="ta-input"
                        />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <div className="ta-label">Job Description Context / Requirements</div>
                        <textarea
                          rows={6}
                          value={aiExtractPromptText}
                          onChange={(e) => setAiExtractPromptText(e.target.value)}
                          placeholder="Paste or verify job description text here..."
                          className="ta-input"
                        />
                      </div>

                      <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 12.5, color: '#1e40af' }}>
                        💡 <strong>AI Architect Signal:</strong> The AI will generate 3 to 5 balanced dimensions whose total weights sum to exactly 100%, each populated with 2 to 4 concrete assessable skills.
                      </div>
                    </div>
                    <div className="ta-modal-footer">
                      <button
                        type="button"
                        onClick={() => setAiExtractModalOpen(false)}
                        className="ta-btn secondary"
                        disabled={aiExtractingMatrix}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleRunAIExtraction}
                        disabled={aiExtractingMatrix}
                        className="ta-btn"
                        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        {aiExtractingMatrix ? (
                          <><span className="ta-spinner"></span> Extracting Dimensions & Skills...</>
                        ) : (
                          <><span>✨</span> Generate Rubric with AI</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ---------------- 3. Job Match ---------------- */}
        {activeNav === 'match' && (
          <div className="ta-card">
            {sourceId === null ? (
              <div>
                <p className="ta-muted" style={{ marginBottom: 16 }}>Please process the job description/source material first before matching candidate resumes.</p>
                <button onClick={() => goTo('source')} className="ta-btn">
                  Go to Upload JD
                </button>
              </div>
            ) : (
              <>
                <div className="ta-grid">
                  <div>
                    <div className="ta-label">
                      Upload Candidate Resumes (Select one or multiple: PDF, DOCX, PNG)
                      {resumeText.trim() !== '' && <span className="ta-small" style={{ marginLeft: 8, fontWeight: 400, color: '#8993a4' }}>(clear text to upload files)</span>}
                    </div>
                    <div className="ta-drop">
                      <input
                        type="file"
                        multiple
                        ref={resumeFileInputRef}
                        disabled={resumeText.trim() !== ''}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setResumeFiles(files);
                          setResumeFile(files[0] || null);
                          if (files.length > 0) setResumeText('');
                        }}
                        style={{ width: '100%' }}
                      />
                    </div>
                    {resumeFiles.length > 0 && (
                      <div className="ta-file-list">
                        {resumeFiles.map((f, idx) => (
                          <div key={idx} className="ta-file-chip">
                            <span>📄 {f.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = resumeFiles.filter((_, i) => i !== idx);
                                setResumeFiles(next);
                                setResumeFile(next[0] || null);
                                if (next.length === 0 && resumeFileInputRef.current) {
                                  resumeFileInputRef.current.value = '';
                                }
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="ta-label">
                      Or Paste Resume Text
                      {resumeFiles.length > 0 && <span className="ta-small" style={{ marginLeft: 8, fontWeight: 400, color: '#8993a4' }}>(remove files to use this)</span>}
                    </div>
                    <textarea rows={5} value={resumeText} disabled={resumeFiles.length > 0} onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste candidate's resume text here..." className="ta-input" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={handleResumeIngest} disabled={loadingResume || (resumeFiles.length === 0 && !resumeText.trim())} className="ta-btn">
                    {loadingResume ? 'Processing Resumes...' : `Process Resume${resumeFiles.length > 1 ? `s (${resumeFiles.length})` : ''}`}
                  </button>
                  <button
                    onClick={handleAnalyzeMatch}
                    disabled={analyzingMatch || (uploadedResumes.length === 0 && resumeId === null)}
                    className="ta-btn secondary"
                  >
                    {analyzingMatch ? 'Analyzing Matches...' : `Analyze Job Match${uploadedResumes.length > 1 ? ` (${uploadedResumes.length})` : ''}`}
                  </button>
                </div>

                {uploadedResumes.length > 0 && multiMatchResults.length === 0 && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                    <span>✓ {uploadedResumes.length} resume{uploadedResumes.length > 1 ? 's' : ''} processed and ready. Click <strong>Analyze Job Match</strong> to run AI comparison.</span>
                  </div>
                )}

                {multiMatchResults.length > 0 && (
                  <div className="ta-match-preview">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <h3 style={{ margin: 0, fontSize: 17.5, color: '#0f172a' }}>
                            Candidate Fit Analysis ({multiMatchResults.length} Candidate{multiMatchResults.length > 1 ? 's' : ''} Ranked)
                          </h3>
                          {selectedCandidateIds.length > 0 && (
                            <span className="ta-pill" style={{ background: '#0284c7', color: '#fff', fontWeight: 600, fontSize: 11.5, margin: 0 }}>
                              {selectedCandidateIds.length} Selected
                            </span>
                          )}
                        </div>
                        <p className="ta-small ta-muted" style={{ margin: '4px 0 0' }}>
                          AI match comparison based on role requirements vs. candidate qualifications. Select multiple candidates or 1-click select all strong fits (≥ 75%).
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {multiMatchResults.some((r) => r.match_score >= 75) && (
                          <button
                            type="button"
                            className="ta-btn"
                            style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', padding: '7px 14px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            onClick={() => {
                              const strongIds = multiMatchResults
                                .filter((r) => r.match_score >= 75 && r.resume_id)
                                .map((r) => r.resume_id!);
                              setSelectedCandidateIds(strongIds);
                            }}
                          >
                            ★ Select All Strong Fits ({multiMatchResults.filter((r) => r.match_score >= 75).length})
                          </button>
                        )}
                        <button
                          type="button"
                          className="ta-btn secondary"
                          style={{ padding: '7px 12px', fontSize: 12 }}
                          onClick={() => {
                            if (selectedCandidateIds.length === multiMatchResults.length) {
                              setSelectedCandidateIds([]);
                            } else {
                              setSelectedCandidateIds(
                                multiMatchResults.filter((r) => r.resume_id).map((r) => r.resume_id!)
                              );
                            }
                          }}
                        >
                          {selectedCandidateIds.length === multiMatchResults.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="ta-badge" style={{ fontSize: 12 }}>
                          Top Fit: {Math.round(multiMatchResults[0].match_score)}%
                        </span>
                      </div>
                    </div>

                    <div className="ta-multi-match-grid">
                      {multiMatchResults.map((result, idx) => {
                        const isSelectedInList = Boolean(
                          result.resume_id && selectedCandidateIds.includes(result.resume_id)
                        );
                        const isCurrentActivePreview =
                          selectedCandidateResumeId ? result.resume_id === selectedCandidateResumeId : idx === 0;

                        return (
                          <div
                            key={result.resume_id ?? idx}
                            className={`ta-candidate-card ${isCurrentActivePreview || isSelectedInList ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedCandidateResumeId(result.resume_id ?? null);
                              setJobMatchResult(result);
                              if (result.candidate_name) setCandidateName(result.candidate_name);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input
                                  type="checkbox"
                                  checked={isSelectedInList}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (!result.resume_id) return;
                                    const rId = result.resume_id;
                                    setSelectedCandidateIds((prev) =>
                                      prev.includes(rId) ? prev.filter((id) => id !== rId) : [...prev, rId]
                                    );
                                  }}
                                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#00a3e0' }}
                                  title="Select for assessment dispatch"
                                />
                                <span className={`ta-rank-badge ${idx === 0 ? 'rank-1' : 'rank-other'}`}>
                                  {idx === 0 ? '★ #1 Top Fit' : `#${idx + 1}`}
                                </span>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <strong style={{ fontSize: 15, color: '#0f172a' }}>
                                      {result.candidate_name || result.filename || `Candidate #${idx + 1}`}
                                    </strong>
                                    {result.filename && (
                                      <span className="ta-small ta-muted">
                                        ({result.filename})
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                    <span style={{ fontSize: 11.5, color: '#0284c7' }}>
                                      ✉ {result.candidate_email || candidateEmails[result.resume_id || 0] || 'email will be requested'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span className="ta-score" style={{ fontSize: 24, fontWeight: 700, color: result.match_score >= 75 ? '#1f8f5f' : result.match_score >= 50 ? '#b56b00' : '#d92d20' }}>
                                  {Math.round(result.match_score)}%
                                </span>
                                <span className={`ta-score-badge ${result.match_score >= 75 ? 'high' : result.match_score >= 50 ? 'mid' : 'low'}`} style={{ fontSize: 12, padding: '3px 10px' }}>
                                  {result.match_score >= 75 ? 'Strong Fit' : result.match_score >= 50 ? 'Moderate Fit' : 'Skill Gap'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!result.resume_id) return;
                                    const rId = result.resume_id;
                                    setSelectedCandidateIds((prev) =>
                                      prev.includes(rId) ? prev.filter((id) => id !== rId) : [...prev, rId]
                                    );
                                    setSelectedCandidateResumeId(result.resume_id ?? null);
                                    setJobMatchResult(result);
                                    if (result.candidate_name) setCandidateName(result.candidate_name);
                                  }}
                                  className={`ta-btn ${isSelectedInList ? 'success' : 'secondary'}`}
                                  style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600 }}
                                >
                                  {isSelectedInList ? '✓ Selected' : '+ Select'}
                                </button>
                              </div>
                            </div>

                            <div className="ta-bar" style={{ marginTop: 10, marginBottom: 12 }}>
                              <span style={{
                                width: `${Math.min(100, Math.max(0, result.match_score))}%`,
                                background: result.match_score >= 75 ? '#1f8f5f' : result.match_score >= 50 ? '#b56b00' : '#d92d20'
                              }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                              <div>
                                <p className="ta-good ta-small" style={{ fontWeight: 700, margin: '0 0 4px' }}>
                                  ✓ Matched Skills ({result.matched_skills.length})
                                </p>
                                <div>
                                  {result.matched_skills.length > 0
                                    ? result.matched_skills.map((s, i) => <span key={i} className="ta-chip">{s}</span>)
                                    : <span className="ta-small ta-muted">None detected</span>}
                                </div>
                              </div>
                              <div>
                                <p className="ta-danger-text ta-small" style={{ fontWeight: 700, margin: '0 0 4px' }}>
                                  ⚠ Skill Gaps ({result.skill_gaps.length})
                                </p>
                                <div>
                                  {result.skill_gaps.length > 0
                                    ? result.skill_gaps.map((s, i) => <span key={i} className="ta-chip gap">{s}</span>)
                                    : <span className="ta-small ta-muted">No critical gaps detected</span>}
                                </div>
                              </div>
                            </div>

                            {result.seniority_assessment && (
                              <div style={{ marginTop: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #edf2f7' }}>
                                <p className="ta-small ta-muted" style={{ margin: 0 }}><strong>Seniority:</strong> {result.seniority_assessment}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Sticky Multi-Candidate Selection Bar */}
                    {selectedCandidateIds.length > 0 && (
                      <div className="ta-selection-bar" style={{ marginTop: 18 }}>
                        <div>
                          <strong>{selectedCandidateIds.length} candidate{selectedCandidateIds.length > 1 ? 's' : ''} selected</strong>
                          <span style={{ fontSize: 13, opacity: 0.9, marginLeft: 8 }}>
                            · Ready to configure assessments and send unique test invitation links
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="ta-btn secondary"
                            style={{ padding: '6px 12px', fontSize: 12.5, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                            onClick={() => setSelectedCandidateIds([])}
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            className="ta-btn"
                            style={{ background: '#fff', color: '#0077b5', fontWeight: 700, padding: '8px 16px', fontSize: 13 }}
                            onClick={() => goTo('generate')}
                          >
                            Generate Assessments for Selected ({selectedCandidateIds.length}) →
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => goTo('dimensions')} className="ta-btn secondary">
                          ← Back to Dimensions & Skills
                        </button>
                        <button onClick={() => goTo('source')} className="ta-btn secondary" style={{ fontSize: 12.5 }}>
                          Upload JD
                        </button>
                      </div>
                      <button onClick={() => goTo('generate')} className="ta-btn success" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px', fontSize: 14 }}>
                        {selectedCandidateIds.length > 0
                          ? `Proceed to Assessment Config (${selectedCandidateIds.length} Candidate${selectedCandidateIds.length > 1 ? 's' : ''} Selected) →`
                          : 'Proceed to Assessment Config with Selected Candidate →'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ---------------- 4. Assessment Generation Controls ---------------- */}
        {activeNav === 'generate' && (
          <div className="ta-card">
            {matrixDimensions && matrixDimensions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(37,99,235,0.06)', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(37,99,235,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🎯</span>
                  <span className="ta-small" style={{ color: '#1e40af' }}>
                    <strong>Evaluation Blueprint Active:</strong> {matrixDimensions.length} Dimensions & {matrixDimensions.reduce((acc, d) => acc + d.skills.length, 0)} Skills Defined ({skillMatrixRoleTitle})
                  </span>
                </div>
                <button onClick={() => goTo('dimensions')} className="ta-btn secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
                  Edit Dimensions & Skills
                </button>
              </div>
            )}

            {jobMatchResult && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,163,224,0.08)', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(0,163,224,0.2)' }}>
                <span className="ta-small" style={{ color: '#0277bd' }}>
                  Active Candidate Fit: <strong>{Math.round(jobMatchResult.match_score)}% Match</strong> ({jobMatchResult.match_score >= 75 ? 'Strong Fit' : jobMatchResult.match_score >= 50 ? 'Moderate Fit' : 'Skill Gap'})
                </span>
                <button onClick={() => goTo('match')} className="ta-btn secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
                  Review Match Analysis
                </button>
              </div>
            )}

            <div className="ta-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div>
                <div className="ta-label">Number of Questions</div>
                <input type="number" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="ta-input" />
              </div>
              <div>
                <div className="ta-label">Difficulty</div>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="ta-select">
                  <option value="">Select</option>
                  <option value="Entry-Level">Entry-Level</option>
                  <option value="Mid-Level">Mid-Level</option>
                  <option value="Senior-Level">Senior-Level</option>
                </select>
              </div>
              <div>
                <div className="ta-label">Question Type</div>
                <select value={questionType} onChange={(e) => setQuestionType(e.target.value)} className="ta-select">
                  <option value="">Select</option>
                  <option value="MCQ">MCQ</option>
                  <option value="Short_Answer">Short Answer (Technical)</option>
                  <option value="Scenario">Scenario (Behavioral/Situational)</option>
                </select>
              </div>
              <div>
                <div className="ta-label">Number of Sets</div>
                <input type="number" min={1} value={numSets} onChange={(e) => setNumSets(Math.max(1, Number(e.target.value)))} className="ta-input" />
              </div>
              <div>
                <div className="ta-label">Duration (Minutes)</div>
                <input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))} className="ta-input" />
              </div>
              <div>
                <div className="ta-label">Number of Candidates <span className="ta-small ta-muted">(reference)</span></div>
                <input type="number" min={0} value={numCandidates} onChange={(e) => setNumCandidates(Math.max(0, Number(e.target.value)))} className="ta-input" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, fontSize: 14, margin: '18px 0' }}>
              <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={shuffleQuestionsOpt} onChange={(e) => setShuffleQuestionsOpt(e.target.checked)} style={{ marginRight: 6 }} /> Shuffle Questions</label>
              <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={shuffleOptionsOpt} onChange={(e) => setShuffleOptionsOpt(e.target.checked)} style={{ marginRight: 6 }} /> Shuffle Options</label>
              <label style={{ color: '#8993a4' }}><input type="checkbox" checked disabled style={{ marginRight: 6 }} /> Communication question always included</label>
            </div>

            {questionSets.length > 0 && (
              <p className="ta-small ta-muted" style={{ marginBottom: 14 }}>{questionSets.length} set(s) generated — go to Candidate Assessment to begin.</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #edf2f7', flexWrap: 'wrap' }}>
              <button onClick={handleResetControls} disabled={generating} className="ta-btn secondary">Reset</button>
              {selectedCandidateIds.length > 1 && (
                <button
                  type="button"
                  onClick={handleGenerateAndSendInvitations}
                  disabled={generating || sendingInvitations}
                  className="ta-btn"
                  style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', fontWeight: 600 }}
                >
                  {generating || sendingInvitations ? 'Generating & Dispatching...' : `⚡ Generate & Dispatch to Selected (${selectedCandidateIds.length})`}
                </button>
              )}
              <button onClick={handleGenerateQuestions} disabled={generating} className="ta-btn success">
                {generating ? 'Generating Assessment...' : 'Generate Assessment'}
              </button>
              {questionSets.length > 0 && (
                <button onClick={() => goTo('assessment')} className="ta-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Go to Assessment <span>→</span>
                </button>
              )}
            </div>

            {/* Candidate Email Invitations Dispatcher */}
            {(selectedCandidateIds.length > 0 || invitations.length > 0) && (
              <div id="candidate-invitations-section" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>
                      Candidate Assessment Email Invitations
                    </h3>
                    <p className="ta-small ta-muted" style={{ margin: '4px 0 0' }}>
                      Enter or verify candidate emails below. Generate unique candidate evaluation links dispatched to candidates.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, marginTop: 8, fontSize: 12.5, color: '#1e40af' }}>
                      <span style={{ fontSize: 15 }}>📧</span>
                      <span>
                        <strong>Email Dispatch:</strong> Invitations are automatically emailed to candidates when SMTP is configured in <code>backend/.env</code>. You can also click <strong>✉ Email Candidate</strong> on any link to send directly from your email client (Outlook/Gmail).
                      </span>
                    </div>
                  </div>
                  {selectedCandidateIds.length > 0 && (
                    <span className="ta-pill" style={{ background: '#0284c7', color: '#fff', fontWeight: 600, fontSize: 12 }}>
                      {selectedCandidateIds.length} Candidate{selectedCandidateIds.length > 1 ? 's' : ''} Ready to Invite
                    </span>
                  )}
                </div>

                {selectedCandidateIds.length > 0 ? (
                  <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: '16px', marginBottom: 18 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {selectedCandidateIds.map((cId) => {
                        const match = multiMatchResults.find((m) => m.resume_id === cId);
                        const cName = match?.candidate_name || `Candidate #${cId}`;
                        const currentEmail = candidateEmails[cId] ?? match?.candidate_email ?? '';
                        const score = match ? Math.round(match.match_score) : null;
                        const inv = invitations.find((i) =>
                          (i.candidate_resume_id != null && i.candidate_resume_id === cId) ||
                          (i.candidate_email && currentEmail && i.candidate_email.toLowerCase().trim() === currentEmail.toLowerCase().trim())
                        );

                        return (
                          <div
                            key={cId}
                            style={{
                              background: '#fff',
                              padding: '14px 16px',
                              borderRadius: 10,
                              border: inv ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                              boxShadow: inv ? '0 2px 8px rgba(2, 132, 199, 0.08)' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12,
                            }}
                          >
                            {/* Candidate Summary Row */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 10,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 220 }}>
                                <div className="ta-avatar" style={{ width: 36, height: 36, fontSize: 13, background: inv ? '#0284c7' : '#475569', color: '#fff' }}>
                                  {cName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>{cName}</strong>
                                  {score !== null && (
                                    <span style={{ fontSize: 11.5, color: score >= 75 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626', fontWeight: 600 }}>
                                      Match: {score}% ({score >= 75 ? 'Strong Fit' : score >= 50 ? 'Moderate' : 'Skill Gap'})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 420 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                                  Candidate Email:
                                </label>
                                <input
                                  type="email"
                                  value={currentEmail}
                                  placeholder={`${cName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCandidateEmails((prev) => ({ ...prev, [cId]: val }));
                                  }}
                                  className="ta-input"
                                  style={{ fontSize: 13, padding: '6px 10px' }}
                                />
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  type="button"
                                  className="ta-btn secondary"
                                  style={{ padding: '4px 8px', fontSize: 11, color: '#dc2626' }}
                                  onClick={() => setSelectedCandidateIds((prev) => prev.filter((id) => id !== cId))}
                                  title="Remove from invite list"
                                >
                                  ✕ Remove
                                </button>
                              </div>
                            </div>

                            {/* Assessment Link & User Login Provisioning Section */}
                            {inv ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                                {/* Direct Assessment Link */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f9ff', padding: '8px 12px', borderRadius: 8, border: '1px solid #bae6fd', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                                    🔗 Assessment Link:
                                  </span>
                                  <input
                                    type="text"
                                    readOnly
                                    value={inv.invitation_link}
                                    className="ta-input"
                                    style={{ flex: 1, minWidth: 220, fontSize: 12, padding: '5px 8px', background: '#ffffff', color: '#0369a1', fontWeight: 500 }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleCopyInviteLink(inv)}
                                    className="ta-btn secondary"
                                    style={{ padding: '5px 10px', fontSize: 12, fontWeight: 600 }}
                                  >
                                    {copiedInviteId === inv.invitation_id ? '✓ Copied' : '📋 Copy Link'}
                                  </button>
                                  <a
                                    href={inv.invitation_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ta-btn"
                                    style={{ padding: '5px 11px', fontSize: 12, fontWeight: 600, textDecoration: 'none', background: '#0284c7', color: '#fff' }}
                                  >
                                    Open Test ↗
                                  </a>
                                </div>

                                {/* User Login Credentials Provisioned Box */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', flexWrap: 'wrap', gap: 10 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                                      🔑 Candidate Login Account:
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1e293b', background: '#ffffff', padding: '3px 8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                                      <span style={{ color: '#64748b' }}>Email:</span>
                                      <strong>{inv.candidate_login_email || inv.candidate_email}</strong>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1e293b', background: '#ffffff', padding: '3px 8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                                      <span style={{ color: '#64748b' }}>Password:</span>
                                      <code style={{ background: '#fef08a', color: '#854d0e', padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
                                        {inv.candidate_temp_password || 'Auto-Provisioned'}
                                      </code>
                                    </div>
                                    {inv.status === 'submitted' ? (
                                      <span className="ta-badge-submitted" style={{ fontSize: 11 }}>
                                        ✓ Submitted ({inv.score_percentage != null ? `${inv.score_percentage}%` : 'Done'})
                                      </span>
                                    ) : inv.email_sent ? (
                                      <span className="ta-pill" style={{ fontSize: 11, padding: '3px 8px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 600 }}>
                                        ✓ Credentials Emailed
                                      </span>
                                    ) : inv.email_delivery_status === 'smtp_not_configured' ? (
                                      <span className="ta-pill" style={{ fontSize: 11, padding: '3px 8px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontWeight: 600 }} title="SMTP not configured in backend/.env">
                                        ⚠️ SMTP Not Configured (Credentials Shown Above)
                                      </span>
                                    ) : null}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCandidateCredentials(inv)}
                                      className="ta-btn"
                                      style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, background: '#16a34a', color: '#fff' }}
                                    >
                                      {copiedCredsCandidateId === (inv.invitation_id || cId) ? '✓ Copied' : '📋 Copy Login Info'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleResendEmail(inv.invitation_id)}
                                      disabled={resendingEmailId === inv.invitation_id}
                                      className="ta-btn secondary"
                                      style={{ padding: '5px 10px', fontSize: 12 }}
                                    >
                                      {resendingEmailId === inv.invitation_id ? 'Sending...' : inv.email_sent ? '↻ Resend' : '✉ Email Candidate'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 12, color: '#64748b' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 14 }}>ℹ️</span>
                                  <span>Assessment link and user login credentials will appear here once dispatched.</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCandidateIds([cId]);
                                    setSubmissionMode('candidate');
                                    handleOpenSubmissionModal();
                                  }}
                                  className="ta-btn secondary"
                                  style={{ padding: '4px 10px', fontSize: 11.5, fontWeight: 600, color: '#0284c7' }}
                                >
                                  ⚡ Dispatch & Create Login
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => goTo('match')}
                        className="ta-btn secondary"
                        style={{ fontSize: 12.5 }}
                      >
                        ← Adjust Candidate Selection in Job Match
                      </button>

                      <div style={{ display: 'flex', gap: 10 }}>
                        {questionSets.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleSendInvitations()}
                            disabled={sendingInvitations}
                            className="ta-btn"
                            style={{ padding: '9px 20px', fontSize: 13.5, fontWeight: 700, background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff' }}
                          >
                            {sendingInvitations ? 'Sending Invitations...' : `✉ Dispatch Assessment Invitations (${selectedCandidateIds.length})`}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleGenerateAndSendInvitations}
                            disabled={generating || sendingInvitations}
                            className="ta-btn"
                            style={{ padding: '9px 20px', fontSize: 13.5, fontWeight: 700, background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff' }}
                          >
                            {generating || sendingInvitations ? 'Generating & Dispatching...' : `⚡ Generate & Dispatch Invitations (${selectedCandidateIds.length})`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 18 }}>
                    <span className="ta-small ta-muted">
                      No candidates currently selected. Go to <strong style={{ cursor: 'pointer', color: '#0284c7' }} onClick={() => goTo('match')}>Job Match</strong> to select candidates or strong-fit profiles for assessment invitations.
                    </span>
                  </div>
                )}

                {/* Sent Invitations & Links List */}
                {invitations.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ margin: 0, fontSize: 15, color: '#1e293b' }}>
                        Active Assessment Invitations & Candidate Links ({invitations.length})
                      </h4>
                      <button
                        type="button"
                        onClick={fetchInvitations}
                        disabled={loadingInvitations}
                        className="ta-btn secondary"
                        style={{ padding: '4px 10px', fontSize: 11.5 }}
                      >
                        {loadingInvitations ? 'Refreshing...' : '↻ Refresh Status'}
                      </button>
                    </div>

                    <div className="ta-invitation-list">
                      {invitations.map((inv) => (
                        <div key={inv.invitation_id} className="ta-invitation-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: 1 }}>
                            <div className="ta-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                              {inv.candidate_name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <div>
                              <strong style={{ fontSize: 13.5, color: '#1e293b' }}>{inv.candidate_name}</strong>
                              <div style={{ fontSize: 11.5, color: '#64748b' }}>✉ {inv.candidate_email}</div>
                              {inv.candidate_temp_password && (
                                <div style={{ fontSize: 11, color: '#166534', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                  <span>🔑 Pwd:</span>
                                  <code style={{ background: '#fef08a', color: '#854d0e', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                                    {inv.candidate_temp_password}
                                  </code>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1.5, minWidth: 260 }}>
                            <input
                              type="text"
                              readOnly
                              value={inv.invitation_link}
                              className="ta-input"
                              style={{ fontSize: 11.5, padding: '4px 8px', background: '#f8fafc', color: '#475569' }}
                            />
                            <button
                              type="button"
                              className="ta-copy-btn"
                              onClick={() => handleCopyInviteLink(inv)}
                              style={{ padding: '4px 8px', fontSize: 11.5 }}
                              title="Copy direct assessment test link"
                            >
                              {copiedInviteId === inv.invitation_id ? '✓ Copied' : 'Copy'}
                            </button>
                            <button
                              type="button"
                              className="ta-btn"
                              onClick={() => handleCopyCandidateCredentials(inv)}
                              style={{ padding: '4px 8px', fontSize: 11.5, background: '#16a34a', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}
                              title="Copy assessment link and candidate portal login credentials"
                            >
                              {copiedCredsCandidateId === inv.invitation_id ? '✓ Copied' : '📋 Copy Login'}
                            </button>
                            <a
                              href={inv.invitation_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ta-btn secondary"
                              style={{ padding: '4px 8px', fontSize: 11.5, whiteSpace: 'nowrap', textDecoration: 'none' }}
                            >
                              Open Test ↗
                            </a>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                            {inv.status === 'submitted' ? (
                              <>
                                <span className="ta-badge-submitted">
                                  ✓ Submitted ({inv.score_percentage != null ? `${inv.score_percentage}%` : 'Done'})
                                </span>
                                {inv.evaluation_report_id && (
                                  <button
                                    type="button"
                                    className="ta-btn secondary"
                                    style={{ padding: '3px 8px', fontSize: 11.5 }}
                                    onClick={() => {
                                      viewReport(inv.evaluation_report_id);
                                      goTo('reports');
                                    }}
                                  >
                                    View Report
                                  </button>
                                )}
                              </>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {inv.email_sent ? (
                                  <span className="ta-pill" style={{ fontSize: 11, padding: '3px 8px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                                    ✓ Email Sent
                                  </span>
                                ) : inv.email_delivery_status === 'smtp_not_configured' ? (
                                  <span className="ta-pill" style={{ fontSize: 11, padding: '3px 8px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }} title="SMTP email server is not configured in backend/.env">
                                    ⚠️ SMTP Not Configured
                                  </span>
                                ) : inv.email_delivery_status ? (
                                  <span className="ta-pill" style={{ fontSize: 11, padding: '3px 8px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }} title={inv.email_delivery_status}>
                                    ✕ Email Failed
                                  </span>
                                ) : (
                                  <span className="ta-badge-pending">
                                    ⏳ Pending Submission
                                  </span>
                                )}

                                <button
                                  type="button"
                                  className="ta-btn"
                                  style={{
                                    padding: '3px 9px',
                                    fontSize: 11.5,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: inv.email_sent ? '#f1f5f9' : 'linear-gradient(135deg, #0077b5, #00a3e0)',
                                    color: inv.email_sent ? '#334155' : '#ffffff',
                                    border: inv.email_sent ? '1px solid #cbd5e1' : 'none',
                                    fontWeight: 600,
                                  }}
                                  disabled={resendingEmailId === inv.invitation_id}
                                  onClick={() => handleResendEmail(inv.invitation_id)}
                                  title="Send official assessment invitation email (exact same branded HTML template as dispatch)"
                                >
                                  {resendingEmailId === inv.invitation_id ? (
                                    <>
                                      <span className="ta-spinner" style={{ width: 11, height: 11 }}></span>
                                      Sending...
                                    </>
                                  ) : inv.email_sent ? (
                                    <>↻ Resend Email</>
                                  ) : (
                                    <>✉ Email Candidate</>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  className="ta-btn secondary"
                                  disabled={previewLoadingId === inv.invitation_id}
                                  onClick={() => handlePreviewInvitationEmail(inv)}
                                  style={{ padding: '3px 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  title="Preview the exact branded invitation email template"
                                >
                                  {previewLoadingId === inv.invitation_id ? 'Loading...' : '👁 Preview'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------- 4. Candidate Assessment ---------------- */}
        {activeNav === 'assessment' && (
          <>
            {questions.length === 0 ? (
              <div className="ta-card">
                <p className="ta-muted" style={{ marginBottom: 14 }}>No assessment generated yet. Configure and generate questions first.</p>
                <button onClick={() => goTo('generate')} className="ta-btn">
                  Go to Assessment Config
                </button>
              </div>
            ) : (
              <div className="ta-card">
                <div className="ta-kpi">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ta-label" style={{ margin: 0 }}>Candidate / Employee Name</div>
                  </div>
                  {timerSeconds !== null && (
                    <span className={`ta-timer ${timerSeconds <= 60 ? 'low' : ''}`}>
                      {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
                <input type="text" value={candidateName} onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Enter the candidate's or employee's name" className="ta-input" style={{ maxWidth: 340, marginBottom: 18 }} />

                {/* Employer verification */}
                <div className="ta-card" style={{ background: '#f7f9fc' }}>
                  <div className="ta-kpi">
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Previous Employer Verification</p>
                      <p className="ta-small ta-muted">Self-attested by the recruiter after checking LinkedIn - not automated. Criterion: &gt;50 employees, verified.</p>
                    </div>
                    <button onClick={addEmployer} className="ta-btn" style={{ padding: '7px 12px', fontSize: 13 }}>+ Add Company</button>
                  </div>
                  {previousEmployers.map((emp, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 13, flexWrap: 'wrap' }}>
                      <input type="text" value={emp.company_name} onChange={(e) => updateEmployer(idx, 'company_name', e.target.value)}
                        placeholder="Company name" className="ta-input" style={{ flex: 1, minWidth: 140 }} />
                      <input type="number" min={0} value={emp.employee_count} onChange={(e) => updateEmployer(idx, 'employee_count', Number(e.target.value))}
                        placeholder="Employee count" className="ta-input" style={{ width: 130 }} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="checkbox" checked={emp.linkedin_verified} onChange={(e) => updateEmployer(idx, 'linkedin_verified', e.target.checked)} />
                        Verified
                      </label>
                      <button onClick={() => removeEmployer(idx)} style={{ border: 0, background: 'none', color: '#d92d20', fontWeight: 700, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                  {previousEmployers.length > 0 && (
                    <p style={{ marginTop: 10, fontWeight: 600, fontSize: 13 }}>
                      {employerEligibilityPreview() === 'yes' && <span className="ta-good">✅ Meets criteria</span>}
                      {employerEligibilityPreview() === 'no' && <span className="ta-danger-text">❌ Does not meet criteria</span>}
                      {employerEligibilityPreview() === 'unverified' && <span className="ta-warn">⚠️ Not fully verified</span>}
                    </p>
                  )}
                </div>

                {questionSets.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
                    {questionSets.map((s, idx) => (
                      <button key={idx} onClick={() => switchToSet(idx)} className={`ta-set-tab ${idx === activeSetIndex ? 'active' : ''}`}>
                        Set {idx + 1}{s.submitted ? ' ✓' : ''}
                      </button>
                    ))}
                  </div>
                )}

                {questions.map((q, idx) => (
                  <div key={`${activeSetIndex}-${idx}`} className="ta-card ta-question" style={{ marginTop: 14 }}>
                    <p style={{ fontWeight: 600, fontSize: 16 }}>{idx + 1}. {q.question_text}</p>
                    {q.options && q.options.length > 0 ? (
                      <div className="ta-options">
                        {q.options.map((opt, oIdx) => (
                          <label key={oIdx}>
                            <input type="radio" name={`q-${idx}`} value={opt} onChange={(e) => updateAnswer(idx, e.target.value)} style={{ marginRight: 8 }} />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea rows={3} onChange={(e) => updateAnswer(idx, e.target.value)} placeholder="Type the candidate's answer here..." className="ta-input" />
                    )}
                    {evaluations[idx] && (
                      <div className="ta-card" style={{ marginTop: 10, background: 'rgba(106,44,145,0.04)', border: '1px solid rgba(106,44,145,0.15)' }}>
                        <p style={{ fontWeight: 700, color: '#6a2c91', margin: 0 }}>Score: {evaluations[idx].overall_score}</p>
                        <p style={{ margin: '4px 0 0' }}><strong>Feedback:</strong> {evaluations[idx].feedback}</p>
                      </div>
                    )}
                  </div>
                ))}

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #edf2f7', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleSubmitAssessment} disabled={evaluating} className="ta-btn success">
                    {evaluating ? 'AI Evaluating...' : 'Submit Candidate Assessment →'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ---------------- 5. Candidate Evaluation Reports ---------------- */}
        {activeNav === 'reports' && (
          <div className="ta-card">
            <div className="ta-kpi" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {reports.length > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={reports.length > 0 && selectedReportIds.length === reports.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReportIds(reports.map((r) => r.report_id));
                        } else {
                          setSelectedReportIds([]);
                        }
                      }}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#00a3e0' }}
                    />
                    <span>Select All</span>
                  </label>
                )}
                <span className="ta-muted ta-small">
                  Past submitted candidate assessments ({reports.length})
                </span>
                {selectedReportIds.length > 0 && (
                  <span className="ta-pill" style={{ background: '#0284c7', color: '#fff', fontWeight: 600, fontSize: 11.5, margin: 0 }}>
                    {selectedReportIds.length} Selected
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Refresh List Button (beside Export Reports) */}
                <button
                  type="button"
                  onClick={() => fetchReports()}
                  disabled={loadingReports}
                  className="ta-btn secondary"
                  style={{
                    fontSize: 13,
                    padding: '8px 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600,
                    cursor: loadingReports ? 'not-allowed' : 'pointer',
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    color: '#1e293b'
                  }}
                  title="Reload and fetch latest submitted candidate evaluation reports"
                >
                  <span style={{ fontSize: 14, fontWeight: 'bold' }}>↻</span>
                  <span>{loadingReports ? 'Refreshing...' : 'Refresh List'}</span>
                </button>

                {/* Multi-Format Export Reports Dropdown Menu */}
                <div className="ta-export-container" ref={exportMenuRef}>
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    disabled={reports.length === 0}
                    className="ta-btn"
                    style={{
                      fontSize: 13,
                      padding: '8px 18px',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 600,
                      cursor: reports.length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    title="Choose export format to extract candidate reports"
                  >
                    <span>📥</span>
                    <span>{selectedReportIds.length > 0 ? `Export Selected (${selectedReportIds.length})` : 'Export Reports'}</span>
                    <span style={{ fontSize: 10, opacity: 0.85, marginLeft: 2 }}>▼</span>
                  </button>

                  {exportMenuOpen && (
                    <div className="ta-export-menu">
                      <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9' }}>
                        {selectedReportIds.length > 0
                          ? `Export ${selectedReportIds.length} Selected Report${selectedReportIds.length > 1 ? 's' : ''}`
                          : `Export All ${reports.length} Reports`}
                      </div>

                      <button
                        type="button"
                        className="ta-export-item"
                        onClick={() => handleExportReports('csv')}
                      >
                        <span style={{ fontSize: 16 }}>📊</span>
                        <div>
                          <strong style={{ display: 'block', color: '#0f172a' }}>CSV Spreadsheet (.csv)</strong>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Excel & Google Sheets format</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="ta-export-item"
                        onClick={() => handleExportReports('pdf')}
                      >
                        <span style={{ fontSize: 16 }}>📄</span>
                        <div>
                          <strong style={{ display: 'block', color: '#0f172a' }}>Print / Save as PDF</strong>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Formatted printable summary</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="ta-export-item"
                        onClick={() => handleExportReports('json')}
                      >
                        <span style={{ fontSize: 16 }}>📦</span>
                        <div>
                          <strong style={{ display: 'block', color: '#0f172a' }}>JSON Data (.json)</strong>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Structured records for integrations</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="ta-export-item"
                        onClick={() => handleExportReports('txt')}
                      >
                        <span style={{ fontSize: 16 }}>📝</span>
                        <div>
                          <strong style={{ display: 'block', color: '#0f172a' }}>Executive Text Summary (.txt)</strong>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Clean plain text report</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {reports.length === 0 ? (
              <p className="ta-muted ta-small">{loadingReports ? 'Loading reports...' : 'No evaluation reports yet.'}</p>
            ) : (
              reports.map((r) => {
                const isChecked = selectedReportIds.includes(r.report_id);
                const scorePct = r.score_percentage != null
                  ? r.score_percentage
                  : (Number(r.max_score) > 0 ? Math.round((Number(r.total_score) / Number(r.max_score)) * 100) : 0);

                return (
                  <div
                    key={r.report_id}
                    className="ta-kpi"
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #edf0f5',
                      flexWrap: 'wrap',
                      gap: 12,
                      background: isChecked ? 'rgba(0, 163, 224, 0.04)' : 'transparent',
                      borderRadius: 6,
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          const rId = r.report_id;
                          setSelectedReportIds((prev) =>
                            prev.includes(rId) ? prev.filter((id) => id !== rId) : [...prev, rId]
                          );
                        }}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#00a3e0' }}
                        title="Select report for export"
                      />
                      <div>
                        <p style={{ fontWeight: 600, margin: 0, fontSize: 14, color: '#0f172a' }}>
                          {r.candidate_name && <span>{r.candidate_name} — </span>}
                          {r.organization_name && <span className="ta-muted">{r.organization_name} — </span>}
                          {r.source || 'Untitled'} — {r.difficulty || '—'} / {r.question_type || '—'}
                        </p>
                        <p className="ta-muted ta-small" style={{ margin: '4px 0 0' }}>
                          {r.created_at ? new Date(r.created_at).toLocaleString() : ''} · Score: {r.total_score}/{r.max_score}
                          <strong style={{ color: '#1f8f5f', marginLeft: 4 }}>({scorePct}%)</strong>
                          {r.job_knowledge_match != null && <> · Job Knowledge: {Math.round(r.job_knowledge_match)}%</>}
                          {r.communication_score != null && <> · Communication: {Math.round(r.communication_score)}%</>}
                          {r.meets_employer_criteria === 'yes' && <span className="ta-good"> · ✅ Employer OK</span>}
                          {r.meets_employer_criteria === 'no' && <span className="ta-danger-text"> · ❌ Employer flagged</span>}
                          {r.meets_employer_criteria === 'unverified' && <span className="ta-warn"> · ⚠️ Unverified</span>}
                          {r.is_onboarded ? (
                            <span className="ta-pill" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontWeight: 700, marginLeft: 6 }}>
                              ✓ Onboarded
                            </span>
                          ) : (
                            <span className="ta-pill" style={{ background: '#f1f5f9', color: '#64748b', marginLeft: 6 }}>
                              In Review
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleOnboard(r.report_id, !!r.is_onboarded);
                        }}
                        disabled={togglingOnboardId === r.report_id}
                        className={`ta-btn ${r.is_onboarded ? 'secondary' : ''}`}
                        style={{
                          fontSize: 12.5,
                          padding: '6px 14px',
                          background: r.is_onboarded ? '#f1f5f9' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          color: r.is_onboarded ? '#1e293b' : '#fff',
                          border: r.is_onboarded ? '1px solid #cbd5e1' : 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                        title={r.is_onboarded ? 'Click to remove onboarded status' : 'Confirm and mark candidate as onboarded'}
                      >
                        {togglingOnboardId === r.report_id ? 'Updating...' : r.is_onboarded ? '✓ Onboarded' : 'Mark Onboarded'}
                      </button>
                      <button onClick={() => viewReport(r.report_id)} disabled={loadingReportDetail} className="ta-btn" style={{ fontSize: 13, padding: '6px 14px' }}>
                        View Report
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {selectedReport && (
              <div className="ta-card" style={{ marginTop: 16, background: '#f7f9fc', border: '1px solid #d7dde7' }}>
                <div className="ta-kpi" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ margin: 0 }}>
                    {selectedReport.candidate_name && `${selectedReport.candidate_name} — `}
                    Report #{selectedReport.report_id} — {selectedReport.total_score}/{selectedReport.max_score}
                    {selectedReport.score_percentage != null && <span style={{ color: '#1f8f5f', marginLeft: 6 }}>({selectedReport.score_percentage}%)</span>}
                    {selectedReport.is_onboarded && (
                      <span className="ta-pill" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontWeight: 700, marginLeft: 8 }}>
                        ✓ Onboarded
                      </span>
                    )}
                  </h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleOnboard(selectedReport.report_id, !!selectedReport.is_onboarded)}
                      disabled={togglingOnboardId === selectedReport.report_id}
                      className={`ta-btn ${selectedReport.is_onboarded ? 'secondary' : ''}`}
                      style={{
                        fontSize: 12.5,
                        padding: '6px 14px',
                        background: selectedReport.is_onboarded ? '#f1f5f9' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        color: selectedReport.is_onboarded ? '#1e293b' : '#fff',
                        border: selectedReport.is_onboarded ? '1px solid #cbd5e1' : 'none',
                        fontWeight: 600,
                      }}
                    >
                      {togglingOnboardId === selectedReport.report_id ? 'Updating...' : selectedReport.is_onboarded ? '✓ Onboarded (Click to Remove)' : 'Mark as Onboarded'}
                    </button>
                    {/* Single report export dropdown */}
                    <div className="ta-export-container" ref={singleExportMenuRef}>
                      <button
                        type="button"
                        onClick={() => setSingleExportMenuOpen(!singleExportMenuOpen)}
                        className="ta-btn"
                        style={{
                          fontSize: 12.5,
                          padding: '6px 14px',
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600
                        }}
                        title="Export this candidate's report"
                      >
                        <span>📥</span>
                        <span>Export Report</span>
                        <span style={{ fontSize: 9, opacity: 0.85 }}>▼</span>
                      </button>

                      {singleExportMenuOpen && (
                        <div className="ta-export-menu">
                          <button
                            type="button"
                            className="ta-export-item"
                            onClick={() => handleExportSingleReport(selectedReport, 'csv')}
                          >
                            <span>📊</span>
                            <div>
                              <strong style={{ display: 'block', color: '#0f172a' }}>CSV Spreadsheet (.csv)</strong>
                              <span style={{ fontSize: 11, color: '#64748b' }}>Questions & candidate answers</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="ta-export-item"
                            onClick={() => handleExportSingleReport(selectedReport, 'pdf')}
                          >
                            <span>📄</span>
                            <div>
                              <strong style={{ display: 'block', color: '#0f172a' }}>Print / Save as PDF</strong>
                              <span style={{ fontSize: 11, color: '#64748b' }}>Full evaluation printable report</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="ta-export-item"
                            onClick={() => handleExportSingleReport(selectedReport, 'json')}
                          >
                            <span>📦</span>
                            <div>
                              <strong style={{ display: 'block', color: '#0f172a' }}>JSON Record (.json)</strong>
                              <span style={{ fontSize: 11, color: '#64748b' }}>Raw question & evaluation data</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="ta-export-item"
                            onClick={() => handleExportSingleReport(selectedReport, 'txt')}
                          >
                            <span>📝</span>
                            <div>
                              <strong style={{ display: 'block', color: '#0f172a' }}>Text Summary (.txt)</strong>
                              <span style={{ fontSize: 11, color: '#64748b' }}>Plain text report</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    <button onClick={() => setSelectedReport(null)} className="ta-back-btn" style={{ padding: '6px 12px', fontSize: 12 }}>
                      <span className="arrow">←</span> Back to All Reports
                    </button>
                  </div>
                </div>
                <p className="ta-small" style={{ marginTop: 8 }}>
                  {selectedReport.job_knowledge_match != null && <>Job Knowledge: <strong>{Math.round(selectedReport.job_knowledge_match)}%</strong>{'  '}</>}
                  {selectedReport.communication_score != null && <>· Communication: <strong>{Math.round(selectedReport.communication_score)}%</strong></>}
                </p>
                {selectedReport.previous_employers && selectedReport.previous_employers.length > 0 && (
                  <div className="ta-small" style={{ marginTop: 10 }}>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>Previous Employers</p>
                    {selectedReport.previous_employers.map((e: any, i: number) => (
                      <div key={i} className="ta-emp-row">
                        <span style={{ flex: 1 }}>{e.company_name}</span>
                        <span className="ta-muted">{e.employee_count} employees</span>
                        <span>{e.linkedin_verified ? '✓ Verified' : 'Not verified'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(selectedReport.questions?.questions || []).map((q: Question, idx: number) => {
                  const ev = selectedReport.evaluations?.[idx];
                  const ans = selectedReport.candidate_answers?.[idx];
                  return (
                    <div key={idx} className="ta-card" style={{ marginTop: 10 }}>
                      <p style={{ fontWeight: 600, margin: 0 }}>{idx + 1}. {q.question_text}</p>
                      <p className="ta-small" style={{ margin: '6px 0' }}><strong>Answer:</strong> {ans || '(no answer)'}</p>
                      {ev && (
                        <>
                          <p style={{ color: '#6a2c91', fontWeight: 700, margin: 0 }}>Score: {ev.overall_score}</p>
                          <p className="ta-small" style={{ margin: '4px 0 0' }}><strong>Feedback:</strong> {ev.feedback}</p>
                        </>
                      )}
                    </div>
                  );
                })}

                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #d7dde7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => goTo(userRole === 'admin' ? 'adminDashboard' : 'dashboard')}
                    className="ta-btn"
                    style={{ fontSize: 13, padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
                    title={userRole === 'admin' ? 'Return to Executive Dashboard' : 'Return to Recruitment Dashboard'}
                  >
                    <span>←</span> {userRole === 'admin' ? 'Go to Executive Dashboard' : 'Go to Dashboard'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    className="ta-btn secondary"
                    style={{ fontSize: 13, padding: '8px 16px', fontWeight: 600 }}
                  >
                    Close Report
                  </button>
                </div>
              </div>
            )}

            {!selectedReport && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => goTo(userRole === 'admin' ? 'adminDashboard' : 'dashboard')}
                  className="ta-btn"
                  style={{
                    fontSize: 13,
                    padding: '9px 20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title={userRole === 'admin' ? 'Return to Executive Dashboard' : 'Return to Recruitment Dashboard'}
                >
                  <span style={{ fontSize: 14 }}>←</span>
                  <span>{userRole === 'admin' ? 'Go to Executive Dashboard' : 'Go to Dashboard'}</span>
                </button>
                {selectedReportIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
                      {selectedReportIds.length} candidate report{selectedReportIds.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                      type="button"
                      className="ta-btn secondary"
                      style={{ fontSize: 12, padding: '5px 10px' }}
                      onClick={() => setSelectedReportIds([])}
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportReports('csv')}
                      className="ta-btn"
                      style={{
                        fontSize: 13,
                        padding: '7px 16px',
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        color: '#fff',
                        fontWeight: 600
                      }}
                    >
                      📥 Quick Export CSV ({selectedReportIds.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------- Notifications & Candidate Alerts ---------------- */}
        {activeNav === 'notifications' && (
          <div className="ta-notif-page">
            {/* Top Stat Cards */}
            <div className="ta-stats" style={{ marginBottom: 20 }}>
              <div className="ta-card ta-stat">
                <span className="ta-muted ta-small">Total Notifications</span>
                <strong>{notifications.length}</strong>
              </div>
              <div
                className="ta-card ta-stat"
                style={{
                  borderLeft: unreadNotifCount > 0 ? '4px solid #0284c7' : '1px solid #e2e8f0',
                  cursor: 'pointer'
                }}
                onClick={() => setNotifFilter('unread')}
                title="Filter by Unread Alerts"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="ta-muted ta-small">Unread Alerts</span>
                  {unreadNotifCount > 0 && (
                    <span className="ta-pill" style={{ background: '#fee2e2', color: '#dc2626', fontSize: 11, padding: '2px 8px' }}>
                      {unreadNotifCount} New
                    </span>
                  )}
                </div>
                <strong style={{ color: unreadNotifCount > 0 ? '#0284c7' : '#0f172a' }}>{unreadNotifCount}</strong>
              </div>
              <div
                className="ta-card ta-stat"
                style={{ cursor: 'pointer' }}
                onClick={() => setNotifFilter('read')}
                title="Filter by Reviewed Submissions"
              >
                <span className="ta-muted ta-small">Reviewed Submissions</span>
                <strong>{notifications.filter(n => n.is_read).length}</strong>
              </div>
            </div>

            {/* Filter and Control Bar */}
            <div className="ta-card" style={{ marginBottom: 16, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`ta-filter-btn ${notifFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setNotifFilter('all')}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    type="button"
                    className={`ta-filter-btn ${notifFilter === 'unread' ? 'active' : ''}`}
                    onClick={() => setNotifFilter('unread')}
                  >
                    ● Unread ({unreadNotifCount})
                  </button>
                  <button
                    type="button"
                    className={`ta-filter-btn ${notifFilter === 'read' ? 'active' : ''}`}
                    onClick={() => setNotifFilter('read')}
                  >
                    ✓ Reviewed ({notifications.filter(n => n.is_read).length})
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {unreadNotifCount > 0 && (
                    <button
                      type="button"
                      className="ta-btn secondary"
                      style={{ padding: '7px 14px', fontSize: 12.5 }}
                      onClick={handleMarkAllNotificationsRead}
                    >
                      ✓ Mark All as Read
                    </button>
                  )}
                  <button
                    type="button"
                    className="ta-btn secondary"
                    style={{ padding: '7px 14px', fontSize: 12.5 }}
                    onClick={() => fetchNotifications(false)}
                    title="Refresh notifications"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Cards List */}
            {notifications.filter(n => {
              if (notifFilter === 'unread') return !n.is_read;
              if (notifFilter === 'read') return n.is_read;
              return true;
            }).length === 0 ? (
              <div className="ta-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 38, marginBottom: 12, opacity: 0.7 }}>🔔</div>
                <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>
                  {notifFilter === 'unread' ? 'No unread notifications' : notifFilter === 'read' ? 'No reviewed notifications' : 'No candidate notifications yet'}
                </h3>
                <p className="ta-muted" style={{ maxWidth: 460, margin: '0 auto', fontSize: 13.5 }}>
                  {notifFilter === 'unread'
                    ? "You're all caught up! As soon as candidates submit assessments, alerts will appear here in real time."
                    : 'Candidate submissions and automated evaluation alerts will be recorded and displayed here.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notifications.filter(n => {
                  if (notifFilter === 'unread') return !n.is_read;
                  if (notifFilter === 'read') return n.is_read;
                  return true;
                }).map((n) => {
                  const isUnread = !n.is_read;
                  const cInitials = (n.candidate_name || 'Candidate')
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const scoreTier = (n.score_percentage ?? 0) >= 75 ? 'high' : ((n.score_percentage ?? 0) >= 50 ? 'medium' : 'low');

                  return (
                    <div
                      key={n.id}
                      className={`ta-card ta-notif-full-card ${isUnread ? 'unread-card' : 'read-card'}`}
                      style={{
                        padding: '18px 22px',
                        borderLeft: isUnread ? '6px solid #0077b5' : '6px solid #cbd5e1',
                        background: isUnread ? 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)' : '#ffffff',
                        boxShadow: isUnread ? '0 4px 16px rgba(0, 119, 181, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
                          {/* Candidate Initials Avatar */}
                          <div
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: '50%',
                              background: isUnread ? 'linear-gradient(135deg, #0077b5 0%, #00a3e0 100%)' : '#94a3b8',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: 16,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: isUnread ? '0 3px 10px rgba(0,119,181,0.35)' : 'none',
                            }}
                          >
                            {cInitials}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: isUnread ? 800 : 600, color: '#0f172a' }}>
                                {n.candidate_name || 'Candidate'}
                              </h3>
                              {isUnread ? (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    letterSpacing: '0.4px',
                                  }}
                                >
                                  ● NEW SUBMISSION
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                  }}
                                >
                                  ✓ Reviewed
                                </span>
                              )}
                              {n.candidate_email && (
                                <span style={{ fontSize: 13, color: '#64748b' }}>
                                  ({n.candidate_email})
                                </span>
                              )}
                            </div>

                            <p style={{ margin: '0 0 8px', fontSize: 14, color: isUnread ? '#1e293b' : '#475569', fontWeight: isUnread ? 500 : 400 }}>
                              {n.message}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#64748b' }}>
                              <span>📋 <strong>Role:</strong> {n.job_title || 'Role Assessment'}</span>
                              {n.score_percentage != null && (
                                <span className={`ta-notif-score-pill ${scoreTier}`} style={{ fontSize: 12.5, padding: '3px 10px' }}>
                                  ★ Overall Score: {n.score_percentage}%
                                </span>
                              )}
                              <span>⏱ {formatRelativeTime(n.created_at)}</span>
                              {n.created_at && (
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>
                                  ({new Date(n.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                          <button
                            type="button"
                            className="ta-btn"
                            style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            onClick={() => handleOpenNotificationReport(n)}
                          >
                            <span>View Full Report</span>
                            <span>→</span>
                          </button>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {isUnread && (
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0284c7',
                                  fontSize: 12.5,
                                  cursor: 'pointer',
                                  padding: '4px 6px',
                                  fontWeight: 600,
                                }}
                                onClick={(e) => handleMarkNotificationRead(n.id, e)}
                                title="Mark as read"
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              type="button"
                              className="ta-notif-delete-btn"
                              onClick={(e) => handleDeleteNotification(n.id, e)}
                              title="Delete notification"
                              style={{ padding: '4px 8px', fontSize: 13 }}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------- Tech Stack & R&D ---------------- */}
        {activeNav === 'tech' && (
          <div className="ta-grid">
            <div className="ta-card">
              <h2>Tech Stack</h2>
              <p><b>Frontend:</b> Next.js (React), deployed on Vercel</p>
              <p><b>Backend:</b> FastAPI (Python), REST APIs, Swagger/OpenAPI</p>
              <p><b>Persistence:</b> PostgreSQL (Supabase-hosted)</p>
              <p><b>LLM:</b> Groq-hosted models via LangChain, structured output</p>
              <p><b>Ingestion:</b> PyMuPDF, python-docx, Tesseract OCR</p>
            </div>
            <div className="ta-card">
              <h2>Features</h2>
              <p><span className="ta-check">✓</span> Job–candidate skill match scoring (real LLM)</p>
              <p><span className="ta-check">✓</span> Mandatory communication-skill question per set</p>
              <p><span className="ta-check">✓</span> Multiple assessment sets with shuffle</p>
              <p><span className="ta-check">✓</span> Timed candidate assessment with auto-submit</p>
              <p><span className="ta-check">✓</span> Employer verification workflow (&gt;50 employee rule)</p>
              <p><span className="ta-check">✓</span> Consolidated report with job knowledge & communication scores</p>
            </div>
          </div>
        )}

        {/* ---------------- Profile (own page) ---------------- */}
        {activeNav === 'profile' && (
          <div className="ta-card" style={{ maxWidth: 480 }}>
            <p className="ta-muted ta-small" style={{ marginBottom: 14 }}>{authUser?.email}</p>

            <div className="ta-label">Full Name</div>
            <input type="text" value={profileFullName} onChange={(e) => setProfileFullName(e.target.value)} className="ta-input" style={{ marginBottom: 12 }} />

            <div className="ta-label">Organization Name</div>
            <input type="text" value={profileOrgName} onChange={(e) => setProfileOrgName(e.target.value)} className="ta-input" style={{ marginBottom: 16 }} />

            {profileMessage && <p className="ta-good ta-small" style={{ marginBottom: 10 }}>{profileMessage}</p>}
            {profileError && <p className="ta-danger-text ta-small" style={{ marginBottom: 10 }}>{profileError}</p>}

            <button onClick={handleUpdateProfile} disabled={profileSaving} className="ta-btn">
              {profileSaving ? <><span className="ta-spinner"></span>Saving...</> : 'Save Profile'}
            </button>
          </div>
        )}

        {/* ---------------- Change Password (own page, redesigned) ---------------- */}
        {activeNav === 'changePassword' && (
          <div className="ta-card">
            <div className="ta-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 36 }}>
              <div>
                <div className="ta-pw-field">
                  <span className="ta-pw-icon-left">🔒</span>
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current Password"
                  />
                  <span className="ta-pw-icon-right" onClick={() => setShowCurrentPw((v) => !v)}>{showCurrentPw ? '🙈' : '👁'}</span>
                </div>

                <div className="ta-pw-field">
                  <span className="ta-pw-icon-left">🔒</span>
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                  />
                  <span className="ta-pw-icon-right" onClick={() => setShowNewPw((v) => !v)}>{showNewPw ? '🙈' : '👁'}</span>
                </div>

                <div className="ta-pw-field">
                  <span className="ta-pw-icon-left">🔒</span>
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm Password"
                  />
                  <span className="ta-pw-icon-right" onClick={() => setShowConfirmPw((v) => !v)}>{showConfirmPw ? '🙈' : '👁'}</span>
                </div>

                {passwordMessage && <p className="ta-good ta-small" style={{ marginBottom: 10 }}>{passwordMessage}</p>}
                {passwordError && <p className="ta-danger-text ta-small" style={{ marginBottom: 10 }}>{passwordError}</p>}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
                      setPasswordError(''); setPasswordMessage('');
                      goTo('profile');
                    }}
                    className="ta-btn secondary"
                  >
                    Cancel
                  </button>
                  <button onClick={handleChangePassword} disabled={passwordSaving} className="ta-btn" style={{ background: '#f2b90c', color: '#182230' }}>
                    {passwordSaving ? <><span className="ta-spinner dark"></span>Saving...</> : 'Save'}
                  </button>
                </div>
              </div>

              <div style={{ borderLeft: '1px solid #edf0f5', paddingLeft: 36 }}>
                <p style={{ fontWeight: 600, marginBottom: 10 }}>Password Strength: <span style={{ color: pwStrengthColor }}>{pwStrengthLabel}</span></p>
                <div style={{ display: 'flex', gap: 4, marginBottom: 22 }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ height: 6, flex: 1, borderRadius: 3, background: i < pwScore ? pwStrengthColor : '#e5e8ee' }} />
                  ))}
                </div>
                <p style={{ fontWeight: 600, marginBottom: 10 }}>Password must :</p>
                {pwRules.map((r) => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, fontSize: 13, color: r.met ? '#182230' : '#8993a4' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: r.met ? '#1f8f5f' : '#e5e8ee', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flex: 'none' }}>✓</span>
                    {r.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Assessment Submission Method Selection Modal */}
      {submissionModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99998,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflowY: 'auto',
          }}
          onClick={() => setSubmissionModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              maxWidth: 680,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #cbd5e1',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #334155',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🎯</span> Choose Assessment Submission Method
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                  Select how this assessment will be administered and completed
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 0,
                  color: '#ffffff',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Option 1: Recruiter In-Person Submission */}
              <div
                onClick={() => setSubmissionMode('recruiter')}
                style={{
                  border: submissionMode === 'recruiter' ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
                  background: submissionMode === 'recruiter' ? '#f0f9ff' : '#ffffff',
                  borderRadius: 12,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: submissionMode === 'recruiter' ? '0 4px 14px rgba(2, 132, 199, 0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="radio"
                      name="submissionMethod"
                      checked={submissionMode === 'recruiter'}
                      onChange={() => setSubmissionMode('recruiter')}
                      style={{ width: 19, height: 19, accentColor: '#0284c7', cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontSize: 15.5, fontWeight: 700, color: '#0f172a', display: 'block' }}>
                        🏢 Recruiter In-Person Submission
                      </span>
                      <span style={{ fontSize: 12.5, color: '#64748b' }}>
                        Evaluator conducts assessment live or inputs candidate answers directly
                      </span>
                    </div>
                  </div>
                  <span className="ta-pill" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 700, padding: '3px 10px' }}>
                    Live Evaluation
                  </span>
                </div>
                <div style={{ marginLeft: 31, marginTop: 8, fontSize: 12.5, color: '#475569', lineHeight: 1.45 }}>
                  Generates questions (if not already created) and navigates straight into the <strong>Candidate Assessment</strong> workspace for live scoring, real-time timer countdown, and instant report generation.
                </div>
              </div>

              {/* Option 2: Candidate Submission through Sent Link in Email */}
              <div
                onClick={() => setSubmissionMode('candidate')}
                style={{
                  border: submissionMode === 'candidate' ? '2px solid #059669' : '1.5px solid #e2e8f0',
                  background: submissionMode === 'candidate' ? '#f0fdf4' : '#ffffff',
                  borderRadius: 12,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: submissionMode === 'candidate' ? '0 4px 14px rgba(5, 150, 105, 0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="radio"
                      name="submissionMethod"
                      checked={submissionMode === 'candidate'}
                      onChange={() => setSubmissionMode('candidate')}
                      style={{ width: 19, height: 19, accentColor: '#059669', cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontSize: 15.5, fontWeight: 700, color: '#0f172a', display: 'block' }}>
                        ✉️ Candidate Remote Submission (Email Link + Candidate User Login)
                      </span>
                      <span style={{ fontSize: 12.5, color: '#64748b' }}>
                        Auto-provisions login credentials, emails secure test link, and displays credentials
                      </span>
                    </div>
                  </div>
                  <span className="ta-pill" style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, padding: '3px 10px' }}>
                    Auto-Login & Email
                  </span>
                </div>
                <div style={{ marginLeft: 31, marginTop: 8, fontSize: 12.5, color: '#475569', lineHeight: 1.45 }}>
                  TalentAssess AI automatically creates a dedicated candidate user login account, dispatches an invitation email with direct assessment link & user login credentials, and renders the assessment link & credentials in the Candidate Email Invitations box.
                </div>

                {/* Candidate Selection / Details in Candidate Mode */}
                {submissionMode === 'candidate' && (
                  <div style={{ marginLeft: 31, marginTop: 12, background: '#ffffff', borderRadius: 8, padding: '12px 14px', border: '1px solid #bbf7d0' }}>
                    {selectedCandidateIds.length > 0 ? (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                          Recipient Candidate(s) ({selectedCandidateIds.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
                          {selectedCandidateIds.map((cId) => {
                            const match = multiMatchResults.find((m) => m.resume_id === cId);
                            const cName = match?.candidate_name || `Candidate #${cId}`;
                            const cEmail = candidateEmails[cId] || match?.candidate_email || `${cName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`;
                            return (
                              <div key={cId} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>👤</span>
                                <strong>{cName}</strong>
                                <span style={{ color: '#64748b' }}>&lt;{cEmail}&gt;</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                          Candidate Recipient (Will receive assessment link & user login):
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            placeholder="Candidate Name (e.g. Alex Kumar)"
                            value={modalCandidateName}
                            onChange={(e) => setModalCandidateName(e.target.value)}
                            className="ta-input"
                            style={{ fontSize: 12.5, flex: 1, minWidth: 160 }}
                          />
                          <input
                            type="email"
                            placeholder="Candidate Email (e.g. alex.kumar@email.com)"
                            value={modalCandidateEmail}
                            onChange={(e) => setModalCandidateEmail(e.target.value)}
                            className="ta-input"
                            style={{ fontSize: 12.5, flex: 1.3, minWidth: 200 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => setSubmissionModalOpen(false)}
                className="ta-btn secondary"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Cancel
              </button>
              {submissionMode === 'recruiter' ? (
                <button
                  type="button"
                  onClick={handleProceedRecruiterSubmission}
                  disabled={generating}
                  className="ta-btn success"
                  style={{ padding: '8px 20px', fontSize: 13.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {generating ? (
                    <>
                      <span className="ta-spinner" style={{ width: 13, height: 13 }}></span>
                      Generating Questions...
                    </>
                  ) : (
                    <>Go to Candidate Assessment <span>→</span></>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedCandidateSubmission}
                  disabled={generating || sendingInvitations}
                  className="ta-btn"
                  style={{ padding: '8px 20px', fontSize: 13.5, fontWeight: 700, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {generating || sendingInvitations ? (
                    <>
                      <span className="ta-spinner" style={{ width: 13, height: 13 }}></span>
                      Creating Login & Sending...
                    </>
                  ) : (
                    <>Create Login & Send Assessment Email ⚡</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assessment Invitation Email Preview Modal */}
      {previewEmailData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflowY: 'auto',
          }}
          onClick={() => setPreviewEmailData(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 14,
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
              maxWidth: 760,
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #cbd5e1',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 22px',
                background: 'linear-gradient(135deg, #132247 0%, #1e3a8a 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #0f172a',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>✉</span>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }}>
                    Official Assessment Invitation Email Template
                  </h3>
                </div>
                <p style={{ margin: '3px 0 0 26px', fontSize: 12, color: '#93c5fd' }}>
                  Exact branded template dispatched to candidates (Same across batch dispatch and individual email)
                </p>
              </div>
              <button
                onClick={() => setPreviewEmailData(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 16,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                title="Close preview"
              >
                ✕
              </button>
            </div>

            {/* Email Metadata Bar */}
            <div
              style={{
                padding: '12px 22px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: 12.5,
                color: '#334155',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '6px 12px',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700, color: '#64748b' }}>To:</span>
              <span>
                <strong>{previewEmailData.candidate_name}</strong> &lt;{previewEmailData.candidate_email}&gt;
              </span>

              <span style={{ fontWeight: 700, color: '#64748b' }}>Subject:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{previewEmailData.subject}</span>

              <span style={{ fontWeight: 700, color: '#64748b' }}>Role & Org:</span>
              <span>
                {previewEmailData.job_title} · <strong>{previewEmailData.organization_name}</strong>
              </span>

              <span style={{ fontWeight: 700, color: '#64748b' }}>Status:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {previewEmailData.email_sent ? (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                    ✓ Dispatched to Inbox
                  </span>
                ) : (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#fef3c7', color: '#b45309', fontWeight: 600 }}>
                    ⏳ Ready to Dispatch
                  </span>
                )}
                {previewEmailData.smtp_configured ? (
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>
                    ● SMTP Active (Gmail)
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 500 }}>
                    ⚠ SMTP Not Configured
                  </span>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div
              style={{
                padding: '10px 22px',
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="ta-btn"
                  style={{
                    padding: '6px 14px',
                    fontSize: 12.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'linear-gradient(135deg, #0077b5, #00a3e0)',
                    color: '#ffffff',
                    fontWeight: 600,
                  }}
                  disabled={resendingEmailId === previewEmailData.invitation_id}
                  onClick={async () => {
                    await handleResendEmail(previewEmailData.invitation_id);
                    setPreviewEmailData((prev: any) => prev ? { ...prev, email_sent: true } : null);
                  }}
                  title="Send this exact branded HTML email template directly to candidate's email address"
                >
                  {resendingEmailId === previewEmailData.invitation_id ? (
                    <>
                      <span className="ta-spinner" style={{ width: 12, height: 12 }}></span>
                      Dispatching Email...
                    </>
                  ) : previewEmailData.email_sent ? (
                    <>↻ Resend This Email</>
                  ) : (
                    <>🚀 Send Dispatch Email Now</>
                  )}
                </button>

                <button
                  type="button"
                  className="ta-btn secondary"
                  style={{ padding: '6px 12px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={handleCopyEmailHtml}
                  title="Copy the rich formatted email HTML into your clipboard (can paste into Outlook, Gmail, etc.)"
                >
                  {copiedHtml ? '✓ Formatted HTML Copied!' : '📋 Copy Rich HTML'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={previewEmailData.invitation_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    color: '#0077b5',
                    textDecoration: 'none',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  🔗 Open Candidate Link ↗
                </a>
              </div>
            </div>

            {/* Rendered HTML Email Frame */}
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f1f5f9', padding: '16px' }}>
              <div
                style={{
                  maxWidth: 620,
                  margin: '0 auto',
                  background: '#ffffff',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <iframe
                  title="Email Invitation Preview"
                  srcDoc={previewEmailData.html_body}
                  style={{
                    width: '100%',
                    height: '520px',
                    border: 'none',
                    display: 'block',
                  }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '10px 22px',
                backgroundColor: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                💡 <strong>Guarantee:</strong> Clicking "✉ Email Candidate" or "Send Dispatch Email Now" delivers this identical branded layout.
              </span>
              <button
                type="button"
                className="ta-btn secondary"
                style={{ padding: '4px 14px', fontSize: 12 }}
                onClick={() => setPreviewEmailData(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Detailed Evaluation Report Modal */}
      {candidateReportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setCandidateReportModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 14,
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.22)',
              width: '100%',
              maxWidth: 880,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 24px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  📊
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#ffffff' }}>
                    Candidate Assessment Evaluation Report
                  </h3>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {candidateViewingReport?.job_title ? `${candidateViewingReport.job_title} · ` : ''}
                    {candidateViewingReport?.candidate_name || 'Candidate Evaluation'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="ta-btn secondary"
                  style={{ fontSize: 12, padding: '4px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                  title="Print or save as PDF"
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setCandidateReportModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: 22,
                    cursor: 'pointer',
                    lineHeight: 1,
                    padding: '4px 8px',
                    borderRadius: 6,
                  }}
                  title="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
              {loadingCandidateReportDetail ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <span className="ta-spinner dark" style={{ width: 28, height: 28 }}></span>
                  <p style={{ marginTop: 14, color: '#64748b', fontSize: 14 }}>
                    Loading AI evaluation report details...
                  </p>
                </div>
              ) : !candidateViewingReport ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  Unable to load evaluation report details.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Top Candidate & Job Banner */}
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: 12,
                      padding: '18px 22px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 14,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Candidate Evaluation Record
                      </div>
                      <h2 style={{ margin: '4px 0 2px', fontSize: 20, color: '#0f172a' }}>
                        {candidateViewingReport.candidate_name}
                      </h2>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        📧 {candidateViewingReport.candidate_email} · 🏢 {candidateViewingReport.organization_name}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Submitted On</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155', marginTop: 2 }}>
                        {candidateViewingReport.submitted_at || (candidateViewingReport.created_at ? new Date(candidateViewingReport.created_at).toLocaleString() : 'Recently submitted')}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <div style={{ background: '#ffffff', borderRadius: 10, padding: '16px 20px', border: '1px solid #e2e8f0', borderTop: '4px solid #10b981' }}>
                      <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Overall Score</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', margin: '4px 0 2px' }}>
                        {candidateViewingReport.score_percentage}%
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b' }}>
                        {candidateViewingReport.total_score} out of {candidateViewingReport.max_score} marks
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', borderRadius: 10, padding: '16px 20px', border: '1px solid #e2e8f0', borderTop: '4px solid #0284c7' }}>
                      <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Job Knowledge Match</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#0284c7', margin: '4px 0 2px' }}>
                        {candidateViewingReport.knowledge_score_pct != null ? `${Math.round(candidateViewingReport.knowledge_score_pct)}%` : candidateViewingReport.job_knowledge_match != null ? `${Math.round(candidateViewingReport.job_knowledge_match)}%` : `${candidateViewingReport.score_percentage}%`}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b' }}>Technical proficiency match</div>
                    </div>

                    <div style={{ background: '#ffffff', borderRadius: 10, padding: '16px 20px', border: '1px solid #e2e8f0', borderTop: '4px solid #8b5cf6' }}>
                      <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Communication & Clarity</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#8b5cf6', margin: '4px 0 2px' }}>
                        {candidateViewingReport.communication_score_pct != null ? `${Math.round(candidateViewingReport.communication_score_pct)}%` : candidateViewingReport.communication_score != null ? `${Math.round(candidateViewingReport.communication_score)}%` : '85%'}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b' }}>Articulation & response clarity</div>
                    </div>
                  </div>

                  {/* AI Evaluation Summary */}
                  {candidateViewingReport.evaluation_summary && (
                    <div style={{ background: '#ffffff', borderRadius: 10, padding: '18px 22px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>🤖</span>
                        <h4 style={{ margin: 0, fontSize: 14.5, color: '#0f172a', fontWeight: 700 }}>
                          AI Evaluation Summary & Competency Insights
                        </h4>
                      </div>
                      <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.6 }}>
                        {candidateViewingReport.evaluation_summary}
                      </p>
                    </div>
                  )}

                  {/* Question Breakdown List */}
                  <div>
                    <h4 style={{ margin: '0 0 12px', fontSize: 16, color: '#0f172a' }}>
                      Question-by-Question Evaluation Breakdown ({candidateViewingReport.questions?.length || 0})
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {(candidateViewingReport.questions || []).map((q: any, qIdx: number) => {
                        const earnedMarks = q.score ?? 0;
                        const maxMarks = q.max_score ?? q.max_marks ?? 10;
                        const isFull = earnedMarks === maxMarks && maxMarks > 0;
                        return (
                          <div
                            key={qIdx}
                            style={{
                              background: '#ffffff',
                              borderRadius: 10,
                              padding: '18px 20px',
                              border: '1px solid #e2e8f0',
                              borderLeft: isFull ? '4px solid #10b981' : earnedMarks > 0 ? '4px solid #f59e0b' : '4px solid #ef4444',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                                  Question {q.question_number || q.index || qIdx + 1}
                                </span>
                                {q.question_type && (
                                  <span className="ta-pill" style={{ fontSize: 11, padding: '2px 8px' }}>
                                    {q.question_type}
                                  </span>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: 700,
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  background: isFull ? '#ecfdf5' : '#f8fafc',
                                  color: isFull ? '#065f46' : '#334155',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                Score: {earnedMarks} / {maxMarks} marks
                              </span>
                            </div>

                            <p style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.5, margin: '0 0 12px', fontWeight: 500 }}>
                              {q.question_text}
                            </p>

                            {/* Candidate's submitted answer */}
                            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 8, border: '1px solid #f1f5f9' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Candidate Response
                              </div>
                              <div style={{ fontSize: 13, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                                {q.candidate_answer || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No response submitted</span>}
                              </div>
                            </div>

                            {/* Correct Benchmark & AI Feedback */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginTop: 8 }}>
                              {q.correct_answer && (
                                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', border: '1px solid #bbf7d0' }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 4 }}>
                                    Benchmark / Key Answer
                                  </div>
                                  <div style={{ fontSize: 12.5, color: '#14532d', lineHeight: 1.45 }}>
                                    {q.correct_answer}
                                  </div>
                                </div>
                              )}

                              {q.feedback && (
                                <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #bfdbfe' }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: 4 }}>
                                    AI Evaluator Feedback
                                  </div>
                                  <div style={{ fontSize: 12.5, color: '#1e3a8a', lineHeight: 1.45 }}>
                                    {q.feedback}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Evaluated by TalentAssess AI Core Intelligence Engine
              </span>
              <button
                type="button"
                className="ta-btn secondary"
                style={{ padding: '6px 20px', fontSize: 13, fontWeight: 600 }}
                onClick={() => setCandidateReportModalOpen(false)}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global High-Visibility Consistent Alert Popups */}
      {alerts.length > 0 && (
        <div className="ta-popup-toast-container" aria-live="polite">
          {alerts.map((item) => (
            <AlertToastItem key={item.id} alert={item} onDismiss={dismissAlert} />
          ))}
        </div>
      )}
    </div>
  );
}