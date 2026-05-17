// ClassVault — Frontend Auth Logic
(function () {
  // If already logged in, redirect to dashboard
  const token = localStorage.getItem('cv_token');
  if (token) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showError('Please fill in all fields');
      return;
    }

    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Signing in...';
    btn.querySelector('.btn-loader').classList.remove('hidden');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('cv_token', data.token);
      localStorage.setItem('cv_user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'Sign In';
      btn.querySelector('.btn-loader').classList.add('hidden');
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
})();
