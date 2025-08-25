async function loadPartials() {
  try {
    const r = await fetch('http://localhost:3001/api/me', { credentials: 'include' });
    const { authenticated, user } = await r.json();
    if (!authenticated) {
      return window.location.replace('../login.html');
    }
    // Optional: enforce role for doctor pages
    // if (user.role !== 'Doctor') return window.location.replace('../login.html');
  } catch {
    window.location.replace('../login.html');
  }
}

document.addEventListener('DOMContentLoaded', loadPartials);
