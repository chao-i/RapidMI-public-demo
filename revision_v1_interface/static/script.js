// === ECG MI Detection — Frontend v2.2 ===
// Fixed English interface

const FEATURES = ['age', 'sex', 'hr', 'pr_interval', 'qrs_duration', 'qt_interval', 'qtc',
                  'p_axis', 'qrs_axis', 't_axis', 'rv5', 'sv1', 'rv5_sv1_amp'];

function getFeatureName(feature) {
  const map = {
    'age': 'label_age', 'sex': 'label_sex', 'hr': 'label_hr',
    'pr_interval': 'label_pr', 'qrs_duration': 'label_qrs',
    'qt_interval': 'label_qt', 'qtc': 'label_qtc',
    'p_axis': 'label_p_axis', 'qrs_axis': 'label_qrs_axis', 't_axis': 'label_t_axis',
    'rv5': 'label_rv5', 'sv1': 'label_sv1', 'rv5_sv1_amp': 'label_cornell',
  };
  return t(map[feature] || feature);
}

const NORMAL_RANGES = {
  'age': [18, 120], 'sex': [0, 1], 'hr': [60, 100],
  'pr_interval': [120, 200], 'qrs_duration': [60, 110],
  'qt_interval': [350, 440], 'qtc': [350, 460],
  'p_axis': [0, 75], 'qrs_axis': [-30, 90], 't_axis': [0, 90],
  'rv5': [0.01, 2.5], 'sv1': [0.01, 1.5], 'rv5_sv1_amp': [0.02, 3.5],
};

// === DOM refs ===
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const previewRow = document.getElementById('preview-row');
const imagePreview = document.getElementById('image-preview');
const ocrResultMini = document.getElementById('ocr-result-mini');
const paramsSection = document.getElementById('params-section');
const resultSection = document.getElementById('result-section');
const resultContent = document.getElementById('result-content');
const btnPredict = document.getElementById('btn-predict');
const btnReset = document.getElementById('btn-reset');
const paramCount = document.getElementById('param-count');
const abnormalSummary = document.getElementById('abnormal-summary');
const abnormalSummaryList = document.getElementById('abnormal-summary-list');
const btnManualEntry = document.getElementById('btn-manual-entry');
const loadingOverlay = document.getElementById('loading-overlay');
const testLoadStatus = document.getElementById('test-load-status');
const reviewNotice = document.getElementById('ocr-review-notice');
const reviewMessage = document.getElementById('ocr-review-message');
const reviewLabel = document.getElementById('ocr-review-label');
const reviewConfirmation = document.getElementById('confirm-parameter-review');
let ocrReviewRequired = false;
let ocrState = 'idle';
let ocrStatusMessage = '';
const ocrProgressStatus = document.getElementById('ocr-progress-status');
function setOcrState(state, message = '') {
  ocrState = state;
  ocrStatusMessage = message;
  const busy = state === 'running';
  ocrProgressStatus.hidden = state === 'idle';
  ocrProgressStatus.textContent = message;
  ocrProgressStatus.className = 'ocr-progress-status ' + state;
  ocrProgressStatus.setAttribute('aria-busy', String(busy));
  paramsSection.setAttribute('aria-busy', String(busy));
  uploadArea.setAttribute('aria-disabled', String(busy));
  [fileInput, btnManualEntry, btnReset, document.getElementById('btn-load-normal'),
   document.getElementById('btn-load-mi')].forEach(el => { if (el) el.disabled = busy; });
  document.querySelectorAll('.param-row input, .param-row select').forEach(el => { el.disabled = busy; });
}
reviewConfirmation.addEventListener('change', updateParamCount);

// These are fixed, de-identified test cases for interface demonstration.
// Their scores were verified using the locked RapidMI pipeline before release.
const TEST_CASES = {
  normal: {
    label: 'Normal-ECG test report',
    imageUrl: './static/demo/rapidmi_test_normal.svg',
    features: {
      age: 43, sex: 0, hr: 72, pr_interval: 150, qrs_duration: 88,
      qt_interval: 370, qtc: 405, p_axis: 48, qrs_axis: 35, t_axis: 42,
      rv5: 1.40, sv1: 0.70, rv5_sv1_amp: 2.10,
    },
  },
  miRelated: {
    label: 'MI-related screen-positive test report',
    imageUrl: './static/demo/rapidmi_test_mi_related.svg',
    features: {
      age: 55, sex: 1, hr: 80, pr_interval: 155, qrs_duration: 98,
      qt_interval: 395, qtc: 435, p_axis: 48, qrs_axis: 50, t_axis: 92,
      rv5: 1.50, sv1: 0.70, rv5_sv1_amp: 2.20,
    },
  },
};

