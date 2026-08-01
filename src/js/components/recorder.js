/* recorder.js — voice note recording using MediaRecorder, adds file to composer */
(function (global) {
  'use strict';
  const { h, fmtDuration, toast } = window.Util;
  const Icons = window.Icons;

  let mediaRec = null, chunks = [], stream = null, startedAt = 0, timer = null, audioPreview = null;

  function open() {
    if (!navigator.mediaDevices?.getUserMedia) { toast('Recording not supported on this device', 'error'); return; }

    const el = h('div', { class: 'recorder' });
    const h3 = h('h3', { text: 'Voice note' });
    const tEl = h('div', { class: 'timer', text: '0:00' });
    const vu = h('div', { class: 'vu' });
    for (let i = 0; i < 18; i++) vu.appendChild(h('i', { style: { height: '6px' } }));
    const row = h('div', { class: 'row' });
    const recBtn = h('button', { class: 'rec-btn', title: 'Start recording' });
    recBtn.appendChild(recIcon());
    const cancelBtn = h('button', { class: 'cancel', text: 'Cancel', onclick: () => { teardown(); el.remove(); } });
    row.append(cancelBtn, recBtn);
    el.append(h3, tEl, vu, row);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('open'));

    let state = 'idle';
    let recordedBlob = null;

    recBtn.addEventListener('click', async () => {
      if (state === 'idle') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRec = new MediaRecorder(stream, { mimeType: pickMime() });
          chunks = [];
          mediaRec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
          mediaRec.onstop = () => {
            recordedBlob = new Blob(chunks, { type: mediaRec.mimeType || 'audio/webm' });
            showPreview();
          };
          mediaRec.start(100);
          startedAt = Date.now();
          timer = setInterval(tick, 200);
          state = 'recording';
          recBtn.classList.add('recording');
          recBtn.innerHTML = ''; recBtn.appendChild(stopIcon());
        } catch (e) {
          toast('Microphone access denied', 'error');
          teardown(); el.remove();
        }
      } else if (state === 'recording') {
        stopRec();
        state = 'preview';
        recBtn.classList.remove('recording');
      } else if (state === 'preview') {
        // Re-record
        recordedBlob = null;
        state = 'idle';
        recBtn.innerHTML = ''; recBtn.appendChild(recIcon());
        if (audioPreview) { audioPreview.remove(); audioPreview = null; }
        tEl.textContent = '0:00';
        row.querySelectorAll('button.send-vn').forEach((b) => b.remove());
        cancelBtn.textContent = 'Cancel';
      }
    });

    function stopRec() {
      clearInterval(timer);
      try { mediaRec.stop(); } catch {}
      try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
    }

    function showPreview() {
      tEl.textContent = fmtDuration((Date.now() - startedAt) / 1000);
      if (audioPreview) audioPreview.remove();
      audioPreview = h('audio', { class: 'preview', controls: true });
      audioPreview.src = URL.createObjectURL(recordedBlob);
      el.insertBefore(audioPreview, row);
      cancelBtn.textContent = 'Re-record';
      const send = h('button', { class: 'send-vn', text: 'Add to entry', onclick: () => {
        const fname = 'voice-note_' + Date.now() + '.' + (recordedBlob.type.includes('mp4') ? 'm4a' : 'webm');
        const file = new File([recordedBlob], fname, { type: recordedBlob.type });
        window.Composer.addFile(file);
        teardown(); el.remove();
        toast('Voice note added — write a caption and send', 'success', 2400);
      }});
      row.appendChild(send);
    }

    function tick() {
      const s = (Date.now() - startedAt) / 1000;
      tEl.textContent = fmtDuration(s);
      // simple VU
      const bars = vu.querySelectorAll('i');
      bars.forEach((b, i) => {
        const h = 4 + Math.round(Math.random() * 28);
        b.style.height = h + 'px';
        b.style.opacity = String(0.5 + (h - 4) / 60);
      });
    }

    function teardown() {
      clearInterval(timer);
      try { mediaRec?.state !== 'inactive' && mediaRec?.stop(); } catch {}
      try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
    }
  }

  function pickMime() {
    if (typeof MediaRecorder === 'undefined') return '';
    const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const m of c) { if (MediaRecorder.isTypeSupported(m)) return m; }
    return '';
  }
  function recIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '26'); s.setAttribute('height', '26'); s.setAttribute('fill', '#fff');
    s.innerHTML = '<circle cx="12" cy="12" r="6"/>';
    return s;
  }
  function stopIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('fill', '#fff');
    s.innerHTML = '<rect x="6" y="6" width="12" height="12" rx="2"/>';
    return s;
  }

  global.Recorder = { open };
})(window);
