// App State
let artworks = [];
let currentLang = localStorage.getItem('language') || 'de';
let currentFilter = 'all';
let visibleCount = 12;

// ========== DATA LOADING ==========
async function loadData() {
    try {
        const [artworksRes, translationsRes] = await Promise.all([
            fetch('/data/artworks.json'),
            fetch(`/data/translations/${currentLang}.json`)
        ]);

        artworks = (await artworksRes.json()).artworks.sort((a, b) => a.order - b.order);
        const translations = await translationsRes.json();

        return { artworks, translations };
    } catch (error) {
        console.error('Error loading data:', error);
        return { artworks: [], translations: {} };
    }
}

// ========== RENDER FUNCTIONS ==========
function renderArtworks() {
    const container = document.getElementById('artworks-container');
    if (!container) return;

    const filtered = currentFilter === 'all'
        ? artworks
        : artworks.filter(artwork => artwork.size === currentFilter);

    const visible = filtered.slice(0, visibleCount);
    const remaining = filtered.length - visibleCount;

    container.innerHTML = visible.map(artwork => `
        <div class="dp-card" data-size="${artwork.size}" data-id="${artwork.id}">
            <img src="${artwork.image}" alt="${currentLang === 'de' ? artwork.title : artwork.titleEn}" width="350" height="350" loading="lazy" />
            <div class="dp-card-content">
                <h4>${currentLang === 'de' ? artwork.title : artwork.titleEn}</h4>
                <p>${currentLang === 'de' ? artwork.description : artwork.descriptionEn}</p>
                <span>Referenz: ${artwork.reference}</span>
            </div>
        </div>
    `).join('');

    const loadMoreBtn = document.getElementById('dp-load-more');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = remaining > 0 ? 'block' : 'none';
    }

    attachModalListeners();
    setupCardAnimations(); // Re-run animations for new cards
}

function applyTranslations(translations) {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.dataset.i18n;
        if (translations[key]) {
            if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = translations[key];
            } else if (element.tagName === 'BUTTON') {
                element.textContent = translations[key];
            } else {
                element.innerHTML = translations[key];
            }
        }
    });

    if (translations.aboutText) {
        const container = document.getElementById('about-text-container');
        if (container) {
            container.innerHTML = translations.aboutText.map(text => `<p>${text}</p>`).join('');
        }
    }

    document.documentElement.lang = currentLang === 'de' ? 'de' : 'en';
}

// ========== GALLERY MODAL ==========
function attachModalListeners() {
    document.querySelectorAll('.dp-card').forEach(card => {
        card.removeEventListener('click', handleCardClick);
        card.addEventListener('click', handleCardClick);
    });
}

function handleCardClick(e) {
    const card = e.currentTarget;
    const id = card.dataset.id;
    const artwork = artworks.find(a => a.id === id);
    if (artwork) openModal(artwork);
}

function openModal(artwork) {
    const modal = document.getElementById('dp-gallery-modal');
    const img = modal.querySelector('.dp-modal-image');
    const title = modal.querySelector('.dp-modal-title');
    const desc = modal.querySelector('.dp-modal-description');
    const ref = modal.querySelector('.dp-modal-reference');

    img.src = artwork.image;
    img.alt = currentLang === 'de' ? artwork.title : artwork.titleEn;
    title.textContent = currentLang === 'de' ? artwork.title : artwork.titleEn;
    desc.textContent = currentLang === 'de' ? artwork.description : artwork.descriptionEn;
    ref.textContent = `Referenz: ${artwork.reference}`;

    modal.hidden = false;
}

function setupGalleryModal() {
    const modal = document.getElementById('dp-gallery-modal');
    if (!modal) return;

    const overlay = modal.querySelector('.dp-modal-overlay');
    const closeBtn = modal.querySelector('.dp-modal-close');
    const leftArrow = modal.querySelector('.dp-modal-arrow.dp-left');
    const rightArrow = modal.querySelector('.dp-modal-arrow.dp-right');
    const modalImg = modal.querySelector('.dp-modal-image');
    const modalTitle = modal.querySelector('.dp-modal-title');
    const modalDesc = modal.querySelector('.dp-modal-description');
    const modalRef = modal.querySelector('.dp-modal-reference');

    let currentIndex = 0;
    let currentArtworks = [];

    function updateModal(index) {
        const artwork = currentArtworks[index];
        if (!artwork) return;

        modalImg.src = artwork.image;
        modalImg.alt = currentLang === 'de' ? artwork.title : artwork.titleEn;
        modalTitle.textContent = currentLang === 'de' ? artwork.title : artwork.titleEn;
        modalDesc.textContent = currentLang === 'de' ? artwork.description : artwork.descriptionEn;
        modalRef.textContent = `Referenz: ${artwork.reference}`;
    }

    function getCurrentArtworks() {
        const container = document.getElementById('artworks-container');
        if (!container) return [];

        const cards = container.querySelectorAll('.dp-card:not(.dp-hidden)');
        const ids = Array.from(cards).map(card => card.dataset.id);
        return artworks.filter(a => ids.includes(a.id));
    }

    function openModalFromCard(card) {
        currentArtworks = getCurrentArtworks();
        const id = card.dataset.id;
        currentIndex = currentArtworks.findIndex(a => a.id === id);
        if (currentIndex !== -1) {
            updateModal(currentIndex);
            modal.hidden = false;
        }
    }

    function showPrev() {
        if (currentArtworks.length === 0) return;
        currentIndex = (currentIndex - 1 + currentArtworks.length) % currentArtworks.length;
        updateModal(currentIndex);
    }

    function showNext() {
        if (currentArtworks.length === 0) return;
        currentIndex = (currentIndex + 1) % currentArtworks.length;
        updateModal(currentIndex);
    }

    function closeModal() {
        modal.hidden = true;
    }

    document.querySelectorAll('.dp-card').forEach(card => {
        card.addEventListener('click', () => openModalFromCard(card));
    });

    overlay?.addEventListener('click', closeModal);
    closeBtn?.addEventListener('click', closeModal);
    leftArrow?.addEventListener('click', showPrev);
    rightArrow?.addEventListener('click', showNext);

    document.addEventListener('keydown', (e) => {
        if (modal.hidden) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') showPrev();
        if (e.key === 'ArrowRight') showNext();
    });
}

