/* ============================================================
   AUTH — CLIENT-SIDE VALIDATION + DEMO NOTICE
   ============================================================
    READ THIS:
   - Client-side validation is ONLY for user experience.
   - It is NOT a security boundary. The real backend must
     re-validate everything and enforce auth rules.
   - This file does NOT create accounts, log anyone in, store
     credentials, use localStorage/cookies, or call any API.
   - Real auth will be added in a later stage according to
     the backend's actual design.
   ============================================================ */

(function initAuthPage() {
  // ---------- Show/hide password toggles ----------
  document.querySelectorAll(".auth-toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-toggle-for");
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
      );

      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
      }
    });
  });

  // ---------- Helpers ----------
  function setFieldError(inputEl, errorEl, message) {
    if (message) {
      inputEl.classList.add("is-invalid");
      errorEl.textContent = message;
    } else {
      inputEl.classList.remove("is-invalid");
      errorEl.textContent = "";
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // ---------- Signup form ----------
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    const fullName          = document.getElementById("fullName");
    const email             = document.getElementById("email");
    const password          = document.getElementById("password");
    const confirmPassword   = document.getElementById("confirmPassword");
    const submitBtn         = document.getElementById("signupSubmit");

    const fullNameError        = document.getElementById("fullNameError");
    const emailError           = document.getElementById("emailError");
    const passwordError        = document.getElementById("passwordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");

    signupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      let valid = true;

      if (fullName.value.trim().length < 2) {
        setFieldError(fullName, fullNameError, "Please enter your full name.");
        valid = false;
      } else {
        setFieldError(fullName, fullNameError, "");
      }

      if (!isValidEmail(email.value.trim())) {
        setFieldError(email, emailError, "Enter a valid email address.");
        valid = false;
      } else {
        setFieldError(email, emailError, "");
      }

      if (password.value.length < 8) {
        setFieldError(
          password,
          passwordError,
          "Password must be at least 8 characters."
        );
        valid = false;
      } else {
        setFieldError(password, passwordError, "");
      }

      if (confirmPassword.value !== password.value || !confirmPassword.value) {
        setFieldError(
          confirmPassword,
          confirmPasswordError,
          "Passwords do not match."
        );
        valid = false;
      } else {
        setFieldError(confirmPassword, confirmPasswordError, "");
      }

      if (!valid) return;

      showBackendNotReadyNotice(
        submitBtn,
        "Sign-up is not connected to the backend yet. No account was created."
      );
    });
  }

  // ---------- Login form ----------
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const email       = document.getElementById("email");
    const password    = document.getElementById("password");
    const submitBtn   = document.getElementById("loginSubmit");

    const emailError    = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");

    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      let valid = true;

      if (!isValidEmail(email.value.trim())) {
        setFieldError(email, emailError, "Enter a valid email address.");
        valid = false;
      } else {
        setFieldError(email, emailError, "");
      }

      if (!password.value) {
        setFieldError(password, passwordError, "Please enter your password.");
        valid = false;
      } else {
        setFieldError(password, passwordError, "");
      }

      if (!valid) return;

      showBackendNotReadyNotice(
        submitBtn,
        "Login is not connected to the backend yet. You are not logged in."
      );
    });
  }

  // ---------- Notice builder ----------
  function showBackendNotReadyNotice(submitBtn, message) {
    const existing = document.getElementById("authBackendNotice");
    if (existing) existing.remove();

    const notice = document.createElement("div");
    notice.id = "authBackendNotice";
    notice.className = "auth-backend-notice";
    notice.setAttribute("role", "status");

    const icon = document.createElement("i");
    icon.className = "bi bi-exclamation-triangle";
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = message;

    notice.appendChild(icon);
    notice.appendChild(text);

    submitBtn.insertAdjacentElement("afterend", notice);

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Please wait…";
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }, 900);
  }
})();