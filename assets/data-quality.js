document.addEventListener('DOMContentLoaded', function () {
  // Filled in once the datachecks backend is deployed and a Google OAuth
  // client exists — see datachecks/README.md. Until then this page can't
  // reach a live backend.
  var API_BASE = '';
  var GOOGLE_CLIENT_ID = '';

  var SESSION_KEY = 'adventag_dq_session';
  var TYPE_LABELS = { database: 'Database (SQL)', api: 'API', file: 'File / Spreadsheet' };

  var signinCard = document.getElementById('dq-signin-card');
  var signinError = document.getElementById('dq-signin-error');
  var appEl = document.getElementById('dq-app');
  var userEmailEl = document.getElementById('dq-user-email');
  var signoutBtn = document.getElementById('dq-signout');

  var addToggle = document.getElementById('dq-add-toggle');
  var formSection = document.getElementById('dq-form-section');
  var cancelBtn = document.getElementById('dq-cancel');
  var form = document.getElementById('dq-form');
  var statusEl = form.querySelector('.form-status');
  var emptyState = document.getElementById('dq-empty-state');
  var listEl = document.getElementById('dq-source-list');
  var typeSelect = document.getElementById('dq-type');
  var dbFields = document.getElementById('dq-db-fields');

  var questionSourceSelect = document.getElementById('dq-question-source');
  var askBtn = document.getElementById('dq-ask-btn');
  var askStatus = document.getElementById('dq-ask-status');
  var askResult = document.getElementById('dq-ask-result');

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }

  function setSession(session) {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function apiFetch(path, options) {
    options = options || {};
    var session = getSession();
    var headers = Object.assign({}, options.headers || {}, {
      Authorization: 'Bearer ' + (session && session.token)
    });
    if (options.body) headers['Content-Type'] = 'application/json';
    return fetch(API_BASE + path, Object.assign({}, options, { headers: headers }))
      .then(function (r) {
        if (r.status === 401) {
          setSession(null);
          showSignedOut();
          return Promise.reject(new Error('Session expired — please sign in again.'));
        }
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || 'Request failed.');
          return data;
        });
      });
  }

  function showSignedOut() {
    appEl.hidden = true;
    signinCard.hidden = false;
  }

  function showSignedIn(session) {
    signinCard.hidden = true;
    appEl.hidden = false;
    userEmailEl.textContent = session.user.email;
    loadSources();
  }

  function renderResultTable(container, result) {
    if (!result.rows.length) {
      container.innerHTML = '<p class="dq-preview-empty">No rows returned.</p>';
      return;
    }
    var head = '<tr>' + result.columns.map(function (c) { return '<th>' + escapeHtml(c) + '</th>'; }).join('') + '</tr>';
    var body = result.rows.map(function (row) {
      return '<tr>' + result.columns.map(function (c) { return '<td>' + escapeHtml(row[c]) + '</td>'; }).join('') + '</tr>';
    }).join('');
    container.innerHTML = '<div class="dq-table-wrap"><table class="dq-result-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function loadSources() {
    apiFetch('/api/sources')
      .then(function (sources) {
        renderSourceList(sources);
        renderQuestionSourceOptions(sources);
      })
      .catch(function (err) {
        listEl.innerHTML = '<p class="form-status is-error">' + escapeHtml(err.message) + '</p>';
      });
  }

  function renderQuestionSourceOptions(sources) {
    var dbSources = sources.filter(function (s) { return s.type === 'database'; });
    if (!dbSources.length) {
      questionSourceSelect.innerHTML = '<option value="">No database sources yet</option>';
      askBtn.disabled = true;
      return;
    }
    askBtn.disabled = false;
    questionSourceSelect.innerHTML = dbSources.map(function (s) {
      return '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>';
    }).join('');
  }

  function renderSourceList(sources) {
    emptyState.hidden = sources.length > 0;
    listEl.innerHTML = sources.map(function (s) {
      var previewControls = s.type === 'database'
        ? '<input type="text" class="dq-table-input" data-id="' + s.id + '" placeholder="table name" maxlength="80">' +
          '<button type="button" class="dq-preview-btn" data-id="' + s.id + '">Preview 25 records</button>'
        : '<span class="dq-preview-empty">Live preview isn’t wired up for this source type yet.</span>';
      return (
        '<div class="card dq-source-card">' +
          '<div class="dq-source-card-head">' +
            '<h3>' + escapeHtml(s.name) + '</h3>' +
            '<span class="dq-badge">' + escapeHtml(TYPE_LABELS[s.type] || s.type) + '</span>' +
          '</div>' +
          (s.target ? '<p class="dq-source-target">Looking for: ' + escapeHtml(s.target) + '</p>' : '') +
          (s.host ? '<p class="dq-source-notes">' + escapeHtml(s.engine) + ' &middot; ' + escapeHtml(s.host) + ':' + escapeHtml(s.port) + '/' + escapeHtml(s.database) + '</p>' : '') +
          (s.notes ? '<p class="dq-source-notes">' + escapeHtml(s.notes) + '</p>' : '') +
          '<div class="dq-source-actions">' +
            previewControls +
            '<button type="button" class="dq-remove-btn" data-id="' + s.id + '">Remove</button>' +
          '</div>' +
          '<div class="dq-preview-result" id="dq-preview-' + s.id + '"></div>' +
        '</div>'
      );
    }).join('');
  }

  // --- Add source form ---

  typeSelect.addEventListener('change', function () {
    dbFields.hidden = typeSelect.value !== 'database';
  });

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
    var type = typeSelect.value;
    var payload = {
      name: document.getElementById('dq-name').value.trim(),
      type: type,
      target: document.getElementById('dq-target').value.trim(),
      notes: document.getElementById('dq-notes').value.trim()
    };
    if (type === 'database') {
      Object.assign(payload, {
        engine: document.getElementById('dq-engine').value,
        host: document.getElementById('dq-host').value.trim(),
        port: document.getElementById('dq-port').value,
        database: document.getElementById('dq-database').value.trim(),
        username: document.getElementById('dq-username').value.trim(),
        password: document.getElementById('dq-password').value,
        ssl: document.getElementById('dq-ssl').checked
      });
    }

    statusEl.textContent = '';
    statusEl.className = 'form-status';

    apiFetch('/api/sources', { method: 'POST', body: JSON.stringify(payload) })
      .then(function () {
        form.reset();
        formSection.hidden = true;
        loadSources();
      })
      .catch(function (err) {
        statusEl.textContent = err.message;
        statusEl.className = 'form-status is-error';
      });
  });

  // --- Source list actions ---

  listEl.addEventListener('click', function (e) {
    var id = e.target.getAttribute('data-id');
    if (!id) return;

    if (e.target.classList.contains('dq-remove-btn')) {
      apiFetch('/api/sources/' + id, { method: 'DELETE' }).then(loadSources).catch(function (err) {
        alert(err.message);
      });
      return;
    }

    if (e.target.classList.contains('dq-preview-btn')) {
      var input = listEl.querySelector('.dq-table-input[data-id="' + id + '"]');
      var table = input.value.trim();
      var resultEl = document.getElementById('dq-preview-' + id);
      if (!table) {
        resultEl.innerHTML = '<p class="form-status is-error">Enter a table name first.</p>';
        return;
      }
      resultEl.innerHTML = '<p class="dq-preview-empty">Loading&hellip;</p>';
      apiFetch('/api/sources/' + id + '/preview', { method: 'POST', body: JSON.stringify({ table: table }) })
        .then(function (result) { renderResultTable(resultEl, result); })
        .catch(function (err) { resultEl.innerHTML = '<p class="form-status is-error">' + escapeHtml(err.message) + '</p>'; });
    }
  });

  // --- Ask about data quality ---

  askBtn.addEventListener('click', function () {
    var sourceId = questionSourceSelect.value;
    var sql = document.getElementById('dq-question').value.trim();
    if (!sourceId || !sql) {
      askStatus.textContent = 'Pick a source and enter a query.';
      askStatus.className = 'form-status is-error';
      return;
    }
    askStatus.textContent = 'Running…';
    askStatus.className = 'form-status';
    askResult.innerHTML = '';

    apiFetch('/api/sources/' + sourceId + '/query', { method: 'POST', body: JSON.stringify({ sql: sql }) })
      .then(function (result) {
        askStatus.textContent = '';
        renderResultTable(askResult, result);
      })
      .catch(function (err) {
        askStatus.textContent = err.message;
        askStatus.className = 'form-status is-error';
      });
  });

  // --- Sign-in ---

  signoutBtn.addEventListener('click', function () {
    setSession(null);
    showSignedOut();
  });

  function handleCredentialResponse(response) {
    signinError.style.display = 'none';
    fetch(API_BASE + '/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential })
    })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Sign-in failed.'); return d; }); })
      .then(function (data) {
        setSession(data);
        showSignedIn(data);
      })
      .catch(function (err) {
        signinError.textContent = err.message;
        signinError.style.display = 'block';
      });
  }

  function initSignIn() {
    var existing = getSession();
    if (existing) {
      showSignedIn(existing);
      return;
    }
    if (!API_BASE || !GOOGLE_CLIENT_ID) {
      signinError.textContent = 'This tool isn’t connected to a backend yet — API_BASE and GOOGLE_CLIENT_ID need to be set in assets/data-quality.js once datachecks is deployed.';
      signinError.style.display = 'block';
      return;
    }
    if (!window.google) {
      setTimeout(initSignIn, 200);
      return;
    }
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredentialResponse });
    google.accounts.id.renderButton(document.getElementById('dq-google-btn'), { theme: 'outline', size: 'large' });
  }

  initSignIn();
});
