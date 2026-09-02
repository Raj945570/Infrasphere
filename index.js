const API_URL = '';

/* ================= Global State ================= */
let currentUser = null;
let cartCount = 0;
let cartTotal = 0;
let expertsBooked = 3;
let activeProjects = 2;
let isAppInitialized = false;

/* App initialization is triggered at the bottom of the file after all functions are defined */

/* ================= Theme Management ================= */
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const htmlEl = document.documentElement;
  
  const savedTheme = localStorage.getItem('infrasphere-theme') || 
                     (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  htmlEl.setAttribute('data-theme', savedTheme);
  
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = htmlEl.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      htmlEl.setAttribute('data-theme', newTheme);
      localStorage.setItem('infrasphere-theme', newTheme);
      showToast(`Switched to ${newTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`);
    });
  }
}

/* ================= Role Permissions Mapping ================= */
const ROLE_PERMISSIONS = {
  Client: [
    '/dashboard',
    '/dashboard/shop',
    '/dashboard/consultants',
    '/dashboard/properties',
    '/dashboard/projects',
    '/dashboard/requests',
    '/dashboard/profile',
    '/profile'
  ],
  Seller: [
    '/dashboard',
    '/dashboard/add-product',
    '/dashboard/add-property',
    '/dashboard/my-listings',
    '/dashboard/sales',
    '/dashboard/shop-details',
    '/dashboard/profile',
    '/profile'
  ],
  Consultant: [
    '/dashboard',
    '/dashboard/services',
    '/dashboard/consultant-requests',
    '/dashboard/earnings',
    '/dashboard/profile',
    '/profile'
  ]
};

/* ================= Routing Controller ================= */
function navigateTo(path) {
  window.history.pushState({}, '', path);
  handleRouting();
}
window.navigateTo = navigateTo;

function initRouter() {
  window.addEventListener('popstate', () => {
    handleRouting();
  });

  // Global link click interceptor
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
      const href = link.getAttribute('href');
      if (href && (href.startsWith('/') || href.startsWith('#'))) {
        if (href.startsWith('#')) {
          const targetEl = document.querySelector(href);
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          e.preventDefault();
          navigateTo(href);
        }
      }
    }
  });

  window.switchTabDirect = function(targetTab) {
    if (targetTab === 'dashboard') {
      navigateTo('/dashboard');
    } else {
      navigateTo('/dashboard/' + targetTab);
    }
  };
}

async function handleRouting() {
  let path = window.location.pathname;
  const token = localStorage.getItem('infrasphere_token');
  const storedUser = localStorage.getItem('user');

  // Alias /profile to /dashboard/profile
  if (path === '/profile') {
    path = '/dashboard/profile';
  }

  // 1. Signup page: Always clear existing session to prevent old user data bugs
  if (path === '/signup') {
    localStorage.removeItem('infrasphere_token');
    localStorage.removeItem('user');
    currentUser = null;
    resetDOMUserData();
  }

  // 2. Unauthenticated Route Guards for Dashboard & Profile
  if (path.startsWith('/dashboard')) {
    if (!token || !storedUser) {
      localStorage.removeItem('infrasphere_token');
      localStorage.removeItem('user');
      currentUser = null;
      window.history.replaceState({}, '', '/login');
      handleRouting();
      return;
    }
  } else if (path === '/login') {
    // If user and token already exist on login page, redirect to dashboard
    if (token && storedUser) {
      window.history.replaceState({}, '', '/dashboard');
      handleRouting();
      return;
    }
  }

  // Hide all primary top-level views
  const landingPage = document.getElementById('landingPage');
  const authPage = document.getElementById('authPage');
  const appContainer = document.querySelector('.app-container');
  const startProjectPage = document.getElementById('startProjectPage');

  if (landingPage) landingPage.style.display = 'none';
  if (authPage) authPage.style.display = 'none';
  if (appContainer) appContainer.style.display = 'none';
  if (startProjectPage) startProjectPage.style.display = 'none';

  // Render current view
  if (path === '/') {
    if (landingPage) landingPage.style.display = 'flex';
  } else if (path === '/login' || path === '/signup') {
    if (authPage) {
      authPage.style.display = 'flex';
      toggleAuthMode(path === '/signup');
    }
  } else if (path === '/apply' || path === '/start-project' || path === '/project' || path === '/start') {
    // Route Protection:
    // 1. IF not logged in: redirect to /login
    if (!token || !storedUser) {
      showToast('Please sign in to start your project');
      window.history.replaceState({}, '', '/login');
      handleRouting();
      return;
    }

    // 2. IF role !== "client": show message "Only clients can create projects"
    let userRole = '';
    try {
      const u = JSON.parse(storedUser);
      userRole = (u.role || '').toLowerCase();
    } catch (e) {
      userRole = '';
    }

    if (userRole !== 'client') {
      showToast('Only clients can create projects');
      window.history.replaceState({}, '', '/dashboard');
      handleRouting();
      return;
    }

    // If user IS logged in AND role === 'client': show Start Your Project form
    if (startProjectPage) {
      startProjectPage.style.display = 'flex';
      const pForm = document.getElementById('projectForm');
      const pSuccess = document.getElementById('projectSuccessState');
      const pFooter = document.getElementById('projectFooter');
      if (pForm) pForm.style.display = 'flex';
      if (pSuccess) pSuccess.style.display = 'none';
      if (pFooter) pFooter.style.display = 'block';
    }
  } else if (path.startsWith('/dashboard')) {
    if (appContainer) {
      appContainer.style.display = 'flex';

      // Load cached user from localStorage
      if (storedUser && !currentUser) {
        try {
          currentUser = JSON.parse(storedUser);
        } catch (e) {
          currentUser = null;
        }
      }

      // Verify token with backend
      if (token && !currentUser) {
        await window.verifyToken(token);
      }

      if (currentUser) {
        hydrateUserUI(currentUser);
        loadUserProjects();

        // Role Authorization Route Guard
        const userRole = currentUser.role || 'Client';
        const allowedRoutes = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS['Client'];

        if (!allowedRoutes.includes(path)) {
          showToast(`Access Restricted: This section is not available for ${userRole} accounts.`);
          window.history.replaceState({}, '', '/dashboard');
          showDashboardTab('/dashboard');
          return;
        }
      } else {
        // Verification failed, redirect to login
        localStorage.removeItem('infrasphere_token');
        localStorage.removeItem('user');
        window.history.replaceState({}, '', '/login');
        handleRouting();
        return;
      }

      if (!isAppInitialized) {
        initMarketplaceSimulation();
        initMobileResponsiveMenu();
        isAppInitialized = true;
      }

      showDashboardTab(path);
    }
  } else {
    // 404 Fallback: redirect to root
    window.history.replaceState({}, '', '/');
    handleRouting();
  }
}
window.handleRouting = handleRouting;

