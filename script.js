    /* ─── Web3Forms key ─────────────────────────── */
    const W3F_KEY = '84c6cb0d-45c5-4162-b09b-b07edf016558';

    /* ─── Security: Sanitize input to prevent XSS ── */
    function sanitize(str) {
      const map = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": "&#39;", '`': '&#96;', '/': '&#47;' };
      return String(str || '').replace(/[<>&"'`/]/g, c => map[c] || c);
    }

    /* ─── Validate email format ─────────────────── */
    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /* ─── Spam rate limit (client-side token) ───── */
    const _submissions = {};
    function checkRateLimit(key) {
      const now = Date.now();
      if (_submissions[key] && (now - _submissions[key]) < 60000) {
        return false; // block if submitted within last 60s
      }
      _submissions[key] = now;
      return true;
    }

    /* ─── Nav scroll behaviour ──────────────────── */
    const nav = document.getElementById('nav');
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 40);
      scrollTopBtn.classList.toggle('visible', y > 400);
    });

    /* ─── Mobile nav ────────────────────────────── */
    function toggleMobile() {
      document.getElementById('mobileMenu').classList.toggle('open');
    }
    function closeMobile() {
      document.getElementById('mobileMenu').classList.remove('open');
    }

    /* ─── Modal ─────────────────────────────────── */
    function openModal() {
      document.getElementById('modalOverlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      document.getElementById('modalOverlay').classList.remove('open');
      document.body.style.overflow = '';
      document.getElementById('modalSuccess').classList.remove('show');
      document.getElementById('modalFormContent').style.display = 'block';
      const btn = document.getElementById('modalSubmitBtn');
      if (btn) { btn.disabled = false; btn.innerHTML = 'Send Message →'; }
    }
    function handleOverlayClick(e) {
      if (e.target === document.getElementById('modalOverlay')) closeModal();
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    /* ─── Core form submit helper ───────────────── */
    async function submitForm(payload, btnEl, successEl, formContentEl, formKey) {
      // Honeypot check
      if (payload._hp && payload._hp.length > 0) {
        console.log('Spam detected via honeypot');
        return;
      }

      // Rate limit
      if (!checkRateLimit(formKey)) {
        alert('Please wait before submitting again.');
        return;
      }

      // Validate
      const name = sanitize(payload.name);
      const email = sanitize(payload.email);
      if (!name.trim()) { alert('Please enter your name.'); return; }
      if (!email.trim() || !isValidEmail(email)) { alert('Please enter a valid email address.'); return; }

      btnEl.disabled = true;
      btnEl.innerHTML = 'Sending…';

      try {
        // Sanitize all string fields before sending
        const safePayload = {};
        for (const [k, v] of Object.entries(payload)) {
          if (k !== '_hp' && k !== 'attachment') {
            safePayload[k] = sanitize(v);
          }
        }

        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: W3F_KEY, subject: 'New Enquiry – Upari Consulting', ...safePayload })
        });
        const data = await res.json();
        if (data.success) {
          formContentEl.style.display = 'none';
          successEl.classList.add('show');
        } else {
          alert(data.message || 'Could not send. Please try again.');
          btnEl.disabled = false; btnEl.innerHTML = 'Send Message →';
        }
      } catch {
        alert('Network error. Please check your connection and try again.');
        btnEl.disabled = false; btnEl.innerHTML = 'Send Message →';
      }
    }

    /* ─── Get trimmed value ─────────────────────── */
    const gv = id => (document.getElementById(id) || {}).value?.trim() || '';

    /* ─── Modal form submit ─────────────────────── */
    function handleModalSubmit() {
      const parts = [];
      if (gv('f-desig')) parts.push('Designation: ' + gv('f-desig'));
      if (gv('f-company')) parts.push('Company: ' + gv('f-company'));
      parts.push(''); parts.push(gv('f-msg') || '(No message)');
      submitForm(
        { name: gv('f-name'), email: gv('f-email'), _hp: gv('m-hp'), from_name: gv('f-name'), message: parts.join('\n') },
        document.getElementById('modalSubmitBtn'),
        document.getElementById('modalSuccess'),
        document.getElementById('modalFormContent'),
        'modal'
      );
    }

    /* ─── Contact form submit ───────────────────── */
    function handleContactSubmit() {
      const parts = [];
      if (gv('c-desig')) parts.push('Designation: ' + gv('c-desig'));
      if (gv('c-company')) parts.push('Company: ' + gv('c-company'));
      parts.push(''); parts.push(gv('c-msg') || '(No message)');
      submitForm(
        { name: gv('c-name'), email: gv('c-email'), _hp: gv('c-hp'), from_name: gv('c-name'), message: parts.join('\n') },
        document.getElementById('contactSubmitBtn'),
        document.getElementById('contactSuccess'),
        document.getElementById('contactFormContent'),
        'contact'
      );
    }

    /* ─── File upload handler ───────────────────── */
    let selectedResumeFile = null;
    function handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowed.includes(file.type)) {
        alert('Please upload a PDF or DOC/DOCX file.');
        event.target.value = '';
        return;
      }
      if (file.size > maxSize) {
        alert('File size must be under 5 MB.');
        event.target.value = '';
        return;
      }
      selectedResumeFile = file;
      document.getElementById('resumeFileName').textContent = '✓ ' + file.name;
    }

    /* ─── Career form submit ────────────────────── */
    async function handleCareerSubmit() {
      const hp = gv('career-hp');
      if (hp) { console.log('Spam blocked'); return; }

      if (!checkRateLimit('career')) {
        alert('Please wait before submitting again.');
        return;
      }

      const name = gv('career-name');
      const email = gv('career-email');
      if (!name) { alert('Please enter your name.'); return; }
      if (!email || !isValidEmail(email)) { alert('Please enter a valid email address.'); return; }
      if (!gv('career-expertise')) { alert('Please select your area of expertise.'); return; }

      const btn = document.getElementById('careerSubmitBtn');
      btn.disabled = true; btn.innerHTML = 'Submitting…';

      const msgParts = [
        'Area of Expertise: ' + gv('career-expertise'),
        'Key Skills: ' + (gv('career-skills') || 'N/A'),
        'Years of Experience: ' + (gv('career-yoe') || 'N/A'),
        'Availability: ' + (gv('career-avail') || 'N/A'),
        'Phone: ' + (gv('career-phone') || 'N/A'),
        'Location: ' + (gv('career-location') || 'N/A'),
        '',
        'Notes: ' + (gv('career-msg') || 'N/A')
      ];

      const payload = {
        access_key: W3F_KEY,
        subject: 'Career Application – Upari Consulting',
        name: sanitize(name),
        email: sanitize(email),
        from_name: sanitize(name),
        message: msgParts.map(s => sanitize(s)).join('\n')
      };

      // Handle file upload if present (Web3Forms supports base64 attachments)
      if (selectedResumeFile) {
        try {
          const base64 = await fileToBase64(selectedResumeFile);
          payload.attachment = base64;
          payload.attachment_name = selectedResumeFile.name;
        } catch (e) {
          console.warn('Could not encode file:', e);
        }
      }

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('careerFormContent').style.display = 'none';
          document.getElementById('careerSuccess').classList.add('show');
        } else {
          alert(data.message || 'Could not submit. Please try again.');
          btn.disabled = false; btn.innerHTML = 'Submit Application →';
        }
      } catch {
        alert('Network error. Please try again.');
        btn.disabled = false; btn.innerHTML = 'Submit Application →';
      }
    }

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    /* ─── Scroll reveal ──────────────────────────── */
    const revealEls = document.querySelectorAll('.reveal');
    const revealObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });
    revealEls.forEach(el => revealObs.observe(el));

    /* ─── Counter animation ──────────────────────── */
    function animateCounter(el) {
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 1800;
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    const counterObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.querySelectorAll('[data-target]').forEach(animateCounter);
          counterObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.counters-grid').forEach(el => counterObs.observe(el));
