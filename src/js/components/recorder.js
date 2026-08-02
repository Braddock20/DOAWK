/* recorder.js — voice note */
(function (global) {
  'use strict';
  const { h, toast, fmtDur, sheet, closeSheet } = global.U;
  const I = global.I;

  let mediaRec, chunks, stream, startedAt, timer;

  function open() {
    if (!navigator.mediaDevices?.getUserMedia) { toast('Not supported', 'error'); return; }
    const box = h('div', { class: 'box' });
    const t = h('div', { class: 't', text: '0:00' });
    const vu = h('div', { class: 'vu' });
    for (let i = 0; i < 16; i++) vu.appendChild(h('i', { style: { height: '4px' } }));
    const recBtn = h('button', { class: 'rec-btn', onclick: recClick }, [recIcon()]);
    const cancelBtn = h('button', { class: 'cancel', text: 'Cancel', onclick: close });
    box.append(t, vu, h('div', { class: 'btns' }, [cancelBtn, recBtn]));
    const back = h('div', { class: 'rec open' });
    back.appendChild(box);
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    document.body.appendChild(back);

    let state = 'idle';
    let blob = null;
    let audio = null;

    function recClick() {
      if (state === 'idle') startRec();
      else if (state === 'recording') stopRec();
      else if (state === 'preview') { blob = null; state = 'idle'; audio?.remove(); audio = null; t.textContent = '0:00'; recBtn.innerHTML = ''; recBtn.appendChild(recIcon()); showStartBtns(); }
    }

    function startRec() {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
        stream = s;
        const mime = pickMime();
        mediaRec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        chunks = [];
        mediaRec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        mediaRec.onstop = () => {
          blob = new Blob(chunks, { type: mediaRec.mimeType || 'audio/webm' });
          showPreview();
        };
        mediaRec.start(100);
        startedAt = Date.now();
        timer = setInterval(() => {
          t.textContent = fmtDur((Date.now() - startedAt) / 1000);
          const bars = vu.querySelectorAll('i');
          bars.forEach((b) => { const h = 4 + Math.round(Math.random() * 22); b.style.height = h + 'px'; });
        }, 150);
        state = 'recording';
        recBtn.classList.add('recording');
        recBtn.innerHTML = ''; recBtn.appendChild(stopIcon());
      }).catch(() => { toast('Microphone denied', 'error'); close(); });
    }

    function stopRec() {
      clearInterval(timer);
      try { mediaRec.stop(); } catch {}
      try { stream?.getTracks().forEach((tr) => tr.stop()); } catch {}
      state = 'preview';
      recBtn.classList.remove('recording');
    }

    function showPreview() {
      t.textContent = fmtDur((Date.now() - startedAt) / 1000);
      audio = h('audio', { controls: true, src: URL.createObjectURL(blob), style: { width: '100%', margin: '8px 0' } });
      box.insertBefore(audio, vu.nextSibling);
      const ok = h('button', { class: 'ok', text: 'Use', onclick: () => {
        const ext = (blob.type.includes('mp4') ? 'm4a' : 'webm');
        const file = new File([blob], 'voice-note_' + Date.now() + '.' + ext, { type: blob.type });
        window.Composer.addFile(file);
        toast('Voice note added', 'success');
        close();
      }});
      box.querySelector('.btns').appendChild(ok);
    }

    function showStartBtns() { /* noop */ }

    function close() {
      clearInterval(timer);
      try { mediaRec?.state !== 'inactive' && mediaRec?.stop(); } catch {}
      try { stream?.getTracks().forEach((tr) => tr.stop()); } catch {}
      back.remove();
    }
  }

  function pickMime() {
    if (typeof MediaRecorder === 'undefined') return '';
    const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    for (const m of c) if (MediaRecorder.isTypeSupported(m)) return m;
    return '';
  }
  function recIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '24'); s.setAttribute('height', '24'); s.setAttribute('fill', '#fff');
    s.innerHTML = '<circle cx="12" cy="12" r="6"/>';
    return s;
  }
  function stopIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '20'); s.setAttribute('height', '20'); s.setAttribute('fill', '#fff');
    s.innerHTML = '<rect x="6" y="6" width="12" height="12" rx="2"/>';
    return s;
  }
  global.Recorder = { open };
})(window);
