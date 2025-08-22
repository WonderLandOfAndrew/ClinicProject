// login.js — simple mock authentication + role-based redirect
(function () {
  // Mock users (replace with real API later)
  const USERS = [
    {
      id: 'd-101',
      email: 'doctor@example.com',
      password: 'doctor123',
      role: 'doctor',
      fullName: 'Dr. Ana Popescu'
    },
    // Add more roles in future (nurse, admin)
  ];

  const form = document.getElementById('loginForm');
  const error = document.getElementById('error');

  function saveSession(user) {
    const session = {
      uid: user.id,
      role: user.role,
      name: user.fullName,
      email: user.email,
      // In production use secure HttpOnly cookies + JWT
      token: `mock-${Math.random().toString(36).slice(2)}`,
      ts: Date.now()
    };
    localStorage.setItem('session', JSON.stringify(session));
    return session;
  }

  function handleRedirect(role) {
    switch (role) {
      case 'doctor':
        window.location.href = 'doctor/doctor.html';
        break;
      default:
        // For other roles, redirect to their dashboards when implemented
        alert('Logged in, but this role has no page yet.');
    }
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    error.textContent = '';

    const email = /** @type {HTMLInputElement} */(document.getElementById('email')).value.trim();
    const password = /** @type {HTMLInputElement} */(document.getElementById('password')).value;

    const user = USERS.find(u => u.email === email && u.password === password);
    if (!user) {
      error.textContent = 'Invalid email or password.';
      return;
    }

    const session = saveSession(user);
    handleRedirect(session.role);
  });
})();