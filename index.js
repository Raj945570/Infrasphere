document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuthentication();
});

/* ================= Global State ================= */
let cartCount = 0;
let cartTotal = 0;
let expertsBooked = 3;
let activeProjects = 2; // Starting with Bangalore Metro and Dwarka Expressway

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

/* ================= Tab Switching ================= */
function initTabs() {
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');
  
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');
      switchTabDirect(targetTab);
    });
  });

  // Expose tab switcher to global scope for inline onclicks
  window.switchTabDirect = function(targetTab) {
    // Update active link state in sidebar
    sidebarLinks.forEach(link => {
      if (link.getAttribute('data-tab') === targetTab) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    
    // Toggle tab visibility
    tabContents.forEach(tab => {
      if (tab.id === `tab-${targetTab}`) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Scroll content to top
    document.querySelector('.main-wrapper').scrollTop = 0;
    
    // Auto-close sidebar on mobile view
    const sidebar = document.getElementById('appSidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
    }
  };
}

/* ================= Marketplace Simulation ================= */
function initMarketplaceSimulation() {
  const projectsContainer = document.getElementById('projectsContainer');
  const tenderForm = document.getElementById('tenderForm');
  const searchInput = document.getElementById('globalSearch');
  const profileForm = document.getElementById('profileForm');
  
  // Dashboard KPI Elements
  const kpiCart = document.getElementById('kpiCart');
  const kpiConsultants = document.getElementById('kpiConsultants');
  const kpiProjects = document.getElementById('kpiProjects');
  
  // 1. Unified Global Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      
      // Filter Projects (Tenders)
      const projectCards = document.querySelectorAll('#projectsContainer .bid-item-card');
      projectCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const desc = card.querySelector('p').textContent.toLowerCase();
        if (title.includes(query) || desc.includes(query)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });

      // Filter Shop Materials
      const shopCards = document.querySelectorAll('.shop-grid .shop-card');
      shopCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const desc = card.querySelector('p').textContent.toLowerCase();
        if (title.includes(query) || desc.includes(query)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });

      // Filter Consultants
      const consultantCards = document.querySelectorAll('.consultants-grid .consultant-card');
      consultantCards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        const bio = card.querySelector('p').textContent.toLowerCase();
        const specialty = card.querySelector('.consultant-specialty').textContent.toLowerCase();
        if (name.includes(query) || bio.includes(query) || specialty.includes(query)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // 2. Category Filters (Tenders Page)
  const filterAll = document.getElementById('btnFilterAll');
  const filterConcrete = document.getElementById('btnFilterConcrete');
  const filterCabling = document.getElementById('btnFilterCabling');

  function applyTenderFilter(category, activeBtn) {
    [filterAll, filterConcrete, filterCabling].forEach(btn => {
      if (btn) btn.className = 'btn btn-outline btn-sm';
    });
    if (activeBtn) activeBtn.className = 'btn btn-secondary btn-sm';

    const cards = projectsContainer.querySelectorAll('.bid-item-card');
    cards.forEach(card => {
      if (category === 'all' || card.getAttribute('data-category') === category) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (filterAll) filterAll.addEventListener('click', () => applyTenderFilter('all', filterAll));
  if (filterConcrete) filterConcrete.addEventListener('click', () => applyTenderFilter('concrete', filterConcrete));
  if (filterCabling) filterCabling.addEventListener('click', () => applyTenderFilter('cabling', filterCabling));

  // 3. Placing Bids on Tenders
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
      }, 1500);
    });
  }

  // 4. Publishing New Tenders
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
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
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
            <button class="btn btn-primary">Review RFQ</button>
          </div>
        </div>
      `;

      projectsContainer.insertBefore(newCard, projectsContainer.firstChild);
      
      // Update local state and dashboard stats
      activeProjects += 1;
      if (kpiProjects) kpiProjects.textContent = activeProjects;

      bindTenderBidButton(newCard.querySelector('.btn-submit-tender'));
      
      tenderForm.reset();
      showToast(`Tender brief "${title}" successfully published!`);
    });
  }

  // 5. Booking Technical Consultants
  const bookButtons = document.querySelectorAll('.btn-book');
  bookButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      const rate = btn.getAttribute('data-rate');
      
      const originalText = btn.textContent;
      btn.setAttribute('disabled', 'true');
      btn.innerHTML = `<span class="spinner"></span><span>Scheduling...</span>`;

      setTimeout(() => {
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"/></svg>
          Booked
        `;
        btn.className = 'btn btn-secondary btn-sm';
        
        // Update stats
        expertsBooked += 1;
        if (kpiConsultants) kpiConsultants.textContent = expertsBooked;

        showToast(`Consultation with ${name} confirmed at ${rate}/hr! Ref ID: INF-IND-${Math.floor(1000 + Math.random() * 9000)}`);
      }, 1200);
    });
  });

  // 6. Shopping Cart Operations (INR)
  const cartButtons = document.querySelectorAll('.btn-add-cart');
  cartButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const price = parseFloat(btn.getAttribute('data-price'));

      cartCount += 1;
      cartTotal += price;

      if (kpiCart) kpiCart.textContent = cartCount;

      showToast(`Added ${name} to cart. Total Cart Value: ₹${cartTotal.toLocaleString('en-IN')}`);
    });
  });

  // 7. Designing Blueprint Purchases
  const buyDesignButtons = document.querySelectorAll('.btn-buy-design');
  buyDesignButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      const price = btn.getAttribute('data-price');
      
      btn.setAttribute('disabled', 'true');
      btn.textContent = 'Purchasing...';

      setTimeout(() => {
        btn.textContent = 'CAD Purchased';
        btn.className = 'btn btn-secondary btn-sm';
        showToast(`Blueprint "${name}" purchased for ${price}! CAD files sent to register email.`);
      }, 1000);
    });
  });

  // 8. Profile Setup Updates
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const contractorName = document.getElementById('profName').value;
      const companyName = document.getElementById('profComp').value;
      const gstin = document.getElementById('profGST').value;
      const address = document.getElementById('profAddr').value;
      
      const submitBtn = profileForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.setAttribute('disabled', 'true');
      submitBtn.textContent = 'Saving...';

      try {
        const token = localStorage.getItem('infrasphere_token');
        const response = await fetch('/api/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: contractorName,
            companyName,
            gstin,
            address
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update profile');
        }

        // Update topbar profile elements dynamically
        const navUserName = document.querySelector('.navbar .user-name');
        const navUserRole = document.querySelector('.navbar .user-role');
        const navAvatar = document.querySelector('.navbar .user-avatar');
        
        if (navUserName) navUserName.textContent = data.user.name;
        if (navUserRole) navUserRole.textContent = data.user.companyName;
        if (navAvatar) {
          const initials = data.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          navAvatar.textContent = initials;
        }

        showToast('Enterprise registration details successfully saved.');
      } catch (err) {
        showToast(`Error: ${err.message}`);
      } finally {
        submitBtn.removeAttribute('disabled');
        submitBtn.textContent = originalText;
      }
    });
  }
}

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
  
  // Clicking outside closes menu on tablet/mobile
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
function showToast(message) {
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
}

