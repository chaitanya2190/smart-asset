const API_BASE = '/api';
let IS_ADMIN = false;
let ALL_ASSETS = [];

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  // Reservation Modal logic
  const reservationModal = document.getElementById('reservation-modal');
  const resCloseBtn = document.querySelector('.close-btn');
  const resForm = document.getElementById('reservation-form');

  resCloseBtn.addEventListener('click', () => {
    reservationModal.classList.add('hidden');
    document.getElementById('form-error').classList.add('hidden');
  });

  resForm.addEventListener('submit', handleReservationSubmit);

  // Add Asset Modal logic
  const addAssetBtn = document.getElementById('add-asset-btn');
  const assetModal = document.getElementById('add-asset-modal');
  const assetCloseBtn = document.querySelector('.asset-close-btn');
  const assetForm = document.getElementById('add-asset-form');

  if (addAssetBtn) {
    addAssetBtn.addEventListener('click', () => {
      assetModal.classList.remove('hidden');
    });
  }

  if (assetCloseBtn) {
    assetCloseBtn.addEventListener('click', () => {
      assetModal.classList.add('hidden');
      document.getElementById('asset-form-error').classList.add('hidden');
    });
  }

  if (assetForm) {
    assetForm.addEventListener('submit', handleAddAssetSubmit);
  }

  // Sign out
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      window.sessionStorage.removeItem('currentUser');
      window.sessionStorage.removeItem('isAdmin');
      window.location.reload();
    });
  }

  // Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('login-name').value.trim();
      const isAdmin = document.getElementById('login-admin').checked;
      
      if (!name) return;

      window.sessionStorage.setItem('currentUser', name);
      window.sessionStorage.setItem('isAdmin', isAdmin.toString());
      
      checkAuth();
    });
  }
  // Search Logic
  const searchInput = document.getElementById('asset-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = ALL_ASSETS.filter(a => 
        a.name.toLowerCase().includes(term) || 
        a.id.toLowerCase().includes(term) || 
        a.category.toLowerCase().includes(term)
      );
      renderAssets(filtered);
    });
  }

  // History Modal logic
  const historyCloseBtn = document.querySelector('.history-close-btn');
  const historyModal = document.getElementById('history-modal');
  if (historyCloseBtn) {
    historyCloseBtn.addEventListener('click', () => {
      historyModal.classList.add('hidden');
    });
  }
});

function checkAuth() {
  const storedUser = window.sessionStorage.getItem('currentUser');
  if (storedUser) {
    IS_ADMIN = window.sessionStorage.getItem('isAdmin') === 'true';
    
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    // Hide add asset for non-admins? No, Tactive didn't specify, leave it.
    // Both admin and non-admin must fill out Name and Registration Number
    document.getElementById('reserver-name-group').style.display = 'block';
    document.getElementById('reserver-reg-group').style.display = 'block';
    document.getElementById('reserver-name').setAttribute('required', 'true');
    document.getElementById('reserver-reg').setAttribute('required', 'true');

    loadAssets();
    loadReservations();
  } else {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  }
}

async function loadAssets() {
  try {
    const res = await fetch(`${API_BASE}/assets`);
    ALL_ASSETS = await res.json();
    
    // Maintain filter if search has text
    const searchInput = document.getElementById('asset-search');
    const term = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (term) {
      const filtered = ALL_ASSETS.filter(a => 
        a.name.toLowerCase().includes(term) || 
        a.id.toLowerCase().includes(term) || 
        a.category.toLowerCase().includes(term)
      );
      renderAssets(filtered);
    } else {
      renderAssets(ALL_ASSETS);
    }
  } catch {
    showToast('Failed to load assets', 'error');
  }
}

async function loadReservations() {
  try {
    const res = await fetch(`${API_BASE}/reservations`);
    const allReservations = await res.json();
    // Shared Ledger: show all active reservations!
    const activeReservations = allReservations.filter(r => r.status !== 'CANCELLED');
    renderReservations(activeReservations);
  } catch {
    showToast('Failed to load reservations', 'error');
  }
}

