const API = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const errEl = document.getElementById('error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';

    const payload = {
      first_name: document.getElementById('first_name').value.trim(),
      last_name:  document.getElementById('last_name').value.trim(),
      role:       document.getElementById('role').value,
      username:   document.getElementById('username').value.trim(),
      email:      document.getElementById('email').value.trim(),
      password:   document.getElementById('password').value
    };

    try {
      const res = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        errEl.textContent = data.message || 'Registration failed.';
        return;
      }
      window.location.href = 'login.html';
    } catch (err) {
      errEl.textContent = 'Network error.';
    }
  });
});
