// ===== i18n =====
function getInitialLang() {
    const saved = localStorage.getItem('spf-lang');
    if (saved) return saved;
    const lang = navigator.language || 'cs';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('de')) return 'de';
    return 'cs';
}

let currentLang = getInitialLang();

function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('spf-lang', lang);
    document.documentElement.lang = lang;
    const t = window.SPF_I18N[lang];
    if (!t) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key] !== undefined) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.dataset.i18nHtml;
        if (t[key] !== undefined) el.innerHTML = t[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (t[key] !== undefined) el.placeholder = t[key];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.dataset.i18nAria;
        if (t[key] !== undefined) el.setAttribute('aria-label', t[key]);
    });

    if (t.meta_title) document.title = t.meta_title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && t.meta_desc) metaDesc.content = t.meta_desc;

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLang(btn.dataset.lang));
});

applyLang(currentLang);

// ===== HEADER SCROLL =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    updateActiveNav();
});

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');
hamburger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
});
// Close nav on link click (mobile)
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        nav.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
    });
});

// ===== ACTIVE NAV LINK =====
const sections = document.querySelectorAll('section[id]');
function updateActiveNav() {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        const navEl = document.querySelector('.nav-link[href="#' + id + '"]');
        if (navEl) {
            if (scrollY >= top && scrollY < top + height) {
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                navEl.classList.add('active');
            }
        }
    });
}

// ===== REVEAL ON SCROLL =====
const reveals = document.querySelectorAll('.team-card, .service-card, .blog-card, .onas-card, .stat, .kontakt-item');
reveals.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, 60 * (Array.from(entry.target.parentElement.children).indexOf(entry.target)));
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

reveals.forEach(el => observer.observe(el));

// ===== SMOOTH SCROLL OFFSET =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

// ===== PERSON MODAL (sekce-01.html + sekce-02.html) =====
(function () {
    const overlay  = document.getElementById('teamModal');
    const bodyEl   = document.getElementById('teamModalBody');
    const closeBtn = document.getElementById('teamModalClose');
    if (!overlay || !bodyEl || !closeBtn) return;

    function show(html) {
        bodyEl.innerHTML = html;
        const sw = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = sw + 'px';
        document.body.style.overflow = 'hidden';
        overlay.classList.add('is-open');
        closeBtn.focus();
    }

    function close() {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    // ── Kontaktní osoba tlačítka (sekce-01 + sekce-02) ──
    const ROLE_EN = {
        'Jednatel': 'Managing Director',
        'Senior konzultant': 'Senior Consultant',
        'Konzultant': 'Consultant',
        'Konzultantka': 'Consultant',
        'Asistentka': 'Project Assistant',
    };
    const ROLE_DE = {
        'Jednatel': 'Geschäftsführer',
        'Senior konzultant': 'Senior-Berater',
        'Konzultant': 'Berater',
        'Konzultantka': 'Beraterin',
        'Asistentka': 'Projektassistentin',
    };

    document.querySelectorAll('.btn-contact-person').forEach(btn => {
        btn.addEventListener('click', () => {
            const name         = btn.dataset.name  || '';
            const roleRaw      = btn.dataset.role  || '';
            const role         = currentLang === 'en' ? (ROLE_EN[roleRaw] || roleRaw)
                               : currentLang === 'de' ? (ROLE_DE[roleRaw] || roleRaw)
                               : roleRaw;
            const email        = btn.dataset.email || '';
            const phone        = btn.dataset.phone || '';
            const phoneDisplay = btn.dataset.phoneDisplay || phone;
            const photo        = btn.dataset.photo || '';

            const initials = name.split(/\s+/)
                .filter(w => /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/i.test(w))
                .slice(-2).map(w => w[0]).join('');

            const photoHtml = photo
                ? `<div class="tmm-photo-wrap"><img src="${photo}" alt="${name}" /></div>`
                : `<div class="tmm-initials-wrap"><span class="tmm-initials">${initials}</span></div>`;

            show(`
                <div class="tmm-header">
                    ${photoHtml}
                    <div class="tmm-info">
                        <h3 class="tmm-name">${name}</h3>
                        ${role ? `<p class="tmm-role">${role}</p>` : ''}
                    </div>
                </div>
                <div class="tmm-details">
                    ${email ? `<p class="tym-contact"><i class="fa-solid fa-envelope" aria-hidden="true"></i> <a href="mailto:${email}">${email}</a></p>` : ''}
                    ${phone ? `<p class="tym-contact"><i class="fa-solid fa-phone" aria-hidden="true"></i> <a href="tel:${phone}">${phoneDisplay}</a></p>` : ''}
                </div>
            `);
        });
    });

    // ── Týmové kartičky – „Více informací" (sekce-02) ──
    document.querySelectorAll('.tym-details summary').forEach(summary => {
        summary.addEventListener('click', e => {
            e.preventDefault();
            const card = summary.closest('.tym-card');
            if (!card) return;

            const photoImg   = card.querySelector('.tym-photo');
            const initialsEl = card.querySelector('.tym-initials');
            const avatarWrap = card.querySelector('.tym-avatar-wrap');

            const photoHtml = photoImg
                ? `<div class="tmm-photo-wrap"><img src="${photoImg.src}" alt="${photoImg.alt}" /></div>`
                : `<div class="tmm-initials-wrap" style="background:${avatarWrap ? avatarWrap.style.background : 'var(--navy)'}"><span class="tmm-initials">${initialsEl ? initialsEl.textContent : ''}</span></div>`;

            const name      = card.querySelector('.tym-name')?.textContent || '';
            const role      = card.querySelector('.tym-role')?.textContent || '';
            const expertise = card.querySelector('.tym-expertise')?.textContent || '';
            const expanded  = card.querySelector('.tym-expanded');

            show(`
                <div class="tmm-header">
                    ${photoHtml}
                    <div class="tmm-info">
                        <h3 class="tmm-name">${name}</h3>
                        <p class="tmm-role">${role}</p>
                        <p class="tmm-expertise">${expertise}</p>
                    </div>
                </div>
                ${expanded ? `<div class="tmm-details">${expanded.innerHTML}</div>` : ''}
            `);
        });
    });

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });
})();

