document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('subscribe-email');
  const categorySelect = document.getElementById('category-select');
  const btn = document.querySelector('.subscribe button');
  const msgEl = document.getElementById('subscribe-msg');

  btn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const category = categorySelect.value;
    msgEl.textContent = '';

    if (!email) {
      msgEl.textContent = 'Введите, пожалуйста, корректный email.';
      return;
    }

    try {
      const res = await fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, category }),
      });
      const data = await res.json();
      msgEl.textContent = data.message;
    } catch (err) {
      console.error(err);
      msgEl.textContent = 'Ошибка соединения с сервером.';
    }
  });
});
