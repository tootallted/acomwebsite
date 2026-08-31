document.addEventListener('DOMContentLoaded', function () {
  var STORAGE_KEY = 'adventag_dq_sources';

  var addToggle = document.getElementById('dq-add-toggle');
  var formSection = document.getElementById('dq-form-section');
  var cancelBtn = document.getElementById('dq-cancel');
  var form = document.getElementById('dq-form');
  var statusEl = form.querySelector('.form-status');
  var emptyState = document.getElementById('dq-empty-state');
  var listEl = document.getElementById('dq-source-list');

  var TYPE_LABELS = { database: 'Database (SQL)', api: 'API', file: 'File / Spreadsheet' };

  function loadSources() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveSources(sources) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function render() {
    var sources = loadSources();
    emptyState.hidden = sources.length > 0;
    listEl.innerHTML = sources.map(function (s, i) {
      return (
        '<div class="card dq-source-card">' +
          '<div class="dq-source-card-head">' +
            '<h3>' + escapeHtml(s.name) + '</h3>' +
            '<span class="dq-badge">' + escapeHtml(TYPE_LABELS[s.type] || s.type) + '</span>' +
          '</div>' +
          (s.target ? '<p class="dq-source-target">Looking for: ' + escapeHtml(s.target) + '</p>' : '') +
          (s.notes ? '<p class="dq-source-notes">' + escapeHtml(s.notes) + '</p>' : '') +
          '<div class="dq-source-actions">' +
            '<button type="button" class="dq-preview-btn" data-index="' + i + '">Preview 25 records</button>' +
            '<button type="button" class="dq-remove-btn" data-index="' + i + '">Remove</button>' +
          '</div>' +
          '<p class="dq-preview-result" id="dq-preview-' + i + '" hidden></p>' +
        '</div>'
      );
    }).join('');
  }

  addToggle.addEventListener('click', function () {
    formSection.hidden = !formSection.hidden;
    if (!formSection.hidden) document.getElementById('dq-name').focus();
  });

  cancelBtn.addEventListener('click', function () {
    form.reset();
    statusEl.textContent = '';
    formSection.hidden = true;
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var sources = loadSources();
    sources.push({
      name: document.getElementById('dq-name').value.trim(),
      type: document.getElementById('dq-type').value,
      target: document.getElementById('dq-target').value.trim(),
      notes: document.getElementById('dq-notes').value.trim()
    });
    saveSources(sources);
    form.reset();
    statusEl.textContent = 'Saved.';
    statusEl.className = 'form-status is-success';
    formSection.hidden = true;
    render();
  });

  listEl.addEventListener('click', function (e) {
    var index = e.target.getAttribute('data-index');
    if (index === null) return;
    index = parseInt(index, 10);

    if (e.target.classList.contains('dq-remove-btn')) {
      var sources = loadSources();
      sources.splice(index, 1);
      saveSources(sources);
      render();
      return;
    }

    if (e.target.classList.contains('dq-preview-btn')) {
      var resultEl = document.getElementById('dq-preview-' + index);
      resultEl.hidden = false;
      resultEl.textContent = 'Live connections aren’t wired up yet — this is next.';
    }
  });

  render();
});
