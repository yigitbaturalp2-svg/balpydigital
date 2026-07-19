(() => {
  "use strict";

  const config = Object.freeze({
    supabaseUrl: "https://abfsosyhworkxzgzqxlu.supabase.co",
    publishableKey: "sb_publishable_plJTBHOUoaPOXLJvL4e1BQ_u8ECtnQG",
    redirectUrl: "https://balpydigital.com/sifre-yenile/",
    resendSeconds: 60,
  });

  const panels = [
    "loading-panel",
    "request-panel",
    "email-sent-panel",
    "password-panel",
    "invalid-panel",
    "success-panel",
  ];

  let accessToken = "";
  let refreshToken = "";
  let lastRequestedEmail = "";
  let resendRemaining = 0;
  let resendTimer = null;

  const element = (id) => document.getElementById(id);

  class AuthApiError extends Error {
    constructor(message, status, code) {
      super(message);
      this.name = "AuthApiError";
      this.status = status;
      this.code = code || "";
    }
  }

  function showPanel(id) {
    for (const panelId of panels) {
      element(panelId).hidden = panelId !== id;
    }
    const card = element("reset-card");
    card.focus?.({ preventScroll: true });
  }

  function sanitizeAddressBar() {
    if (!window.history?.replaceState) return;
    window.history.replaceState({}, document.title, "/sifre-yenile/");
  }

  function parseRecoveryParameters() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const result = {
      accessToken: hash.get("access_token") || "",
      refreshToken: hash.get("refresh_token") || "",
      type: hash.get("type") || query.get("type") || "",
      tokenHash: query.get("token_hash") || "",
      error: hash.get("error") || query.get("error") || "",
      errorCode: hash.get("error_code") || query.get("error_code") || "",
      errorDescription:
        hash.get("error_description") ||
        query.get("error_description") ||
        "",
    };
    sanitizeAddressBar();
    return result;
  }

  async function authRequest(path, options = {}) {
    const url = new URL(`${config.supabaseUrl}/auth/v1/${path}`);
    if (options.redirectTo) {
      url.searchParams.set("redirect_to", options.redirectTo);
    }

    const bearer = options.token || config.publishableKey;
    const response = await fetch(url, {
      method: options.method || "POST",
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (_) {
      payload = {};
    }

    if (!response.ok) {
      throw new AuthApiError(
        payload.msg || payload.message || payload.error_description || "İşlem tamamlanamadı.",
        response.status,
        payload.code || payload.error_code,
      );
    }
    return payload;
  }

  function userMessage(error, fallback) {
    if (error instanceof TypeError) {
      return "Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.";
    }

    const message = String(error?.message || "").toLocaleLowerCase("tr-TR");
    const code = String(error?.code || "").toLocaleLowerCase("tr-TR");
    if (
      error?.status === 429 ||
      code.includes("over_request_rate_limit") ||
      message.includes("rate limit")
    ) {
      return "Kısa sürede çok fazla istek gönderildi. Birkaç dakika sonra tekrar dene.";
    }
    if (
      error?.status === 401 ||
      code.includes("session") ||
      code.includes("otp_expired") ||
      message.includes("expired") ||
      message.includes("invalid token")
    ) {
      return "Bu bağlantının süresi dolmuş veya bağlantı daha önce kullanılmış. Yeni bir bağlantı iste.";
    }
    if (code.includes("weak_password") || message.includes("password")) {
      return "Bu şifre kabul edilmedi. En az 8 karakterlik farklı bir şifre dene.";
    }
    return fallback;
  }

  async function verifyTokenHash(tokenHash) {
    const payload = await authRequest("verify", {
      body: { token_hash: tokenHash, type: "recovery" },
    });
    return {
      accessToken: payload.access_token || "",
      refreshToken: payload.refresh_token || "",
    };
  }

  function openPasswordForm(tokens) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken || "";
    if (!accessToken) {
      showInvalid();
      return;
    }
    showPanel("password-panel");
    window.setTimeout(() => element("new-password").focus(), 80);
  }

  function showInvalid(message) {
    element("invalid-message").textContent =
      message ||
      "Bu şifre yenileme bağlantısının süresi dolmuş veya bağlantı daha önce kullanılmış olabilir.";
    showPanel("invalid-panel");
  }

  async function initialize() {
    const params = parseRecoveryParameters();
    if (params.error || params.errorDescription) {
      showInvalid(
        userMessage(
          new AuthApiError(params.errorDescription, 401, params.errorCode),
          "Bağlantı doğrulanamadı. Yeni bir şifre yenileme bağlantısı iste.",
        ),
      );
      return;
    }

    if (params.tokenHash && params.type === "recovery") {
      try {
        openPasswordForm(await verifyTokenHash(params.tokenHash));
      } catch (error) {
        showInvalid(
          userMessage(error, "Bağlantı doğrulanamadı. Yeni bir bağlantı iste."),
        );
      }
      return;
    }

    if (params.accessToken && params.type === "recovery") {
      openPasswordForm(params);
      return;
    }

    showPanel("request-panel");
    window.setTimeout(() => element("request-email").focus(), 80);
  }

  function validateEmail(value) {
    const email = value.trim();
    if (!email) return "E-posta adresini gir.";
    if (email.length > 100) return "E-posta adresi 100 karakterden uzun olamaz.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return "Geçerli bir e-posta adresi gir.";
    }
    return "";
  }

  function setFieldError(inputId, errorId, message) {
    const input = element(inputId);
    const error = element(errorId);
    input.setAttribute("aria-invalid", message ? "true" : "false");
    error.textContent = message;
  }

  function setFormMessage(id, message) {
    const messageElement = element(id);
    messageElement.textContent = message || "";
    messageElement.hidden = !message;
  }

  function setButtonBusy(button, busy, busyText, normalText) {
    button.disabled = busy;
    button.setAttribute("aria-busy", busy ? "true" : "false");
    button.querySelector("span").textContent = busy ? busyText : normalText;
  }

  async function requestReset(email, isResend = false) {
    const submit = isResend ? element("resend-button") : element("request-submit");
    if (isResend) {
      submit.disabled = true;
      submit.textContent = "Gönderiliyor…";
      setFormMessage("resend-message", "");
    } else {
      setButtonBusy(submit, true, "Gönderiliyor…", "Bağlantı gönder");
      setFormMessage("request-message", "");
    }

    try {
      await authRequest("recover", {
        redirectTo: config.redirectUrl,
        body: { email },
      });
      lastRequestedEmail = email;
      element("sent-email").textContent = email;
      showPanel("email-sent-panel");
      startResendCountdown();
    } catch (error) {
      const message = userMessage(
        error,
        "Bağlantı gönderilemedi. Biraz sonra tekrar dene.",
      );
      if (isResend) {
        setFormMessage("resend-message", message);
        showPanel("email-sent-panel");
        startResendCountdown();
      } else {
        setFormMessage("request-message", message);
      }
    } finally {
      if (!isResend) {
        setButtonBusy(submit, false, "Gönderiliyor…", "Bağlantı gönder");
      }
    }
  }

  function updateResendButton() {
    const button = element("resend-button");
    if (resendRemaining > 0) {
      button.disabled = true;
      button.textContent = `Tekrar gönder (${resendRemaining} sn)`;
      return;
    }
    button.disabled = false;
    button.textContent = "Bağlantıyı tekrar gönder";
  }

  function startResendCountdown() {
    if (resendTimer) window.clearInterval(resendTimer);
    resendRemaining = config.resendSeconds;
    updateResendButton();
    resendTimer = window.setInterval(() => {
      resendRemaining -= 1;
      updateResendButton();
      if (resendRemaining <= 0) {
        window.clearInterval(resendTimer);
        resendTimer = null;
      }
    }, 1000);
  }

  async function refreshRecoverySession() {
    if (!refreshToken) throw new AuthApiError("Recovery session expired.", 401, "session_expired");
    const payload = await authRequest("token?grant_type=refresh_token", {
      body: { refresh_token: refreshToken },
    });
    accessToken = payload.access_token || "";
    refreshToken = payload.refresh_token || refreshToken;
    if (!accessToken) throw new AuthApiError("Recovery session expired.", 401, "session_expired");
  }

  async function savePassword(password, allowRefresh = true) {
    try {
      return await authRequest("user", {
        method: "PUT",
        token: accessToken,
        body: { password },
      });
    } catch (error) {
      if (allowRefresh && error?.status === 401 && refreshToken) {
        await refreshRecoverySession();
        return savePassword(password, false);
      }
      throw error;
    }
  }

  element("request-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = element("request-email").value.trim();
    const validationError = validateEmail(email);
    setFieldError("request-email", "request-email-error", validationError);
    if (validationError) return;
    await requestReset(email);
  });

  element("password-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = element("new-password").value;
    const confirmation = element("confirm-password").value;
    let passwordError = "";
    let confirmationError = "";

    if (!password) passwordError = "Yeni şifreni gir.";
    else if (password.length < 8) passwordError = "Şifre en az 8 karakter olmalı.";
    else if (password.length > 128) passwordError = "Şifre 128 karakterden uzun olamaz.";
    if (!confirmation) confirmationError = "Şifreni tekrar gir.";
    else if (confirmation !== password) confirmationError = "Şifreler eşleşmiyor.";

    setFieldError("new-password", "new-password-error", passwordError);
    setFieldError("confirm-password", "confirm-password-error", confirmationError);
    setFormMessage("password-message", "");
    if (passwordError || confirmationError) return;

    const submit = element("password-submit");
    setButtonBusy(submit, true, "Güncelleniyor…", "Şifreyi güncelle");
    try {
      await savePassword(password);
      accessToken = "";
      refreshToken = "";
      element("new-password").value = "";
      element("confirm-password").value = "";
      showPanel("success-panel");
    } catch (error) {
      const message = userMessage(
        error,
        "Şifre güncellenemedi. Biraz sonra tekrar dene.",
      );
      if (error?.status === 401) showInvalid(message);
      else setFormMessage("password-message", message);
    } finally {
      setButtonBusy(submit, false, "Güncelleniyor…", "Şifreyi güncelle");
    }
  });

  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = element(button.dataset.target);
      const revealing = input.type === "password";
      input.type = revealing ? "text" : "password";
      button.textContent = revealing ? "Gizle" : "Göster";
      button.setAttribute(
        "aria-label",
        `${button.dataset.target === "new-password" ? "Yeni şifreyi" : "Şifre tekrarını"} ${revealing ? "gizle" : "göster"}`,
      );
    });
  });

  element("resend-button").addEventListener("click", () => {
    if (lastRequestedEmail && resendRemaining <= 0) {
      requestReset(lastRequestedEmail, true);
    }
  });

  element("change-email-button").addEventListener("click", () => {
    showPanel("request-panel");
    element("request-email").focus();
  });

  element("new-link-button").addEventListener("click", () => {
    showPanel("request-panel");
    element("request-email").focus();
  });

  initialize().catch(() => {
    sanitizeAddressBar();
    showInvalid("Bağlantı doğrulanamadı. Yeni bir şifre yenileme bağlantısı iste.");
  });
})();
