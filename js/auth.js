(() => {

    const isFastAPIPort = window.location.protocol.startsWith("http") && window.location.port === "8000";
    const API_BASE = isFastAPIPort ? "" : "http://localhost:8000";

    function showAlert(form, type, message) {
        let alertBox = document.getElementById("authAlert");
        if (!alertBox) {
            alertBox = document.createElement("div");
            alertBox.id = "authAlert";
            form.parentNode.insertBefore(alertBox, form);
        }

        alertBox.className = `auth-alert auth-alert-${type}`;
        const icon = type === "success" 
            ? '<i class="fa-solid fa-circle-check"></i>' 
            : '<i class="fa-solid fa-triangle-exclamation"></i>';

        alertBox.innerHTML = `${icon}<span>${message}</span>`;
        alertBox.style.display = "flex";
        alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function clearAlert() {
        const alertBox = document.getElementById("authAlert");
        if (alertBox) {
            alertBox.style.display = "none";
            alertBox.innerHTML = "";
        }
    }

    function updateHeaderAuthState() {
        const userJson = localStorage.getItem("stackly_user");
        if (!userJson) return;

        let user = null;
        try {
            user = JSON.parse(userJson);
        } catch (e) {
            return;
        }

        if (!user || !user.fullname) return;

        const headerActions = document.querySelector(".header-actions");
        if (!headerActions) return;

        const loginBtn = headerActions.querySelector(".btn-nav-login");
        const signupBtn = headerActions.querySelector(".btn-nav-signup");
        if (loginBtn) loginBtn.style.display = "none";
        if (signupBtn) signupBtn.style.display = "none";

        const existingBadge = headerActions.querySelector(".user-logged-in-nav");
        if (existingBadge) existingBadge.remove();

        const badge = document.createElement("div");
        badge.className = "user-logged-in-nav";
        badge.innerHTML = `
            <span class="user-greeting" title="Logged in as ${user.identifier}">
                <i class="fa-solid fa-circle-user"></i> Hi, ${user.fullname}
            </span>
            <button class="btn-logout" id="logoutBtn" title="Sign out of your account">
                <i class="fa-solid fa-arrow-right-from-bracket"></i> Logout
            </button>
        `;
        headerActions.appendChild(badge);

        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                localStorage.removeItem("stackly_token");
                localStorage.removeItem("stackly_user");
                window.location.href = "login.html";
            });
        }
    }

    document.addEventListener("DOMContentLoaded", () => {

        updateHeaderAuthState();

        const form = document.querySelector(".login-section form");
        if (!form) return;

        const fullNameInput = document.getElementById("fullname");
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const submitBtn = form.querySelector('button[type="submit"]');

        const isSignupPage = Boolean(fullNameInput);

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("registered") === "true") {
            showAlert(form, "success", "Registration successful! Please log in with your credentials.");
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            clearAlert();

            const emailVal = emailInput ? emailInput.value.trim() : "";
            const passwordVal = passwordInput ? passwordInput.value.trim() : "";

            if (isSignupPage) {

                const fullNameVal = fullNameInput.value.trim();

                if (fullNameVal.length < 2) {
                    showAlert(form, "error", "Please enter your full name (minimum 2 characters).");
                    fullNameInput.focus();
                    return;
                }

                if (!emailVal) {
                    showAlert(form, "error", "Please enter your email or mobile number.");
                    emailInput.focus();
                    return;
                }

                if (passwordVal.length < 6) {
                    showAlert(form, "error", "Password must be at least 6 characters long.");
                    passwordInput.focus();
                    return;
                }

                const originalBtnHtml = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

                try {
                    const response = await fetch(`${API_BASE}/api/signup`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({
                            fullname: fullNameVal,
                            email: emailVal,
                            password: passwordVal
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        const errMsg = data.detail || (data.message || "Failed to register account. Please try again.");
                        showAlert(form, "error", errMsg);
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnHtml;
                        return;
                    }

                    showAlert(form, "success", "Account created successfully! Redirecting to login page...");
                    form.reset();

                    setTimeout(() => {
                        window.location.href = "login.html?registered=true";
                    }, 1200);

                } catch (error) {
                    console.error("Signup error:", error);
                    showAlert(form, "error", "Unable to connect to the backend server. Please verify the backend is running on port 8000.");
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }

            } else {

                if (!emailVal) {
                    showAlert(form, "error", "Please enter your registered email or mobile number.");
                    emailInput.focus();
                    return;
                }

                if (!passwordVal) {
                    showAlert(form, "error", "Please enter your password.");
                    passwordInput.focus();
                    return;
                }

                const originalBtnHtml = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

                try {
                    const response = await fetch(`${API_BASE}/api/login`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({
                            email: emailVal,
                            password: passwordVal
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        const errMsg = data.detail || (data.message || "Invalid credentials. Please try again.");
                        showAlert(form, "error", errMsg);
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnHtml;
                        return;
                    }

                    localStorage.setItem("stackly_token", data.access_token);
                    localStorage.setItem("stackly_user", JSON.stringify(data.user));

                    showAlert(form, "success", `Welcome back, ${data.user.fullname}! Redirecting to home...`);

                    setTimeout(() => {
                        window.location.href = "home.html";
                    }, 1000);

                } catch (error) {
                    console.error("Login error:", error);
                    showAlert(form, "error", "Unable to connect to the backend server. Please verify the backend is running on port 8000.");
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }
            }
        });
    });
})();
