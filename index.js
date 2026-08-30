document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initMarketplaceSimulation();
  initMobileResponsiveMenu();
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
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const contractorName = document.getElementById('profName').value;
      const companyName = document.getElementById('profComp').value;
      
      // Update topbar profile elements dynamically
      const navUserName = document.querySelector('.navbar .user-name');
      const navUserRole = document.querySelector('.navbar .user-role');
      
      if (navUserName) navUserName.textContent = contractorName;
      if (navUserRole) navUserRole.textContent = companyName;

      showToast('Enterprise registration details successfully saved.');
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
