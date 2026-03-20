# Documentación del Proyecto: Yoda Finanzas

## 1. Visión General del Proyecto
**Yoda Finanzas** es una aplicación web multiplataforma (Desktop y Mobile / PWA) diseñada para la gestión financiera personal y de parejas. Su enfoque principal es el control de flujo de efectivo estructurado de manera quincenal, permitiendo proyectar el **Saldo Acumulado**, gestionar deudas, controlar ingresos, gastos fijos/variables, y visualizar metas de ahorro.

## 2. Stack Tecnológico
- **Frontend**: HTML5, Vanilla JavaScript, Vanilla CSS.
  - Uso intensivo de CSS Variables (`style.css`) para soportar un sistema de temas dinámicos (Light / Dark Mode).
  - Integración de **Chart.js** para gráficos visuales, como la Proyección de Saldo.
- **Backend**: PHP 8+ estructurado en APIs ligeras.
  - Patrón de rutas basado en archivos bajo el directorio `/api/` devolviendo respuestas JSON.
  - Conexión a base de datos mediante **PDO** (`core/Database.php`).
- **Base de Datos**: MySQL/MariaDB.
  - Esquema completo que maneja catálogos (`CatalogDate`, `CatalogOrigin`, etc.) y tablas transaccionales (`TableIncome`, `TableExpenses`, `TableDebt`, `TableGoals`).
- **PWA (Progressive Web App)**:
  - Archivo `manifest.json`.
  - Service Worker (`sw.js`) y lógica Offline (`offline.js`) mediante IndexedDB para permitir el uso de la aplicación sin conexión y sincronización en segundo plano.

## 3. Arquitectura y Estructura de Archivos
La aplicación está estructurada de la siguiente manera en `/var/www/yoda.nexuslogicit.com/`:

- `app.php`: El archivo principal de la interfaz de usuario una vez autenticado. Maneja el Top Nav, Menú y carga el contenedor principal.
- `index.php`: Pantalla de inicio de sesión / Login.
- `/core/`: 
  - `Auth.php`: Manejo y validación de sesiones, autenticación de usuarios y obtención del perfil y avatar.
  - `Database.php`: Clase singleton para conexión a la base de datos MySQL.
- `/api/`: Endpoints del backend.
  - `dashboard.php`: Provee la información para los widgets de resumen, estado quincenal, deudas, metas y los arreglos para construir la gráfica de proyección.
  - `expenses.php`, `income.php`, `catalogs.php`: API REST para obtención y mutación de la información de otras áreas.
- `/css/`:
  - `style.css`: Tokens de diseño, tipografía y variables para Modo Claro y Oscuro.
  - `app.css`: Estilos estructurales, componentes (botones, tarjetas de cristal "glass-card", alertas).
- `/js/app/`:
  - `core.js`: Cliente API, Router de módulos UI y manejo del DOMContentLoaded. Maneja el botón de alternancia de Tema (Theme Toggle).
  - `dashboard.js`: Inyección dinámica de HTML para el Dashboard y configuración detallada del Chart.js.
  - `offline.js`: Lógica del lado cliente para manejar estado Offline con IndexedDB.
  - Otros: Lógica por módulo (`income.js`, `expenses.js`, `debt.js`, `goals.js`).
- `/assets/`: Imágenes, avatares e íconos (`apple-touch-icon.png`, `icon-192.png`).

## 4. Características Principales Implementadas
1. **Sistema de Temas Dual (Light / Dark)**: Diseño "Premium" mediante variables CSS (`[data-theme="dark"]`).
2. **Dashboard para Parejas**: 
   - Proyección fiel estilo Excel (Barras apiladas/agrupadas + Línea de Saldo Acumulado).
   - Resumen quincenal dinámico.
   - Cálculo estricto de saldos acumulados respetando las proyecciones y catálogos de fechas.
3. **Módulos Financieros Avanzados**:
   - Seguimiento visual de Pagos (Listados, Pagado Parcialmente mediante barras de progreso y badges intuitivos).
   - Metas de ahorro con barras de progreso estilizadas.
4. **Resiliencia Offline**: 
   - Detecta pérdida de conexión a internet, muestra un banner al usuario y encola solicitudes API para reenviarlas (sync) cuando regrese la conectividad.

## 5. Notas para Mantenimiento (AI Agents)
- **CSS**: Evitar hardcodear colores en `app.css`. Utilizar siempre `var(--clr-xyz)` definidos en `style.css` para mantener la integridad de los temas.
- **Javascript UI**: El proyecto no usa frameworks como React/Vue. Las vistas se re-renderizan manipulando el string HTML y usando `outlet.innerHTML` dentro de los métodos `registerModule()`.
- **Lógica de Fechas**: Las fechas y periodos de la app no solo dependen de la función date() en PHP, sino de registros estandarizados ubicados en la base de datos `CatalogDate`. Esto asegura que quincenas y fechas fiscales cuadren de forma predecible al proyectar.
- **Gráficos**: Si es necesario actualizar gráficos, verificar los colores de la gráfica leyendo la variable calculada en javascript mediante `getComputedStyle(document.documentElement)` para asegurar que funcionen tanto en modo claro como oscuro.
