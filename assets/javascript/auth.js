/* ============================================================
   TruthPulse AUTH — client-side validation + cookie-session flow.
   Passwords and session tokens are never stored in browser storage.
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
  function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value); }
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
      const passed = Boolean(rules[item.getAttribute("data-rule")]);
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
      document.querySelector(".auth-form")?.insertAdjacentElement("afterend", notice);
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
  function ensureLiveAuth() {
    if (typeof CONFIG === "undefined" || !CONFIG.USE_LIVE_AUTH) {
      showNotice("Live sign-in is not configured.", "error");
      return false;
    }
    if (!window.TruthPulseAPI) {
      showNotice("The API client is missing. Check that assets/javascript/api.js is loaded.", "error");
      return false;
    }
    return true;
  }
  async function verifySession() {
    // Fetch uses credentials: include; this confirms the browser accepted the
    // HttpOnly cookie and is sending it back before we navigate to chat.
    const result = await TruthPulseAPI.currentUser();
    if (!result?.success || !result?.account) throw new Error("The session cookie was not accepted. Please check your browser cookie settings and try again.");
    return result.account;
  }

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
      setFieldError(password, passwordError, password.value && !Object.values(rules).every(Boolean)
        ? "Your password is missing one or more requirements below." : "");
      if (confirmPassword.value) setFieldError(confirmPassword, confirmPasswordError,
        confirmPassword.value === password.value ? "" : "Passwords do not match.");
    });
    confirmPassword.addEventListener("input", () => setFieldError(confirmPassword, confirmPasswordError,
      !confirmPassword.value || confirmPassword.value === password.value ? "" : "Passwords do not match."));

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
      const passwordMessage = Object.values(rules).every(Boolean) ? "" : "Your password must meet every requirement listed below.";
      setFieldError(password, passwordError, passwordMessage);
      if (passwordMessage) valid = false;
      const confirmMessage = confirmPassword.value === password.value && confirmPassword.value ? "" : "Passwords do not match.";
      setFieldError(confirmPassword, confirmPasswordError, confirmMessage);
      if (confirmMessage) valid = false;
      if (!valid) { signupForm.querySelector(".is-invalid")?.focus(); return; }
      if (!ensureLiveAuth()) return;

      setSubmitting(submitBtn, true, defaultText);
      try {
        await TruthPulseAPI.register({ name: nameValue, email: emailValue, password: password.value });
        await verifySession();
        window.location.assign("chat.html");
      } catch (error) {
        showNotice(error.status === 409
          ? "An account may already exist for this email. Try logging in."
          : error.message || "Could not create the account or verify its sign-in session. Please try again.", "error");
      } finally {
        setSubmitting(submitBtn, false, defaultText);
      }
    });
  }

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
      if (!valid) { loginForm.querySelector(".is-invalid")?.focus(); return; }
      if (!ensureLiveAuth()) return;

      setSubmitting(submitBtn, true, defaultText);
      try {
        await TruthPulseAPI.login({ email: emailValue, password: password.value });
        await verifySession();
        window.location.assign("chat.html");
      } catch (error) {
        showNotice(error.status === 404
          ? "No account exists for this email. Please sign up first."
          : error.status === 401
            ? "Email or password is incorrect."
            : error.message || "Could not log in or verify the sign-in session. Please try again.", "error");
      } finally {
        setSubmitting(submitBtn, false, defaultText);
      }
    });
  }
})();
