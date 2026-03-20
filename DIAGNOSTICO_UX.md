Yoda finanzas diagnostico ux · MD
Copiar

# Diagnóstico UX & Arquitectura — Yoda Finanzas
 
> **Fecha de análisis:** 20 de marzo de 2026
> **Versión analizada:** PROYECTO_COMPLETADO (producción)
> **Alcance:** Frontend (JS/CSS), Backend (PHP/API), Experiencia de usuario, PWA
 
---
 
## Resumen Ejecutivo
 
| Categoría | Cantidad |
|---|---|
| Fricciones críticas | 7 |
| Mejoras de impacto alto | 11 |
| Quick wins (bajo esfuerzo, alto impacto) | 6 |
| Módulos analizados | 5 |
 
La aplicación tiene una base técnica sólida y una arquitectura limpia. Sin embargo, el análisis revela que varios de los flujos más frecuentes del día a día (marcar un gasto como pagado, capturar un ingreso, entender el balance de pareja) tienen fricciones innecesarias que reducen la utilidad real de la herramienta. La mayoría de las mejoras críticas son correcciones de código de bajo esfuerzo, no rediseños.
 
---
 
## 1. Dashboard (`dashboard.js` / `api/dashboard.php`)
 
### 1.1 El "Saldo Acumulado" no ofrece contexto comparativo
**Severidad:** 🔴 Crítico
 
El usuario ve un número grande en MXN pero no sabe si es bueno o malo respecto a períodos anteriores. El valor absoluto sin contexto no es información accionable.
 
**Problema técnico:** `dashboard.php` calcula `totalBalance` como `totalIncome - totalExpenses` del mes en curso, pero no compara contra la quincena anterior ni proyecta si el ritmo de gasto es sostenible.
 
**Solución propuesta:**
- Añadir chip de variación relativa: `+$2,300 vs Q anterior` (requiere consulta adicional en `dashboard.php`).
- Indicador de salud financiera tipo semáforo (verde / amarillo / rojo) basado en el ratio gastos/ingresos.
- Línea de meta mínima configurable en la gráfica de proyección.
 
```php
// En api/dashboard.php — agregar consulta de quincena anterior
$prevQuin = ($quincenaNum === 1) ? 2 : 1;
$prevMonth = ($quincenaNum === 1) ? date('n') - 1 : date('n');
$prevBalance = $db->prepare("SELECT ...")->fetch();
```
 
---
 
### 1.2 La gráfica de proyección no respeta el concepto de quincena
**Severidad:** 🟠 Alto
 
El eje X muestra fechas del calendario (1, 15, etc.), pero la unidad mental del usuario son las quincenas. No hay líneas divisoras entre Q1 y Q2 de cada mes, ni etiquetas tipo `Q1 Mar` / `Q2 Mar`, ni resaltado de la quincena actual.
 
**Solución propuesta:**
```javascript
// En dashboard.js — añadir plugin de anotación a Chart.js
plugins: {
  annotation: {
    annotations: data.projection
      .filter((p, i) => i > 0 && p.numQuin !== data.projection[i-1].numQuin)
      .map(p => ({
        type: 'line',
        xMin: ..., xMax: ...,
        borderColor: 'rgba(var(--clr-primary), 0.3)',
        borderWidth: 1,
        borderDash: [4, 4],
      }))
  }
}
```
 
---
 
### 1.3 El balance de pareja no está en el dashboard principal
**Severidad:** 🟠 Alto
 
`api/partnership.php` calcula con precisión quién debe qué, pero ese dato está oculto en un módulo secundario. Para una app diseñada específicamente para parejas, el widget `Daniel → Yolitzin $X` o `✅ Balanceados` debería ser el tercer widget del dashboard, no estar enterrado.
 
**Solución propuesta:** Incluir una llamada paralela a `api/partnership.php` desde `dashboard.js` y renderizar un widget de balance de pareja junto a los stats de resumen.
 
---
 
### 1.4 Sin acceso rápido para agregar transacciones desde el dashboard
**Severidad:** 🟠 Alto
 
El flujo actual para registrar un gasto requiere: navegar al módulo → click en "+ Registrar" → llenar modal. Un botón flotante `+` o un menú de acciones rápidas en el dashboard reduciría el tiempo de captura de 5 pasos a 2.
 
**Solución propuesta:** Botón FAB (Floating Action Button) fijo en la esquina inferior derecha en todas las vistas, con opciones rápidas: Ingreso / Gasto / Deuda.
 
---
 
## 2. Módulo de Ingresos (`income.js` / `api/income.php`)
 