// === Utility ===
function checkAbnormal(feature, value) {
  if (value === null || value === undefined || value === '') return null;
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  const rng = NORMAL_RANGES[feature];
  if (!rng) return null;
  const [lo, hi] = rng;
  const name = getFeatureName(feature);
  if (v < lo) return { status: 'abnormal_low', message: `${name} ${t('abnormal_low')} (${t('normal')}: ${lo}-${hi})` };
  if (v > hi) return { status: 'abnormal_high', message: `${name} ${t('abnormal_high')} (${t('normal')}: ${lo}-${hi})` };
  return { status: 'normal', message: '' };
}

// Add helper translation keys for abnormality messages
const I18N_EXTRA = {
  en: { abnormal_low: 'Low', abnormal_high: 'High', normal: 'Normal' },
  zh: { abnormal_low: '偏低', abnormal_high: '偏高', normal: '正常' },
};
// Merge into I18N
for (const lang of ['en', 'zh']) {
  Object.assign(I18N[lang], I18N_EXTRA[lang]);
}

function highlightParam(feature, status) {
  const el = document.getElementById(`param-${feature}`);
  const badge = document.getElementById(`badge-${feature}`);
  if (!el) return;
  el.classList.remove('ocr-valid', 'ocr-abnormal', 'abnormal-low', 'abnormal-high', 'manual', 'normal-val');
  if (status === 'normal') el.classList.add('normal-val');
  else if (status === 'abnormal_low') el.classList.add('ocr-abnormal', 'abnormal-low');
  else if (status === 'abnormal_high') el.classList.add('ocr-abnormal', 'abnormal-high');
  if (badge) {
    if (status === 'abnormal_low') {
      badge.innerHTML = '<span class="badge-low">↓ Low</span>';
      badge.style.display = 'inline';
    } else if (status === 'abnormal_high') {
      badge.innerHTML = '<span class="badge-high">↑ High</span>';
      badge.style.display = 'inline';
    } else {
      badge.innerHTML = '';
      badge.style.display = 'none';
    }
  }
}

function updateAbnormalSummary() {
  const abnormals = [];
  FEATURES.forEach(f => {
    const el = document.getElementById(`param-${f}`);
    if (!el || el.value === '' || el.value === null) return;
    const v = parseFloat(el.value);
    if (isNaN(v)) return;
    const check = checkAbnormal(f, v);
    if (check && check.status !== 'normal') {
      abnormals.push({ feature: f, name: getFeatureName(f), value: v, ...check });
    }
  });
  if (abnormals.length === 0) { abnormalSummary.style.display = 'none'; return; }
  abnormalSummary.style.display = 'block';
  abnormalSummaryList.innerHTML = abnormals.map(a => {
    const dir = a.status === 'abnormal_low' ? '↓' : '↑';
    const cls = a.status === 'abnormal_low' ? 'badge-low' : 'badge-high';
    return `<div class="abnormal-item">
      <span class="${cls}">${dir}</span>
      <strong>${a.name}</strong> = ${a.value}
      <span class="abnormal-msg">${a.message}</span>
    </div>`;
  }).join('');
}

// === Manual entry ===
btnManualEntry.addEventListener('click', () => enterManualMode());

function enterManualMode() {
  if (ocrState === 'running') return;
  setOcrState('idle');
  ocrReviewRequired = false; reviewConfirmation.checked = false;
  testLoadStatus.hidden = true;
  document.querySelectorAll('.param-row input, .param-row select').forEach(el => {
    el.value = ''; el.className = '';
  });
  document.querySelectorAll('.abnormal-badge').forEach(b => { b.innerHTML = ''; b.style.display = 'none'; });
  resultSection.style.display = 'none';
  previewRow.style.display = 'none';
  uploadStatus.innerHTML = '';
  uploadStatus.className = '';
  fileInput.value = '';
  imagePreview.src = '';
  ocrResultMini.innerHTML = '';
  abnormalSummary.style.display = 'none';
  paramsSection.style.display = 'block';
  updateParamCount();
  paramsSection.scrollIntoView({ behavior: 'smooth' });
}

