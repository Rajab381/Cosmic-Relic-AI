/**
 * Cosmic Relic AI - Authentication & Entry Screen Controller
 * Handles:
 * - Session verification (/api/auth/me)
 * - Sign In & Create Account flows with inline validation
 * - Google Sheets backend integration via Express proxy
 * - Continue as Guest flow
 * - Smooth transition into main application
 * - Full Dark/Light mode synchronization
 * - User state & Logout controls
 */

(function () {
    'use strict';

    let currentAuthUser = null;
    let isGuestSession = false;

    // Elements cache
    function getEls() {
        return {
            entryScreen: document.getElementById('entryScreen'),
            appContainer: document.getElementById('appContainer'),
            macosDock: document.getElementById('macosDock'),
            authHubView: document.getElementById('authHubView'),
            authSignInView: document.getElementById('authSignInView'),
            authRegisterView: document.getElementById('authRegisterView'),
            authCheckingOverlay: document.getElementById('authCheckingOverlay'),

            // Sign In elements
            signInUsername: document.getElementById('signInUsername'),
            signInPassword: document.getElementById('signInPassword'),
            signInBtn: document.getElementById('signInBtn'),
            signInError: document.getElementById('signInError'),

            // Register elements
            regUsername: document.getElementById('regUsername'),
            regEmail: document.getElementById('regEmail'),
            regPassword: document.getElementById('regPassword'),
            regConfirmPassword: document.getElementById('regConfirmPassword'),
            regBtn: document.getElementById('regBtn'),
            regError: document.getElementById('regError'),

            // Guest element
            guestBtn: document.getElementById('guestBtn'),

            // User indicator in main app
            userProfileBadge: document.getElementById('dockUserProfileBadge'),
            userProfileName: document.getElementById('dockUserProfileName')
        };
    }

    // Initialize Interactive Particles on entry screen
    function initEntryParticles() {
        if (!window.InteractiveParticles) return;
        if (!window.entryParticles) {
            window.entryParticles = new window.InteractiveParticles('entryParticlesCanvas');
        } else {
            window.entryParticles.start();
            window.entryParticles.playIntro();
        }
    }

    function stopEntryParticles() {
        if (window.entryParticles) {
            window.entryParticles.stop();
        }
    }

    // View Navigation
    function showHubView() {
        const els = getEls();
        if (els.authSignInView) els.authSignInView.style.display = 'none';
        if (els.authRegisterView) els.authRegisterView.style.display = 'none';
        if (els.authHubView) els.authHubView.style.display = 'flex';
        clearErrors();
    }

    function showSignInView() {
        const els = getEls();
        if (els.authHubView) els.authHubView.style.display = 'none';
        if (els.authRegisterView) els.authRegisterView.style.display = 'none';
        if (els.authSignInView) {
            els.authSignInView.style.display = 'flex';
            if (els.signInUsername) els.signInUsername.focus();
        }
        clearErrors();
    }

    function showRegisterView() {
        const els = getEls();
        if (els.authHubView) els.authHubView.style.display = 'none';
        if (els.authSignInView) els.authSignInView.style.display = 'none';
        if (els.authRegisterView) {
            els.authRegisterView.style.display = 'flex';
            if (els.regUsername) els.regUsername.focus();
        }
        clearErrors();
    }

    function clearErrors() {
        const els = getEls();
        if (els.signInError) {
            els.signInError.textContent = '';
            els.signInError.style.display = 'none';
        }
        if (els.regError) {
            els.regError.textContent = '';
            els.regError.style.display = 'none';
        }
    }

    function showError(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }

    // Enter Main Application
    function enterMainApplication(user, isGuest, instant = false) {
        currentAuthUser = user;
        isGuestSession = isGuest;

        const els = getEls();

        // Update profile indicator in main dock / header
        if (els.userProfileBadge && els.userProfileName) {
            if (user && !isGuest) {
                els.userProfileName.textContent = user.username || 'Explorer';
                els.userProfileBadge.style.display = 'flex';
                els.userProfileBadge.setAttribute('data-label', `${user.username} • Sign Out`);
                els.userProfileBadge.title = `Signed in as ${user.username}. Click to Sign Out.`;
            } else if (isGuest) {
                els.userProfileName.textContent = 'Guest';
                els.userProfileBadge.style.display = 'flex';
                els.userProfileBadge.setAttribute('data-label', 'Guest • Sign In');
                els.userProfileBadge.title = 'Operating in Guest Session. Click to Sign In.';
            } else {
                els.userProfileBadge.style.display = 'none';
            }
        }

        // Smooth visual transition or instant bypass
        if (els.entryScreen) {
            if (instant) {
                els.entryScreen.style.display = 'none';
                stopEntryParticles();
            } else {
                els.entryScreen.classList.add('fade-out');
                setTimeout(() => {
                    els.entryScreen.style.display = 'none';
                    els.entryScreen.classList.remove('fade-out');
                    stopEntryParticles();
                }, 450);
            }
        }

        if (els.macosDock) els.macosDock.style.display = 'flex';
        if (els.appContainer) els.appContainer.style.display = 'block';

        // Trigger any dependent resizes
        window.dispatchEvent(new Event('resize'));
    }

    // Exit to Entry Screen (Logout)
    function returnToEntryScreen() {
        currentAuthUser = null;
        isGuestSession = false;

        // Cleanly disable Air Mouse if active
        if (window.cosmicAirMouse && typeof window.cosmicAirMouse.disable === 'function') {
            try { window.cosmicAirMouse.disable(); } catch (_) {}
        }

        const els = getEls();

        if (els.macosDock) els.macosDock.style.display = 'none';
        if (els.appContainer) els.appContainer.style.display = 'none';

        if (els.entryScreen) {
            els.entryScreen.style.display = 'flex';
            showHubView();
            initEntryParticles();
        }
    }

    // User badge click in Dock
    function handleUserBadgeClick() {
        if (isGuestSession) {
            returnToEntryScreen();
        } else {
            handleLogout();
        }
    }

    // Session Verification
    async function checkSession() {
        const els = getEls();
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();

            if (data.ok && data.authenticated && data.user) {
                // User already has active authenticated session: skip entry screen
                enterMainApplication(data.user, false, true);
                return;
            } else if (data.ok && data.isGuest) {
                // Guest session already active: skip entry screen
                enterMainApplication({ username: 'Guest Explorer' }, true, true);
                return;
            }
        } catch (err) {
            console.warn('[Cosmic Auth] Session check notice:', err);
        }

        // No active session: reveal Entry Screen
        if (els.macosDock) els.macosDock.style.display = 'none';
        if (els.appContainer) els.appContainer.style.display = 'none';
        if (els.entryScreen) {
            els.entryScreen.style.display = 'flex';
            showHubView();
            initEntryParticles();
        }
    }

    // Sign In Handler
    async function handleSignIn(e) {
        if (e && e.preventDefault) e.preventDefault();
        const els = getEls();
        clearErrors();

        const username = els.signInUsername ? els.signInUsername.value.trim() : '';
        const password = els.signInPassword ? els.signInPassword.value : '';

        if (!username) {
            showError(els.signInError, 'Please enter your username.');
            if (els.signInUsername) els.signInUsername.focus();
            return;
        }

        if (!password) {
            showError(els.signInError, 'Please enter your password.');
            if (els.signInPassword) els.signInPassword.focus();
            return;
        }

        const btn = els.signInBtn;
        const origText = btn ? btn.textContent : 'Sign In';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Signing in...';
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                showError(els.signInError, data.error || 'Invalid username or password.');
                return;
            }

            // Success
            enterMainApplication(data.user, false);
            if (typeof window.showCosmicNotification === 'function') {
                window.showCosmicNotification(`Welcome back, ${data.user.username}. Session initialized.`);
            }
        } catch (err) {
            showError(els.signInError, 'Network or server error. Please try again.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = origText;
            }
        }
    }

    // Create Account Handler
    async function handleRegister(e) {
        if (e && e.preventDefault) e.preventDefault();
        const els = getEls();
        clearErrors();

        const username = els.regUsername ? els.regUsername.value.trim() : '';
        const email = els.regEmail ? els.regEmail.value.trim() : '';
        const password = els.regPassword ? els.regPassword.value : '';
        const confirmPassword = els.regConfirmPassword ? els.regConfirmPassword.value : '';

        if (!username || username.length < 3) {
            showError(els.regError, 'Username must be at least 3 characters long.');
            if (els.regUsername) els.regUsername.focus();
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showError(els.regError, 'Username can only contain letters, numbers, and underscores.');
            if (els.regUsername) els.regUsername.focus();
            return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError(els.regError, 'Please enter a valid email address.');
            if (els.regEmail) els.regEmail.focus();
            return;
        }

        if (!password || password.length < 6) {
            showError(els.regError, 'Password must be at least 6 characters long.');
            if (els.regPassword) els.regPassword.focus();
            return;
        }

        if (password !== confirmPassword) {
            showError(els.regError, 'Passwords do not match.');
            if (els.regConfirmPassword) els.regConfirmPassword.focus();
            return;
        }

        const btn = els.regBtn;
        const origText = btn ? btn.textContent : 'Create Account';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creating account...';
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, confirmPassword })
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                showError(els.regError, data.error || 'Failed to create account.');
                return;
            }

            // Success: Auto-authenticate upon registration
            enterMainApplication(data.user, false);
            if (typeof window.showCosmicNotification === 'function') {
                window.showCosmicNotification(`Account created. Welcome to Cosmic Relic, ${data.user.username}.`);
            }
        } catch (err) {
            showError(els.regError, 'Network or database error. Please try again.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = origText;
            }
        }
    }

    // Continue as Guest Handler
    async function handleContinueAsGuest(e) {
        if (e && e.preventDefault) e.preventDefault();
        const els = getEls();
        const btn = els.guestBtn;

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Entering as Guest...';
        }

        try {
            const res = await fetch('/api/auth/guest', { method: 'POST' });
            const data = await res.json();

            enterMainApplication({ username: 'Guest Explorer' }, true);
            if (typeof window.showCosmicNotification === 'function') {
                window.showCosmicNotification('Entered as Guest. All six cores accessible.');
            }
        } catch (err) {
            // Client fallback if network hiccup
            enterMainApplication({ username: 'Guest Explorer' }, true);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Continue as Guest';
            }
        }
    }

    // Logout Handler
    async function handleLogout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (err) {
            console.warn('[Cosmic Auth] Logout notice:', err);
        }

        returnToEntryScreen();
        if (typeof window.showCosmicNotification === 'function') {
            window.showCosmicNotification('Logged out of Cosmic Relic.');
        }
    }

    // Password visibility toggle helper
    function togglePasswordVisibility(inputId, toggleBtn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
            toggleBtn.classList.toggle('active', isPassword);
        }
    }

    // Bind event listeners
    function bindAuthEvents() {
        const els = getEls();

        // Forms & Enter key submissions
        if (els.signInPassword) {
            els.signInPassword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleSignIn(e);
            });
        }
        if (els.regConfirmPassword) {
            els.regConfirmPassword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleRegister(e);
            });
        }

        // Expose public controller API on window
        window.cosmicAuth = {
            showHubView,
            showSignInView,
            showRegisterView,
            handleSignIn,
            handleRegister,
            handleContinueAsGuest,
            handleLogout,
            handleUserBadgeClick,
            togglePasswordVisibility,
            checkSession,
            getCurrentUser: () => currentAuthUser,
            isGuest: () => isGuestSession
        };
    }

    // Initialize on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            bindAuthEvents();
            checkSession();
        });
    } else {
        bindAuthEvents();
        checkSession();
    }
})();