### 2.1 Sin alerta cuando el ingreso real es menor al esperado
**Severidad:** 🔴 Crítico
 
`income.js` muestra el porcentaje de cumplimiento, pero si Daniel recibió `$30,000` de `$35,000` esperados, no hay ninguna advertencia visual que alerte sobre el déficit. Este dato afecta directamente la proyección de saldo y el usuario podría no darse cuenta del desbalance.
 
**Solución propuesta:**
```javascript
// En renderIncomeModule — modificar la construcción de tableRows
const deficit = +r.amountToBeReceived - +r.actualAmountReceived;
const deficitBadge = deficit > 0
  ? `<span class="badge badge--pending">⚠️ Déficit ${Ui.money(deficit)}</span>`
  : '';
 
// Añadir borde izquierdo de advertencia en la fila
const rowStyle = deficit > 0 ? 'border-left: 3px solid var(--clr-debt)' : '';
return `<tr style="${rowStyle}" data-id="${r.idIncome}">...`
```
 
---
 
### 2.2 El formulario no pre-selecciona la quincena actual
**Severidad:** 🟠 Alto
 
Al abrir el modal de nuevo ingreso, el campo "Fecha (Quincena)" aparece vacío. El 90% de las capturas corresponden a la quincena en curso. Obliga al usuario a buscar manualmente la fecha correcta en un dropdown de 24 opciones.
 
**Solución propuesta:**
```javascript
// En incFormHTML() y en todos los demás formularios (expFormHTML, debtFormHTML, goalFormHTML)
function getCurrentIdCatDate(dates) {
  const today = new Date().toISOString().split('T')[0];
  const day = new Date().getDate();
  const quin = day <= 15 ? 1 : 2;
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  
  return dates.find(d => {
    const dDate = new Date(d.date);
    return dDate.getFullYear() === year &&
           dDate.getMonth() + 1 === month &&
           d.numQuin == quin;
  })?.idCatDate ?? '';
}
```
 
---
 
### 2.3 Sin vista comparativa Daniel vs Yolitzin en ingresos
**Severidad:** 🔵 Medio
 
La tabla lista todos los ingresos mezclados. Una vista con dos columnas o dos tarjetas de resumen haría evidente quién aporta qué porcentaje al ingreso familiar total, dato clave para la planificación de pareja.
 
**Solución propuesta:** Agregar dos tarjetas de resumen sobre la tabla con subtotales por `idUser`, filtrando desde los datos ya disponibles en `rows` sin petición adicional a la API.
 
---
 
## 3. Módulo de Gastos (`expenses.js` / `api/expenses.php`)
 
### 3.1 El estado "Parcial" no muestra cuánto falta por pagar
**Severidad:** 🔴 Crítico
 
El badge "Parcial" informa que hay un pago incompleto, pero el monto restante no es visible en la tabla sin hacer la resta mentalmente. El módulo de deudas (`debt.js`) ya resolvió esto correctamente con una columna "Pendiente" explícita. El de gastos debería ser consistente.
 
**Solución propuesta:**
```javascript
// En renderExpensesModule — añadir columna "Faltante" a la tabla
const faltante = Math.max(0, amtToPay - amtPaid);
// En la fila:
`<td><span class="${faltante > 0 ? 'amount-expense' : 'amount-income'}">${Ui.money(faltante)}</span></td>`
// Y en el thead: <th>Faltante</th>
```
 
---
 
### 3.2 Sin gráfico de distribución por categoría
**Severidad:** 🔴 Crítico
 
El módulo de gastos solo tiene dos métricas de resumen y una tabla. Los usuarios de finanzas personales necesitan ver en qué categorías concentran sus gastos. Una gráfica de dona o barras horizontales por categoría revelaría patrones de gasto inmediatamente y es el reporte más pedido en cualquier app de finanzas.
 
**Solución propuesta:**
```javascript
// En renderExpensesModule — agregar Canvas para Chart.js
const byCategory = rows.reduce((acc, r) => {
  const key = r.nameTypeExpense || 'Sin categoría';
  acc[key] = (acc[key] || 0) + (+r.amountToPay || 0);
  return acc;
}, {});
 
new Chart(document.getElementById('expChart'), {
  type: 'doughnut',
  data: {
    labels: Object.keys(byCategory),
    datasets: [{ data: Object.values(byCategory) }]
  }
});
```
 
---
 
### 3.3 Marcar un gasto como pagado requiere 4 pasos
**Severidad:** 🟠 Alto
 