// ========== SMOOTH SCROLL ENGINE ==========
function createScrollEngine(duration = 600) {
    const ease = (t) =>
        t < 0.5
            ? 16 * t * t * t * t * t
            : 1 - Math.pow(-2 * t + 2, 5) / 2;

    return function scrollToY(targetY, ms = duration) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) {
            window.scrollTo({ top: targetY, behavior: "auto" });
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            const startY = window.pageYOffset;
            const dist = targetY - startY;
            const start = performance.now();

            function step(now) {
                const t = Math.min(1, (now - start) / ms);
                const y = startY + dist * ease(t);
                window.scrollTo(0, y);
                if (t < 1) requestAnimationFrame(step);
                else resolve();
            }
            requestAnimationFrame(step);
        });
    };
}
const scrollToY = createScrollEngine(600);

// ========== SCROLL FUNCTIONS ==========
function setupScrollToTop(selector = ".dp-scrollTop") {
    const triggers = document.querySelectorAll(selector);
    triggers.forEach((el) => {
        el.style.cursor = "pointer";
        el.addEventListener("click", async (e) => {
            if (el.tagName === "A") e.preventDefault();
            await scrollToY(0);
        });
    });
}

function setupScrollSection({
    selector = 'nav a[href^="#"], a[href^="#"]',
    headerSelector = "header",
    duration = 600,
} = {}) {
    const header = document.querySelector(headerSelector);

    function getOffset() {
        return (header ? header.offsetHeight : 0) + 8;
    }

    document.querySelectorAll(selector).forEach((link) => {
        link.addEventListener("click", async (e) => {
            const hash = link.getAttribute("href");
            if (!hash || hash === "#" || !hash.startsWith("#")) return;

            const target = document.querySelector(hash);
            if (!target) return;

            e.preventDefault();
            const y =
                target.getBoundingClientRect().top +
                window.pageYOffset -
                getOffset();
            await scrollToY(y, duration);

            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
        });
    });
}

// ========== CARD ANIMATIONS ==========
function setupCardAnimations() {
    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    obs.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.4 }
    );
    document.querySelectorAll(".dp-card").forEach((card) => observer.observe(card));
}

// ========== FILTERS ==========
function initFilters() {
    document.querySelectorAll('.dp-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dp-filter-btn').forEach(b => b.classList.remove('dp-filter-active'));
            btn.classList.add('dp-filter-active');
            currentFilter = btn.dataset.filter;
            visibleCount = 12;
            renderArtworks();
        });
    });
}

// ========== LOAD MORE ==========
function initLoadMore() {
    const loadMoreBtn = document.getElementById('dp-load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            visibleCount += 12;
            renderArtworks();
        });
    }
}

// ========== LANGUAGE SWITCHER ==========
function initLanguageSwitcher() {
    document.querySelectorAll('.dp-lang-switcher').forEach(btn => {
        btn.addEventListener('click', async () => {
            currentLang = btn.dataset.lang;
            localStorage.setItem('language', currentLang);

            const { translations } = await loadData();
            applyTranslations(translations);
            renderArtworks();
        });
    });
}

// ========== CONTACT FORM ==========
function initContactForm() {
    const form = document.getElementById('contact-form');
    if (form) {
        form.action = 'https://formsubmit.co/1ef9999ba107cefe3d6c8f53a3108f36';
    }
}

// ========== PRIVACY NOTICE ==========
function initPrivacyNotice() {
    const banner = document.getElementById('dp-cookie-banner');
    const acceptBtn = document.getElementById('dp-accept-cookies');

    if (!banner || !acceptBtn) return;

    const dismissed = sessionStorage.getItem('privacy_notice_dismissed');

    if (!dismissed) {
        banner.hidden = false;
    }

    acceptBtn.addEventListener('click', () => {
        sessionStorage.setItem('privacy_notice_dismissed', 'true');
        banner.hidden = true;
    });
}

// ========== INITIALIZATION ==========
async function init() {
    const { translations } = await loadData();
    applyTranslations(translations);
    renderArtworks();

    initLanguageSwitcher();
    initFilters();
    initLoadMore();
    initContactForm();

    setupCardAnimations();
    setupScrollToTop(".dp-scrollTop");
    setupScrollSection();
    setupGalleryModal();
    initPrivacyNotice();
}

// Start the app
init();