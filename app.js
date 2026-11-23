/**
 * CatatBelanja — Anggaran Belanja Keluarga & Envelope Budgeting
 * Offline-first PWA, Expense Logging, Budget Health Monitoring & CSV Export.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'catatbelanja_v1';

  // --- DEFAULT ENVELOPES SEED ---
  const DEFAULT_ENVELOPES = [
    { id: 'dapur', name: 'Dapur & Belanja Pasar', target: 2500000, icon: '🍳', color: '#059669', bg: '#ecfdf5' },
    { id: 'tagihan', name: 'Tagihan Rumah (Listrik, PDAM, Wifi)', target: 1100000, icon: '💡', color: '#d97706', bg: '#fffbeb' },
    { id: 'anak', name: 'Kebutuhan Anak & Sekolah', target: 1200000, icon: '🎒', color: '#0284c7', bg: '#f0f9ff' },
    { id: 'transport', name: 'Bensin & Transportasi', target: 700000, icon: '🛵', color: '#475569', bg: '#f8fafc' },
    { id: 'kesehatan', name: 'Kesehatan & Perlengkapan Rumah', target: 500000, icon: '🧼', color: '#047857', bg: '#f0fdf4' },
    { id: 'hiburan', name: 'Makan Luar & Jajan Santai', target: 500000, icon: '☕', color: '#e11d48', bg: '#fff1f2' }
  ];

  // --- DEFAULT EXPENSES SEED ---
  const DEFAULT_EXPENSES = [
    { id: 1, date: '2026-11-22', envelopeId: 'dapur', desc: 'Belanja sayur bayam, telur 1kg, tempe & ayam potong', amount: 95000, payment: 'Tunai' },
    { id: 2, date: '2026-11-21', envelopeId: 'dapur', desc: 'Beras Ramos 5kg & minyak goreng Sania 2L', amount: 120000, payment: 'QRIS' },
    { id: 3, date: '2026-11-20', envelopeId: 'tagihan', desc: 'Token listrik PLN 500rb & iuran sampah RT', amount: 550000, payment: 'Transfer / Debit' },
    { id: 4, date: '2026-11-19', envelopeId: 'transport', desc: 'Isi Pertalite motor full tank', amount: 45000, payment: 'Tunai' },
    { id: 5, date: '2026-11-18', envelopeId: 'anak', desc: 'Buku tulis sidu 1 pak, pensil warna & uang saku mingguan', amount: 185000, payment: 'QRIS' },
    { id: 6, date: '2026-11-16', envelopeId: 'hiburan', desc: 'Makan bakso keluarga & es degan akhir pekan', amount: 110000, payment: 'QRIS' },
    { id: 7, date: '2026-11-15', envelopeId: 'kesehatan', desc: 'Sabun mandi refill, deterjen Attack & pasta gigi', amount: 85000, payment: 'Transfer / Debit' },
    { id: 8, date: '2026-11-12', envelopeId: 'tagihan', desc: 'Tagihan internet WiFi IndiHome bulanan', amount: 375000, payment: 'Transfer / Debit' },
    { id: 9, date: '2026-11-10', envelopeId: 'dapur', desc: 'Bumbu dapur lengkap, bawang merah, bawang putih, cabai', amount: 85000, payment: 'Tunai' }
  ];

  // --- STATE CONTAINER ---
  let appState = loadState();
  let filterEnvelope = 'ALL';
  let filterPayment = 'ALL';
  let searchQuery = '';

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { envelopes: DEFAULT_ENVELOPES, expenses: DEFAULT_EXPENSES };
      const parsed = JSON.parse(raw);
      return {
        envelopes: parsed.envelopes || DEFAULT_ENVELOPES,
        expenses: parsed.expenses || DEFAULT_EXPENSES
      };
    } catch (e) {
      return { envelopes: DEFAULT_ENVELOPES, expenses: DEFAULT_EXPENSES };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
      console.error('Save state failed:', e);
    }
  }

  function formatRupiah(num) {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  }

  // --- RENDER 1: AMPLOP ANGGARAN (ENVELOPE BUDGETING) ---
  function renderAmplop() {
    const grid = document.getElementById('envelopesGrid');
    if (!grid) return;

    let totalAllocated = 0;
    let totalSpent = 0;
    const warningEnvelopes = [];

    const envStats = appState.envelopes.map(env => {
      totalAllocated += Number(env.target);
      const spent = appState.expenses
        .filter(exp => exp.envelopeId === env.id)
        .reduce((sum, exp) => sum + Number(exp.amount), 0);

      totalSpent += spent;
      const remaining = Number(env.target) - spent;
      const pct = env.target > 0 ? Math.round((spent / env.target) * 100) : 0;

      if (pct >= 80) {
        warningEnvelopes.push({ name: env.name, pct });
      }

      return {
        ...env,
        spent,
        remaining,
        pct
      };
    });

    const totalRemaining = totalAllocated - totalSpent;
    const overallPct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

    // Top Hero Stats
    const elRemaining = document.getElementById('totalRemainingBudget');
    const elHealth = document.getElementById('budgetHealthSummary');
    const elAllocated = document.getElementById('sumTotalAllocated');
    const elSpent = document.getElementById('sumTotalSpent');
    const elUsagePct = document.getElementById('sumUsagePercentage');

    if (elRemaining) elRemaining.textContent = formatRupiah(totalRemaining);
    if (elHealth) elHealth.textContent = `Dari total alokasi bulanan ${formatRupiah(totalAllocated)} • Sisa ${100 - overallPct}%`;
    if (elAllocated) elAllocated.textContent = formatRupiah(totalAllocated);
    if (elSpent) elSpent.textContent = formatRupiah(totalSpent);
    if (elUsagePct) elUsagePct.textContent = `${overallPct}%`;

    // Alert Warning
    const alertBox = document.getElementById('alertAmplopWarning');
    const alertText = document.getElementById('alertWarningText');
    if (alertBox && alertText) {
      if (warningEnvelopes.length > 0) {
        alertBox.hidden = false;
        alertText.textContent = `Amplop ${warningEnvelopes.map(w => `${w.name} (${w.pct}%)`).join(', ')} sudah mendekati batas anggaran bulanan.`;
      } else {
        alertBox.hidden = true;
      }
    }

    // Grid of envelopes
    grid.innerHTML = envStats.map(env => {
      let badgeClass = 'badge-safe';
      let fillClass = 'fill-safe';
      let cardExtraClass = '';

      if (env.pct > 100) {
        badgeClass = 'badge-danger';
        fillClass = 'fill-danger';
        cardExtraClass = 'is-overbudget';
      } else if (env.pct >= 80) {
        badgeClass = 'badge-warn';
        fillClass = 'fill-warn';
        cardExtraClass = 'is-warning';
      }

      const displayRemaining = env.remaining < 0 
        ? `<span style="color:#e11d48;">Overbudget -${formatRupiah(Math.abs(env.remaining))}</span>`
        : formatRupiah(env.remaining);

      return `
        <div class="envelope-card ${cardExtraClass}" data-env-id="${env.id}">
          <div class="env-top">
            <div class="env-icon-title">
              <div class="env-icon-box" style="background:${env.bg}; color:${env.color};">${env.icon}</div>
              <div>
                <h3 class="env-name">${env.name}</h3>
                <span style="font-size:0.75rem; color:#64748b;">Target: ${formatRupiah(env.target)}</span>
              </div>
            </div>
            <span class="env-badge ${badgeClass}">${env.pct}% Terpakai</span>
          </div>

          <div class="env-amounts-row">
            <span class="env-remaining-label">Sisa Saldo Amplop:</span>
            <div class="env-remaining-val">${displayRemaining}</div>
          </div>

          <div class="env-progress-bar">
            <div class="env-progress-fill ${fillClass}" style="width: ${Math.min(env.pct, 100)}%;"></div>
          </div>

          <div class="env-meta-info">
            <span>Terpakai: <strong>${formatRupiah(env.spent)}</strong></span>
            <span>Target: <strong>${formatRupiah(env.target)}</strong></span>
          </div>

          <div class="env-footer-actions">
            <button type="button" class="btn-card-add btn-quick-env-add" data-env-id="${env.id}">
              + Catat Belanja
            </button>
            <button type="button" class="btn-card-filter btn-filter-env" data-env-id="${env.id}">
              Lihat Rincian &rarr;
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach button click events
    grid.querySelectorAll('.btn-quick-env-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const envId = btn.getAttribute('data-env-id');
        openInputModal(envId);
      });
    });

    grid.querySelectorAll('.btn-filter-env').forEach(btn => {
      btn.addEventListener('click', () => {
        const envId = btn.getAttribute('data-env-id');
        filterEnvelope = envId;
        const filterSelect = document.getElementById('expenseEnvelopeFilter');
        if (filterSelect) filterSelect.value = envId;
        switchToTab('riwayat');
        renderRiwayat();
      });
    });
  }

  // --- RENDER 2: RIWAYAT BELANJA HARIAN ---
  function renderRiwayat() {
    const tbody = document.getElementById('expenseTableBody');
    if (!tbody) return;

    // Populate filter dropdown
    const filterSelect = document.getElementById('expenseEnvelopeFilter');
    if (filterSelect && filterSelect.children.length <= 1) {
      appState.envelopes.forEach(env => {
        const opt = document.createElement('option');
        opt.value = env.id;
        opt.textContent = `${env.icon} ${env.name}`;
        filterSelect.appendChild(opt);
      });
    }

    let items = appState.expenses.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filterEnvelope !== 'ALL') {
      items = items.filter(exp => exp.envelopeId === filterEnvelope);
    }

    if (filterPayment !== 'ALL') {
      items = items.filter(exp => exp.payment === filterPayment);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(exp => exp.desc.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2.5rem; color:#64748b;">Belum ada catatan belanja yang sesuai kriteria pencarian.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(exp => {
      const env = appState.envelopes.find(e => e.id === exp.envelopeId) || { name: 'Lainnya', icon: '📦' };

      return `
        <tr>
          <td>${exp.date}</td>
          <td><strong>${env.icon} ${env.name}</strong></td>
          <td>${exp.desc}</td>
          <td><span class="payment-badge">${exp.payment}</span></td>
          <td><span class="expense-amount">-${formatRupiah(exp.amount)}</span></td>
          <td>
            <button type="button" class="btn-del-expense" data-id="${exp.id}" title="Hapus Catatan">&times;</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach delete handlers
    tbody.querySelectorAll('.btn-del-expense').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        if (confirm('Hapus catatan belanja ini?')) {
          appState.expenses = appState.expenses.filter(e => e.id !== id);
          saveState();
          renderAmplop();
          renderRiwayat();
          renderAnalisis();
        }
      });
    });
  }

  // --- RENDER 3: ATUR ANGGARAN & PLANNER ---
  function renderPlanner() {
    const grid = document.getElementById('plannerInputsGrid');
    if (!grid) return;

    grid.innerHTML = appState.envelopes.map(env => `
      <div class="planner-card">
        <div class="p-header">
          <div class="env-icon-box" style="background:${env.bg}; color:${env.color};">${env.icon}</div>
          <h4>${env.name}</h4>
        </div>
        <div class="p-input-group">
          <label for="plan_${env.id}">Target Alokasi Bulanan (Rp):</label>
          <input type="number" id="plan_${env.id}" class="plan-target-input" data-env-id="${env.id}" value="${env.target}" step="50000" min="50000">
        </div>
      </div>
    `).join('');
  }

  // --- RENDER 4: ANALISIS PENGELUARAN & TIPS ---
  function renderAnalisis() {
    const totalSpent = appState.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const dayOfMonth = new Date().getDate();
    const dailyAvg = dayOfMonth > 0 ? Math.round(totalSpent / dayOfMonth) : 0;

    const elDaily = document.getElementById('anDailyAverage');
    if (elDaily) elDaily.textContent = formatRupiah(dailyAvg);

    // Group by category
    const catTotals = {};
    appState.expenses.forEach(exp => {
      catTotals[exp.envelopeId] = (catTotals[exp.envelopeId] || 0) + Number(exp.amount);
    });

    let topCatId = '';
    let topCatVal = 0;
    Object.keys(catTotals).forEach(cid => {
      if (catTotals[cid] > topCatVal) {
        topCatVal = catTotals[cid];
        topCatId = cid;
      }
    });

    const topEnv = appState.envelopes.find(e => e.id === topCatId) || { name: '-', icon: '' };
    const elTopCat = document.getElementById('anTopCategory');
    const elTopCatVal = document.getElementById('anTopCategoryVal');
    if (elTopCat) elTopCat.textContent = `${topEnv.icon} ${topEnv.name}`;
    if (elTopCatVal) elTopCatVal.textContent = `${formatRupiah(topCatVal)} terpakai`;

    // Group by payment method
    const payCounts = {};
    appState.expenses.forEach(exp => {
      payCounts[exp.payment] = (payCounts[exp.payment] || 0) + 1;
    });

    let topPay = 'Tunai';
    let topPayCount = 0;
    Object.keys(payCounts).forEach(p => {
      if (payCounts[p] > topPayCount) {
        topPayCount = payCounts[p];
        topPay = p;
      }
    });

    const totalExpCount = appState.expenses.length;
    const payPct = totalExpCount > 0 ? Math.round((topPayCount / totalExpCount) * 100) : 0;

    const elTopPay = document.getElementById('anTopPayment');
    const elTopPayPct = document.getElementById('anTopPaymentPct');
    if (elTopPay) elTopPay.textContent = topPay;
    if (elTopPayPct) elTopPayPct.textContent = `${payPct}% dari seluruh transaksi`;

    // Category distribution bars
    const listContainer = document.getElementById('categoryBarsList');
    if (listContainer) {
      listContainer.innerHTML = appState.envelopes.map(env => {
        const spent = catTotals[env.id] || 0;
        const pct = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;

        return `
          <div class="cat-bar-item">
            <div class="cat-bar-header">
              <span>${env.icon} ${env.name}</span>
              <strong>${formatRupiah(spent)} (${pct}%)</strong>
            </div>
            <div class="cat-bar-bg">
              <div class="cat-bar-fill" style="width: ${pct}%; background: ${env.color};"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // --- MODAL INPUT BELANJA ---
  function openInputModal(preselectEnvId = null) {
    const modal = document.getElementById('inputModal');
    const form = document.getElementById('formExpense');
    const select = document.getElementById('expenseEnvelopeSelect');
    const dateInput = document.getElementById('expenseDateInput');

    if (!modal || !form || !select) return;

    form.reset();

    // Populate envelope select options
    select.innerHTML = appState.envelopes.map(env => `
      <option value="${env.id}" ${env.id === preselectEnvId ? 'selected' : ''}>
        ${env.icon} ${env.name}
      </option>
    `).join('');

    if (dateInput) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }

    modal.hidden = false;
  }

  function initModals() {
    const modal = document.getElementById('inputModal');
    const form = document.getElementById('formExpense');
    const btnQuick = document.getElementById('btnQuickCatatBelanja');
    const btnOpenFromAmplop = document.getElementById('btnOpenInputModal');
    const btnOpenFromRiwayat = document.getElementById('btnOpenInputModalFromRiwayat');
    const btnClose = document.getElementById('btnCloseInputModal');
    const btnCancel = document.getElementById('btnCancelInputModal');

    const closeModal = () => { if (modal) modal.hidden = true; };

    if (btnQuick) btnQuick.addEventListener('click', () => openInputModal());
    if (btnOpenFromAmplop) btnOpenFromAmplop.addEventListener('click', () => openInputModal());
    if (btnOpenFromRiwayat) btnOpenFromRiwayat.addEventListener('click', () => openInputModal());
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    // Quick chip buttons (+25k, +50k, etc.)
    document.querySelectorAll('.amt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const amt = Number(chip.getAttribute('data-amt'));
        const input = document.getElementById('expenseAmountInput');
        if (input) {
          const current = Number(input.value) || 0;
          input.value = current + amt;
        }
      });
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = document.getElementById('expenseDateInput')?.value;
        const envelopeId = document.getElementById('expenseEnvelopeSelect')?.value;
        const amount = Number(document.getElementById('expenseAmountInput')?.value);
        const desc = document.getElementById('expenseDescInput')?.value.trim();
        const payment = document.getElementById('expensePaymentSelect')?.value;

        if (!date || !envelopeId || !amount || !desc) return;

        const newExpense = {
          id: Date.now(),
          date,
          envelopeId,
          amount,
          desc,
          payment
        };

        appState.expenses.unshift(newExpense);
        saveState();
        renderAmplop();
        renderRiwayat();
        renderAnalisis();
        closeModal();
      });
    }

    // Save Budget Plan
    const btnSavePlan = document.getElementById('btnSaveBudgetPlan');
    if (btnSavePlan) {
      btnSavePlan.addEventListener('click', () => {
        document.querySelectorAll('.plan-target-input').forEach(input => {
          const envId = input.getAttribute('data-env-id');
          const val = Number(input.value) || 0;
          const targetEnv = appState.envelopes.find(e => e.id === envId);
          if (targetEnv) {
            targetEnv.target = val;
          }
        });

        saveState();
        renderAmplop();
        renderPlanner();
        renderAnalisis();
        alert('Alokasi target anggaran berhasil diperbarui!');
        switchToTab('amplop');
      });
    }

    // Export CSV
    const btnExport = document.getElementById('btnExportBelanjaCsv');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const headers = ['Tanggal', 'Pos Amplop', 'Deskripsi Belanja', 'Metode Bayar', 'Nominal (Rp)'];
        const rows = appState.expenses.map(exp => {
          const env = appState.envelopes.find(e => e.id === exp.envelopeId) || { name: 'Lainnya' };
          return [
            `"${exp.date}"`,
            `"${env.name}"`,
            `"${exp.desc.replace(/"/g, '""')}"`,
            `"${exp.payment}"`,
            exp.amount
          ].join(',');
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `Catatan_Belanja_Keluarga_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

    // Filters on Riwayat
    const searchInput = document.getElementById('expenseSearchInput');
    const filterEnvSelect = document.getElementById('expenseEnvelopeFilter');
    const filterPaySelect = document.getElementById('expensePaymentFilter');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim();
        renderRiwayat();
      });
    }

    if (filterEnvSelect) {
      filterEnvSelect.addEventListener('change', () => {
        filterEnvelope = filterEnvSelect.value;
        renderRiwayat();
      });
    }

    if (filterPaySelect) {
      filterPaySelect.addEventListener('change', () => {
        filterPayment = filterPaySelect.value;
        renderRiwayat();
      });
    }
  }

  // --- NAVIGATION TABS ---
  function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const view = tab.getAttribute('data-view');
        document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));

        const target = document.getElementById('view' + view.charAt(0).toUpperCase() + view.slice(1));
        if (target) target.classList.add('active');
      });
    });
  }

  function switchToTab(viewName) {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(t => {
      if (t.getAttribute('data-view') === viewName) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
    if (target) target.classList.add('active');
  }

  // --- PWA SERVICE WORKER REGISTRATION ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        console.log('CatatBelanja ServiceWorker registered:', reg.scope);
      }).catch(err => {
        console.warn('CatatBelanja ServiceWorker failed:', err);
      });
    });
  }

  // --- BOOTSTRAP ---
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initModals();
    renderAmplop();
    renderRiwayat();
    renderPlanner();
    renderAnalisis();
  });

})();