function toggleAuthMode(isSignup) {
  const authSubtitle = document.getElementById('authSubtitle');
  const fullNameGroup = document.getElementById('fullNameGroup');
  const authFullNameInput = document.getElementById('authFullName');
  const roleGroup = document.getElementById('roleGroup');
  const phoneGroup = document.getElementById('phoneGroup');
  const authPhoneInput = document.getElementById('authPhone');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authToggleText = document.getElementById('authToggleText');
  const createAccountLink = document.getElementById('createAccountLink');
  const loginLink = document.getElementById('loginLink');
  const authToggleLink = document.getElementById('authToggleLink');
  const authAlert = document.getElementById('authAlert');
  const demoLoginBox = document.getElementById('demoLoginBox');

  if (authAlert && !authAlert.classList.contains('auth-alert-persist')) {
    authAlert.style.display = 'none';
  }

  if (!isSignup) {
    if (authSubtitle) authSubtitle.textContent = 'Enter your credentials to continue';
    if (fullNameGroup) fullNameGroup.style.display = 'none';
    if (authFullNameInput) authFullNameInput.removeAttribute('required');
    if (roleGroup) roleGroup.style.display = 'none';
    if (phoneGroup) phoneGroup.style.display = 'none';
    if (authPhoneInput) authPhoneInput.removeAttribute('required');
    if (demoLoginBox) demoLoginBox.style.display = 'block';
    if (authSubmitBtn) {
      const btnSpan = authSubmitBtn.querySelector('span');
      if (btnSpan) btnSpan.textContent = 'Sign In';
    }
    if (authToggleText) authToggleText.textContent = 'New to Infrasphere?';
    if (createAccountLink) {
      createAccountLink.style.display = 'inline';
      createAccountLink.textContent = 'Create an account';
      createAccountLink.setAttribute('href', '/signup');
    }
    if (loginLink) {
      loginLink.style.display = 'none';
      loginLink.setAttribute('href', '/login');
    }
    if (authToggleLink) {
      authToggleLink.textContent = 'Create an account';
      authToggleLink.setAttribute('href', '/signup');
    }
  } else {
    if (authSubtitle) authSubtitle.textContent = 'Register a new Infrasphere account';
    if (fullNameGroup) fullNameGroup.style.display = 'block';
    if (authFullNameInput) authFullNameInput.setAttribute('required', 'true');
    if (roleGroup) roleGroup.style.display = 'block';
    if (phoneGroup) phoneGroup.style.display = 'block';
    if (authPhoneInput) authPhoneInput.setAttribute('required', 'true');
    if (demoLoginBox) demoLoginBox.style.display = 'none';
    if (authSubmitBtn) {
      const btnSpan = authSubmitBtn.querySelector('span');
      if (btnSpan) btnSpan.textContent = 'Create Account';
    }
    if (authToggleText) authToggleText.textContent = 'Already have an account?';
    if (createAccountLink) {
      createAccountLink.style.display = 'none';
      createAccountLink.setAttribute('href', '/signup');
    }
    if (loginLink) {
      loginLink.style.display = 'inline';
      loginLink.textContent = 'Sign In';
      loginLink.setAttribute('href', '/login');
    }
    if (authToggleLink) {
      authToggleLink.textContent = 'Sign In';
      authToggleLink.setAttribute('href', '/login');
    }
  }
}

function showDashboardTab(path) {
  const tabContents = document.querySelectorAll('.tab-content');
  const sidebarLinks = document.querySelectorAll('.sidebar-link[href]');
  
  let subTab = 'dashboard';
  if (path.startsWith('/dashboard/')) {
    subTab = path.substring('/dashboard/'.length);
  }

  let activeTabId = `tab-${subTab}`;

  tabContents.forEach(tab => {
    if (tab.id === activeTabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  sidebarLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '/profile' && href === '/dashboard/profile')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const mainWrapper = document.querySelector('.main-wrapper');
  if (mainWrapper) mainWrapper.scrollTop = 0;

  const sidebar = document.getElementById('appSidebar');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
  }
}

/* ================= Reset DOM User Data Helper ================= */
function resetDOMUserData() {
  const navUserName = document.getElementById('navUserName');
  const navUserRole = document.getElementById('navUserRole');
  const navAvatar = document.getElementById('navAvatar');
  const dashboardUserName = document.getElementById('dashboardUserName');
  const welcomeUserHeading = document.getElementById('welcomeUserHeading');
  const profNameInput = document.getElementById('profName');
  const profPhoneInput = document.getElementById('profPhone');
  const profCompInput = document.getElementById('profComp');
  const profGSTInput = document.getElementById('profGST');
  const profAddrInput = document.getElementById('profAddr');
  const profBioInput = document.getElementById('profBio');
  const profDisplayHeading = document.getElementById('profDisplayHeading');
  const profDisplayEmail = document.getElementById('profDisplayEmail');
  const profAvatarInitials = document.getElementById('profAvatarInitials');
  const profAvatarImg = document.getElementById('profAvatarImg');

  if (navUserName) navUserName.textContent = 'User';
  if (navUserRole) navUserRole.textContent = 'Infrasphere Member';
  if (navAvatar) navAvatar.textContent = 'IN';
  if (dashboardUserName) dashboardUserName.textContent = 'User';
  if (welcomeUserHeading) welcomeUserHeading.innerHTML = `Welcome to <span class="gradient-text">Infrasphere</span> 👋`;
  if (profNameInput) profNameInput.value = '';
  if (profPhoneInput) profPhoneInput.value = '';
  if (profCompInput) profCompInput.value = '';
  if (profGSTInput) profGSTInput.value = '';
  if (profAddrInput) profAddrInput.value = '';
  if (profBioInput) profBioInput.value = '';
  if (profDisplayHeading) profDisplayHeading.textContent = 'User Profile';
  if (profDisplayEmail) profDisplayEmail.textContent = '';
  if (profAvatarInitials) profAvatarInitials.textContent = 'IN';
  if (profAvatarImg) profAvatarImg.style.display = 'none';
}

/* ================= Authentication System ================= */
function initAuthentication() {
  const authForm = document.getElementById('authForm');
  const authFullNameInput = document.getElementById('authFullName');
  const authPhoneInput = document.getElementById('authPhone');
  const authEmailInput = document.getElementById('authEmail');
  const authPasswordInput = document.getElementById('authPassword');
  const authRoleInput = document.getElementById('authRole');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const createAccountLink = document.getElementById('createAccountLink');
  const loginLink = document.getElementById('loginLink');
  const authToggleLink = document.getElementById('authToggleLink');
  const authAlert = document.getElementById('authAlert');
  const authAlertMsg = document.getElementById('authAlertMsg');
  const logoutLink = document.getElementById('logoutLink');
  const passwordToggleBtn = document.getElementById('passwordToggleBtn');
  const roleHintText = document.getElementById('roleHintText');

  // Role selector hint feedback
  if (authRoleInput && roleHintText) {
    authRoleInput.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected === 'Client') {
        roleHintText.innerHTML = `ℹ️ <strong>Client Account:</strong> Browse products & lands, submit RFQ tenders, and book technical experts.`;
      } else if (selected === 'Seller') {
        roleHintText.innerHTML = `ℹ️ <strong>Seller Account:</strong> Add structural materials, list commercial land parcels, and fulfill purchase orders.`;
      } else if (selected === 'Consultant') {
        roleHintText.innerHTML = `ℹ️ <strong>Consultant Account:</strong> Offer engineering audits, manage advisory rates, and review developer requests.`;
      }
    });
  }

  // Toggle show/hide password
  if (passwordToggleBtn && authPasswordInput) {
    passwordToggleBtn.addEventListener('click', () => {
      const type = authPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      authPasswordInput.setAttribute('type', type);
      if (type === 'text') {
        passwordToggleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" class="eye-off-icon" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        `;
      } else {
        passwordToggleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" class="eye-icon" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="13" r="4"/></svg>
        `;
      }
    });
  }

  // 1. Toggle Mode Navigation: Create Account Link
  if (createAccountLink) {
    createAccountLink.addEventListener('click', (e) => {
      e.preventDefault();
      hideAlert();
      if (typeof window.navigateTo === 'function') {
        window.navigateTo('/signup');
      } else if (window.location.replace) {
        window.location.replace('/signup');
      } else {
        window.location.href = '/signup';
      }
    });
  }

  // 2. Toggle Mode Navigation: Sign In Link
  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      hideAlert();
      if (typeof window.navigateTo === 'function') {
        window.navigateTo('/login');
      } else if (window.location.replace) {
        window.location.replace('/login');
      } else {
        window.location.href = '/login';
      }
    });
  }

  // Legacy fallback for authToggleLink if present
  if (authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      const targetHref = authToggleLink.getAttribute('href') || (window.location.pathname === '/login' ? '/signup' : '/login');
      hideAlert();
      if (typeof window.navigateTo === 'function') {
        window.navigateTo(targetHref);
      } else if (window.location.replace) {
        window.location.replace(targetHref);
      } else {
        window.location.href = targetHref;
      }
    });
  }

  // Handle Form Submission
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const isSignup = window.location.pathname === '/signup';
      const email = authEmailInput.value.trim();
      const password = authPasswordInput.value;
      const name = authFullNameInput ? authFullNameInput.value.trim() : '';
      const phone = authPhoneInput ? authPhoneInput.value.trim() : '';
      const role = authRoleInput ? authRoleInput.value : 'Client';

      // Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAlert('danger', 'Please enter a valid email address.');
        return;
      }

      if (password.length < 6) {
        showAlert('danger', 'Password must be at least 6 characters.');
        return;
      }

      if (isSignup) {
        if (!name) {
          showAlert('danger', 'Please enter your full name.');
          return;
        }
        if (!phone || !/^\d{10}$/.test(phone)) {
          showAlert('danger', 'Please enter a valid 10-digit mobile number.');
          return;
        }
        if (!role) {
          showAlert('danger', 'Please select your account role.');
          return;
        }
      }

      // Loading state
      authSubmitBtn.setAttribute('disabled', 'true');
      authSubmitBtn.classList.add('btn-loading');
      const originalBtnText = authSubmitBtn.querySelector('span').textContent;
      authSubmitBtn.querySelector('span').innerHTML = `<span class="spinner"></span>Processing...`;

      try {
        const url = isSignup ? '/api/auth/signup' : '/api/auth/login';
        const bodyData = isSignup ? { name, email, password, phone, role } : { email, password };

        const response = await fetch(`${API_URL}${url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });

        const data = await response.json();

        if (!response.ok) {
          // If login fails: Show Invalid email or password, and do NOT store anything in localStorage
          localStorage.removeItem('infrasphere_token');
          localStorage.removeItem('user');
          currentUser = null;
          throw new Error(data.error || 'Invalid email or password');
        }

        if (isSignup) {
          // 1. SIGNUP SUCCESS FLOW:
          // - DO NOT auto-login user
          // - Clear any existing user session
          localStorage.removeItem('infrasphere_token');
          localStorage.removeItem('user');
          currentUser = null;
          resetDOMUserData();

          // Reset form fields
          authForm.reset();

          // Redirect to login page
          navigateTo('/login');

          // Show success message: "Account created successfully. Please login."
          showAlert('success', 'Account created successfully. Please login.');
          showToast('Account created successfully. Please login.');
        } else {
          // 2. LOGIN SUCCESS FLOW:
          // Store token and user object
          localStorage.setItem('infrasphere_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          window.loginUser(data.user);
        }
      } catch (err) {
        showAlert('danger', err.message);
      } finally {
        authSubmitBtn.removeAttribute('disabled');
        authSubmitBtn.classList.remove('btn-loading');
        authSubmitBtn.querySelector('span').textContent = isSignup ? 'Create Account' : 'Sign In';
      }
    });
  }

  // Logout Handler
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.logoutUser();
    });
  }

  function showAlert(type, message) {
    authAlert.className = `auth-alert auth-alert-${type}`;
    authAlertMsg.textContent = message;
    authAlert.style.display = 'flex';
  }

  function hideAlert() {
    authAlert.style.display = 'none';
    authAlert.classList.remove('auth-alert-persist');
  }
}