/* ================= Helper Utilities ================= */
function escapeHtml(string) {
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

/* ================= Authentication System ================= */
let currentUser = null;
let isAppInitialized = false;

function initAuthentication() {
  const authPage = document.getElementById('authPage');
  const appContainer = document.querySelector('.app-container');
  const authForm = document.getElementById('authForm');
  const authSubtitle = document.getElementById('authSubtitle');
  const fullNameGroup = document.getElementById('fullNameGroup');
  const authFullNameInput = document.getElementById('authFullName');
  const phoneGroup = document.getElementById('phoneGroup');
  const authPhoneInput = document.getElementById('authPhone');
  const authEmailInput = document.getElementById('authEmail');
  const authPasswordInput = document.getElementById('authPassword');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authToggleLink = document.getElementById('authToggleLink');
  const authToggleText = document.getElementById('authToggleText');
  const authAlert = document.getElementById('authAlert');
  const authAlertMsg = document.getElementById('authAlertMsg');
  const fillDemoCredsBtn = document.getElementById('fillDemoCredsBtn');
  const authDemoBadge = document.getElementById('authDemoBadge');
  const logoutLink = document.getElementById('logoutLink');
  
  let isLoginMode = true;

  // Toggle show/hide password
  const passwordToggleBtn = document.getElementById('passwordToggleBtn');
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
          <svg viewBox="0 0 24 24" class="eye-icon" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        `;
      }
    });
  }

  // Toggle Mode (Login <-> Signup)
  if (authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      isLoginMode = !isLoginMode;
      hideAlert();
      
      if (isLoginMode) {
        authSubtitle.textContent = 'Sign in to your Indian construction portal';
        fullNameGroup.style.display = 'none';
        authFullNameInput.removeAttribute('required');
        phoneGroup.style.display = 'none';
        authPhoneInput.removeAttribute('required');
        authSubmitBtn.querySelector('span').textContent = 'Sign In';
        authToggleText.textContent = 'New to Infrasphere?';
        authToggleLink.textContent = 'Create an account';
        authDemoBadge.style.display = 'block';
      } else {
        authSubtitle.textContent = 'Register a new contractor account';
        fullNameGroup.style.display = 'block';
        authFullNameInput.setAttribute('required', 'true');
        phoneGroup.style.display = 'block';
        authPhoneInput.setAttribute('required', 'true');
        authSubmitBtn.querySelector('span').textContent = 'Create Account';
        authToggleText.textContent = 'Already have an account?';
        authToggleLink.textContent = 'Sign In';
        authDemoBadge.style.display = 'none';
      }
    });
  }

  // Quick fill demo credentials
  if (fillDemoCredsBtn) {
    fillDemoCredsBtn.addEventListener('click', () => {
      authEmailInput.value = 'rajesh@infrasphere.in';
      authPasswordInput.value = 'sharma123';
      hideAlert();
    });
  }

  // Handle Form Submission
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const email = authEmailInput.value.trim();
      const password = authPasswordInput.value;
      const name = authFullNameInput ? authFullNameInput.value.trim() : '';
      const phone = authPhoneInput ? authPhoneInput.value.trim() : '';

      // Client Side Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAlert('danger', 'Please enter a valid email address.');
        return;
      }

      if (password.length < 6) {
        showAlert('danger', 'Password must be at least 6 characters.');
        return;
      }

      if (!isLoginMode && !name) {
        showAlert('danger', 'Please enter your full name.');
        return;
      }

      if (!isLoginMode && (!phone || !/^\d{10}$/.test(phone))) {
        showAlert('danger', 'Please enter a valid 10-digit phone number.');
        return;
      }

      // Enter loading state
      authSubmitBtn.setAttribute('disabled', 'true');
      authSubmitBtn.classList.add('btn-loading');
      const originalBtnText = authSubmitBtn.querySelector('span').textContent;
      authSubmitBtn.querySelector('span').innerHTML = `<span class="spinner"></span>Processing...`;

      try {
        const url = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
        const bodyData = isLoginMode ? { email, password } : { name, email, password, phone };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Success
        localStorage.setItem('infrasphere_token', data.token);
        
        if (!isLoginMode) {
          showAlert('success', 'Signup successful! Logging you in...');
          setTimeout(() => {
            loginUser(data.user);
          }, 1000);
        } else {
          loginUser(data.user);
        }
      } catch (err) {
        showAlert('danger', err.message);
        authSubmitBtn.removeAttribute('disabled');
        authSubmitBtn.classList.remove('btn-loading');
        authSubmitBtn.querySelector('span').textContent = originalBtnText;
      }
    });
  }

  // Logout Handler
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }

  // Check Token on Startup
  const token = localStorage.getItem('infrasphere_token');
  if (token) {
    verifyToken(token);
  } else {
    // Show login page
    authPage.style.display = 'flex';
    appContainer.style.display = 'none';
  }

  async function verifyToken(authToken) {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error('Session expired');
      }
      loginUser(data.user);
    } catch (err) {
      console.warn('Re-auth failed:', err.message);
      logoutUser();
    }
  }

  function loginUser(user) {
    currentUser = user;
    
    // Populate layout with user details
    hydrateUserUI(user);

    // Swap displays
    authPage.style.display = 'none';
    appContainer.style.display = 'flex';

    // Reset button states
    authSubmitBtn.removeAttribute('disabled');
    authSubmitBtn.classList.remove('btn-loading');
    authSubmitBtn.querySelector('span').textContent = isLoginMode ? 'Sign In' : 'Create Account';

    // Clear form
    authForm.reset();

    // Initialize core dashboard ONCE
    if (!isAppInitialized) {
      initTabs();
      initMarketplaceSimulation();
      initMobileResponsiveMenu();
      isAppInitialized = true;
    }

    showToast(`Welcome back, ${user.name}!`);
  }

  function logoutUser() {
    currentUser = null;
    localStorage.removeItem('infrasphere_token');
    
    // Swap displays
    authPage.style.display = 'flex';
    appContainer.style.display = 'none';

    // Reset form states
    isLoginMode = true;
    authSubtitle.textContent = 'Sign in to your Indian construction portal';
    fullNameGroup.style.display = 'none';
    phoneGroup.style.display = 'none';
    authSubmitBtn.querySelector('span').textContent = 'Sign In';
    authToggleText.textContent = 'New to Infrasphere?';
    authToggleLink.textContent = 'Create an account';
    authDemoBadge.style.display = 'block';

    showToast('You have been logged out.');
  }

  function showAlert(type, message) {
    authAlert.className = `auth-alert auth-alert-${type}`;
    authAlertMsg.textContent = message;
    authAlert.style.display = 'flex';
  }

  function hideAlert() {
    authAlert.style.display = 'none';
  }
}

function hydrateUserUI(user) {
  // Update Topbar
  const navUserName = document.querySelector('.navbar .user-name');
  const navUserRole = document.querySelector('.navbar .user-role');
  const navAvatar = document.querySelector('.navbar .user-avatar');
  
  if (navUserName) navUserName.textContent = user.name;
  if (navUserRole) navUserRole.textContent = user.companyName;
  if (navAvatar) {
    // Generate initials
    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    navAvatar.textContent = initials;
  }

  // Update Settings Page Inputs
  const profNameInput = document.getElementById('profName');
  const profCompInput = document.getElementById('profComp');
  const profGSTInput = document.getElementById('profGST');
  const profAddrInput = document.getElementById('profAddr');

  if (profNameInput) profNameInput.value = user.name;
  if (profCompInput) profCompInput.value = user.companyName;
  if (profGSTInput) profGSTInput.value = user.gstin;
  if (profAddrInput) profAddrInput.value = user.address;
}