async function loadTestCase(caseKey) {
  if (ocrState === 'running') return;
  setOcrState('idle');
  const testCase = TEST_CASES[caseKey];
  if (!testCase) return;
  const buttons = Array.from(document.querySelectorAll('#btn-load-normal, #btn-load-mi'));
  if (buttons.some(button => button.disabled)) return;
  const activeButton = document.getElementById(caseKey === 'normal' ? 'btn-load-normal' : 'btn-load-mi');
  buttons.forEach(button => { button.disabled = true; });
  activeButton.setAttribute('aria-busy', 'true');
  activeButton.innerHTML = '<span class="spinner"></span> Loading test report...';
  try {
    // Paint the immediate button feedback before populating and scrolling.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    ocrReviewRequired = false; reviewConfirmation.checked = false;
    fillParams(testCase.features, []);
    fileInput.value = '';
    imagePreview.src = testCase.imageUrl;
    previewRow.style.display = 'flex';
    ocrResultMini.innerHTML = `<p class="test-case-status"><strong>${testCase.label} loaded</strong><br>Review or edit the preloaded values, then run the screening score.</p>`;
    showStatus('Test report loaded. The 13 displayed values are ready for review or editing.', 'success');
    paramsSection.style.display = 'block';
    resultSection.style.display = 'none';
    updateParamCount();
    updateAbnormalSummary();
    testLoadStatus.textContent = '✓ ' + testCase.label + ' loaded successfully. All 13 parameters are ready for review.';
    testLoadStatus.hidden = false;
    // Wait for Streamlit to resize the iframe before scrolling to the new section.
    const resizeStarted = performance.now();
    await new Promise(resolve => {
      function waitForFrame() {
        if (window.innerHeight + 2 < document.body.scrollHeight && performance.now() - resizeStarted < 1000) {
          requestAnimationFrame(waitForFrame);
        } else resolve();
      }
      requestAnimationFrame(waitForFrame);
    });
    paramsSection.scrollIntoView({ behavior: 'smooth' });
  } finally {
    activeButton.textContent = 'Load test report';
    activeButton.removeAttribute('aria-busy');
    buttons.forEach(button => { button.disabled = false; });
  }
}

document.getElementById('btn-load-normal')?.addEventListener('click', () => loadTestCase('normal'));
document.getElementById('btn-load-mi')?.addEventListener('click', () => loadTestCase('miRelated'));

// === Upload ===
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
});

async function handleFile(file) {
  if (!file || ocrState === 'running') return;
  if (!file.type.startsWith('image/')) {
    showStatus(t('upload_error_format'), 'error');
    return;
  }
  testLoadStatus.hidden = true;
  ocrReviewRequired = true; reviewConfirmation.checked = false;
  fillParams({}, []); window._lastResult = null; resultSection.style.display = 'none';
  updateAbnormalSummary();
  paramsSection.style.display = 'block';
  previewRow.style.display = 'flex';
  // Keep the report preview in this browser; no image is returned by the server.
  imagePreview.src = URL.createObjectURL(file);
  ocrResultMini.textContent = 'Reading the printed report parameters...';
  setOcrState('running', 'OCR is running. The fields are temporarily empty while the report is processed. Please wait for the completion message; this is not a zero-field result.');
  updateParamCount();
  showStatus(`<span class="spinner"></span> ${t('ocr_processing')} "${escapeHtml(file.name)}"...`, 'loading');
  const formData = new FormData();
  formData.append('image', file);
  try {
    const response = await window.rapidmiRequest('/api/ocr', { method: 'POST', body: formData });
    let data;
    try { data = JSON.parse(await response.text()); }
    catch (_) { throw new Error('The OCR service returned an incomplete response. Please retry or enter the printed values manually.'); }
    if (data.error) throw new Error(data.error);
    if (!response.ok) throw new Error(`OCR service returned HTTP ${response.status}.`);
    if (!data.extracted || typeof data.extracted !== 'object' || !Array.isArray(data.details)) {
      throw new Error('The OCR service returned an invalid result. Please retry.');
    }
    fillParams(data.extracted, data.details);
    const n = FEATURES.filter(f => document.getElementById(`param-${f}`).value !== '').length;
    if (n === 0) {
      setOcrState('empty', 'No printed parameters were extracted from this image. Check that the full parameter names, values and units are visible. Cropped or resized previews may lose the beginnings of labels such as PR, QRS or RV5. Upload the original complete report with intact labels, or enter the printed values manually. A zero-field result does not mean that the report has no measurements.');
      showStatus(ocrStatusMessage, 'warning');
    } else {
      setOcrState('complete', `OCR completed: ${n}/13 inputs filled. Check every value against the printed report before calculating the score.`);
      showStatus(t('ocr_ok', { n, total: 13, abnormal: data.n_abnormal || 0 }), n < 13 ? 'warning' : 'success');
    }
    showOcrDetails(data);
    updateAbnormalSummary();
  } catch (error) {
    setOcrState('error', `OCR could not complete: ${error.message}. No extraction result has been received. Retry the upload or enter the printed values manually.`);
    showStatus(escapeHtml(ocrStatusMessage), 'error');
    ocrResultMini.textContent = 'No OCR result was received. The empty form is not an extraction accuracy result.';
  } finally {
    // Permit retrying the same file; choosing it again must fire a change event.
    fileInput.value = '';
    updateParamCount();
  }
}

