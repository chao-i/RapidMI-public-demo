// === ECG MI Detection — i18n (Chinese / English) ===
let currentLang = "en";

const I18N = {
  en: {
    title: "RapidMI Emergency ECG Screening Prototype",
    subtitle: "13 standard report parameters · fixed PTB-derived threshold · cross-setting external validation",
    lang_label: "中文",
    badge_hospital: "Hospital primary AUC 0.916",
    badge_mimic: "MIMIC external AUC 0.937",
    badge_ensemble: "Screening threshold 0.286",

    step1: "Step 1",
    upload_title: "Upload ECG Report Image",
    upload_desc: "Upload a photo or scan of a printed ECG report. OCR will automatically extract 13 standard parameters.",
    upload_drop: "Drag & drop image here, or <strong>click to browse</strong>",
    upload_hint: "Supports JPG, PNG formats",
    upload_or: "or",
    manual_btn: "✍️ Manual Entry — Type 13 parameters directly",

    step2: "Step 2",
    params_title: "Verify & Edit Parameters",
    params_desc: "Verify every OCR value against the printed report before screening.",
    legend_normal: "● Normal",
    legend_abnormal: "● Abnormal",
    legend_manual: "● Manual",
    warn_abnormal: "Out-of-range and missing axis values require particular attention.",

    group_basic: "Basic Information",
    group_rate: "Heart Rate & Intervals",
    group_axis: "Cardiac Axis (°)",
    group_voltage: "Voltage (mV)",

    label_age: "Age", unit_years: "years", range_age: "Normal: 18–120",
    label_sex: "Sex", sex_select: "—", sex_male: "Male", sex_female: "Female",
    label_hr: "Heart Rate", unit_bpm: "bpm", range_hr: "Normal: 60–100",
    label_pr: "PR Interval", unit_ms: "ms", range_pr: "Normal: 120–200",
    label_qrs: "QRS Duration", range_qrs: "Normal: 60–110",
    label_qt: "QT Interval", range_qt: "Normal: 350–440",
    label_qtc: "QTc", range_qtc: "Reference: 350–460",
    label_p_axis: "P Axis", range_p_axis: "Normal: 0–75",
    label_qrs_axis: "QRS Axis", range_qrs_axis: "Normal: −30–90",
    label_t_axis: "T Axis ⭐", range_t_axis: "Normal: 0–90",
    label_rv5: "RV5", range_rv5: "Normal: <2.5",
    label_sv1: "SV1", range_sv1: "Normal: <1.5",
  label_cornell: "RV5+SV1", unit_cornell: "Calculated automatically from RV5 + SV1", range_cornell: "Reference: <3.5",

    abnormal_title: "⚠ Abnormal Parameter Summary",
    abnormal_low: "Low", abnormal_high: "High", normal: "Normal",

    btn_predict: "Run emergency screening score",
    btn_predict_loading: "AI Model Analyzing...",
    param_count: "0 / 13 parameters filled",

    loading_title: "Analyzing ECG Parameters...",
    loading_detail: "MLP Neural Network Inference",
    loading_step1_text: "Parameter Validation",
    loading_step2_text: "Feature Scaling & Model Inference",
    loading_step3_text: "Generating Risk Report",

    step3: "Step 3",
    result_title: "Screening Output",
    result_probability: "Uncalibrated model score",
    result_threshold: "Fixed threshold = 0.286",
    risk_level_label: "Threshold status",
    result_abnormal_params: "Reference-range flags",
    result_mi_positive: "Myocardial Infarction Detected",
    result_mi_negative: "No Myocardial Infarction Detected",
    result_top_features: "SHAP Consensus — Top Predictors",
    disclaimer_full: "Research prototype only. This score is not an individual MI probability and cannot rule in or rule out ACS. Do not delay serial ECG, troponin testing, STEMI activation, or emergency treatment when clinically indicated.",

    btn_reset: "🔄 New Prediction",
    btn_print: "🖨 Print Result",

    info_model_title: "🧠 Model",
    info_model_desc: "Locked MLP (64×32)<br>PTB-only preprocessing and training<br>Fixed screening threshold 0.286",
    info_val_title: "🌍 Validation",
    info_val_desc: "Hospital primary AUC 0.916 (OCR-QC sensitivity 0.918)<br>MIMIC AUC 0.937<br>Retrospective enriched validation cohorts",
    info_feature_title: "⭐ Top Predictor",
    info_feature_desc: "T-wave axis was consistently influential<br>Axis OCR requires manual verification<br>No single feature is diagnostic",
    info_disclaimer_title: "⚠ Disclaimer",
    info_disclaimer_desc: "Research use only<br>Early triage aid, not a diagnosis<br>Cannot replace ECG interpretation or troponin",

    footer: "RapidMI research prototype · locked clinical-v2.0.0 model · OCR v2.0.0",

    upload_error_format: "Please upload an image file (JPG, PNG)",
    ocr_processing: "Running OCR...",
    ocr_failed: "OCR failed: {error}. Please enter parameters manually.",
    ocr_ok: "OCR complete: {n}/{total} parameters extracted, {abnormal} abnormal",
    network_error: "Network error: {error}",
    params_filled: "{n} / 13 parameters filled",
    manual_mode_title: "Enter ECG Parameters Manually",
    manual_mode_desc: "Fill in the 13 parameters from the ECG report.",
    predict_error: "Prediction error: ",
    extracted_count: "{n}/{total} parameters extracted",
    abnormal_count: "{n} reference-range flags",
  },

  zh: {
    title: "RapidMI 急诊心电图初筛研究原型",
    subtitle: "13项标准报告参数 · PTB内部锁定阈值 · 跨场景外部验证",
    lang_label: "English",
    badge_hospital: "医院主分析AUC 0.916",
    badge_mimic: "MIMIC外部AUC 0.937",
    badge_ensemble: "初筛阈值 0.286",

    step1: "第1步",
    upload_title: "上传心电图报告图片",
    upload_desc: "上传打印版心电图报告的拍照或截图，OCR将自动识别提取13项参数。",
    upload_drop: "拖拽图片到此处，或<strong>点击浏览选择文件</strong>",
    upload_hint: "支持 JPG、PNG 格式",
    upload_or: "或",
    manual_btn: "✍️ 手动输入13项心电图参数，直接预测",

    step2: "第2步",
    params_title: "核对与修正参数",
    params_desc: "运行初筛前，请逐项对照原始心电图报告核对OCR结果。",
    legend_normal: "● 正常",
    legend_abnormal: "● 异常",
    legend_manual: "● 手动",
    warn_abnormal: "超范围值、缺失值及电轴字段需要重点核对。",

    group_basic: "基本信息",
    group_rate: "心率与间期",
    group_axis: "心电轴 (°)",
    group_voltage: "电压 (mV)",

    label_age: "年龄", unit_years: "岁", range_age: "正常: 18–120",
    label_sex: "性别", sex_select: "—", sex_male: "男", sex_female: "女",
    label_hr: "心率", unit_bpm: "次/分", range_hr: "正常: 60–100",
    label_pr: "PR间期", unit_ms: "ms", range_pr: "正常: 120–200",
    label_qrs: "QRS时限", range_qrs: "正常: 60–110",
    label_qt: "QT间期", range_qt: "正常: 350–440",
    label_qtc: "QTc", range_qtc: "参考: 350–460",
    label_p_axis: "P波电轴", range_p_axis: "正常: 0–75",
    label_qrs_axis: "QRS电轴", range_qrs_axis: "正常: −30–90",
    label_t_axis: "T波电轴 ⭐", range_t_axis: "正常: 0–90",
    label_rv5: "RV5", range_rv5: "正常: <2.5",
    label_sv1: "SV1", range_sv1: "正常: <1.5",
  label_cornell: "RV5+SV1", unit_cornell: "由RV5 + SV1自动计算", range_cornell: "参考: <3.5",

    abnormal_title: "⚠ 异常参数摘要",
    abnormal_low: "偏低", abnormal_high: "偏高", normal: "正常",

    btn_predict: "运行急诊初筛评分",
    btn_predict_loading: "AI模型分析中...",
    param_count: "已填写 0 / 13 项参数",

    loading_title: "正在分析心电图参数...",
    loading_detail: "MLP神经网络模型推理中",
    loading_step1_text: "参数验证",
    loading_step2_text: "特征缩放与模型推理",
    loading_step3_text: "生成风险报告",

    step3: "第3步",
    result_title: "初筛输出",
    result_probability: "未校准模型评分",
    result_threshold: "固定阈值 = 0.286",
    risk_level_label: "阈值状态",
    result_abnormal_params: "参考范围提示",
    result_mi_positive: "检测到心肌梗死特征",
    result_mi_negative: "未检测到心肌梗死特征",
    result_top_features: "SHAP共识 — 核心预测因子",
    disclaimer_full: "仅供科研。该评分不是个体心梗概率，不能单独纳入或排除ACS；临床需要时不得延误动态心电图、肌钙蛋白、STEMI通道或其他急救处理。",

    btn_reset: "🔄 重新预测",
    btn_print: "🖨 打印结果",

    info_model_title: "🧠 模型",
    info_model_desc: "锁定MLP (64×32)<br>仅在PTB完成预处理与训练<br>固定初筛阈值0.286",
    info_val_title: "🌍 验证",
    info_val_desc: "医院主分析AUC 0.916（OCR质控敏感性分析0.918）<br>MIMIC AUC 0.937<br>回顾性富集验证队列",
    info_feature_title: "⭐ 核心预测因子",
    info_feature_desc: "T波电轴表现出稳定影响<br>电轴OCR必须人工核对<br>任何单项参数均不能确诊",
    info_disclaimer_title: "⚠ 免责声明",
    info_disclaimer_desc: "仅供科研<br>用于前置风险提示而非诊断<br>不能替代ECG判读或肌钙蛋白",

    footer: "RapidMI科研原型 · clinical-v2.0.0锁定模型 · OCR v2.0.0",

    upload_error_format: "请上传图片文件（JPG、PNG格式）",
    ocr_processing: "正在进行OCR识别...",
    ocr_failed: "OCR识别失败：{error}。请手动输入参数。",
    ocr_ok: "OCR识别完成：成功提取 {n}/{total} 项参数，{abnormal}项异常",
    network_error: "网络错误：{error}",
    params_filled: "已填写 {n} / 13 项参数",
    manual_mode_title: "手动输入心电图参数",
    manual_mode_desc: "请根据心电图报告逐项填写13项参数。",
    predict_error: "预测出错：",
    extracted_count: "成功提取 {n}/{total} 项参数",
    abnormal_count: "{n} 项参数超出临床正常范围",
  }
};