// Global Quick Login Helper for Demo Testing
window.quickFillLogin = function(email, password, role) {
  const emailInput = document.getElementById('authEmail');
  const passInput = document.getElementById('authPassword');
  const authForm = document.getElementById('authForm');
  if (emailInput && passInput && authForm) {
    emailInput.value = email;
    passInput.value = password;
    showToast(`Quick login as ${role} (${email})...`);
    authForm.dispatchEvent(new Event('submit'));
  }
};

window.verifyToken = async function(authToken) {
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error('Session expired');
    }
    currentUser = data.user;
    localStorage.setItem('user', JSON.stringify(data.user));
  } catch (err) {
    console.warn('Session verification failed:', err.message);
    window.logoutUser();
  }
};

window.loginUser = function(user) {
  currentUser = user;
  hydrateUserUI(user);

  const authSubmitBtn = document.getElementById('authSubmitBtn');
  if (authSubmitBtn) {
    authSubmitBtn.removeAttribute('disabled');
    authSubmitBtn.classList.remove('btn-loading');
    authSubmitBtn.querySelector('span').textContent = 'Sign In';
  }

  const authForm = document.getElementById('authForm');
  if (authForm) authForm.reset();

  navigateTo('/dashboard');
  showToast(`Welcome back, ${user.name}! (${user.role} Portal)`);
};

window.logoutUser = function() {
  currentUser = null;
  localStorage.removeItem('infrasphere_token');
  localStorage.removeItem('user');
  resetDOMUserData();
  navigateTo('/login');
  showToast('You have been logged out.');
};

