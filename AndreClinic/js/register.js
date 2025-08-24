// document.addEventListener('DOMContentLoaded', function () {
//   const form = document.getElementById('registerForm');
//   const errorElem = document.getElementById('error');

//   form.addEventListener('submit', async function (e) {
//     e.preventDefault();
//     errorElem.textContent = '';

//     const username = document.getElementById('username').value.trim();
//     const email = document.getElementById('email').value.trim();
//     const password = document.getElementById('password').value;

//     try {
//       const response = await fetch('http://localhost:3000/api/register', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ username, email, password })
//       });

//       if (response.ok) {
//         window.location.href = 'login.html';
//       } else {
//         const data = await response.json();
//         errorElem.textContent = data.message || 'Registration failed.';
//       }
//     } catch (err) {
//       errorElem.textContent = 'Network error. Please try again.';
//     }
//   });
// });

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
