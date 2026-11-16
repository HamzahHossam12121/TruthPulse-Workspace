/* TruthPulse homepage behavior — navigation, motion, and cookie-session auth. */
(function () {
  "use strict";

  const nav = document.querySelector(".site-navbar");
  const updateNav = () => { if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 24); };
  updateNav();
  window.addEventListener("scroll", updateNav, { passive: true });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealTargets = document.querySelectorAll(
    ".hero .col-lg-7, .hero .col-lg-5, .section-heading, .feature-card, .company-section .row > div, .cta-section .container, .site-footer .row > div"
  );
  if (!reduceMotion && "IntersectionObserver" in window) {
    revealTargets.forEach((element, index) => {
      element.classList.add("motion-reveal");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 3, 2) * 90}ms`);
    });
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          instance.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    revealTargets.forEach((element) => observer.observe(element));
  } else revealTargets.forEach((element) => element.classList.add("is-visible"));

  const navCollapse = document.getElementById("mainNav");
  if (navCollapse) {
    navCollapse.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      if (window.bootstrap?.Collapse && navCollapse.classList.contains("show")) {
        window.bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
      }
    }));
  }

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const continueBtn = document.getElementById("continueBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const ctaSignupBtn = document.getElementById("ctaSignupBtn");
  const footerAuthLink = document.getElementById("footerAuthLink");
  const chatLinks = document.querySelectorAll('a[href="chat.html"]');
  let lastKnownAuthenticated = false;

  function updateAuthUI(isLoggedIn) {
    lastKnownAuthenticated = isLoggedIn;
    [loginBtn, signupBtn, ctaSignupBtn, footerAuthLink].forEach((element) => {
      if (element) element.classList.toggle("d-none", isLoggedIn);
    });
    if (continueBtn) {
      continueBtn.classList.toggle("d-none", !isLoggedIn);
      continueBtn.textContent = "Continue to Chat";
    }
    if (logoutBtn) logoutBtn.classList.toggle("d-none", !isLoggedIn);
    chatLinks.forEach((link) => {
      if (link.id !== "continueBtn") link.textContent = isLoggedIn ? "Continue to Chat" : "Try Now";
    });
  }

  async function checkAuth({ preserveOnNetworkError = false } = {}) {
    if (!window.TruthPulseAPI || typeof window.TruthPulseAPI.currentUser !== "function") {
      console.error("TruthPulse API client is not loaded. Check config.js and api.js script order.");
      return false;
    }
    try {
      const response = await window.TruthPulseAPI.currentUser();
      // Backend /api/auth/me returns { success: true, account: {...} }.
      const isLoggedIn = response?.success === true && Boolean(response.account?.accountId || response.account?.email);
      updateAuthUI(isLoggedIn);
      return isLoggedIn;
    } catch (error) {
      // A 401 means the session is definitely absent/expired. For network or
      // CORS failures on a BFCache restore, retain the last known UI state.
      if (error.status === 401 || !preserveOnNetworkError) updateAuthUI(false);
      if (error.status !== 401) console.error("Could not check the current user session:", error);
      return false;
    }
  }

  async function handleLogout() {
    if (!window.TruthPulseAPI || typeof window.TruthPulseAPI.logout !== "function") return;
    if (logoutBtn) { logoutBtn.disabled = true; logoutBtn.setAttribute("aria-busy", "true"); }
    try {
      await window.TruthPulseAPI.logout();
      updateAuthUI(false);
    } catch (error) {
      console.error("Logout failed:", error);
      await checkAuth();
    } finally {
      if (logoutBtn) { logoutBtn.disabled = false; logoutBtn.removeAttribute("aria-busy"); }
    }
  }

  if (loginBtn || signupBtn || continueBtn || logoutBtn) {
    // Start from signed-out controls on a fresh page load, then confirm the
    // backend session. On browser Back/Forward cache restores, revalidate the
    // cookie instead of leaving the page's stale pre-login UI in place.
    updateAuthUI(false);
    checkAuth();
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) checkAuth({ preserveOnNetworkError: true });
    });
    logoutBtn?.addEventListener("click", handleLogout);
  }
})();