// Quick i18n messages for dynamic strings
(function() {
  I18N['en'].upload_error_format = 'Please upload an image file (JPG, PNG)';
  I18N['zh'].upload_error_format = '请上传图片文件（JPG、PNG格式）';
  I18N['en'].ocr_processing = 'Running OCR...';
  I18N['zh'].ocr_processing = '正在进行OCR识别...';
  I18N['en'].ocr_failed = 'OCR failed: {error}. Please enter parameters manually.';
  I18N['zh'].ocr_failed = 'OCR识别失败：{error}。请手动输入参数。';
  I18N['en'].ocr_ok = 'OCR filled {n}/{total} fields. Check every value against the report; fill count does not establish correctness.';
  I18N['zh'].ocr_ok = 'OCR已填写 {n}/{total} 项；请逐项核对原报告，填写数量不代表数值已经验证正确。';
  I18N['en'].network_error = 'Network error: {error}';
  I18N['zh'].network_error = '网络错误：{error}';
  I18N['en'].params_filled = '{n} / 13 parameters filled';
  I18N['zh'].params_filled = '已填写 {n} / 13 项参数';
  I18N['en'].manual_mode_title = 'Enter ECG Parameters Manually';
  I18N['zh'].manual_mode_title = '手动输入心电图参数';
  I18N['en'].manual_mode_desc = 'Enter the available report values; QTc and RV5+SV1 are calculated automatically.';
  I18N['zh'].manual_mode_desc = '请填写报告中的可用数值；QTc及RV5+SV1由相应输入自动计算。';
  I18N['en'].predict_error = 'Prediction error: ';
  I18N['zh'].predict_error = '预测出错：';
})();

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showStatus(msg, type) { uploadStatus.innerHTML = msg; uploadStatus.className = type; }

function formatValue(feature, value) {
  if (feature === 'sex') {
    return currentLang === 'zh' ? (value === 1 ? '男' : '女') : (value === 1 ? 'Male' : 'Female');
  }
  return value;
}

function showOcrDetails(data) {
  let html = `<p style="margin:0 0 10px;color:#66bb6a;">✅ ${t('extracted_count', { n: data.n_extracted, total: 13 })}</p>`;
  if (data.n_abnormal > 0) {
    html += `<p style="margin:0 0 8px;font-size:0.78rem;color:#ffa726;">⚠ ${t('abnormal_count', { n: data.n_abnormal })}</p>`;
  }
  const missing = data.missing || [];
  if (missing.length) html += `<p style="margin:8px 0;color:#92600b;">Missing: ${missing.map(f => escapeHtml(getFeatureName(f))).join(', ')}. Please enter visible report values manually.</p>`;
  const conflicts = data.field_qc?.conflicting_fields || [];
  if (conflicts.length) html += `<p style="margin:8px 0;color:#92600b;">Conflicting OCR readings left blank: ${conflicts.map(f => escapeHtml(getFeatureName(f))).join(', ')}.</p>`;
  data.details.forEach(d => {
    const name = getFeatureName(d.feature);
    const displayVal = formatValue(d.feature, d.value);
    let icon = '✅', color = '#66bb6a';
    if (d.status === 'abnormal_low') { icon = '🔽'; color = '#ffa726'; }
    else if (d.status === 'abnormal_high') { icon = '🔼'; color = '#ef5350'; }
    else if (d.status !== 'normal' && d.status !== 'no_range') { icon = '⚠️'; color = '#ffa726'; }
    html += `<div style="font-size:0.78rem;margin:2px 0;color:${color};">${icon} <b>${name}</b> = ${displayVal}${currentLang === 'zh' ? (d.unit || '') : (d.unit_en || d.unit || '')}</div>`;
    if (d.abnormal_msg) html += `<div style="font-size:0.7rem;margin:0 0 4px 20px;color:#ef5350;">⚠ ${currentLang === 'zh' ? d.abnormal_msg : (d.abnormal_msg_en || d.abnormal_msg)}</div>`;
  });
  ocrResultMini.innerHTML = html;
}

