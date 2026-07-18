document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.querySelector('.main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu when a link is clicked (mobile)
    mainNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Animated stat counters ---------- */
  const statTargets = {
    0: { end: 120, suffix: '+', prefix: '' },
    1: { end: 480, suffix: 'm', prefix: '' },
    2: { end: 950, suffix: 'k', prefix: '' },
    3: { end: 12, suffix: '%', prefix: '' },
  };

  const statEls = document.querySelectorAll('.stat__value');
  let hasAnimated = false;

  function animateStats() {
    if (hasAnimated) return;
    hasAnimated = true;
    statEls.forEach((el, i) => {
      const target = statTargets[i];
      if (!target) return;
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const value = Math.floor(progress * target.end);
        el.textContent = `${target.prefix}${value}${target.suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  const statsSection = document.querySelector('.stats');
  if (statsSection && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateStats();
          observer.disconnect();
        }
      });
    }, { threshold: 0.4 });
    observer.observe(statsSection);
  } else {
    animateStats();
  }

  /* ---------- Podcast episode list + player bar (real <audio> playback) ---------- */
  const episodeRows = document.querySelectorAll('.episode-row');
  const playerAudio = document.getElementById('playerAudio');
  const playerToggle = document.getElementById('playerToggle');
  const playerTitle = document.getElementById('playerTitle');
  const playerHost = document.getElementById('playerHost');
  const playerCover = document.getElementById('playerCover');
  const playerVolume = document.getElementById('playerVolume');
  const playerMute = document.getElementById('playerMute');
  const playerPrev = document.getElementById('playerPrev');
  const playerNext = document.getElementById('playerNext');
  const playerShuffle = document.getElementById('playerShuffle');
  const playerRepeat = document.getElementById('playerRepeat');
  const playerBar = document.getElementById('playerBar');
  const playerProgress = document.getElementById('playerProgress');
  const playerProgressFill = document.getElementById('playerProgressFill');
  const playerTime = document.getElementById('playerTime');

  let shuffleOn = false;
  let repeatOn = false;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function setRowIndicator(row, isActive) {
    const indexEl = row.querySelector('.episode-row__index');
    const waveEl = row.querySelector('.waveform');
    row.classList.toggle('episode-row--playing', isActive);
    if (isActive && indexEl) {
      const wave = document.createElement('span');
      wave.className = 'waveform';
      wave.setAttribute('aria-hidden', 'true');
      wave.innerHTML = '<span></span><span></span><span></span>';
      indexEl.replaceWith(wave);
    } else if (!isActive && waveEl) {
      const idx = Array.from(row.parentElement.children).indexOf(row) + 1;
      const span = document.createElement('span');
      span.className = 'episode-row__index';
      span.textContent = String(idx);
      waveEl.replaceWith(span);
    }
  }

  function loadEpisode(row, { autoplay = true } = {}) {
    if (!row || !playerAudio) return;
    episodeRows.forEach((r) => { if (r !== row) setRowIndicator(r, false); });
    setRowIndicator(row, true);

    if (playerTitle) playerTitle.textContent = row.dataset.title || '';
    if (playerHost) playerHost.textContent = row.dataset.host || '';
    if (playerCover && row.dataset.cover) playerCover.src = row.dataset.cover;

    const src = row.dataset.src;
    if (src && playerAudio.getAttribute('src') !== src) {
      // encodeURI keeps spaces/special characters in filenames (e.g. inside
      // assets/podcasts/) from breaking the request.
      playerAudio.src = encodeURI(src);
    }

    if (autoplay) {
      // play() returns a promise that rejects if the browser blocks
      // autoplay or the file at data-src can't be found yet.
      playerAudio.play().catch(() => {
        if (playerBar) playerBar.classList.remove('is-playing');
        if (playerToggle) {
          playerToggle.classList.remove('is-playing');
          playerToggle.setAttribute('aria-label', 'Play');
          playerToggle.setAttribute('aria-pressed', 'false');
        }
      });
    }
  }

  episodeRows.forEach((row) => {
    const playBtn = row.querySelector('.episode-row__play');
    if (playBtn) {
      playBtn.addEventListener('click', () => loadEpisode(row, { autoplay: true }));
    }
  });

  if (playerToggle && playerAudio) {
    playerToggle.addEventListener('click', () => {
      if (playerAudio.paused) {
        playerAudio.play().catch(() => {});
      } else {
        playerAudio.pause();
      }
    });
  }

  // Keep the play/pause button, waveform animation, and row highlight in
  // sync with the actual state of the <audio> element (not just clicks) —
  // this covers autoplay being blocked, the file finishing, buffering, etc.
  if (playerAudio) {
    playerAudio.addEventListener('play', () => {
      if (playerBar) playerBar.classList.add('is-playing');
      if (playerToggle) {
        playerToggle.classList.add('is-playing');
        playerToggle.setAttribute('aria-label', 'Pause');
        playerToggle.setAttribute('aria-pressed', 'true');
      }
    });
    playerAudio.addEventListener('pause', () => {
      if (playerBar) playerBar.classList.remove('is-playing');
      if (playerToggle) {
        playerToggle.classList.remove('is-playing');
        playerToggle.setAttribute('aria-label', 'Play');
        playerToggle.setAttribute('aria-pressed', 'false');
      }
    });
    playerAudio.addEventListener('timeupdate', () => {
      const duration = playerAudio.duration || 0;
      const current = playerAudio.currentTime || 0;
      const pct = duration ? (current / duration) * 100 : 0;
      if (playerProgressFill) playerProgressFill.style.width = `${pct}%`;
      if (playerTime) playerTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    });
    playerAudio.addEventListener('loadedmetadata', () => {
      if (playerTime) playerTime.textContent = `${formatTime(playerAudio.currentTime)} / ${formatTime(playerAudio.duration)}`;
    });
    playerAudio.addEventListener('ended', () => {
      if (repeatOn) {
        playerAudio.currentTime = 0;
        playerAudio.play().catch(() => {});
      } else {
        stepEpisode(1);
      }
    });
    playerAudio.addEventListener('error', () => {
      // Most likely cause during setup: the file hasn't been dropped into
      // the assets/podcasts/ folder yet, or the filename doesn't match data-src.
      if (playerTime) playerTime.textContent = 'Audio file not found';
    });
  }

  // Shuffle: toggles whether prev/next/auto-advance pick a random
  // episode instead of the next one in list order.
  if (playerShuffle) {
    playerShuffle.addEventListener('click', () => {
      shuffleOn = !shuffleOn;
      playerShuffle.setAttribute('aria-pressed', String(shuffleOn));
    });
  }

  // Repeat: when on, a finished episode replays itself instead of
  // advancing to the next one.
  if (playerRepeat) {
    playerRepeat.addEventListener('click', () => {
      repeatOn = !repeatOn;
      playerRepeat.setAttribute('aria-pressed', String(repeatOn));
    });
  }

  function stepEpisode(direction) {
    const rows = Array.from(episodeRows);
    const currentIndex = rows.findIndex((r) => r.classList.contains('episode-row--playing'));
    if (currentIndex === -1) return;

    let nextIndex;
    if (shuffleOn && rows.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * rows.length);
      } while (nextIndex === currentIndex);
    } else {
      nextIndex = (currentIndex + direction + rows.length) % rows.length;
    }
    loadEpisode(rows[nextIndex], { autoplay: true });
  }
  if (playerPrev) playerPrev.addEventListener('click', () => stepEpisode(-1));
  if (playerNext) playerNext.addEventListener('click', () => stepEpisode(1));

  if (playerVolume && playerAudio) {
    playerAudio.volume = Number(playerVolume.value) / 100;
    playerVolume.addEventListener('input', () => {
      playerAudio.volume = Number(playerVolume.value) / 100;
      if (playerAudio.muted && Number(playerVolume.value) > 0) {
        playerAudio.muted = false;
        if (playerMute) playerMute.setAttribute('aria-pressed', 'false');
      }
    });
  }

  if (playerMute && playerAudio) {
    playerMute.addEventListener('click', () => {
      playerAudio.muted = !playerAudio.muted;
      playerMute.setAttribute('aria-pressed', String(playerAudio.muted));
      playerMute.setAttribute('aria-label', playerAudio.muted ? 'Unmute' : 'Mute');
    });
  }

  if (playerProgress && playerAudio) {
    let isScrubbing = false;

    function seekToClientX(clientX) {
      const rect = playerProgress.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      if (playerAudio.duration) {
        playerAudio.currentTime = ratio * playerAudio.duration;
        // Give instant visual feedback instead of waiting for the next
        // timeupdate tick, so dragging feels responsive.
        if (playerProgressFill) playerProgressFill.style.width = `${ratio * 100}%`;
      }
    }

    playerProgress.addEventListener('click', (e) => seekToClientX(e.clientX));

    playerProgress.addEventListener('mousedown', (e) => {
      isScrubbing = true;
      seekToClientX(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (isScrubbing) seekToClientX(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      isScrubbing = false;
    });

    // Basic touch support (mobile drag-to-seek).
    playerProgress.addEventListener('touchstart', (e) => {
      isScrubbing = true;
      seekToClientX(e.touches[0].clientX);
    }, { passive: true });

    playerProgress.addEventListener('touchmove', (e) => {
      if (isScrubbing) seekToClientX(e.touches[0].clientX);
    }, { passive: true });

    playerProgress.addEventListener('touchend', () => {
      isScrubbing = false;
    });
  }

  // Best-effort: probe each episode's real audio file (if present) to
  // replace the placeholder duration text with the actual length.
  // Silently leaves the placeholder in place if the file isn't there yet.
  episodeRows.forEach((row) => {
    const src = row.dataset.src;
    if (!src) return;
    const durationEl = row.querySelector('.episode-row__duration');
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.addEventListener('loadedmetadata', () => {
      if (durationEl) durationEl.textContent = formatTime(probe.duration);
    });
    probe.addEventListener('error', () => {
      /* file not uploaded yet — keep existing placeholder text */
    });
    probe.src = encodeURI(src);
  });

  /* ---------- Academic Planner (add / complete / delete tasks) ---------- */
  const taskForm = document.getElementById('taskForm');
  const taskList = document.getElementById('taskList');

  if (taskForm && taskList) {
    const taskInput = document.getElementById('taskInput');
    const taskDue = document.getElementById('taskDue');
    const taskCategory = document.getElementById('taskCategory');
    const taskEmpty = document.getElementById('taskEmpty');
    const statTotal = document.getElementById('statTotal');
    const statPending = document.getElementById('statPending');
    const statDone = document.getElementById('statDone');
    const plannerFilterTabs = document.querySelectorAll('.planner-list-section .filter-tab');

    const STORAGE_KEY = 'omenye-planner-tasks';
    let tasks = [];
    let activeFilter = 'all';

    function seedDummyTasks() {
      const today = new Date();
      const inDays = (n) => {
        const d = new Date(today);
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
      };
      return [
        { id: 'seed1', title: 'Finish network security lab report', due: inDays(2), category: 'Coursework', done: false },
        { id: 'seed2', title: 'Read Ch. 7 — Cryptographic Protocols', due: inDays(4), category: 'Reading', done: false },
        { id: 'seed3', title: 'Submit web development capstone proposal', due: inDays(6), category: 'Project', done: false },
        { id: 'seed4', title: 'Review lecture notes for Cyber Security midterm', due: inDays(1), category: 'Exam', done: false },
        { id: 'seed5', title: 'Set up penetration testing lab environment', due: inDays(-1), category: 'Assignment', done: true },
      ];
    }

    const ICON_CALENDAR = '<svg class="icon icon-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>';
    const ICON_CHECK = '<svg class="icon icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    const ICON_TRASH = '<svg class="icon icon-trash-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

    function loadTasks() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === null) {
          // First time this planner has been opened on this browser —
          // drop in a few sample tasks so the list isn't empty.
          tasks = seedDummyTasks();
          saveTasks();
        } else {
          tasks = JSON.parse(raw);
        }
      } catch (err) {
        tasks = [];
      }
    }

    function saveTasks() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      } catch (err) {
        // localStorage unavailable (private browsing, etc.) — tasks will
        // still work for this session, just won't persist on reload.
      }
    }

    function formatDue(dateStr) {
      if (!dateStr) return '';
      const d = new Date(`${dateStr}T00:00:00`);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function render() {
      taskList.innerHTML = '';

      const visible = tasks.filter((t) => {
        if (activeFilter === 'pending') return !t.done;
        if (activeFilter === 'done') return t.done;
        return true;
      });

      if (tasks.length === 0) {
        taskEmpty.hidden = false;
        taskEmpty.textContent = 'No tasks yet — add your first one above.';
      } else if (visible.length === 0) {
        taskEmpty.hidden = false;
        taskEmpty.textContent = 'No tasks match this filter.';
      } else {
        taskEmpty.hidden = true;
      }

      visible.forEach((task) => {
        const li = document.createElement('li');
        li.className = `task-row${task.done ? ' is-done' : ''}`;
        li.dataset.id = task.id;

        const metaBits = [];
        if (task.due) metaBits.push(`<span>${ICON_CALENDAR}${formatDue(task.due)}</span>`);

        li.innerHTML = `
          <button type="button" class="task-row__check" aria-label="${task.done ? 'Mark as not done' : 'Mark as done'}" aria-pressed="${task.done}">
            ${ICON_CHECK}
          </button>
          <div class="task-row__body">
            <p class="task-row__title"></p>
            <div class="task-row__meta">
              <span class="task-row__category">${task.category}</span>
              ${metaBits.join('')}
            </div>
          </div>
          <button type="button" class="task-row__delete" aria-label="Delete task">
            ${ICON_TRASH}
          </button>
        `;
        // set title via textContent to avoid HTML-injecting user input
        li.querySelector('.task-row__title').textContent = task.title;

        taskList.appendChild(li);
      });

      statTotal.textContent = String(tasks.length);
      statPending.textContent = String(tasks.filter((t) => !t.done).length);
      statDone.textContent = String(tasks.filter((t) => t.done).length);
    }

    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = taskInput.value.trim();
      if (!title) return;

      tasks.unshift({
        id: `t${Date.now()}${Math.floor(Math.random() * 1000)}`,
        title,
        due: taskDue.value || '',
        category: taskCategory.value,
        done: false,
      });

      saveTasks();
      render();
      taskForm.reset();
      taskInput.focus();
    });

    taskList.addEventListener('click', (e) => {
      const row = e.target.closest('.task-row');
      if (!row) return;
      const id = row.dataset.id;

      if (e.target.closest('.task-row__check')) {
        const task = tasks.find((t) => t.id === id);
        if (task) task.done = !task.done;
        saveTasks();
        render();
      } else if (e.target.closest('.task-row__delete')) {
        tasks = tasks.filter((t) => t.id !== id);
        saveTasks();
        render();
      }
    });

    plannerFilterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        plannerFilterTabs.forEach((t) => {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');
        activeFilter = tab.dataset.filter;
        render();
      });
    });

    loadTasks();
    render();
  }

  /* ---------- Project filter tabs (projects.html) ---------- */
  const filterTabs = document.querySelectorAll('.filter-tab');
  const projectCards = document.querySelectorAll('.project-card');
  if (filterTabs.length && projectCards.length) {
    filterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        filterTabs.forEach((t) => {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        const filter = tab.dataset.filter;
        projectCards.forEach((card) => {
          const matches = filter === 'all' || card.dataset.category === filter;
          card.hidden = !matches;
        });
      });
    });
  }

  /* ---------- Contact form (numbers-only phone + mailto send) ---------- */
  const contactForm = document.getElementById('contactForm');
  const contactStatus = document.getElementById('contactStatus');
  const phoneInput = document.getElementById('phone');

  // Restrict the phone field to digits only as the user types.
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, '');
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const recipient = contactForm.dataset.recipient || 'v.omenye9788@miva.edu.ng';
      const getVal = (id) => {
        const el = contactForm.querySelector(`#${id}`);
        return el ? el.value.trim() : '';
      };

      const firstName = getVal('firstName');
      const lastName = getVal('lastName');
      const email = getVal('email');
      const countryCode = getVal('countryCode');
      const phone = getVal('phone');
      const message = getVal('message');

      const fullName = `${firstName} ${lastName}`.trim();
      const subject = `Portfolio Contact Form — ${fullName || 'New message'}`;
      const bodyLines = [
        `Name: ${fullName}`,
        `Email: ${email}`,
        phone ? `Phone: ${countryCode} ${phone}` : '',
        '',
        message,
      ].filter((line) => line !== '');

      // No backend on this static site, so this hands off to the visitor's
      // own email client with everything pre-filled, addressed to Victor.
      const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

      if (contactStatus) {
        contactStatus.textContent = `Opening your email app to send this to ${recipient} — if nothing happens, please email that address directly.`;
      }

      window.location.href = mailtoUrl;
      contactForm.reset();
    });
  }

  /* ---------- Loan request form (demo only) ---------- */
  const requestForm = document.getElementById('requestForm');
  if (requestForm) {
    requestForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = requestForm.querySelector('input');
      if (input && input.value.trim()) {
        input.placeholder = 'Request sent!';
        input.value = '';
      }
    });
  }
});