// ===== EXCLUSIVE TEAM CARD ACCORDION (index.html) =====
document.querySelectorAll('.tym-details').forEach(details => {
    details.addEventListener('toggle', () => {
        if (details.open) {
            document.querySelectorAll('.tym-details').forEach(other => {
                if (other !== details) other.removeAttribute('open');
            });
        }
    });
});

// ===== REFERENCE FILTER =====
document.querySelectorAll('.ref-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.ref-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        document.querySelectorAll('.ref-card').forEach(card => {
            card.style.display = (f === 'all' || card.dataset.category === f) ? '' : 'none';
        });
    });
});

// ===== CONTENT MODAL (reference + blog – index.html) =====
(function () {
    const overlay  = document.getElementById('contentModal');
    const bodyEl   = document.getElementById('contentModalBody');
    const closeBtn = document.getElementById('contentModalClose');
    if (!overlay || !bodyEl || !closeBtn) return;

    function show(html) {
        bodyEl.innerHTML = html;
        const sw = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = sw + 'px';
        document.body.style.overflow = 'hidden';
        overlay.classList.add('is-open');
        closeBtn.focus();
    }

    function close() {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    // Event delegation so dynamically rebuilt [data-i18n-html] lists keep working after language switch
    document.addEventListener('click', e => {
        const trigger = e.target.closest('[data-modal]');
        if (!trigger) return;
        e.preventDefault();
        const key = trigger.dataset.modal;
        const t = window.SPF_I18N && window.SPF_I18N[currentLang];
        const html = t && t[key];
        if (html) show(html);
    });

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });

    // Otevři modal z URL hash (např. index.html#modal-ref-olomouc)
    window.addEventListener('load', () => {
        const hash = window.location.hash.slice(1);
        if (!hash || !hash.startsWith('modal-')) return;
        const trigger = document.querySelector(`[data-modal="${hash}"]`);
        if (trigger) trigger.click();
    });
})();

// ===== FORM SUBMIT =====
const form = document.querySelector('.kontakt-form');
if (form) {
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const btn = document.getElementById('form-submit');
        const t = window.SPF_I18N && window.SPF_I18N[currentLang];
        const msg = (t && t.form_success) || '✓ Odesláno! Ozveme se vám brzy.';
        if (btn) {
            btn.textContent = msg;
            btn.style.background = '#059669';
            btn.disabled = true;
            btn.setAttribute('aria-disabled', 'true');
        }

        const statusEl = document.getElementById('form-status');
        if (statusEl) statusEl.textContent = msg;
    });
}

// ===== BLOG CAROUSEL =====
(function () {
    const track = document.querySelector('.blog-track');
    if (!track) return;

    const wrap    = document.querySelector('.blog-carousel-wrap');
    const prevBtn = document.querySelector('.blog-nav-prev');
    const nextBtn = document.querySelector('.blog-nav-next');
    const dotsEl  = document.querySelector('.blog-dots');
    const cards   = Array.from(track.querySelectorAll('.blog-card'));
    const GAP     = 24;
    let idx = 0;

    cards.forEach(c => c.classList.add('visible'));

    function visCount() {
        const w = wrap.offsetWidth;
        if (w < 620) return 1;
        if (w < 960) return 2;
        return 3;
    }

    function setup() {
        const vc     = visCount();
        const cardW  = (wrap.offsetWidth - GAP * (vc - 1)) / vc;
        cards.forEach(c => {
            c.style.width     = cardW + 'px';
            c.style.flexShrink = '0';
            c.style.flexGrow   = '0';
        });
        dotsEl.innerHTML = '';
        const max = Math.max(0, cards.length - vc);
        for (let i = 0; i <= max; i++) {
            const d = document.createElement('button');
            d.className = 'blog-dot';
            d.setAttribute('aria-label', String(i + 1));
            d.addEventListener('click', () => go(i));
            dotsEl.appendChild(d);
        }
    }

    function maxIdx() {
        return Math.max(0, cards.length - visCount());
    }

    function go(n) {
        idx = Math.max(0, Math.min(n, maxIdx()));
        const step = (cards[0].offsetWidth || 0) + GAP;
        track.style.transform = `translateX(-${idx * step}px)`;
        prevBtn.disabled = idx === 0;
        nextBtn.disabled = idx >= maxIdx();
        dotsEl.querySelectorAll('.blog-dot').forEach((d, i) => {
            d.classList.toggle('active', i === idx);
        });
    }

    prevBtn.addEventListener('click', () => go(idx - 1));
    nextBtn.addEventListener('click', () => go(idx + 1));

    let rto;
    window.addEventListener('resize', () => {
        clearTimeout(rto);
        rto = setTimeout(() => { setup(); go(Math.min(idx, maxIdx())); }, 150);
    });

    setup();
    go(0);
})();