function fillParams(extracted, details) {
  document.querySelectorAll('.param-row input, .param-row select').forEach(el => { el.value = ''; el.className = ''; });
  document.querySelectorAll('.abnormal-badge').forEach(b => { b.innerHTML = ''; b.style.display = 'none'; });
  for (const [feature, value] of Object.entries(extracted)) {
    const el = document.getElementById(`param-${feature}`);
    if (el) { el.value = value; el.classList.add('ocr-valid'); }
    const check = checkAbnormal(feature, value);
    if (check && check.status !== 'normal') highlightParam(feature, check.status);
  }
  autoComputeDerivedFeatures();
}

function autoComputeDerivedFeatures() {
  const qt = parseFloat(document.getElementById('param-qt_interval')?.value);
  const hr = parseFloat(document.getElementById('param-hr')?.value);
  const qtc = document.getElementById('param-qtc');
  if (qtc) {
    qtc.value = Number.isFinite(qt) && qt > 0 && Number.isFinite(hr) && hr > 0
      ? (qt * Math.sqrt(hr / 60)).toFixed(3) : '';
    qtc.className = qtc.value ? 'derived' : '';
  }
  const rv5 = parseFloat(document.getElementById('param-rv5')?.value);
  const sv1 = parseFloat(document.getElementById('param-sv1')?.value);
  const cornell = document.getElementById('param-rv5_sv1_amp');
  if (!cornell) return;
  if (!isNaN(rv5) && !isNaN(sv1)) {
    cornell.value = (rv5 + sv1).toFixed(3);
    cornell.className = 'derived';
  } else {
    cornell.value = '';
    cornell.className = '';
  }
}

// Real-time validation
document.querySelectorAll('.param-row input, .param-row select').forEach(el => {
  el.addEventListener('input', () => {
    const feature = el.dataset.feature;
    const value = el.value;
    reviewConfirmation.checked = false;
    el.classList.remove('ocr-valid');
    if (!el.className.includes('ocr-valid') && el.tagName === 'INPUT') {
      el.className = value ? 'manual' : '';
    }
    if (feature && value !== '' && value !== null) {
      const check = checkAbnormal(feature, value);
      if (check) highlightParam(feature, check.status);
    }
    autoComputeDerivedFeatures();
    updateParamCount();
    updateAbnormalSummary();
  });
});