/* ================= Dynamic UI Hydration ================= */
function hydrateUserUI(user) {
  if (!user) return;
  const role = user.role || 'Client';

  // 1. Top Navbar Updates
  const navUserName = document.getElementById('navUserName');
  const navUserRole = document.getElementById('navUserRole');
  const navAvatar = document.getElementById('navAvatar');
  
  if (navUserName) navUserName.textContent = user.name;
  if (navUserRole) {
    const roleEmoji = role === 'Seller' ? '🏭 Seller' : role === 'Consultant' ? '📐 Consultant' : '🏗️ Client';
    navUserRole.textContent = `${user.companyName || 'Infrasphere Member'} • ${roleEmoji}`;
  }
  
  const initials = (user.name || 'User')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (navAvatar) {
    if (user.avatar) {
      navAvatar.innerHTML = `<img src="${user.avatar}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
      navAvatar.textContent = initials;
    }
  }

  // Role-Based "Start Project" Button & Section Visibility (Client Only)
  const isClient = (role || '').toLowerCase() === 'client';
  const navStartProjectBtn = document.getElementById('navStartProjectBtn');
  if (navStartProjectBtn) {
    navStartProjectBtn.style.display = isClient ? 'inline-flex' : 'none';
  }

  const dashboardMyProjectsSection = document.getElementById('dashboardMyProjectsSection');
  if (dashboardMyProjectsSection) {
    dashboardMyProjectsSection.style.display = isClient ? 'block' : 'none';
  }

  // 2. Dynamic Sidebar Links Visibility
  document.querySelectorAll('.sidebar-link[data-role]').forEach(link => {
    const linkRole = link.getAttribute('data-role');
    if (linkRole === role) {
      link.style.display = 'flex';
    } else {
      link.style.display = 'none';
    }
  });

  // 3. Dynamic Welcome Banner & Quick Actions
  const welcomeUserHeading = document.getElementById('welcomeUserHeading');
  const dashboardUserSubtext = document.getElementById('dashboardUserSubtext');
  const btnQuickAction1 = document.getElementById('btnQuickAction1');
  const btnQuickAction2 = document.getElementById('btnQuickAction2');

  if (welcomeUserHeading && dashboardUserSubtext) {
    if (role === 'Seller') {
      welcomeUserHeading.innerHTML = `Welcome back, <span class="gradient-text">${escapeHtml(user.name)}</span> 👋 <span class="badge badge-warning" style="font-size: 13px; margin-left: 8px;">🏭 Supplier & Land Broker</span>`;
      dashboardUserSubtext.textContent = 'Manage your structural materials catalog, commercial land parcels, and contractor purchase orders.';
      if (btnQuickAction1) {
        btnQuickAction1.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>+ Add Product</span>`;
        btnQuickAction1.onclick = () => navigateTo('/dashboard/add-product');
      }
      if (btnQuickAction2) {
        btnQuickAction2.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg><span>+ Add Property</span>`;
        btnQuickAction2.onclick = () => navigateTo('/dashboard/add-property');
      }
    } else if (role === 'Consultant') {
      welcomeUserHeading.innerHTML = `Welcome back, <span class="gradient-text">${escapeHtml(user.name)}</span> 👋 <span class="badge badge-info" style="font-size: 13px; margin-left: 8px;">📐 Consultant Practice</span>`;
      dashboardUserSubtext.textContent = 'Review developer consultation appointments, upload compliance audits, and track practice escrow earnings.';
      if (btnQuickAction1) {
        btnQuickAction1.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span>Manage Rates</span>`;
        btnQuickAction1.onclick = () => navigateTo('/dashboard/services');
      }
      if (btnQuickAction2) {
        btnQuickAction2.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span>Review Requests</span>`;
        btnQuickAction2.onclick = () => navigateTo('/dashboard/consultant-requests');
      }
    } else {
      welcomeUserHeading.innerHTML = `Welcome back, <span class="gradient-text">${escapeHtml(user.name)}</span> 👋 <span class="badge badge-primary" style="font-size: 13px; margin-left: 8px;">🏗️ Client & Contractor</span>`;
      dashboardUserSubtext.textContent = 'Here is a real-time overview of your Indian site operations, active tenders, material logistics, and expert sessions.';
      if (btnQuickAction1) {
        btnQuickAction1.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>New RFQ Brief</span>`;
        btnQuickAction1.onclick = () => navigateTo('/dashboard/projects');
      }
      if (btnQuickAction2) {
        btnQuickAction2.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><span>Order Supplies</span>`;
        btnQuickAction2.onclick = () => navigateTo('/dashboard/shop');
      }
    }
  }

  // 4. Dynamic KPI Cards
  const kpi1Val = document.getElementById('kpi1Val');
  const kpi1Label = document.getElementById('kpi1Label');
  const kpi1Trend = document.getElementById('kpi1Trend');

  const kpi2Val = document.getElementById('kpi2Val');
  const kpi2Label = document.getElementById('kpi2Label');
  const kpi2Trend = document.getElementById('kpi2Trend');

  const kpi3Val = document.getElementById('kpi3Val');
  const kpi3Label = document.getElementById('kpi3Label');
  const kpi3Trend = document.getElementById('kpi3Trend');

  const kpi4Val = document.getElementById('kpi4Val');
  const kpi4Label = document.getElementById('kpi4Label');
  const kpi4Trend = document.getElementById('kpi4Trend');

  if (kpi1Val && kpi2Val && kpi3Val && kpi4Val) {
    if (role === 'Seller') {
      kpi1Val.textContent = '₹42,80,000';
      kpi1Label.textContent = 'Gross Sales (FY26)';
      kpi1Trend.textContent = '+22.4% YoY';
      kpi1Trend.className = 'stat-trend badge badge-success';

      kpi2Val.textContent = '28';
      kpi2Label.textContent = 'Orders Completed';
      kpi2Trend.textContent = '100% On-time';
      kpi2Trend.className = 'stat-trend badge badge-info';

      kpi3Val.textContent = '3 Products';
      kpi3Label.textContent = 'Catalog In Stock';
      kpi3Trend.textContent = '140 Tons Rebar';
      kpi3Trend.className = 'stat-trend badge badge-success';

      kpi4Val.textContent = '1 Parcel';
      kpi4Label.textContent = 'Commercial Plot';
      kpi4Trend.textContent = '₹34 Cr Valuation';
      kpi4Trend.className = 'stat-trend badge badge-warning';
    } else if (role === 'Consultant') {
      kpi1Val.textContent = '₹3,45,000';
      kpi1Label.textContent = 'Consulting Revenue';
      kpi1Trend.textContent = '+18.2% this quarter';
      kpi1Trend.className = 'stat-trend badge badge-success';

      kpi2Val.textContent = '₹42,500';
      kpi2Label.textContent = 'In Escrow Release';
      kpi2Trend.textContent = '2 Milestones Active';
      kpi2Trend.className = 'stat-trend badge badge-info';

      kpi3Val.textContent = '₹5,000 / hr';
      kpi3Label.textContent = 'Hourly Advisory Rate';
      kpi3Trend.textContent = 'IIT Bombay Certified';
      kpi3Trend.className = 'stat-trend badge badge-success';

      kpi4Val.textContent = '2 Requests';
      kpi4Label.textContent = 'Pending Bookings';
      kpi4Trend.textContent = '1 Session Today';
      kpi4Trend.className = 'stat-trend badge badge-warning';
    } else {
      kpi1Val.textContent = '₹18,45,000';
      kpi1Label.textContent = 'Total Procurement';
      kpi1Trend.textContent = '+14.8% this month';
      kpi1Trend.className = 'stat-trend badge badge-success';

      kpi2Val.textContent = String(activeProjects);
      kpi2Label.textContent = 'Active Sites / Tenders';
      kpi2Trend.textContent = '2 Tenders in Review';
      kpi2Trend.className = 'stat-trend badge badge-info';

      kpi3Val.textContent = '12';
      kpi3Label.textContent = 'Material Orders';
      kpi3Trend.textContent = '3 Out for Delivery';
      kpi3Trend.className = 'stat-trend badge badge-success';

      kpi4Val.textContent = String(expertsBooked);
      kpi4Label.textContent = 'Expert Sessions';
      kpi4Trend.textContent = '1 Session Today';
      kpi4Trend.className = 'stat-trend badge badge-warning';
    }
  }

  // 5. Toggle Dashboard Role Sub-Views
  const clientView = document.getElementById('clientDashboardView');
  const sellerView = document.getElementById('sellerDashboardView');
  const consultantView = document.getElementById('consultantDashboardView');

  if (clientView) clientView.style.display = role === 'Client' ? 'block' : 'none';
  if (sellerView) sellerView.style.display = role === 'Seller' ? 'block' : 'none';
  if (consultantView) consultantView.style.display = role === 'Consultant' ? 'block' : 'none';

  // 6. Profile Page Updates
  const profDisplayHeading = document.getElementById('profDisplayHeading');
  const profDisplayEmail = document.getElementById('profDisplayEmail');
  const profRoleBadge = document.getElementById('profRoleBadge');
  const profRoleSelect = document.getElementById('profRoleSelect');
  const profAvatarInitials = document.getElementById('profAvatarInitials');
  const profAvatarImg = document.getElementById('profAvatarImg');

  if (profDisplayHeading) profDisplayHeading.textContent = user.name;
  if (profDisplayEmail) profDisplayEmail.textContent = user.email;
  if (profRoleBadge) {
    profRoleBadge.textContent = role === 'Seller' ? '🏭 Seller (Supplier)' : role === 'Consultant' ? '📐 Consultant (Expert)' : '🏗️ Client (Developer)';
    profRoleBadge.className = role === 'Seller' ? 'badge badge-warning' : role === 'Consultant' ? 'badge badge-info' : 'badge badge-primary';
  }
  if (profRoleSelect) profRoleSelect.value = role;

  if (profAvatarInitials && profAvatarImg) {
    if (user.avatar) {
      profAvatarImg.src = user.avatar;
      profAvatarImg.style.display = 'block';
      profAvatarInitials.style.display = 'none';
    } else {
      profAvatarInitials.textContent = initials;
      profAvatarInitials.style.display = 'block';
      profAvatarImg.style.display = 'none';
    }
  }

  // Settings form input fields
  const profNameInput = document.getElementById('profName');
  const profPhoneInput = document.getElementById('profPhone');
  const profCompInput = document.getElementById('profComp');
  const profGSTInput = document.getElementById('profGST');
  const profAddrInput = document.getElementById('profAddr');
  const profBioInput = document.getElementById('profBio');

  if (profNameInput) profNameInput.value = user.name || '';
  if (profPhoneInput) profPhoneInput.value = user.phone || '';
  if (profCompInput) profCompInput.value = user.companyName || '';
  if (profGSTInput) profGSTInput.value = user.gstin || '';
  if (profAddrInput) profAddrInput.value = user.address || '';
  if (profBioInput) profBioInput.value = user.bio || '';
}

/* ================= Profile Management System ================= */
function initProfileManagement() {
  const profPhotoInput = document.getElementById('profPhotoInput');
  const profRoleSelect = document.getElementById('profRoleSelect');
  const profileForm = document.getElementById('profileForm');

  // 1. Profile Photo Upload Handler
  if (profPhotoInput) {
    profPhotoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const avatarDataUrl = event.target.result;
        if (currentUser) {
          currentUser.avatar = avatarDataUrl;
          localStorage.setItem('user', JSON.stringify(currentUser));
          hydrateUserUI(currentUser);

          const token = localStorage.getItem('infrasphere_token');
          if (token) {
            try {
              await fetch(`${API_URL}/api/profile/update`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  name: currentUser.name,
                  avatar: avatarDataUrl
                })
              });
              showToast('Profile photo successfully uploaded and saved!');
            } catch (err) {
              console.error('Failed to sync avatar to backend', err);
            }
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // 2. Active Role Switcher in Profile
  if (profRoleSelect) {
    profRoleSelect.addEventListener('change', async (e) => {
      const newRole = e.target.value;
      if (!currentUser) return;
      currentUser.role = newRole;
      localStorage.setItem('user', JSON.stringify(currentUser));
      hydrateUserUI(currentUser);

      const token = localStorage.getItem('infrasphere_token');
      if (token) {
        try {
          await fetch(`${API_URL}/api/profile/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: currentUser.name,
              role: newRole
            })
          });
          showToast(`Active role switched to ${newRole}! Sidebar & dashboard updated.`);
        } catch (err) {
          console.error('Failed to sync role change', err);
        }
      }
    });
  }

  // 3. Profile Details Form Save
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('profName').value.trim();
      const phone = document.getElementById('profPhone').value.trim();
      const companyName = document.getElementById('profComp') ? document.getElementById('profComp').value.trim() : '';
      const gstin = document.getElementById('profGST') ? document.getElementById('profGST').value.trim() : '';
      const address = document.getElementById('profAddr') ? document.getElementById('profAddr').value.trim() : '';
      const bio = document.getElementById('profBio') ? document.getElementById('profBio').value.trim() : '';
      const role = currentUser ? (currentUser.role || 'Client') : 'Client';
      const avatar = currentUser ? (currentUser.avatar || '') : '';

      if (!name) {
        showToast('Full Name is required');
        return;
      }
      if (!phone || !/^\d{10}$/.test(phone)) {
        showToast('Please enter a valid 10-digit mobile number');
        return;
      }

      const submitBtn = profileForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.setAttribute('disabled', 'true');
      submitBtn.textContent = 'Saving Changes...';

      try {
        const token = localStorage.getItem('infrasphere_token');
        const response = await fetch(`${API_URL}/api/profile/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            phone,
            companyName,
            gstin,
            address,
            bio,
            role,
            avatar
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update profile');
        }

        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        hydrateUserUI(currentUser);
        showToast('Profile and business details successfully saved to database!');
      } catch (err) {
        showToast(`Error: ${err.message}`);
      } finally {
        submitBtn.removeAttribute('disabled');
        submitBtn.textContent = originalText;
      }
    });
  }
}

/* ================= Role Feature Handlers ================= */
function initRoleFeatures() {
  // Seller Add Product Form
  const sellerAddProductForm = document.getElementById('sellerAddProductForm');
  if (sellerAddProductForm) {
    sellerAddProductForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const prodName = document.getElementById('prodName').value.trim();
      const prodCategory = document.getElementById('prodCategory').value;
      const prodPrice = document.getElementById('prodPrice').value;
      const prodUnit = document.getElementById('prodUnit').value.trim();
      const prodMOQ = document.getElementById('prodMOQ').value.trim();

      const tbody = document.getElementById('sellerProductListingsBody');
      if (tbody) {
        const tr = document.createElement('tr');
        const sku = 'SKU-' + Math.floor(1000 + Math.random() * 9000);
        tr.innerHTML = `
          <td><strong>${sku}</strong></td>
          <td>${escapeHtml(prodName)}</td>
          <td>${escapeHtml(prodCategory)}</td>
          <td>₹${parseInt(prodPrice).toLocaleString('en-IN')} / ${escapeHtml(prodUnit)}</td>
          <td>${escapeHtml(prodMOQ)} Available</td>
          <td><span class="badge badge-success">In Stock</span></td>
          <td><button class="btn btn-outline btn-sm" style="padding: 4px 8px;" onclick="showToast('Listing updated')">Edit</button></td>
        `;
        tbody.prepend(tr);
      }

      sellerAddProductForm.reset();
      showToast(`Product "${prodName}" published successfully to marketplace!`);
      navigateTo('/dashboard/my-listings');
    });
  }

  // Seller Add Property Form
  const sellerAddPropertyForm = document.getElementById('sellerAddPropertyForm');
  if (sellerAddPropertyForm) {
    sellerAddPropertyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const propTitle = document.getElementById('propTitle').value.trim();
      const propLocation = document.getElementById('propLocation').value.trim();
      const propSize = document.getElementById('propSize').value.trim();
      const propZoning = document.getElementById('propZoning').value;
      const propValuation = document.getElementById('propValuation').value.trim();
      const propDesc = document.getElementById('propDesc').value.trim();

      const container = document.getElementById('sellerPropertyListingsContainer');
      if (container) {
        const card = document.createElement('div');
        card.className = 'card property-card';
        card.innerHTML = `
          <div class="property-image-placeholder" style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); color: #047857;">
            <span class="property-badge badge-success">Active Listing</span>
            <div class="property-geo-icon">📍 ${escapeHtml(propLocation)}</div>
          </div>
          <div class="property-body">
            <span class="property-type-tag">${escapeHtml(propZoning)}</span>
            <h3 style="font-size: 18px; margin-bottom: 8px;">${escapeHtml(propTitle)}</h3>
            <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">${escapeHtml(propSize)} • ${escapeHtml(propDesc)}</p>
            <div class="flex justify-between items-center pt-12" style="border-top: 1px solid var(--border-color);">
              <span style="font-weight: 700; font-size: 18px; color: var(--primary);">${escapeHtml(propValuation)}</span>
              <span class="badge badge-success">New Listing</span>
            </div>
          </div>
        `;
        container.prepend(card);
      }

      sellerAddPropertyForm.reset();
      showToast(`Commercial Property "${propTitle}" listed successfully!`);
      navigateTo('/dashboard/my-listings');
    });
  }

  // Consultant Services Form
  const consultantServiceForm = document.getElementById('consultantServiceForm');
  if (consultantServiceForm) {
    consultantServiceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const rate = document.getElementById('consRate').value;
      showToast(`Advisory rates updated to ₹${parseInt(rate).toLocaleString('en-IN')}/hr! Practice profile synced.`);
    });
  }
}

/* ================= Marketplace Simulation ================= */
function initMarketplaceSimulation() {
  const projectsContainer = document.getElementById('projectsContainer');
  const tenderForm = document.getElementById('tenderForm');
  const searchInput = document.getElementById('globalSearch');

  // Unified Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      
      // Filter Projects
      const projectCards = document.querySelectorAll('#projectsContainer .bid-item-card');
      projectCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const desc = card.querySelector('p').textContent.toLowerCase();
        card.style.display = (title.includes(query) || desc.includes(query)) ? 'block' : 'none';
      });

      // Filter Shop Materials
      const shopCards = document.querySelectorAll('.shop-grid .shop-card');
      shopCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const desc = card.querySelector('p').textContent.toLowerCase();
        card.style.display = (title.includes(query) || desc.includes(query)) ? 'block' : 'none';
      });

      // Filter Consultants
      const consultantCards = document.querySelectorAll('.consultants-grid .consultant-card');
      consultantCards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        const bio = card.querySelector('p').textContent.toLowerCase();
        const specialty = card.querySelector('.consultant-specialty').textContent.toLowerCase();
        card.style.display = (name.includes(query) || bio.includes(query) || specialty.includes(query)) ? 'flex' : 'none';
      });
    });
  }

  // Category Filters (Tenders Page)
  const filterAll = document.getElementById('btnFilterAll');
  const filterConcrete = document.getElementById('btnFilterConcrete');
  const filterCabling = document.getElementById('btnFilterCabling');

  function applyTenderFilter(category, activeBtn) {
    [filterAll, filterConcrete, filterCabling].forEach(btn => {
      if (btn) btn.className = 'btn btn-outline btn-sm';
    });
    if (activeBtn) activeBtn.className = 'btn btn-secondary btn-sm';

    if (projectsContainer) {
      const cards = projectsContainer.querySelectorAll('.bid-item-card');
      cards.forEach(card => {
        card.style.display = (category === 'all' || card.getAttribute('data-category') === category) ? 'block' : 'none';
      });
    }
  }

  if (filterAll) filterAll.addEventListener('click', () => applyTenderFilter('all', filterAll));
  if (filterConcrete) filterConcrete.addEventListener('click', () => applyTenderFilter('concrete', filterConcrete));
  if (filterCabling) filterCabling.addEventListener('click', () => applyTenderFilter('cabling', filterCabling));

  // Placing Bids on Tenders
  const tenderBidButtons = document.querySelectorAll('.btn-submit-tender');
  tenderBidButtons.forEach(bindTenderBidButton);

  function bindTenderBidButton(btn) {
    btn.addEventListener('click', () => {
      const card = btn.closest('.bid-item-card');
      const title = card ? card.querySelector('h3').textContent : 'Tender Project';
      
      btn.setAttribute('disabled', 'true');
      btn.innerHTML = `<span class="spinner"></span><span>Submitting Bid...</span>`;
      
      setTimeout(() => {
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"/></svg>
          Bid Submitted
        `;
        btn.className = 'btn btn-secondary btn-sm';
        showToast(`Successfully registered your structural bid for: "${title}"`);
      }, 1200);
    });
  }

  // Publishing New Tenders
  if (tenderForm) {
    tenderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const title = document.getElementById('tenTitle').value;
      const location = document.getElementById('tenLocation').value;
      const category = document.getElementById('tenCategory').value;
      const budget = document.getElementById('tenBudget').value;
      const desc = document.getElementById('tenDesc').value;

      const newCard = document.createElement('div');
      newCard.className = 'card bid-item-card';
      newCard.setAttribute('data-category', category);

      const dateString = new Date().toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' });

      newCard.innerHTML = `
        <div class="bid-header">
          <div>
            <h3>${escapeHtml(title)}</h3>
            <p style="color: var(--text-muted); font-size: 13px; font-weight: 500;">General Site Procurement</p>
          </div>
          <span class="badge badge-warning">Awaiting Tenders</span>
        </div>
        <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6; margin-bottom: 16px;">
          ${escapeHtml(desc)}
        </p>
        <div class="bid-meta">
          <div class="bid-meta-item">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span>Starts: ${dateString}</span>
          </div>
          <div class="bid-meta-item">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${escapeHtml(location)}</span>
          </div>
          <div class="bid-meta-item">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4.5"/></svg>
            <span>0 Bids Registered</span>
          </div>
        </div>
        <div class="bid-footer">
          <div>
            <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; display: block;">ESTIMATED VALUE</span>
            <span class="bid-price" style="color: var(--primary);">${escapeHtml(budget)}</span>
          </div>
          <div class="bid-actions">
            <button class="btn btn-outline btn-submit-tender">Place Bid</button>
            <button class="btn btn-primary" onclick="showToast('Reviewing RFQ Specs...')">Review RFQ</button>
          </div>
        </div>
      `;

      if (projectsContainer) {
        projectsContainer.insertBefore(newCard, projectsContainer.firstChild);
      }
      
      activeProjects += 1;
      const kpi2Val = document.getElementById('kpi2Val');
      if (kpi2Val && currentUser && currentUser.role === 'Client') {
        kpi2Val.textContent = activeProjects;
      }

      bindTenderBidButton(newCard.querySelector('.btn-submit-tender'));
      
      tenderForm.reset();
      showToast(`Tender brief "${title}" successfully published!`);
    });
  }

  // Booking Technical Consultants
  const bookButtons = document.querySelectorAll('.btn-book');
  bookButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      const rate = btn.getAttribute('data-rate');
      
      btn.setAttribute('disabled', 'true');
      btn.innerHTML = `<span class="spinner"></span><span>Booking...</span>`;

      setTimeout(() => {
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"/></svg>
          Booked
        `;
        btn.className = 'btn btn-secondary btn-sm';
        
        expertsBooked += 1;
        const kpi4Val = document.getElementById('kpi4Val');
        if (kpi4Val && currentUser && currentUser.role === 'Client') {
          kpi4Val.textContent = expertsBooked;
        }

        // Add to Client Requests list
        const clientRequestsList = document.getElementById('clientRequestsList');
        if (clientRequestsList) {
          const reqCard = document.createElement('div');
          reqCard.className = 'card';
          reqCard.style.padding = '20px';
          reqCard.innerHTML = `
            <div class="flex justify-between items-start flex-wrap gap-12">
              <div>
                <div class="flex items-center gap-12">
                  <h3 style="font-size: 17px;">${escapeHtml(name)}</h3>
                  <span class="badge badge-success">Session Confirmed</span>
                </div>
                <p style="font-size: 14px; font-weight: 600; color: var(--primary); margin-top: 4px;">Site Review & Structural Inspection</p>
                <p style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">Scheduled Date: Tomorrow at 4:00 PM IST • Fee: ${escapeHtml(rate)} / hr</p>
              </div>
              <div class="flex gap-8">
                <button class="btn btn-primary btn-sm" onclick="showToast('Connecting to Virtual Meeting...')">Join Video Call</button>
              </div>
            </div>
          `;
          clientRequestsList.prepend(reqCard);
        }

        showToast(`Consultation with ${name} confirmed at ${rate}/hr! Added to My Requests.`);
      }, 1000);
    });
  });

  // Shopping Cart Operations (INR)
  const cartButtons = document.querySelectorAll('.btn-add-cart');
  cartButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      const price = parseFloat(btn.getAttribute('data-price'));

      cartCount += 1;
      cartTotal += price;

      showToast(`Added ${name} to cart. Total Cart Value: ₹${cartTotal.toLocaleString('en-IN')}`);
    });
  });

  // Property Visit Bookings
  const scheduleVisitButtons = document.querySelectorAll('.btn-schedule-visit');
  scheduleVisitButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.getAttribute('data-title');
      
      btn.setAttribute('disabled', 'true');
      btn.textContent = 'Scheduling...';

      setTimeout(() => {
        btn.textContent = 'Visit Scheduled';
        btn.className = 'btn btn-secondary btn-sm';
        showToast(`Site visit for "${title}" scheduled! Our relationship officer will contact you.`);
      }, 1000);
    });
  });
}

/* ================= Custom Service Request Modal ================= */
window.showServiceRequestModal = function() {
  const modal = document.getElementById('serviceRequestModal');
  if (modal) modal.style.display = 'flex';
};

window.closeServiceRequestModal = function() {
  const modal = document.getElementById('serviceRequestModal');
  if (modal) modal.style.display = 'none';
};

window.handleCustomServiceSubmit = function(e) {
  e.preventDefault();
  const serviceType = document.getElementById('reqServiceType').value;
  const siteLocation = document.getElementById('reqSiteLocation').value;
  const preferredDate = document.getElementById('reqPreferredDate').value;
  const duration = document.getElementById('reqDuration').value;

  const clientRequestsList = document.getElementById('clientRequestsList');
  if (clientRequestsList) {
    const reqCard = document.createElement('div');
    reqCard.className = 'card';
    reqCard.style.padding = '20px';
    reqCard.innerHTML = `
      <div class="flex justify-between items-start flex-wrap gap-12">
        <div>
          <div class="flex items-center gap-12">
            <h3 style="font-size: 17px;">${escapeHtml(serviceType)}</h3>
            <span class="badge badge-warning">Request Submitted</span>
          </div>
          <p style="font-size: 14px; font-weight: 600; color: var(--primary); margin-top: 4px;">Location: ${escapeHtml(siteLocation)}</p>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">Requested Date: ${escapeHtml(preferredDate)} • Package: ${escapeHtml(duration)}</p>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="showToast('Advisory manager notified')">Check Status</button>
        </div>
      </div>
    `;
    clientRequestsList.prepend(reqCard);
  }

  closeServiceRequestModal();
  showToast(`Custom service request for "${serviceType}" submitted successfully!`);
  navigateTo('/dashboard/requests');
};

/* ================= Mobile Responsive Layout ================= */
function initMobileResponsiveMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const closeLink = document.getElementById('mobileCloseLink');
  const sidebar = document.getElementById('appSidebar');
  
  if (!sidebar) return;
  
  function checkWidth() {
    if (window.innerWidth <= 1024) {
      if (menuBtn) menuBtn.style.display = 'inline-flex';
    } else {
      if (menuBtn) menuBtn.style.display = 'none';
      if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    }
  }
  
  checkWidth();
  window.addEventListener('resize', checkWidth);
  
  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });
  }
  
  if (closeLink) {
    closeLink.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }
  
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024) {
      if (!sidebar.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) {
        sidebar.classList.remove('open');
      }
    }
  });
}

/* ================= Toast Notification ================= */
let toastTimeout;
window.showToast = function(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
  }, 3500);
};

/* ================= Helper Utilities ================= */
function escapeHtml(string) {
  if (!string) return '';
  return String(string).replace(/[&<>"']/g, function (s) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[s];
  });
}

/* ================= Global SPA Navigation Helpers ================= */
window.goToLogin = function() {
  if (typeof window.navigateTo === 'function') {
    window.navigateTo('/login');
  } else if (window.location.replace) {
    window.location.replace('/login');
  } else {
    window.location.href = '/login';
  }
};

window.goToSignup = function() {
  if (typeof window.navigateTo === 'function') {
    window.navigateTo('/signup');
  } else if (window.location.replace) {
    window.location.replace('/signup');
  } else {
    window.location.href = '/signup';
  }
};

/* ================= Conditional Start Project Flow ================= */
window.handleStartProjectClick = function(e) {
  if (e) e.preventDefault();
  const token = localStorage.getItem('infrasphere_token');
  const storedUser = localStorage.getItem('user');
  
  if (token && storedUser) {
    let userRole = '';
    try {
      const u = JSON.parse(storedUser);
      userRole = (u.role || '').toLowerCase();
    } catch (err) {
      userRole = '';
    }

    if (userRole !== 'client') {
      showToast('Only clients can create projects');
      navigateTo('/dashboard');
      return;
    }

    // If user IS logged in and is Client: redirect to /apply
    navigateTo('/apply');
  } else {
    // If user is NOT logged in: redirect to /login
    showToast('Please sign in to start your project');
    navigateTo('/login');
  }
};

/* ================= Dashboard User Projects Loader ================= */
async function loadUserProjects() {
  const token = localStorage.getItem('infrasphere_token');
  const storedUser = localStorage.getItem('user');
  if (!token || !storedUser) return;

  let userRole = '';
  try {
    const u = JSON.parse(storedUser);
    userRole = (u.role || '').toLowerCase();
  } catch (e) {
    userRole = '';
  }

  // Only load user projects if Client
  if (userRole !== 'client') return;

  const container = document.getElementById('myProjectsContainer');
  const countBadge = document.getElementById('myProjectsCountBadge');
  const kpi2Val = document.getElementById('kpi2Val');

  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return;
      throw new Error('Failed to fetch projects');
    }

    const data = await res.json();
    const projects = data.projects || [];

    if (countBadge) {
      countBadge.textContent = `${projects.length} Project${projects.length === 1 ? '' : 's'}`;
    }
    if (kpi2Val) {
      kpi2Val.textContent = projects.length;
    }

    if (projects.length === 0) {
      container.innerHTML = `
        <div class="empty-projects-state">
          <div style="font-size: 32px; margin-bottom: 8px;">🏗️</div>
          <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 6px;">No projects submitted yet</h3>
          <p style="color: var(--text-muted); font-size: 13px; max-width: 360px; margin: 0 auto 16px auto;">
            Submit your construction, interior, renovation or digital project with our engineering team.
          </p>
          <a href="/apply" class="btn btn-primary btn-sm">Start Your Project</a>
        </div>
      `;
      return;
    }

    container.innerHTML = projects.map(p => {
      const statusClass = p.status === 'Completed' ? 'badge-success' : p.status === 'In Progress' ? 'badge-primary' : 'badge-warning';
      const formattedDate = new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return `
        <div class="card my-project-card">
          <div class="project-card-header flex justify-between items-start mb-12">
            <div>
              <span class="badge badge-secondary" style="font-size: 11px;">${escapeHtml(p.projectType)}</span>
              <h3 class="project-card-title">${escapeHtml(p.fullName)}</h3>
            </div>
            <span class="badge ${statusClass}">${escapeHtml(p.status)}</span>
          </div>
          <p class="project-card-desc">${escapeHtml(p.description || 'No additional specifications provided.')}</p>
          <div class="project-card-footer flex justify-between items-center pt-12 border-top">
            <div class="project-budget">
              <span class="text-xs text-muted" style="display:block; font-size: 11px;">Budget</span>
              <span class="project-budget-val">${escapeHtml(p.budget)}</span>
            </div>
            <div class="project-meta text-right">
              <span class="text-xs text-muted flex items-center gap-4" style="font-size: 11px; justify-content: flex-end;">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                ${escapeHtml(p.location)}
              </span>
              <span class="text-xs text-muted" style="display: block; font-size: 10px; margin-top: 2px;">${formattedDate}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading user projects:', err);
  }
}
window.loadUserProjects = loadUserProjects;