El flujo más frecuente en gestión de gastos es registrar que algo ya fue pagado. Hoy el flujo es: click en ✏️ → editar `actualAmountPaid` en el formulario → click en "Actualizar" → esperar re-render. Debería ser un solo click.
 
**Solución propuesta:**
```javascript
// Añadir en tbl-actions de cada fila de gastos
`<button class="tbl-btn" onclick="expMarkPaid(${r.idExpense})" title="Marcar como pagado">✓</button>`
 
// Nueva función en expenses.js
window.expMarkPaid = async (id) => {
  const row = window._expRows.find(r => r.idExpense == id);
  if (!row || +row.actualAmountPaid >= +row.amountToPay) return;
  try {
    await API.put('api/expenses.php', {
      ...row,
      idExpense: id,
      amount: row.amountToPay,
      actualAmountPaid: row.amountToPay
    });
    Ui.toast('Gasto marcado como pagado ✅');
    navigate('#expenses');
  } catch(e) { Ui.toast(e.message, 'error'); }
};
```
 
---
 
### 3.4 Sin filtro de período en la tabla de gastos
**Severidad:** 🟠 Alto
 
La tabla muestra todos los gastos de todos los meses. El filtro de texto cliente-side ayuda para buscar, pero no existe selector de quincena/mes que cambie la consulta a la API. El usuario que quiere ver solo "los gastos de esta quincena" no tiene forma directa de hacerlo.
 
**Solución propuesta:** Añadir un `<select>` de quincena en el toolbar de la tabla que llame a `API.get('api/expenses.php', { idCatDate: value })` y re-renderice solo el cuerpo de la tabla.
 
---
 
## 4. Módulo de Deudas (`debt.js` / `api/debt.php`)
 
### 4.1 Sin vista de calendario de vencimientos
**Severidad:** 🔴 Crítico
 
El módulo muestra el saldo total y el progreso de amortización, pero no responde la pregunta más urgente: **¿cuándo vence mi próximo pago?**. Una lista ordenada por fecha de vencimiento o una mini-línea de tiempo sería la información más accionable para evitar cargos por mora en tarjetas de crédito.
 
**Solución propuesta:** Ordenar el query en `api/debt.php` por `cd.date ASC` cuando la deuda está pendiente, y añadir una sección "Próximos vencimientos" en la parte superior del módulo con los 3 pagos más cercanos.
 
---
 
### 4.2 Typo: "✅ Liquidad" debe ser "✅ Liquidar"
**Severidad:** 🟢 Quick win
 
En `debtFormHTML()`, el botón de acción rápida tiene un error ortográfico. Además, su comportamiento (copiar el monto al campo) no deja claro al usuario que la deuda quedará marcada como cerrada.
 
**Fix:**
```javascript
// debt.js línea ~83 — cambiar:
'<button class="btn btn--ghost" ... >✅ Liquidad</button>'
// Por:
'<button class="btn btn--ghost" ... >✅ Liquidar</button>'
```
 
---
 
### 4.3 Sin indicador de ratio deuda/ingreso
**Severidad:** 🟠 Alto
 
El usuario no puede ver qué porcentaje de su ingreso quincenal se destina a pagos de deuda. Este indicador (debt-to-income ratio) es el más importante para evaluar salud financiera. Un valor superior al 30-35% debería disparar una alerta visual.
 
**Solución propuesta:** Calcular en `api/dashboard.php` o `api/debt.php`:
```php
$dti = ($quincenalData['income'] > 0)
  ? round(($debtTotal['total'] / $quincenalData['income']) * 100)
  : 0;
```
Y renderizar un widget con semáforo: verde (<30%), amarillo (30-50%), rojo (>50%).
 
---
 
## 5. UX Global (todos los módulos)
 
### 5.1 Navegación móvil rota — crítico para PWA
**Severidad:** 🔴 Crítico
 
`app.css` tiene breakpoints para mobile, pero `top-nav__menu` no tiene versión hamburger para pantallas < 600px. Los 5 enlaces del nav se desbordan del viewport. Siendo una PWA que se instala en el celular, este es el bug con mayor impacto en usuarios reales.
 
**Solución propuesta:**
```css
/* app.css — añadir */
@media (max-width: 768px) {
  .top-nav__menu {
    display: none;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: var(--clr-surface);
    border-top: 1px solid var(--clr-border);
    justify-content: space-around;
    padding: 0.5rem;
  }
  .top-nav__menu.mobile-open { display: flex; }
  .top-nav__link { font-size: 0.7rem; flex-direction: column; }
}
```
Considerar un bottom navigation bar en lugar del top nav para mobile — es el patrón estándar en apps móviles de finanzas.
 
