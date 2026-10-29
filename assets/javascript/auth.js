/* ============================================================
   TruthPulse AUTH — validation + optional backend connection
   IMPORTANT:
   - Browser validation improves UX only; the server MUST validate again.
   - Passwords are sent over HTTPS to the backend and are never stored here.
   - The backend must hash passwords with Argon2id or bcrypt and use
     Secure, HttpOnly, SameSite session cookies. Never store passwords/tokens
     in localStorage or sessionStorage.
   ============================================================ */
(function initAuthPage() {
  "use strict";

  if (typeof CONFIG !== "undefined" && CONFIG.USE_LIVE_AUTH) {
    document.querySelectorAll(".auth-demo-notice").forEach((notice) => notice.remove());
  }

  document.querySelectorAll(".auth-toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.getAttribute("data-toggle-for"));
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      const icon = btn.querySelector("i");
      if (icon) icon.className = show ? "bi bi-eye-slash" : "bi bi-eye";
    });
  });

  function setFieldError(input, error, message) {
    if (!input || !error) return;
    input.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    error.textContent = message || "";
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  function passwordRules(value) {
    return {
      length: value.length >= 8,
      lower: /[a-z]/.test(value),
      upper: /[A-Z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9\s]/.test(value)
    };
  }

  function updatePasswordChecklist(value) {
    const list = document.getElementById("passwordRules");
    if (!list) return passwordRules(value);
    const rules = passwordRules(value);
    list.querySelectorAll("[data-rule]").forEach((item) => {
      const key = item.getAttribute("data-rule");
      const passed = Boolean(rules[key]);
      item.classList.toggle("is-met", passed);
      const icon = item.querySelector("i");
      if (icon) icon.className = passed ? "bi bi-check-circle-fill" : "bi bi-circle";
    });
    return rules;
  }

  function showNotice(message, type = "info") {
    let notice = document.getElementById("authBackendNotice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "authBackendNotice";
      notice.className = "auth-backend-notice";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      const icon = document.createElement("i");
      icon.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      notice.append(icon, text);
      const form = document.querySelector(".auth-form");
      if (form) form.insertAdjacentElement("afterend", notice);
    }
    notice.classList.toggle("is-error", type === "error");
    notice.querySelector("i").className = type === "error"
      ? "bi bi-exclamation-triangle"
      : type === "success" ? "bi bi-check-circle" : "bi bi-info-circle";
    notice.querySelector("span").textContent = message;
    notice.hidden = false;
  }

  function setSubmitting(button, isSubmitting, defaultText) {
    if (!button) return;
    button.disabled = isSubmitting;
    button.setAttribute("aria-busy", isSubmitting ? "true" : "false");
    button.textContent = isSubmitting ? "Please wait…" : defaultText;
  }

  // Signup
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    const fullName = document.getElementById("fullName");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const submitBtn = document.getElementById("signupSubmit");
    const fullNameError = document.getElementById("fullNameError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");
    const defaultText = submitBtn.textContent.trim();

    password.addEventListener("input", () => {
      const rules = updatePasswordChecklist(password.value);
      setFieldError(password, passwordError,
        password.value && !Object.values(rules).every(Boolean)
          ? "Your password is missing one or more requirements below."
          : "");
      if (confirmPassword.value) {
        setFieldError(confirmPassword, confirmPasswordError,
          confirmPassword.value === password.value ? "" : "Passwords do not match.");
      }
    });

    confirmPassword.addEventListener("input", () => {
      setFieldError(confirmPassword, confirmPasswordError,
        !confirmPassword.value || confirmPassword.value === password.value
          ? "" : "Passwords do not match.");
    });

    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      let valid = true;
      const nameValue = fullName.value.trim();
      const emailValue = email.value.trim().toLowerCase();
      const rules = updatePasswordChecklist(password.value);

      const nameMessage = nameValue.length < 2 ? "Please enter your full name." : "";
      setFieldError(fullName, fullNameError, nameMessage);
      if (nameMessage) valid = false;

      const emailMessage = isValidEmail(emailValue) ? "" : "Enter a valid email address.";
      setFieldError(email, emailError, emailMessage);
      if (emailMessage) valid = false;

      const passwordMessage = Object.values(rules).every(Boolean)
        ? "" : "Your password must meet every requirement listed below.";
      setFieldError(password, passwordError, passwordMessage);
      if (passwordMessage) valid = false;

      const confirmMessage = confirmPassword.value === password.value && confirmPassword.value
        ? "" : "Passwords do not match.";
      setFieldError(confirmPassword, confirmPasswordError, confirmMessage);
      if (confirmMessage) valid = false;

      if (!valid) {
        const firstInvalid = signupForm.querySelector(".is-invalid");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      if (typeof CONFIG === "undefined" || !CONFIG.USE_LIVE_AUTH) {
        showNotice("Demo mode: no account was created. The backend is not connected yet.");
        return;
      }

      if (!window.TruthPulseAPI) {
        showNotice("The API client is missing. Check that assets/javascript/api.js is loaded.", "error");
        return;
      }

      setSubmitting(submitBtn, true, defaultText);
      try {
        const result = await TruthPulseAPI.register({
          name: nameValue,
          email: emailValue,
          password: password.value
        });
        showNotice(
          result && typeof result.message === "string"
            ? result.message
            : "Registration request completed. Follow the backend's account verification flow.",
          "success"
        );
        signupForm.reset();
        updatePasswordChecklist("");
        // Do not store credentials in browser storage.
      } catch (error) {
        showNotice(
          error.status === 409
            ? "An account may already exist for this email. Try logging in."
            : error.message || "Could not create the account. Please try again.",
          "error"
        );
      } finally {
        setSubmitting(submitBtn, false, defaultText);
      }
    });
  }

  // Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const submitBtn = document.getElementById("loginSubmit");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const defaultText = submitBtn.textContent.trim();

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const emailValue = email.value.trim().toLowerCase();
      let valid = true;

      const emailMessage = isValidEmail(emailValue) ? "" : "Enter a valid email address.";
      setFieldError(email, emailError, emailMessage);
      if (emailMessage) valid = false;

      const passwordMessage = password.value ? "" : "Please enter your password.";
      setFieldError(password, passwordError, passwordMessage);
      if (passwordMessage) valid = false;

      if (!valid) {
        const firstInvalid = loginForm.querySelector(".is-invalid");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      if (typeof CONFIG === "undefined" || !CONFIG.USE_LIVE_AUTH) {
        showNotice("Demo mode: you are not logged in because the backend is not connected yet.");
        return;
      }

      if (!window.TruthPulseAPI) {
        showNotice("The API client is missing. Check that assets/javascript/api.js is loaded.", "error");
        return;
      }

      setSubmitting(submitBtn, true, defaultText);
      try {
        await TruthPulseAPI.login({ email: emailValue, password: password.value });
        // The backend should establish a Secure, HttpOnly session cookie.
        // The frontend deliberately does not persist the password or token.
        window.location.assign("chat.html");
      } catch (error) {
        showNotice(
          error.status === 401
            ? "Email or password is incorrect."
            : error.message || "Could not log in. Please try again.",
          "error"
        );
      } finally {
        setSubmitting(submitBtn, false, defaultText);
      }
    });
  }
})();
