(() => {
  const audio = document.getElementById('audio');
  const play = document.getElementById('play');
  const back = document.getElementById('back');
  const forward = document.getElementById('forward');
  const track = document.getElementById('track');
  const fill = document.getElementById('fill');
  const current = document.getElementById('currentTime');
  const duration = document.getElementById('duration');
  const volume = document.getElementById('volume');
  const volumeValue = document.getElementById('volumeValue');
  const mute = document.getElementById('mute');
  const disc = document.getElementById('disc');
  const wave = document.getElementById('wave');
  const status = document.getElementById('status');
  const title = document.getElementById('title');

  const params = new URLSearchParams(location.search);
  const audioUrl = params.get('audio');
  const name = params.get('title');

  function safeUrl(url) {
    try {
      const u = new URL(url, location.href);
      return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
    } catch { return ''; }
  }

  const src = safeUrl(audioUrl || 'audio/demo.mp3');
  if (name) title.textContent = name;
  audio.src = src;

  function fmt(v) {
    if (!Number.isFinite(v) || v < 0) return '0:00';
    return Math.floor(v / 60) + ':' + String(Math.floor(v % 60)).padStart(2, '0');
  }

  function render() {
    const playing = !audio.paused && !audio.ended;
    play.textContent = playing ? 'Ⅱ' : '▶';
    disc.classList.toggle('playing', playing);
    wave.classList.toggle('active', playing);
    if (audio.duration) fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
    current.textContent = fmt(audio.currentTime);
    duration.textContent = fmt(audio.duration);
  }

  play.onclick = async () => {
    if (!src) {
      status.textContent = 'رابط الصوت غير صالح';
      return;
    }
    try {
      if (audio.paused) {
        await audio.play();
        status.textContent = 'جاري التشغيل';
      } else {
        audio.pause();
        status.textContent = 'متوقف';
      }
      render();
    } catch (e) {
      status.textContent = 'تعذر تشغيل الصوت من هذا الرابط';
    }
  };

  back.onclick = () => { audio.currentTime = Math.max(0, audio.currentTime - 5); };
  forward.onclick = () => { if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); };

  function seek(clientX) {
    if (!audio.duration) return;
    const r = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    audio.currentTime = ratio * audio.duration;
  }
  track.addEventListener('click', e => seek(e.clientX));
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const step = e.key === 'ArrowRight' ? 5 : -5;
      audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + step));
    }
  });

  volume.oninput = () => {
    audio.volume = Number(volume.value);
    const p = Math.round(audio.volume * 100);
    volumeValue.textContent = p + '%';
    mute.textContent = p === 0 ? '🔇' : p < 50 ? '🔉' : '🔊';
  };

  mute.onclick = () => {
    if (audio.muted) {
      audio.muted = false;
      mute.textContent = '🔊';
    } else {
      audio.muted = true;
      mute.textContent = '🔇';
    }
  };

  audio.addEventListener('loadedmetadata', () => {
    duration.textContent = fmt(audio.duration);
    status.textContent = 'جاهز للتشغيل';
    render();
  });
  audio.addEventListener('timeupdate', render);
  audio.addEventListener('play', render);
  audio.addEventListener('pause', render);
  audio.addEventListener('ended', () => {
    status.textContent = 'انتهى الصوت';
    render();
  });
  audio.addEventListener('error', () => {
    status.textContent = 'فشل تحميل ملف الصوت';
  });

  audio.volume = .8;
  render();
})();
