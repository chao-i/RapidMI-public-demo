/* Streamlit v1 transport for the preserved RapidMI page. */
(() => {
  const pending = new Map();
  let nonce = null, parentOrigin = "*", lastHeight = 0;
  const storageKey = "rapidmi-component-form-revision-v1";
  const post = (type, values={}) => window.parent.postMessage(
    {isStreamlitMessage:true, type, ...values}, parentOrigin);
  function fitHeight() {
    // Measure content rather than the viewport, so hidden results can shrink the iframe.
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    if (height !== lastHeight) { lastHeight=height; post("streamlit:setFrameHeight",{height}); }
  }
  // A tall Streamlit component has its own viewport. Clip it to the
  // visible ancestor windows so the modal stays where the user is looking.
  function positionOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    let current = window, offset = 0;
    let top = 0, bottom = window.innerHeight;
    try {
      while (current !== current.parent && current.frameElement) {
        offset += current.frameElement.getBoundingClientRect().top;
        current = current.parent;
        const viewport = current.visualViewport;
        const viewportTop = viewport?.offsetTop || 0;
        top = Math.max(top, viewportTop - offset);
        bottom = Math.min(bottom, viewportTop + (viewport?.height || current.innerHeight) - offset);
      }
    } catch (_) {
      // Keep the bounds from accessible ancestors if an outer host is cross-origin.
    }
    overlay.style.setProperty("--rapidmi-visible-top", top + "px");
    overlay.style.setProperty("--rapidmi-visible-height", Math.max(0, bottom - top) + "px");
  }
  window.rapidmiPositionOverlay = positionOverlay;
  let positioning = false;
  function scheduleOverlayPosition() {
    if (positioning) return;
    positioning = true;
    requestAnimationFrame(() => { positioning = false; positionOverlay(); });
  }
  function watchViewport() {
    let current = window;
    try {
      while (true) {
        current.addEventListener("scroll", scheduleOverlayPosition, {capture:true, passive:true});
        current.addEventListener("resize", scheduleOverlayPosition);
        current.visualViewport?.addEventListener("resize", scheduleOverlayPosition);
        current.visualViewport?.addEventListener("scroll", scheduleOverlayPosition);
        if (current === current.parent) break;
        current = current.parent;
      }
    } catch (_) {}
    positionOverlay();
  }
  function saveForm() {
    if (window.rapidmiSnapshot) {
      try { sessionStorage.setItem(storageKey, JSON.stringify(window.rapidmiSnapshot())); }
      catch (_) {}
    }
  }
  function responseObject(reply) {
    return {ok:reply.status>=200 && reply.status<300, status:reply.status,
            json:async()=>reply.data, text:async()=>JSON.stringify(reply.data)};
  }
  window.addEventListener("message", event => {
    if (event.source!==window.parent || event.data?.type!=="streamlit:render") return;
    parentOrigin=event.origin==="null" ? "*" : event.origin;
    nonce=event.data.args?.nonce || null;
    const reply=event.data.args?.response;
    if (reply && pending.has(reply.id)) {
      const request=pending.get(reply.id);
      pending.delete(reply.id); clearTimeout(request.timer);
      request.resolve(responseObject(reply));
      post("streamlit:setComponentValue",{value:null, dataType:"json"});
    }
    fitHeight();
    positionOverlay();
  });
  async function filePayload(file) {
    if (!file || file.size>12*1024*1024) throw new Error("Image files must be 12 MB or smaller.");
    const dataUrl=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(new Error("The image could not be read."));
      reader.readAsDataURL(file);
    });
    return {filename:file.name,base64:String(dataUrl).split(",")[1]};
  }
  window.rapidmiRequest=async (endpoint,options={})=>{
    if (!nonce) throw new Error("The application is still connecting. Please retry shortly.");
    if (pending.size) throw new Error("Please wait for the current operation to finish.");
    const operation=endpoint==="/api/ocr" ? "ocr" : endpoint==="/api/predict" ? "predict" : null;
    if (!operation) throw new Error("Unsupported operation.");
    const payload=operation==="ocr" ? await filePayload(options.body.get("image")) : JSON.parse(options.body);
    const id=crypto.randomUUID().replaceAll("-","_");
    saveForm();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error("The operation timed out. Retry or enter parameters manually."));},240000);
      pending.set(id,{resolve,reject,timer});
      post("streamlit:setComponentValue",{value:{id,nonce,operation,payload},dataType:"json"});
    });
  };
  window.addEventListener("DOMContentLoaded",()=>{
    try {
      const saved=sessionStorage.getItem(storageKey);
      if (saved) window.dispatchEvent(new CustomEvent("rapidmi:restore",{detail:JSON.parse(saved)}));
    } catch (_) {}
    watchViewport();
    new ResizeObserver(() => { fitHeight(); scheduleOverlayPosition(); }).observe(document.body);
    document.addEventListener("input",saveForm);
    document.addEventListener("click",()=>setTimeout(saveForm,1100));
    window.addEventListener("beforeunload",saveForm);
    post("streamlit:componentReady",{apiVersion:1});
    fitHeight();
  });
})();