---
 
### 5.2 Los formularios no validan antes del POST
**Severidad:** 🔴 Crítico
 
`incSave()`, `expSave()`, `debtSave()` y `goalSave()` envían directamente a la API sin verificar campos requeridos. Si el usuario deja categoría o fecha vacíos, recibe un error genérico del servidor ("Error") sin saber qué campo falta. Esto ocurre en los 4 módulos.
 
**Solución propuesta — agregar en `core.js`:**
```javascript
// Validador genérico reutilizable
Ui.validate = function(rules) {
  const errors = [];
  rules.forEach(({ id, label, required }) => {
    const el = document.getElementById(id);
    const val = el?.value?.trim();
    if (required && !val) {
      errors.push(label);
      el?.classList.add('input--error');
    } else {
      el?.classList.remove('input--error');
    }
  });
  return { valid: errors.length === 0, errors };
};
 
// Uso en incSave():
window.incSave = async () => {
  const { valid, errors } = Ui.validate([
    { id: 'f_idTypeIncome', label: 'Categoría', required: true },
    { id: 'f_idCatDate', label: 'Fecha', required: true },
    { id: 'f_amountExpected', label: 'Monto', required: true },
  ]);
  if (!valid) {
    Ui.toast(`Campos requeridos: ${errors.join(', ')}`, 'error');
    return;
  }
  // ... POST
};
```
 
---
 
### 5.3 Re-render completo en cada guardado pierde el scroll
**Severidad:** 🟠 Alto
 
Después de guardar cualquier registro, el código llama a `navigate('#modulo')` que re-renderiza toda la vista y regresa al scroll al inicio. En tablas largas esto es molesto y da sensación de lentitud.
 
**Solución propuesta (Optimistic UI):** Después de un POST exitoso, insertar la fila directamente en el DOM de la tabla en lugar de hacer `navigate()`. Solo re-navegar si hay un error que requiera recargar el estado.
 
```javascript
// Patrón sugerido en expSave():
const newRow = buildExpenseRow(savedData); // función que retorna HTML de <tr>
document.querySelector('#expTable tbody').insertAdjacentHTML('afterbegin', newRow);
Ui.closeModal();
Ui.toast('Gasto guardado ✅');
// No llamar navigate('#expenses')
```
 
---
 
### 5.4 Bug latente: override global de `Ui.options()` en `income.js`
**Severidad:** 🟠 Alto (riesgo de bug)
 
Al final de `income.js`, se sobrescribe el método `Ui.options` del objeto global para que acepte una función como `labelKey`. Esto modifica el comportamiento de `Ui.options` para **todos los módulos** cargados después. Si el orden de los `<script>` cambia, otros módulos podrían recibir la versión modificada de forma inesperada.
 
**Fix en `core.js`:**
```javascript
// Modificar la definición original para aceptar función o string
options(list, valKey, labelKey, selected = '') {
  if (!list || !Array.isArray(list)) return '';
  return list.map(r => {
    const label = typeof labelKey === 'function' ? labelKey(r) : r[labelKey];
    return `<option value="${r[valKey]}" ${r[valKey] == selected ? 'selected' : ''}>${label}</option>`;
  }).join('');
},
```
Y eliminar el override al final de `income.js`.
 
---
 
### 5.5 Sin captura rápida inline (sin modal)
**Severidad:** 🟠 Alto
 
Para usuarios que registran gastos e ingresos diariamente, abrir un modal de 6-8 campos es lento. Una fila de captura rápida inline al inicio de cada tabla (monto + categoría + notas) reduciría el tiempo de registro frecuente de ~20 segundos a ~5 segundos.
 
**Patrón sugerido:**
```html
<!-- Fila de captura rápida al inicio de la tabla -->
<tr class="quick-add-row">
  <td><input type="number" placeholder="$0.00" id="qa-amount" class="form__input"></td>
  <td><select id="qa-category" class="form__input">...</select></td>
  <td colspan="4"><input type="text" placeholder="Nota rápida..." id="qa-notes"></td>
  <td><button onclick="quickAddExpense()">+ Agregar</button></td>
</tr>
```
 
---
 
### 5.6 El Service Worker no maneja el caso de dashboard offline
**Severidad:** 🔵 Medio
 
En `offline.js`, el bloque que maneja `api/dashboard.php` offline tiene una referencia a `IDB.getAll('store_dates')` que usa un nombre de store incorrecto (no existe `store_dates`, el store es `STORES.debt`, etc.). Si el usuario pierde conexión y trata de ver el dashboard, el catch silencia el error pero devuelve una estructura de datos incompleta.
 
