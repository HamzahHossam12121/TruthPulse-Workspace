/* TruthPulse motion and navigation — subtle, accessible, no dependencies. */
(function () {
  "use strict";
  const nav = document.querySelector(".site-navbar");
  const updateNav = () => {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };
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
  } else {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
  }

  // Close the mobile menu after following an in-page or page link.
  const navCollapse = document.getElementById("mainNav");
  if (navCollapse) {
    navCollapse.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.bootstrap && window.bootstrap.Collapse && navCollapse.classList.contains("show")) {
          window.bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
        }
      });
    });
  }
})();