/* ================= Premium "Start Your Project" Form Handler ================= */
function initStartProjectForm() {
  const projectForm = document.getElementById('projectForm');
  const projectSuccessState = document.getElementById('projectSuccessState');
  const projectFooter = document.getElementById('projectFooter');
  const btnSubmitAnotherProject = document.getElementById('btnSubmitAnotherProject');
  const projectBackLink = document.getElementById('projectBackLink');
  const btnReturnHome = document.getElementById('btnReturnHome');
  const projTypeSelect = document.getElementById('projType');
  const customTypeGroup = document.getElementById('customTypeGroup');
  const projCustomTypeInput = document.getElementById('projCustomType');
  const projectAlert = document.getElementById('projectAlert');
  const projectAlertMsg = document.getElementById('projectAlertMsg');
  const projSubmitBtn = document.getElementById('projSubmitBtn');

  function showProjectError(msg) {
    if (projectAlert && projectAlertMsg) {
      projectAlertMsg.textContent = msg;
      projectAlert.style.display = 'flex';
      projectAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      showToast(msg);
    }
  }

  function hideProjectError() {
    if (projectAlert) {
      projectAlert.style.display = 'none';
    }
  }

  // Toggle "Others" custom input field
  if (projTypeSelect && customTypeGroup) {
    projTypeSelect.addEventListener('change', () => {
      if (projTypeSelect.value === 'Others') {
        customTypeGroup.style.display = 'block';
        if (projCustomTypeInput) projCustomTypeInput.setAttribute('required', 'true');
      } else {
        customTypeGroup.style.display = 'none';
        if (projCustomTypeInput) projCustomTypeInput.removeAttribute('required');
      }
    });
  }

  if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideProjectError();

      const token = localStorage.getItem('infrasphere_token');
      const storedUser = localStorage.getItem('user');
      if (!token || !storedUser) {
        showToast('Please sign in to submit your project');
        navigateTo('/login');
        return;
      }

      let userRole = '';
      try {
        const u = JSON.parse(storedUser);
        userRole = (u.role || '').toLowerCase();
      } catch (err) {
        userRole = '';
      }

      if (userRole !== 'client') {
        showProjectError('Only clients can create projects');
        return;
      }

      const fullName = document.getElementById('projFullName')?.value.trim();
      const phone = document.getElementById('projPhone')?.value.trim();
      const projectType = projTypeSelect?.value;
      const customProjectType = projCustomTypeInput?.value.trim();
      const budget = document.getElementById('projBudget')?.value.trim();
      const location = document.getElementById('projLocation')?.value.trim();
      const description = document.getElementById('projDescription')?.value.trim();

      if (!fullName || !phone || !projectType || !budget || !location) {
        showProjectError('Please fill in all required fields.');
        return;
      }

      if (projectType === 'Others' && !customProjectType) {
        showProjectError('Please specify your custom project type.');
        return;
      }

      // Loading state: Disable submit button & change text
      if (projSubmitBtn) {
        projSubmitBtn.disabled = true;
        projSubmitBtn.innerHTML = `<span>Submitting...</span>`;
        projSubmitBtn.style.opacity = '0.75';
        projSubmitBtn.style.cursor = 'not-allowed';
      }

      try {
        const response = await fetch(`${API_URL}/api/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fullName,
            phone,
            projectType,
            customProjectType,
            budget,
            location,
            description
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit project request');
        }

        // On success:
        showToast('Project submitted successfully 🚀');
        projectForm.reset();
        if (customTypeGroup) customTypeGroup.style.display = 'none';

        // Refresh projects in dashboard
        loadUserProjects();

        // Redirect to dashboard after 1–2 sec
        setTimeout(() => {
          navigateTo('/dashboard');
        }, 1400);

      } catch (err) {
        console.error('Project submit error:', err);
        showProjectError(err.message || 'Error submitting project. Please try again.');
      } finally {
        // Restore submit button
        if (projSubmitBtn) {
          projSubmitBtn.disabled = false;
          projSubmitBtn.innerHTML = `<span>Submit Request</span>`;
          projSubmitBtn.style.opacity = '1';
          projSubmitBtn.style.cursor = 'pointer';
        }
      }
    });
  }

  function handleReturnNavigation(e) {
    if (e) e.preventDefault();
    const token = localStorage.getItem('infrasphere_token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      navigateTo('/dashboard');
    } else {
      navigateTo('/');
    }
  }

  if (projectBackLink) {
    projectBackLink.addEventListener('click', handleReturnNavigation);
  }

  if (btnReturnHome) {
    btnReturnHome.addEventListener('click', handleReturnNavigation);
  }

  if (btnSubmitAnotherProject) {
    btnSubmitAnotherProject.addEventListener('click', () => {
      if (projectForm) {
        projectForm.reset();
        projectForm.style.display = 'flex';
      }
      if (customTypeGroup) customTypeGroup.style.display = 'none';
      if (projectFooter) projectFooter.style.display = 'block';
      if (projectSuccessState) projectSuccessState.style.display = 'none';
      hideProjectError();
    });
  }
}

/* ================= Application Initialization ================= */
function startApp() {
  initTheme();
  initRouter();
  initAuthentication();
  initStartProjectForm();
  initProfileManagement();
  initRoleFeatures();
  initMobileResponsiveMenu();
  handleRouting();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
