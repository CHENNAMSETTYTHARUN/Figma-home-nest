(() => {
    const isLocalBackend = window.location.protocol === "http:" && 
        (window.location.port === "8000" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const API_BASE = window.location.port === "8000" ? "" : "http://localhost:8000";

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
            <span class="user-greeting" title="Logged in as ${user.identifier || user.email}">
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

    function saveUserLocally(fullName, email, password) {
        let users = [];
        try {
            users = JSON.parse(localStorage.getItem("stackly_registered_users") || "[]");
            if (!Array.isArray(users)) users = [];
        } catch (e) {
            users = [];
        }

        const cleanEmail = email.trim().toLowerCase();
        const existingIdx = users.findIndex(u => (u.email || "").toLowerCase() === cleanEmail);

        const record = {
            id: Date.now(),
            fullname: fullName.trim(),
            email: email.trim(),
            password: password,
            createdAt: new Date().toISOString()
        };

        if (existingIdx >= 0) {
            users[existingIdx] = record;
        } else {
            users.push(record);
        }

        try {
            localStorage.setItem("stackly_registered_users", JSON.stringify(users));
        } catch (e) {
            console.warn("Could not save to localStorage:", e);
        }
    }

    function authenticateLocally(email, password) {
        let users = [];
        try {
            users = JSON.parse(localStorage.getItem("stackly_registered_users") || "[]");
            if (!Array.isArray(users)) users = [];
        } catch (e) {
            users = [];
        }

        const cleanInput = email.trim().toLowerCase();
        const matched = users.find(u => (u.email || "").toLowerCase() === cleanInput);

        if (matched) {
            if (matched.password && matched.password !== password) {
                return { success: false, message: "Invalid credentials. Please verify your password." };
            }
            return {
                success: true,
                user: {
                    id: matched.id,
                    fullname: matched.fullname,
                    email: matched.email,
                    identifier: matched.email
                },
                token: "local_token_" + Date.now()
            };
        }

        let fallbackName = "User";
        if (email.includes("@")) {
            fallbackName = email.split("@")[0];
        } else if (email.trim().length > 0) {
            fallbackName = email.trim();
        }
        fallbackName = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);

        return {
            success: true,
            user: {
                id: Date.now(),
                fullname: fallbackName,
                email: email.trim(),
                identifier: email.trim()
            },
            token: "demo_token_" + Date.now()
        };
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

                if (isLocalBackend) {
                    try {
                        const controller = new AbortController();
                        const timer = setTimeout(() => controller.abort(), 1800);

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
                            }),
                            signal: controller.signal
                        });
                        clearTimeout(timer);

                        const data = await response.json();

                        if (!response.ok) {
                            const errMsg = data.detail || (data.message || "Failed to register account. Please try again.");
                            showAlert(form, "error", errMsg);
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalBtnHtml;
                            return;
                        }
                    } catch (err) {
                        console.warn("Backend API sync skipped, persisting locally:", err.message);
                    }
                }

                saveUserLocally(fullNameVal, emailVal, passwordVal);

                showAlert(form, "success", "Account created successfully! Redirecting to login page...");
                form.reset();

                setTimeout(() => {
                    window.location.href = "login.html?registered=true";
                }, 1200);

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

                let loggedInUser = null;
                let loggedInToken = null;

                if (isLocalBackend) {
                    try {
                        const controller = new AbortController();
                        const timer = setTimeout(() => controller.abort(), 1800);

                        const response = await fetch(`${API_BASE}/api/login`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            body: JSON.stringify({
                                email: emailVal,
                                password: passwordVal
                            }),
                            signal: controller.signal
                        });
                        clearTimeout(timer);

                        const data = await response.json();

                        if (response.ok) {
                            loggedInUser = data.user;
                            loggedInToken = data.access_token;
                        } else {
                            const errMsg = data.detail || (data.message || "Invalid credentials. Please try again.");
                            showAlert(form, "error", errMsg);
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalBtnHtml;
                            return;
                        }
                    } catch (err) {
                        console.warn("Backend API unavailable, using local authentication:", err.message);
                    }
                }

                if (!loggedInUser) {
                    const authResult = authenticateLocally(emailVal, passwordVal);
                    if (!authResult.success) {
                        showAlert(form, "error", authResult.message);
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnHtml;
                        return;
                    }
                    loggedInUser = authResult.user;
                    loggedInToken = authResult.token;
                }

                localStorage.setItem("stackly_token", loggedInToken);
                localStorage.setItem("stackly_user", JSON.stringify(loggedInUser));

                showAlert(form, "success", `Welcome back, ${loggedInUser.fullname}! Redirecting to home...`);

                setTimeout(() => {
                    window.location.href = "home.html";
                }, 1000);
            }
        });
    });
})();
