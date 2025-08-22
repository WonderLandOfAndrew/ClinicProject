async function loadPartials() {
  (function () {
    const sessionRaw = localStorage.getItem('session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    if (!session || session.role !== 'doctor') return window.location.replace('../login.html');
  })();
}

document.addEventListener('DOMContentLoaded', loadPartials);