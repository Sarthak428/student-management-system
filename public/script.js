const form = document.querySelector('#student-form');
const list = document.querySelector('#student-list');
const notice = document.querySelector('#notice');
const searchInput = document.querySelector('#search');
const studentIdInput = document.querySelector('#student-id');
const submitButton = document.querySelector('#submit-button');
const cancelEditButton = document.querySelector('#cancel-edit');
const detailsDialog = document.querySelector('#details-dialog');

let students = [];
let noticeTimer;

document.querySelector('#current-year').textContent = new Date().getFullYear();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(value));
}

function showNotice(message, isError = false) {
  window.clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.classList.toggle('error', isError);
  notice.hidden = false;
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 5000);
}

async function apiRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  } catch {
    throw new Error('Could not reach the server. Check that the application is running.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status}).`);
  }
  return payload;
}

function renderStudents() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = students.filter((student) => (
    String(student.name || '').toLowerCase().includes(query) ||
    String(student._id || '').toLowerCase().includes(query)
  ));

  document.querySelector('#student-count').textContent = students.length;
  document.querySelector('#course-count').textContent = new Set(
    students.map((student) => student.course).filter(Boolean).map((course) => course.toLowerCase())
  ).size;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  document.querySelector('#recent-count').textContent = students.filter((student) => {
    const createdAt = new Date(student.createdAt).getTime();
    return !Number.isNaN(createdAt) && createdAt >= sevenDaysAgo;
  }).length;
  document.querySelector('#visible-count').textContent = filtered.length;
  document.querySelector('#table-caption').textContent = `Showing ${filtered.length} of ${students.length} student${students.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    const message = students.length === 0
      ? 'No students yet. Add your first student using the form.'
      : 'No students match your search.';
    list.innerHTML = `<tr><td class="table-message" colspan="5">${escapeHtml(message)}</td></tr>`;
    return;
  }

  list.innerHTML = filtered.map((student) => {
    const name = student.name || 'Unnamed student';
    const email = student.email || 'No email on file';
    const course = student.course || '—';
    const age = student.age == null ? '—' : `${student.age} yrs`;
    return `
      <tr>
        <td>
          <div class="student-cell">
            <span class="avatar" aria-hidden="true">${escapeHtml(initials(String(name)))}</span>
            <span>
              <span class="student-name">${escapeHtml(name)}</span>
              <span class="student-email">${escapeHtml(email)}</span>
              <button class="id-link" type="button" data-action="details" data-id="${escapeHtml(student._id)}" title="View student details">${escapeHtml(student._id)}</button>
            </span>
          </div>
        </td>
        <td><span class="course-badge" title="${escapeHtml(course)}">${escapeHtml(course)}</span></td>
        <td>${escapeHtml(age)}</td>
        <td>${escapeHtml(formatDate(student.createdAt))}</td>
        <td>
          <div class="row-actions">
            <button class="action-button" type="button" data-action="details" data-id="${escapeHtml(student._id)}" aria-label="View ${escapeHtml(name)} details" title="View details">↗</button>
            <button class="action-button" type="button" data-action="edit" data-id="${escapeHtml(student._id)}" aria-label="Edit ${escapeHtml(name)}" title="Edit student">✎</button>
            <button class="action-button delete" type="button" data-action="delete" data-id="${escapeHtml(student._id)}" aria-label="Delete ${escapeHtml(name)}" title="Delete student">×</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadStudents() {
  try {
    students = await apiRequest('/api/students');
    renderStudents();
  } catch (error) {
    list.innerHTML = `<tr><td class="table-message" colspan="5">${escapeHtml(error.message)}</td></tr>`;
    showNotice(error.message, true);
  }
}

function resetForm() {
  form.reset();
  studentIdInput.value = '';
  document.querySelector('#form-title').textContent = 'Add a student';
  submitButton.innerHTML = 'Add student <span aria-hidden="true">↗</span>';
  cancelEditButton.hidden = true;
}

function beginEdit(student) {
  studentIdInput.value = student._id;
  form.elements.name.value = student.name;
  form.elements.email.value = student.email;
  form.elements.course.value = student.course;
  form.elements.age.value = student.age;
  document.querySelector('#form-title').textContent = 'Edit student';
  submitButton.innerHTML = 'Save changes <span aria-hidden="true">↗</span>';
  cancelEditButton.hidden = false;
  form.elements.name.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDetails(student) {
  document.querySelector('#details-name').textContent = student.name || 'Unnamed student';
  document.querySelector('#details-email').textContent = student.email || 'No email on file';
  document.querySelector('#details-course').textContent = student.course || '—';
  document.querySelector('#details-age').textContent = student.age == null ? '—' : `${student.age} years`;
  document.querySelector('#details-id').textContent = student._id;
  document.querySelector('#details-date').textContent = formatDate(student.createdAt);
  detailsDialog.showModal();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const id = studentIdInput.value;
  const student = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    course: form.elements.course.value.trim(),
    age: Number(form.elements.age.value)
  };
  submitButton.disabled = true;

  try {
    await apiRequest(id ? `/api/students/${encodeURIComponent(id)}` : '/api/students', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(student)
    });
    showNotice(id ? 'Student details updated successfully.' : 'Student added successfully.');
    resetForm();
    await loadStudents();
  } catch (error) {
    showNotice(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

cancelEditButton.addEventListener('click', resetForm);
searchInput.addEventListener('input', renderStudents);
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement !== searchInput && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    searchInput.focus();
  }
});

list.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const student = students.find((item) => item._id === button.dataset.id);
  if (!student) return;

  if (button.dataset.action === 'edit') {
    beginEdit(student);
  } else if (button.dataset.action === 'details') {
    showDetails(student);
  } else if (button.dataset.action === 'delete') {
    const name = student.name || 'this student';
    if (!window.confirm(`Delete ${name}? This action cannot be undone.`)) return;
    try {
      await apiRequest(`/api/students/${encodeURIComponent(student._id)}`, { method: 'DELETE' });
      if (studentIdInput.value === student._id) resetForm();
      showNotice(`${name} was deleted.`);
      await loadStudents();
    } catch (error) {
      showNotice(error.message, true);
    }
  }
});

loadStudents();