function updateParamCount() {
  let filled = 0;
  FEATURES.forEach(f => {
    const el = document.getElementById(`param-${f}`);
    if (el && el.value !== '' && el.value !== null) filled++;
  });
  paramCount.innerHTML = t('params_filled', { n: filled });
  const missing = FEATURES.filter(f => document.getElementById(`param-${f}`).value === '');
  if (ocrState === 'running') {
    reviewNotice.hidden = true;
    btnPredict.disabled = true;
    paramCount.textContent = 'Waiting for OCR to complete...';
    paramCount.style.color = '#92600b';
    return;
  }
  const needsConfirmation = ocrReviewRequired || missing.length > 0;
  reviewConfirmation.closest('label').style.display = filled < 8 ? 'none' : '';
  reviewNotice.hidden = !needsConfirmation;
  const zh = currentLang === 'zh';
  reviewMessage.textContent = filled < 8
    ? (zh ? `当前仅填写 ${filled}/13 项，至少需要8项才可计算。请等待OCR完成、重新上传完整清晰报告，或补录报告中可见的参数；不能直接将空表单全部插补。`
          : `${filled}/13 inputs are filled. At least 8 are required before a score can be calculated. Retry OCR with a clear complete report, or enter the printed values manually; an empty form cannot be filled entirely by imputation.`)
    : missing.length
    ? (zh ? `尚缺 ${missing.length} 项：${missing.map(getFeatureName).join('、')}。请优先补录报告可见值；保持缺失时，模型会使用PTB-XL训练中位数插补，并在结果中标明。`
          : `Missing ${missing.length} inputs: ${missing.map(getFeatureName).join(', ')}. Enter visible report values first. Any remaining missing inputs will use PTB-XL training medians and be marked in the result.`)
    : (zh ? '请对照原报告核对全部OCR提取值，确认字段对应、数值与单位。' : 'Check all OCR values against the source report, including field assignment, numbers, and units.');
  reviewLabel.textContent = zh ? '我已核对可用参数，并了解剩余缺失项的插补方式。' : 'I have checked the available values and understand how any remaining missing inputs will be imputed.';
  btnPredict.disabled = filled < 8 || (needsConfirmation && !reviewConfirmation.checked);
  paramCount.style.color = filled < 8 ? '#ef5350' : filled < 13 ? '#ffa726' : '#66bb6a';
}

// === Prediction ===
btnPredict.addEventListener('click', () => {
  updateParamCount(); if (btnPredict.disabled) return;
  const features = {};
  FEATURES.forEach(f => {
    const el = document.getElementById(`param-${f}`);
    if (el && el.value !== '' && el.value !== null) features[f] = parseFloat(el.value);
  });

  // Disable button
  btnPredict.disabled = true;

  // Show loading overlay
  const overlay = document.getElementById('loading-overlay');
  const progressFill = document.getElementById('loading-progress-fill');
  const step1 = document.getElementById('load-step1');
  const step2 = document.getElementById('load-step2');
  const step3 = document.getElementById('load-step3');

  // Reset all steps to initial state
  [step1, step2, step3].forEach(s => {
    s.className = 'loading-step';
    const icon = s.querySelector('.step-icon');
    if (icon) icon.textContent = '○';
  });
  progressFill.style.width = '0%';
  progressFill.classList.remove('running');

  window.rapidmiPositionOverlay();
  overlay.style.display = 'flex';
  // Force reflow so transitions work
  overlay.offsetHeight;

  // Start progress bar animation
  progressFill.style.width = '15%';
  progressFill.classList.add('running');

  // Step 1: Parameter Validation (after short delay)
  setTimeout(() => {
    progressFill.style.width = '35%';
    setStepState(step1, 'done', '✓');
    setStepState(step2, 'active', '◉');
  }, 350);

  const fetchStart = Date.now();

  window.rapidmiRequest('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features }),
  })
    .then(r => r.json())
    .then(data => {
      const elapsed = Date.now() - fetchStart;

      // Step 2 complete, Step 3 active
      progressFill.style.width = '75%';
      setStepState(step2, 'done', '✓');
      setStepState(step3, 'active', '◉');

      // Step 3 complete + hide overlay (ensure minimum display time for UX)
      const minRemaining = Math.max(0, 600 - elapsed);
      setTimeout(() => {
        progressFill.style.width = '100%';
        progressFill.classList.remove('running');
        setStepState(step3, 'done', '✓');

        setTimeout(() => {
          overlay.style.display = 'none';
          btnPredict.disabled = false;
          window._lastResult = { data, features };
          renderResult(data, features);
        }, 350);
      }, Math.min(minRemaining, 400));
    })
    .catch(err => {
      overlay.style.display = 'none';
      btnPredict.disabled = false;
      alert(t('predict_error') + err.message);
    });
});

function setStepState(stepEl, state, iconText) {
  if (!stepEl) return;
  stepEl.className = 'loading-step ' + state;
  const icon = stepEl.querySelector('.step-icon');
  if (icon) icon.textContent = iconText;
}

