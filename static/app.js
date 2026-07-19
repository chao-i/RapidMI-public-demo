const FIELDS = [
  ['age', 'Age', 'years', 'number', '18-120'],
  ['sex', 'Sex', '', 'select', ''],
  ['hr', 'Heart rate', 'bpm', 'number', '60-100'],
  ['pr_interval', 'PR interval', 'ms', 'number', '120-200'],
  ['qrs_duration', 'QRS duration', 'ms', 'number', '60-110'],
  ['qt_interval', 'QT interval', 'ms', 'number', '350-440'],
  ['qtc', 'QTc', 'ms', 'number', '350-460'],
  ['p_axis', 'P axis', 'degrees', 'number', '0-75'],
  ['qrs_axis', 'QRS axis', 'degrees', 'number', '-30-90'],
  ['t_axis', 'T axis', 'degrees', 'number', '0-90'],
  ['rv5', 'RV5', 'mV', 'number', '<2.5'],
  ['sv1', 'SV1', 'mV', 'number', '<1.5'],
  ['rv5_sv1_amp', 'RV5 + SV1', 'mV', 'number', '<3.5'],
];

const caseGrid = document.getElementById('case-grid');
const parameterPanel = document.getElementById('parameter-panel');
const parameterForm = document.getElementById('parameter-form');
const resultPanel = document.getElementById('result-panel');
const result = document.getElementById('result');
const preview = document.getElementById('preview');
const previewImage = document.getElementById('preview-image');
const previewCopy = document.getElementById('preview-copy');
let activeDemoCaseId = null;

function setStatus(elementId, message, kind = '') {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `status ${kind}`;
}

function renderFields() {
  parameterForm.innerHTML = FIELDS.map(([name, label, unit, type, hint]) => {
    if (type === 'select') {
      return `<label class="field"><span>${label}</span><select data-field="${name}"><option value="">Select</option><option value="1">Male</option><option value="0">Female</option></select><small>${hint}</small></label>`;
    }
    return `<label class="field"><span>${label} <em>${unit}</em></span><input data-field="${name}" type="number" step="any"><small>Reference display: ${hint}</small></label>`;
  }).join('');
}

function showParameters(values = {}) {
  parameterPanel.hidden = false;
  resultPanel.hidden = true;
  FIELDS.forEach(([name]) => {
    const input = document.querySelector(`[data-field="${name}"]`);
    input.value = values[name] ?? '';
  });
  parameterPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function readParameters() {
  const values = {};
  FIELDS.forEach(([name]) => {
    values[name] = document.querySelector(`[data-field="${name}"]`).value;
  });
  return values;
}

async function loadCases() {
  const response = await fetch('/api/demo-cases');
  const payload = await response.json();
  caseGrid.innerHTML = payload.cases.map((item) => `
    <button type="button" class="case-card" data-case="${item.id}">
      <img src="${item.image_url}" alt="${item.title}">
      <strong>${item.title}</strong>
      <small>Load preconfigured synthetic values</small>
    </button>`).join('');
  caseGrid.querySelectorAll('[data-case]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = payload.cases.find((entry) => entry.id === button.dataset.case);
      activeDemoCaseId = item.id;
      preview.hidden = false;
      previewImage.src = item.image_url;
      previewCopy.innerHTML = `<strong>13 preloaded demonstration values</strong><p>${item.note}</p>`;
      showParameters(item.values);
      setStatus('status', 'Synthetic demonstration values loaded. You may review or edit them before running the workflow.', 'success');
    });
  });
}

document.getElementById('manual-entry').addEventListener('click', () => {
  activeDemoCaseId = null;
  preview.hidden = true;
  showParameters();
  setStatus('status', 'Manual entry mode is active. No image has been uploaded.', 'success');
});

document.getElementById('clear-button').addEventListener('click', () => {
  activeDemoCaseId = null;
  showParameters();
  resultPanel.hidden = true;
});

document.getElementById('ocr-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = document.getElementById('ocr-file').files[0];
  if (!file) return setStatus('ocr-status', 'Choose an image first.', 'error');
  setStatus('ocr-status', 'Running local OCR extraction...', 'loading');
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch('/api/ocr', { method: 'POST', body: formData });
  const payload = await response.json();
  if (!response.ok) return setStatus('ocr-status', payload.error || 'OCR failed.', 'error');
  activeDemoCaseId = null;
  showParameters(payload.values);
  setStatus('ocr-status', `OCR returned ${payload.n_extracted}/${payload.n_total} fields. Verify every value against the source report.`, 'success');
});

document.getElementById('predict-button').addEventListener('click', async () => {
  resultPanel.hidden = true;
  const response = await fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features: readParameters(), demo_case_id: activeDemoCaseId }),
  });
  const payload = await response.json();
  resultPanel.hidden = false;
  if (!response.ok) {
    result.innerHTML = `<p class="result-error">${payload.error || 'The workflow could not run.'}</p>`;
    return;
  }
  const thresholdText = payload.screen_positive ? 'Fixed screening threshold reached' : 'Below fixed screening threshold';
  result.innerHTML = `
    <div class="score ${payload.screen_positive ? 'positive' : 'negative'}">${payload.score.toFixed(4)}</div>
    <h3>${thresholdText}</h3>
    <p>Fixed threshold: ${payload.threshold}</p>
    <p>${payload.source}</p>
    <p class="notice">${payload.notice}</p>`;
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

renderFields();
loadCases().catch(() => setStatus('status', 'Could not load demonstration cases.', 'error'));
