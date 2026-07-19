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
let activeTestCaseKey = null;

// These are fixed, de-identified test cases for interface demonstration.
// Their scores were verified using the locked RapidMI pipeline before release.
const TEST_CASES = {
  normal: {
    label: 'Normal-ECG test report',
    imageUrl: '/static/demo/rapidmi_test_normal.svg',
    features: {
      age: 43, sex: 0, hr: 72, pr_interval: 150, qrs_duration: 88,
      qt_interval: 370, qtc: 405, p_axis: 48, qrs_axis: 35, t_axis: 42,
      rv5: 1.40, sv1: 0.70, rv5_sv1_amp: 2.10,
    },
  },
  miRelated: {
    label: 'MI-related screen-positive test report',
    imageUrl: '/static/demo/rapidmi_test_mi_related.svg',
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
  activeTestCaseKey = null;
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

function loadTestCase(caseKey) {
  const testCase = TEST_CASES[caseKey];
  if (!testCase) return;

  activeTestCaseKey = caseKey === 'miRelated' ? 'mi_related' : caseKey;
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
  paramsSection.scrollIntoView({ behavior: 'smooth' });
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

function handleFile(file) {
  if (!file) return;
  activeTestCaseKey = null;
  if (!file.type.startsWith('image/')) {
    showStatus(t('upload_error_format'), 'error');
    return;
  }
  showStatus(`<span class="spinner"></span> ${t('ocr_processing')} "${file.name}"...`, 'loading');
  const formData = new FormData();
  formData.append('image', file);
  fetch('/api/ocr', { method: 'POST', body: formData })
    .then(async r => {
      const body = await r.text();
      let data;
      try {
        data = JSON.parse(body);
      } catch (_error) {
        const status = r.status ? `HTTP ${r.status}` : 'an incomplete response';
        throw new Error(`OCR service returned ${status}. Please retry once after the service recovers, or enter the values manually.`);
      }
      if (!r.ok && !data.error) {
        throw new Error(`OCR service returned HTTP ${r.status}.`);
      }
      return data;
    })
    .then(data => {
      if (data.error) {
        showStatus(t('ocr_failed', { error: data.error }), 'error');
        previewRow.style.display = 'flex';
        imagePreview.src = URL.createObjectURL(file);
        paramsSection.style.display = 'block';
        updateParamCount();
        return;
      }
      const nAbnormal = data.n_abnormal || 0;
      showStatus(t('ocr_ok', { n: data.n_extracted, total: data.n_total, abnormal: nAbnormal }), 'success');
      previewRow.style.display = 'flex';
      // The server never sends the uploaded ECG image back. Keep the preview
      // in the browser only so report images are not duplicated in responses.
      imagePreview.src = URL.createObjectURL(file);
      showOcrDetails(data);
      fillParams(data.extracted, data.details);
      paramsSection.style.display = 'block';
      updateParamCount();
      updateAbnormalSummary();
    })
    .catch(err => {
      showStatus(t('network_error', { error: err.message }), 'error');
      paramsSection.style.display = 'block';
    });
}

// Quick i18n messages for dynamic strings
(function() {
  I18N['en'].upload_error_format = 'Please upload an image file (JPG, PNG)';
  I18N['zh'].upload_error_format = '请上传图片文件（JPG、PNG格式）';
  I18N['en'].ocr_processing = 'Running OCR...';
  I18N['zh'].ocr_processing = '正在进行OCR识别...';
  I18N['en'].ocr_failed = 'OCR failed: {error}. Please enter parameters manually.';
  I18N['zh'].ocr_failed = 'OCR识别失败：{error}。请手动输入参数。';
  I18N['en'].ocr_ok = 'OCR complete: {n}/{total} parameters extracted, {abnormal} abnormal';
  I18N['zh'].ocr_ok = 'OCR识别完成：成功提取 {n}/{total} 项参数，{abnormal}项异常';
  I18N['en'].network_error = 'Network error: {error}';
  I18N['zh'].network_error = '网络错误：{error}';
  I18N['en'].params_filled = '{n} / 13 parameters filled';
  I18N['zh'].params_filled = '已填写 {n} / 13 项参数';
  I18N['en'].manual_mode_title = 'Enter ECG Parameters Manually';
  I18N['zh'].manual_mode_title = '手动输入心电图参数';
  I18N['en'].manual_mode_desc = 'Fill in the 13 parameters from the ECG report.';
  I18N['zh'].manual_mode_desc = '请根据心电图报告逐项填写13项参数。';
  I18N['en'].predict_error = 'Prediction error: ';
  I18N['zh'].predict_error = '预测出错：';
})();

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
  autoComputeCornell();
}

function autoComputeCornell() {
  const rv5 = parseFloat(document.getElementById('param-rv5')?.value);
  const sv1 = parseFloat(document.getElementById('param-sv1')?.value);
  const cornell = document.getElementById('param-rv5_sv1_amp');
  if (!isNaN(rv5) && !isNaN(sv1) && cornell && !cornell.value) {
    cornell.value = (rv5 + sv1).toFixed(3);
    cornell.className = 'ocr-valid';
  }
}

// Real-time validation
document.querySelectorAll('.param-row input, .param-row select').forEach(el => {
  el.addEventListener('input', () => {
    const feature = el.dataset.feature;
    const value = el.value;
    if (!el.className.includes('ocr-valid') && el.tagName === 'INPUT') {
      el.className = value ? 'manual' : '';
    }
    if (feature && value !== '' && value !== null) {
      const check = checkAbnormal(feature, value);
      if (check) highlightParam(feature, check.status);
    }
    autoComputeCornell();
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
  btnPredict.disabled = filled < 8;
  paramCount.style.color = filled < 8 ? '#ef5350' : filled < 13 ? '#ffa726' : '#66bb6a';
}

// === Prediction ===
btnPredict.addEventListener('click', () => {
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

  fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features, demo_case_id: activeTestCaseKey }),
  })
    .then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Prediction service returned HTTP ${r.status}.`);
      return data;
    })
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
  const isPositive = Boolean(data.screen_positive);
  const lang = currentLang;

  const screeningInterpretation = isPositive
    ? 'The fixed screening threshold was reached. Prioritize clinician review, serial ECG, cardiac troponin testing, and other standard emergency assessment as clinically appropriate.'
    : 'The score was below the fixed screening threshold. Continue standard clinical assessment because this result does not exclude MI or acute coronary syndrome.';

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

  resultContent.innerHTML = `
    <div class="result-gauge">
      <div class="screening-status ${isPositive ? 'screening-positive' : 'screening-negative'}">
        <span class="screening-kicker">${lang === 'zh' ? 'RapidMI 初筛结果' : 'RapidMI screening result'}</span>
        <h3>${isPositive ? (lang === 'zh' ? '达到固定初筛阈值' : 'Fixed screening threshold reached') : (lang === 'zh' ? '未达到固定初筛阈值' : 'Below fixed screening threshold')}</h3>
        <p>${lang === 'zh' ? '用于后续评估优先级提示，不代表个体MI发生概率。' : 'Supports prioritization of further assessment; not an individual MI probability.'}</p>
      </div>
      <div class="gauge-circle" style="border-color: ${riskColor};">
        <span class="gauge-pct" style="color: ${riskColor};">${scoreValue.toFixed(3)}</span>
        <span class="gauge-label">${lang === 'zh' ? '未校准模型评分' : 'Uncalibrated model score'}</span>
      </div>
      <div class="result-detail">
        <div class="result-item">
          <div class="val">${isPositive ? (lang === 'zh' ? '达到' : 'Reached') : (lang === 'zh' ? '未达到' : 'Below')}</div>
          <div class="lbl">${lang === 'zh' ? '固定阈值 0.286' : 'Fixed threshold 0.286'}</div>
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
        <p class="interpretation-note">The displayed score is an uncalibrated model output for screening prioritization, not an individual probability of myocardial infarction.</p>
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
  activeTestCaseKey = null;
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