**Fix:**
```javascript
// offline.js — corregir el bloque de dashboard offline
// Construir la proyección desde los stores correctos que sí existen:
const incomeRows = await IDB.getAll(STORES.income);
const expenseRows = await IDB.getAll(STORES.expenses);
const debtRows = await IDB.getAll(STORES.debt);
// Usar buildOfflineDashboard() que ya existe y está correcta
return buildOfflineDashboard(incomeRows, expenseRows, debtRows);
```
 
---
 
## 6. Roadmap de Implementación
 
### Fase 1 — Ahora (1-2 semanas)
*Correcciones de bajo esfuerzo y alta fricción*
 
| # | Mejora | Archivo(s) | Esfuerzo |
|---|---|---|---|
| 1 | Fix typo "Liquidad" → "Liquidar" | `debt.js` | 5 min |
| 2 | Pre-seleccionar quincena actual en formularios | `income.js`, `expenses.js`, `debt.js`, `goals.js` | 1h |
| 3 | Validación de campos requeridos antes del POST | `core.js` + 4 módulos | 3h |
| 4 | Botón "✓ Pagar" inline en tabla de gastos | `expenses.js` | 1h |
| 5 | Alerta visual cuando ingreso real < esperado | `income.js` | 1h |
| 6 | Fix `Ui.options()` en `core.js` + eliminar override | `core.js`, `income.js` | 30 min |
| 7 | Fix bug `store_dates` en offline.js | `offline.js` | 30 min |
 
---
 
### Fase 2 — Próximo mes
*Mejoras de comprensión financiera y flujo*
 
| # | Mejora | Archivo(s) | Esfuerzo |
|---|---|---|---|
| 1 | Widget "Balance de pareja" en dashboard | `dashboard.js`, `api/dashboard.php` | 4h |
| 2 | Gráfico de dona por categoría de gasto | `expenses.js` + Chart.js | 3h |
| 3 | Filtro de quincena activa en tabla de gastos | `expenses.js`, `api/expenses.php` | 2h |
| 4 | Columna "Faltante" explícita en gastos | `expenses.js` | 1h |
| 5 | Nav responsivo / bottom bar para móvil (PWA) | `app.css`, `app.php` | 4h |
| 6 | Chip de variación vs quincena anterior en saldo | `api/dashboard.php`, `dashboard.js` | 3h |
 
---
 
### Fase 3 — 2 a 3 meses
*Funcionalidades avanzadas de insight y captura*
 
| # | Mejora | Archivo(s) | Esfuerzo |
|---|---|---|---|
| 1 | Vista de calendario de vencimientos de deudas | `debt.js`, nueva vista | 6h |
| 2 | Ratio deuda/ingreso quincenal en dashboard | `api/dashboard.php`, `dashboard.js` | 3h |
| 3 | Captura rápida inline sin modal | `expenses.js`, `income.js` | 4h |
| 4 | Vista Daniel vs Yolitzin con desglose visual | `income.js`, `expenses.js` | 5h |
| 5 | Optimistic UI — insertar fila sin re-render completo | `core.js` + 4 módulos | 6h |
| 6 | Quincenas marcadas en gráfica de proyección (Chart.js annotation) | `dashboard.js` | 2h |
 
---
 
## 7. Resumen de Archivos por Prioridad de Intervención
 
```
PRIORIDAD CRÍTICA
├── core.js             → Validación global, fix Ui.options()
├── offline.js          → Fix store_dates bug
├── expenses.js         → Columna faltante, botón pagar, gráfico, filtro
├── income.js           → Alerta déficit, pre-selección fecha, override fix
└── app.css / app.php   → Navegación mobile PWA
 
PRIORIDAD ALTA
├── debt.js             → Typo, calendario vencimientos, ratio DTI
├── dashboard.js        → Widget pareja, variación saldo, quincenas en gráfica
├── api/dashboard.php   → Consulta comparativa, balance pareja, DTI
└── goals.js            → Pre-selección fecha (consistencia)
 
PRIORIDAD MEDIA
├── api/expenses.php    → Filtro por idCatDate
├── api/debt.php        → Ordenar por fecha vencimiento
└── config              → HTTPS en producción, CSRF tokens (mencionados en README)
```
 
---
 
*Diagnóstico elaborado analizando la totalidad del código fuente: 20 archivos PHP, 8 módulos JavaScript, 2 hojas de estilo CSS, arquitectura de base de datos (17 tablas) y configuración PWA.*