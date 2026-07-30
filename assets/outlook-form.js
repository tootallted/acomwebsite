document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('outlook-form');
  if (!form) return;

  var statusEl = form.querySelector('.form-status');
  var submitBtn = form.querySelector('.form-submit');
  var wrapper = document.getElementById('outlook-form-wrapper');
  var successEl = document.getElementById('outlook-success');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    statusEl.textContent = '';
    statusEl.className = 'form-status';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (response) {
        if (response.ok) {
          wrapper.style.display = 'none';
          successEl.style.display = 'block';
        } else {
          return response.json().then(function (data) {
            throw new Error((data && data.error) || 'Submission failed.');
          });
        }
      })
      .catch(function () {
        statusEl.textContent = 'Something went wrong sending your answers. Please try again, or email ted.clark@adventag.com directly.';
        statusEl.className = 'form-status is-error';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send my answers';
      });
  });
});
