/* ============================================
   Yoda — dashboard.js
   ============================================ */
registerModule('#dashboard', async (outlet) => {
    const data = await API.get('api/dashboard.php');
    
    outlet.innerHTML = `
        <div class="dashboard-hero">
            <div class="hero-stats">
                <div class="hero-stat-main glass-card">
                    <span class="hero-stat-label">Saldo Acumulado</span>
                    <h1 class="${data.summary.totalBalance >= 0 ? 'amount-income' : 'amount-expense'}">${Ui.money(data.summary.totalBalance)}</h1>
                    <p class="hero-stat-sub">Capital total disponible</p>
                </div>
                
                <div class="quincena-widget glass-card">
                    <div class="quincena-header">
                        <span class="quincena-title">Quincena Actual</span>
                        <span class="txt-muted">${data.quincena?.month || 'Marzo'}</span>
                    </div>
                    <div class="quincena-body">
                        <div class="q-item">
                            <span class="q-label">Ingresos</span>
                            <span class="q-val amount-income">${Ui.money(data.quincena?.income || 0)}</span>
                        </div>
                        <div class="q-item">
                            <span class="q-label">Gastos</span>
                            <span class="q-val amount-expense">${Ui.money(data.quincena?.expense || 0)}</span>
                        </div>
                    </div>
                    <div class="quincena-progress" style="overflow:hidden">
                        <div class="q-bar" style="width: ${data.quincena?.progress || 0}%; height:100%; background: var(--clr-income); box-shadow: 0 0 10px var(--clr-income); transition: width 1s ease"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 2rem;">
            <div class="stat-card glass-card">
                <span class="stat-card__label">Ingresos del Mes</span>
                <span class="stat-card__value amount-income">${Ui.money(data.summary.totalIncome)}</span>
            </div>
            <div class="stat-card glass-card">
                <span class="stat-card__label">Gastos Pendientes</span>
                <span class="stat-card__value amount-expense">${Ui.money(data.summary.pendingExpenses)}</span>
            </div>
            <div class="stat-card glass-card">
                <span class="stat-card__label">Metas de Ahorro</span>
                <span class="stat-card__value amount-income" style="color: var(--clr-goal)">${Ui.money(data.summary.totalGoals)}</span>
            </div>
        </div>

        <div class="projection-container glass-card" style="margin-top: 2rem; padding: 1.5rem; background: var(--clr-surface);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem; flex-wrap:wrap; gap:10px">
                <h3 style="font-size: 1rem; font-weight: 700;">Ruta de Saldo Acumulado (Proyección)</h3>
                <div class="chart-legend-custom" style="display:flex; gap:12px; font-size:0.75rem; font-weight:800; text-transform:uppercase">
                    <span style="color:#3b82f6">■ INGRESO</span>
                    <span style="color:#ef4444">■ EGRESO</span>
                    <span style="color:#991b1b">■ DEUDA</span>
                    <span style="color:#22d3ee">■ METAS & INVER</span>
                    <span style="color:#f59e0b">● SALDO ACUMULADO</span>
                </div>
            </div>
            <div style="height: 400px; position: relative;">
                <canvas id="projectionChart"></canvas>
            </div>
        </div>
    `;

    // --- PROJECTION CHART OVERHAUL ---
    const getClrs = () => {
        const style = getComputedStyle(document.documentElement);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            ingreso: '#3b82f6',
            egreso:  '#ef4444',
            deuda:   '#991b1b', // Dark Red/Maroon
            metas:   '#22d3ee', // Cyan
            saldo:   '#f59e0b', // Amber/Orange
            text:    style.getPropertyValue('--clr-text-muted').trim() || (isDark ? '#94a3b8' : '#64748b'),
            grid:    isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
        };
    };
    const clrs = getClrs();

    const ctx = document.getElementById('projectionChart').getContext('2d');
    const projLabels = data.projection.map(p => {
        const d = new Date(p.date + 'T12:00:00');
        return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    let runningBalance = 0;
    const balanceData = data.projection.map(p => {
        runningBalance += (parseFloat(p.income) - parseFloat(p.expense) - parseFloat(p.debt) - parseFloat(p.goals));
        return runningBalance;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: projLabels,
            datasets: [
                {
                    label: 'SALDO ACUMULADO',
                    data: balanceData,
                    type: 'line',
                    borderColor: clrs.saldo,
                    backgroundColor: 'transparent',
                    borderWidth: 4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: clrs.saldo,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    tension: 0, 
                    order: 0
                },
                {
                    label: 'INGRESO',
                    data: data.projection.map(p => p.income),
                    backgroundColor: clrs.ingreso,
                    borderRadius: 0,
                    order: 1
                },
                {
                    label: 'EGRESO',
                    data: data.projection.map(p => p.expense),
                    backgroundColor: clrs.egreso,
                    borderRadius: 0,
                    order: 1
                },
                {
                    label: 'DEUDA',
                    data: data.projection.map(p => p.debt),
                    backgroundColor: clrs.deuda,
                    borderRadius: 0,
                    order: 1
                },
                {
                    label: 'METAS & INVER',
                    data: data.projection.map(p => p.goals),
                    backgroundColor: clrs.metas,
                    borderRadius: 0,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: { 
                    beginAtZero: false, // Excel doesn't always start at zero depending on data
                    grid: { color: clrs.grid },
                    ticks: { 
                        color: clrs.text, 
                        font: { size: 10 },
                        callback: val => Ui.money(val)
                    }
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { color: clrs.text, font: { size: 10 } } 
                }
            }
        }
    });
});
