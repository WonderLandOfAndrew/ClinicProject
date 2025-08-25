// login.js — real authentication with backend communication
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');
  const errorElem = document.getElementById('error');

  form?.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorElem.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        // Optionally, handle session storage here
        window.location.href = 'index.html';
      } else {
        const data = await response.json();
        errorElem.textContent = data.message || 'Login failed.';
      }
    } catch (err) {
      errorElem.textContent = 'Network error. Please try again.';
    }
  });
});