function t(key, params) {
  const lang = I18N[currentLang] || I18N["en"];
  let text = lang[key];
  if (text === undefined) {
    text = I18N["en"][key];
    if (text === undefined) return key;
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp("\\{" + k + "\\}", "g"), v);
    }
  }
  return text;
}

function setLang(lang) {
  // The public research prototype uses a fixed English interface.
  currentLang = "en";
  document.querySelectorAll("[data-i18n]").forEach(function(el) {
    var key = el.getAttribute("data-i18n");
    var translated = t(key);
    if (el.tagName === "OPTION") {
      el.textContent = translated;
    } else {
      el.innerHTML = translated;
    }
  });
  var pc = document.getElementById("param-count");
  if (pc) {
    var filled = 0;
    ["age","sex","hr","pr_interval","qrs_duration","qt_interval","qtc",
     "p_axis","qrs_axis","t_axis","rv5","sv1","rv5_sv1_amp"].forEach(function(f) {
      var el = document.getElementById("param-" + f);
      if (el && el.value !== "" && el.value !== null) filled++;
    });
    pc.innerHTML = t("params_filled", { n: filled });
  }
  if (window._lastResult) {
    renderResult(window._lastResult.data, window._lastResult.features);
  }
}

document.addEventListener("DOMContentLoaded", function() { setLang("en"); });