// === Result rendering (called on predict + language switch) ===
function renderResult(data, features) {
  resultSection.style.display = 'block';
  setTimeout(() => resultSection.scrollIntoView({ behavior: 'smooth' }), 100);

  const riskColor = data.risk_color;
  if (data.error) { resultSection.style.display = 'none'; alert(data.error); return; }
  const isPositive = Boolean(data.screen_positive);
  const lang = currentLang;

  const screeningInterpretation = isPositive
    ? 'The fixed screening threshold was reached. This indicates a model-positive MI-related ECG pattern. Acute versus prior MI was not independently adjudicated in this study.'
    : 'The score was below the fixed screening threshold. This does not exclude MI or acute coronary syndrome. Acute emergency use requires further validation.';

  // Abnormal features
  let abnormalHtml = '';
  if (data.abnormal_features && data.abnormal_features.length > 0) {
    abnormalHtml = `
      <div class="abnormal-report">
        <h4>⚠ ${lang === 'zh' ? '参考范围提示' : 'Reference-range flags'} (${data.n_abnormal})</h4>
        <div class="abnormal-report-list">
          ${data.abnormal_features.map(a => {
            const dir = a.status === 'abnormal_low' ? '↓' : '↑';
            const dirClass = a.status === 'abnormal_low' ? 'badge-low' : 'badge-high';
            const name = lang === 'zh' ? a.cn_name : a.en_name;
            const displayVal = formatValue(a.feature, a.value);
            return `<div class="abnormal-report-item">
              <span class="${dirClass}">${dir}</span>
              <strong>${name}</strong> = <span class="abnormal-val">${displayVal}</span>
              <span class="normal-range-ref">(${lang === 'zh' ? '参考范围' : 'reference'}: ${a.normal_range[0]}-${a.normal_range[1]})</span>
              <div class="abnormal-desc">${lang === 'zh' ? '超出展示参考范围；请核对原始报告并结合临床判断。' : 'Outside the display reference range; verify the source report and assess clinically.'}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  let missingHtml = '';
  if (data.n_missing > 0) {
    const missingNames = (data.missing_feature_names || data.missing_features || []).join(', ');
    missingHtml = `
      <div class="abnormal-report" style="border-color:#f59e0b;">
        <h4>⚠ Missing parameters were imputed (${data.n_missing})</h4>
        <div class="abnormal-report-list">
          <div class="abnormal-report-item">
            <strong>${missingNames}</strong>
            <div class="abnormal-desc">PTB-XL training-set medians were used for these inputs. Verify the source report before interpreting the screening output.</div>
          </div>
        </div>
      </div>`;
  }

  const scoreValue = Number(data.score ?? data.probability ?? 0);
  const roundedScore = scoreValue.toFixed(3);
  let scoreDisplay = roundedScore;
  if (scoreDisplay === '1.000') scoreDisplay = '&gt;0.999';
  else if (scoreDisplay === '0.000') scoreDisplay = '&lt;0.001';

  resultContent.innerHTML = `
    <div class="result-gauge">
      <div class="screening-status ${isPositive ? 'screening-positive' : 'screening-negative'}">
        <span class="screening-kicker">${lang === 'zh' ? 'RapidMI 初筛结果' : 'RapidMI screening result'}</span>
        <h3>${isPositive ? (lang === 'zh' ? '达到固定初筛阈值' : 'Fixed screening threshold reached') : (lang === 'zh' ? '未达到固定初筛阈值' : 'Below fixed screening threshold')}</h3>
        <p>${lang === 'zh' ? '用于后续评估优先级提示，不代表个体MI发生概率。' : 'A research classification output; not an individual MI probability.'}</p>
      </div>
      <div class="gauge-circle" style="border-color: ${riskColor};">
        <span class="gauge-pct${scoreDisplay !== roundedScore ? ' gauge-bound' : ''}" style="color: ${riskColor};">${scoreDisplay}</span>
        <span class="gauge-label">${lang === 'zh' ? '未校准模型评分' : 'Uncalibrated model score'}</span>
      </div>
      <div class="result-detail">
        <div class="result-item">
          <div class="val">${isPositive ? (lang === 'zh' ? '达到' : 'Reached') : (lang === 'zh' ? '未达到' : 'Below')}</div>
          <div class="lbl">${lang === 'zh' ? '固定阈值 ' : 'Fixed threshold '}${Number(data.threshold).toFixed(3)}</div>
        </div>
        <div class="result-item">
          <div class="val">${data.n_abnormal}</div>
          <div class="lbl">${lang === 'zh' ? '参考范围提示' : 'Reference-range flags'}</div>
        </div>
        <div class="result-item">
          <div class="val">13</div>
          <div class="lbl">${lang === 'zh' ? '已输入变量' : 'Input variables'}</div>
        </div>
      </div>

      <div class="screening-interpretation ${isPositive ? 'interpretation-positive' : 'interpretation-negative'}">
        <h4>Screening interpretation</h4>
        <p>${screeningInterpretation}</p>
        <p class="interpretation-note">The displayed score is an uncalibrated model output for MI-related ECG classification, not an individual probability of myocardial infarction.</p>
      </div>
      ${abnormalHtml}
      ${missingHtml}

      <p style="margin-top:20px;color:#78909c;font-size:0.8rem;">
        ${t('disclaimer_full')}
      </p>
    </div>
  `;
}

// Feature name lookup for English (separate from i18n for result rendering)
const I18N_EN_FEATURES = {
  'age': 'Age', 'sex': 'Sex', 'hr': 'Heart Rate',
  'pr_interval': 'PR Interval', 'qrs_duration': 'QRS Duration',
  'qt_interval': 'QT Interval', 'qtc': 'QTc',
  'p_axis': 'P Axis', 'qrs_axis': 'QRS Axis', 't_axis': 'T Axis',
  'rv5': 'RV5', 'sv1': 'SV1', 'rv5_sv1_amp': 'RV5+SV1',
};

// Quick i18n extras
(function() {
  I18N['en'].risk_level_label = 'Threshold status';
  I18N['zh'].risk_level_label = '阈值状态';
  I18N['en'].extracted_count = '{n}/{total} parameters extracted';
  I18N['zh'].extracted_count = '成功提取 {n}/{total} 项参数';
  I18N['en'].abnormal_count = '{n} parameters abnormal';
  I18N['zh'].abnormal_count = '{n} 项参数超出临床正常范围';
  I18N['en'].disclaimer_full = 'Research prototype only. The displayed score is not an individual MI probability and cannot rule in or rule out ACS.';
  I18N['zh'].disclaimer_full = '仅供科研。显示值不是个体心梗概率，不能单独纳入或排除急性冠脉综合征。';
})();

// === Reset ===
btnReset.addEventListener('click', () => {
  if (ocrState === 'running') return;
  setOcrState('idle');
  ocrReviewRequired = false; reviewConfirmation.checked = false; reviewNotice.hidden = true;
  testLoadStatus.hidden = true;
  document.querySelectorAll('.param-row input, .param-row select').forEach(el => { el.value = ''; el.className = ''; });
  document.querySelectorAll('.abnormal-badge').forEach(b => { b.innerHTML = ''; b.style.display = 'none'; });
  paramsSection.style.display = 'none';
  resultSection.style.display = 'none';
  previewRow.style.display = 'none';
  uploadStatus.innerHTML = '';
  uploadStatus.className = '';
  fileInput.value = '';
  btnPredict.disabled = true;
  paramCount.innerHTML = t('params_filled', { n: 0 });
  paramCount.style.color = '';
  imagePreview.src = '';
  ocrResultMini.innerHTML = '';
  abnormalSummary.style.display = 'none';
  window._lastResult = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

btnPredict.disabled = true;

uploadArea.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); }
});
window.addEventListener('rapidmi:restore', event => {
  const snapshot = event.detail;
  if (snapshot && snapshot.features) {
    const interrupted = snapshot.ocrState === 'running';
    setOcrState(interrupted ? 'error' : (snapshot.ocrState || 'idle'), interrupted
      ? 'The previous OCR request was interrupted by a page refresh. Upload the report again; no completed OCR result has been received.'
      : (snapshot.ocrStatusMessage || ''));
    if (interrupted) showStatus(escapeHtml(ocrStatusMessage), 'error');
    ocrReviewRequired = Boolean(snapshot.ocrReviewRequired); reviewConfirmation.checked = false;
    fillParams(snapshot.features, []);
    paramsSection.style.display = snapshot.paramsVisible ? 'block' : 'none';
    updateParamCount();
    updateAbnormalSummary();
    if (snapshot.result) { window._lastResult = snapshot.result; renderResult(snapshot.result.data, snapshot.result.features); }
  }
});
window.rapidmiSnapshot = () => ({
  features: Object.fromEntries(FEATURES.map(f=>[f,document.getElementById('param-'+f)?.value]).filter(x=>x[1]!=='')),
  paramsVisible: paramsSection.style.display !== 'none',
  ocrReviewRequired,
  ocrState,
  ocrStatusMessage,
  result: window._lastResult || null
});
