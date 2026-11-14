/* TruthPulse homepage behavior — navigation, motion, and authentication. */
(function () {
  "use strict";

  // Navigation scroll effect.
  const nav = document.querySelector(".site-navbar");
  const updateNav = () => {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  updateNav();
  window.addEventListener("scroll", updateNav, { passive: true });

  // Accessible reveal animations.
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
  } else {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
  }

  // Close the mobile menu after following a navigation link.
  const navCollapse = document.getElementById("mainNav");
  if (navCollapse) {
    navCollapse.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (
          window.bootstrap &&
          window.bootstrap.Collapse &&
          navCollapse.classList.contains("show")
        ) {
          window.bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
        }
      });
    });
  }

  // Homepage authentication controls.
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const continueBtn = document.getElementById("continueBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const ctaSignupBtn = document.getElementById("ctaSignupBtn");
  const footerAuthLink = document.getElementById("footerAuthLink");

  function updateAuthUI(isLoggedIn) {
    // Signed-out controls.
    [loginBtn, signupBtn, ctaSignupBtn, footerAuthLink].forEach((element) => {
      if (element) element.classList.toggle("d-none", isLoggedIn);
    });

    // Signed-in controls.
    if (continueBtn) continueBtn.classList.toggle("d-none", !isLoggedIn);
    if (logoutBtn) logoutBtn.classList.toggle("d-none", !isLoggedIn);
  }

  function responseHasUser(response) {
    if (!response || typeof response !== "object") return false;
    if (response.authenticated === true || response.is_authenticated === true) return true;

    const user = response.user;
    if (user && typeof user === "object") return true;
    if (response.id || response.email) return true;

    return false;
  }

  async function checkAuth() {
    // Fail closed: show signed-out controls until the backend confirms a session.
    updateAuthUI(false);

    if (!window.TruthPulseAPI || typeof window.TruthPulseAPI.currentUser !== "function") {
      console.error("TruthPulse API client is not loaded. Check config.js and api.js script order.");
      return false;
    }

    try {
      const response = await window.TruthPulseAPI.currentUser();
      const isLoggedIn = responseHasUser(response);
      updateAuthUI(isLoggedIn);
      return isLoggedIn;
    } catch (error) {
      // 401 and network/server errors both fall back to signed-out controls.
      updateAuthUI(false);
      if (error.status !== 401) {
        console.error("Could not check the current user session:", error);
      }
      return false;
    }
  }

  async function handleLogout() {
    if (!window.TruthPulseAPI || typeof window.TruthPulseAPI.logout !== "function") {
      console.error("TruthPulse logout API is not loaded.");
      return;
    }

    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.setAttribute("aria-busy", "true");
    }

    try {
      // The backend clears the session cookie.
      await window.TruthPulseAPI.logout();
      updateAuthUI(false);
    } catch (error) {
      console.error("Logout failed:", error);
      // Re-check session state rather than claiming logout succeeded.
      await checkAuth();
    } finally {
      if (logoutBtn) {
        logoutBtn.disabled = false;
        logoutBtn.removeAttribute("aria-busy");
      }
    }
  }

  const hasAuthControls = loginBtn || signupBtn || continueBtn || logoutBtn;
  if (hasAuthControls) {
    checkAuth();
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  }
})();
