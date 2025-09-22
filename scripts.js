/* ---------- UTILS ---------- */
/* smooth scroll engine */
function createScrollEngine(duration = 600) {
    // Easing: easeInOutQuint (slower, more elegant curve)
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


/* ---------- FEATURES ---------- */
/* cards animations */
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
/* scroll to top */
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
/* scroll to section */
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
/* gallery modal */
/* ---------- GALLERY MODAL ---------- */
function setupGalleryModal() {
    const modal = document.getElementById("dp-gallery-modal");
    const overlay = modal.querySelector(".dp-modal-overlay");
    const closeBtn = modal.querySelector(".dp-modal-close");
    const leftArrow = modal.querySelector(".dp-modal-arrow.dp-left");
    const rightArrow = modal.querySelector(".dp-modal-arrow.dp-right");

    const modalImg = modal.querySelector(".dp-modal-image");
    const modalTitle = modal.querySelector(".dp-modal-title");
    const modalDesc = modal.querySelector(".dp-modal-description");
    const modalRef = modal.querySelector(".dp-modal-reference");

    const cards = Array.from(document.querySelectorAll(".dp-cards-container .dp-card"));
    let currentIndex = 0;

    function openModal(index) {
        currentIndex = index;
        const card = cards[currentIndex];
        const img = card.querySelector("img");
        const title = card.querySelector("h4");
        const desc = card.querySelector("p");
        const ref = card.querySelector("span");

        modalImg.src = img.src;
        modalImg.alt = title.textContent || "Artwork";
        modalTitle.textContent = title.textContent;
        modalDesc.textContent = desc ? desc.textContent : "";
        modalRef.textContent = ref ? ref.textContent : "";

        modal.removeAttribute("hidden");
    }

    function closeModal() {
        modal.setAttribute("hidden", true);
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + cards.length) % cards.length;
        openModal(currentIndex);
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % cards.length;
        openModal(currentIndex);
    }

    // Listeners
    cards.forEach((card, index) => {
        card.addEventListener("click", () => openModal(index));
    });
    overlay.addEventListener("click", closeModal);
    closeBtn.addEventListener("click", closeModal);
    leftArrow.addEventListener("click", showPrev);
    rightArrow.addEventListener("click", showNext);

    // Escape key closes modal
    document.addEventListener("keydown", (e) => {
        if (modal.hasAttribute("hidden")) return;
        if (e.key === "Escape") closeModal();
        if (e.key === "ArrowLeft") showPrev();
        if (e.key === "ArrowRight") showNext();
    });
}


/* ---------- BOOT ---------- */
$(document).ready(function () {
    setupCardAnimations();
    setupScrollToTop(".dp-scrollTop");
    setupScrollSection();
    setupGalleryModal();
});