function renderAssets(assets) {
  const container = document.getElementById('assets-list');
  container.innerHTML = '';

  assets.forEach(asset => {
    const card = document.createElement('div');
    card.className = 'asset-card';
    const isAvailable = asset.status === 'AVAILABLE';
    card.innerHTML = `
      <div class="asset-info">
        <h3 style="margin-bottom: 0.25rem;">${asset.name}</h3>
        <p class="mono" style="font-size: 0.9rem; margin-bottom: 0.75rem; font-weight: bold;">REG: ${asset.id}</p>
        <p class="mono" style="font-size: 0.8rem; color: #555;">MAX DURATION: ${asset.maxDuration} DAYS</p>
      </div>
      <div class="ticket-stub">
        <div style="display: flex; gap: 0.5rem; justify-content: center; flex-direction: column;">
          <button class="btn primary-btn reserve-btn" ${!isAvailable ? 'disabled' : ''} data-id="${asset.id}" data-name="${asset.name.replace(/"/g, '&quot;')}">
            Tear to Reserve
          </button>
          <div style="display: flex; gap: 0.5rem; width: 100%;">
            <button class="btn history-asset-btn" data-id="${asset.id}" style="flex: 1; border: 2px solid var(--text-main); background: #fdfaf5; color: var(--text-main); padding: 0.5rem; font-size: 0.85rem;">
              HISTORY
            </button>
            <button class="btn danger-btn remove-asset-btn" data-id="${asset.id}" style="flex: 1; padding: 0.5rem; font-size: 0.85rem;">
              REMOVE
            </button>
          </div>
          <div style="display: flex; gap: 0.5rem; width: 100%; margin-top: 0.25rem;">
            <button class="btn toggle-maint-btn" data-id="${asset.id}" style="flex: 1; border: 2px solid var(--text-main); background: #fdfaf5; color: var(--text-main); padding: 0.5rem; font-size: 0.85rem;">
              ${isAvailable ? 'SET MAINTENANCE' : 'SET AVAILABLE'}
            </button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Attach event listeners to all reserve buttons
  document.querySelectorAll('.reserve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const assetId = e.target.getAttribute('data-id');
      const assetName = e.target.getAttribute('data-name');
      openModal(assetId, assetName);
    });
  });

  // Attach event listeners to all remove buttons
  document.querySelectorAll('.remove-asset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => removeAsset(e.target.getAttribute('data-id')));
  });

  // Attach event listeners to all history buttons
  document.querySelectorAll('.history-asset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => loadAssetHistory(e.target.getAttribute('data-id')));
  });

  // Attach event listeners to all toggle maintenance buttons
  document.querySelectorAll('.toggle-maint-btn').forEach(btn => {
    btn.addEventListener('click', (e) => toggleMaintenance(e.target.getAttribute('data-id')));
  });
}

async function toggleMaintenance(id) {
  try {
    const res = await fetch(`${API_BASE}/assets/${id}/maintenance`, {
      method: 'PATCH',
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, 'success');
      loadAssets(); // refresh list
    } else {
      showToast(data.error || 'Failed to toggle maintenance', 'error');
    }
  } catch {
    showToast('Network error', 'error');
  }
}

async function loadAssetHistory(id) {
  try {
    const res = await fetch(`${API_BASE}/assets/${id}/history`);
    if (!res.ok) throw new Error('Failed to load history');
    const history = await res.json();
    
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    if (history.length === 0) {
      list.innerHTML = '<p class="mono">No history found for this asset.</p>';
    } else {
      history.forEach(r => {
        const item = document.createElement('div');
        item.style = 'border: 2px solid var(--border-color); padding: 1rem; background: #fff; position: relative; box-shadow: 2px 2px 0px rgba(0,0,0,0.05);';
        
        let stampClass = 'approved';
        if(r.status === 'PENDING_APPROVAL') stampClass = 'pending';
        if(r.status === 'CANCELLED' || r.status === 'RETURNED') stampClass = 'maintenance';

        item.innerHTML = `
          <div class="stamp ${stampClass}" style="position: absolute; right: 15px; top: 15px; font-size: 0.8rem; transform: rotate(0deg); border-width: 2px; padding: 0.15rem 0.5rem;">${r.status}</div>
          <p class="mono" style="margin-bottom: 0.5rem; font-size: 1.1rem;"><strong>USER:</strong> ${r.userId}</p>
          <p class="mono" style="font-size: 0.9rem; color: #555;">OUT: ${r.startDate} &nbsp;|&nbsp; DUE: ${r.endDate}</p>
          <p class="mono" style="font-size: 0.75rem; color: #999; margin-top: 0.75rem; border-top: 1px dashed #eee; padding-top: 0.5rem;">LOGGED: ${new Date(r.createdAt).toLocaleString()}</p>
        `;
        list.appendChild(item);
      });
    }
    
    document.getElementById('history-modal').classList.remove('hidden');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeAsset(id) {
  if (!window.confirm('Are you sure you want to remove this asset?')) return;
  try {
    const res = await fetch(`${API_BASE}/assets/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to remove asset');
    }
    showToast('Asset removed successfully');
    loadAssets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderReservations(reservations) {
  const container = document.getElementById('reservations-list');
  container.innerHTML = '';

  if (reservations.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 3rem 0;">
        <span class="stamp maintenance" style="font-size:1.5rem; opacity:0.5;">LEDGER EMPTY &mdash; NOTHING CHECKED OUT</span>
      </div>
    `;
    return;
  }

  reservations.forEach(r => {
    const item = document.createElement('div');
    item.className = 'due-card';
    let stampClass = 'approved';
    if(r.status === 'PENDING_APPROVAL') stampClass = 'pending';
    
    item.innerHTML = `
      <div class="due-card-header">
        <strong class="due-card-id">ASSET: ${r.assetId}</strong>
      </div>
      <div class="stamp ${stampClass}">${r.status.replace('_', ' ')}</div>
      <p class="due-card-dates">
        OWNER: <strong>${r.userId}</strong><br>
        OUT: ${r.startDate}<br>
        DUE: ${r.endDate}
      </p>
      ${(IS_ADMIN && r.status === 'PENDING_APPROVAL') ? `
        <div style="display:flex; gap:0.5rem; margin-top:1rem;">
          <button class="btn primary-btn approve-btn" data-id="${r.id}" style="flex:1; padding:0.5rem; font-size:0.9rem;">APPROVE</button>
          <button class="btn danger-btn reject-btn" data-id="${r.id}" style="flex:1; background:transparent;">REJECT</button>
        </div>
      ` : `
        <button class="btn danger-btn cancel-btn" data-id="${r.id}" style="margin-top:1rem;">VOID TICKET</button>
      `}
    `;
    container.appendChild(item);
  });

  // Attach event listeners to all buttons
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => cancelReservation(e.target.getAttribute('data-id')));
  });
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => adminAction(e.target.getAttribute('data-id'), 'approve'));
  });
  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => adminAction(e.target.getAttribute('data-id'), 'reject'));
  });
}

async function adminAction(id, action) {
  try {
    const res = await fetch(`${API_BASE}/reservations/${id}/${action}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed to ${action}`);
    showToast(`Reservation ${action}d successfully`);
    loadReservations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openModal(assetId, assetName) {
  document.getElementById('asset-id').value = assetId;
  document.getElementById('modal-asset-name').textContent = assetName;
  
  document.getElementById('reserver-name').value = '';
  document.getElementById('reserver-reg').value = '';
  
  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('start-date').min = today;
  document.getElementById('end-date').min = today;
  document.getElementById('start-date').value = '';
  document.getElementById('end-date').value = '';

  document.getElementById('reservation-modal').classList.remove('hidden');
}

async function handleReservationSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('form-error');
  errorDiv.classList.add('hidden');

  const submitBtn = document.getElementById('submit-reservation-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'PROCESSING...';

  const resName = document.getElementById('reserver-name').value.trim();
  const resReg = document.getElementById('reserver-reg').value.trim();
  const finalUserId = `${resReg} - ${resName}`;

  const payload = {
    assetId: document.getElementById('asset-id').value,
    userId: finalUserId,
    startDate: document.getElementById('start-date').value,
    endDate: document.getElementById('end-date').value
  };

  try {
    const res = await fetch(`${API_BASE}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reserve');
    }

    document.getElementById('reservation-modal').classList.add('hidden');
    showToast('Reservation successful!');
    loadReservations();
  } catch (err) {
    errorDiv.textContent = err.message;
    errorDiv.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Reservation';
  }
}

async function cancelReservation(id) {
  if (!window.confirm('Cancel this reservation?')) return;
  try {
    const res = await fetch(`${API_BASE}/reservations/${id}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to cancel');
    showToast('Reservation cancelled');
    loadReservations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAddAssetSubmit(e) {
  e.preventDefault();
  const errorDiv = document.getElementById('asset-form-error');
  errorDiv.classList.add('hidden');
  const submitBtn = document.getElementById('submit-asset-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'PROCESSING...';

  const payload = {
    name: document.getElementById('new-asset-name').value,
    category: document.getElementById('new-asset-category').value,
    maxDuration: document.getElementById('new-asset-duration').value
  };

  try {
    const res = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create asset');

    document.getElementById('add-asset-modal').classList.add('hidden');
    showToast('Asset added successfully!');
    document.getElementById('add-asset-form').reset();
    loadAssets();
  } catch (err) {
    errorDiv.textContent = err.message;
    errorDiv.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'CREATE ASSET';
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}
