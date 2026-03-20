# YODA APP

## 1. Instrucciones de Rol y Sistema (System Prompting)
- Rol: Asigna un rol múltiple: Actúa como un Arquitecto de Software Senior y un Experto en Lógica Financiera.
- Tono y Formato:Código limpio, comentado, estructurado bajo principios SOLID y documentado.
- Restricciones: 
    > No uses frameworks obsoletos
    > Evita código espagueti
    > Separa la lógica de negocio de la UI.

## 2. Contexto y Visión del Producto (Product Vision)
- Objetivo Core: Una plataforma web/móvil para la gestión integral de finanzas personales, con capacidad de manejar espacios compartidos (cuentas de pareja).
- Casos de Uso Principales:
    > Gestión de patrimonio individual.
    > Gestión de gastos compartidos
    > División equitativa
    > Proporcional
    > Finanzas combinadas
    > Planificación de presupuestos conjuntos.

## 3. Stack Tecnológico (Tech Stack)
- Frontend: (ej. React, Vue, Flutter).
- Backend: (ej. Node.js, Python, Go).
- Base de Datos: Relacional MySQL = Usar la base de datos yodaAppV001
- Infraestructura: Despliegue en Digital Ocean

## 4. Arquitectura y Modelado de Datos (Data Schema)
- Entidad de Usuarios: Autenticación, perfiles, vinculación de cuentas (ej. vincular el perfil de Daniel con el de Yoli para habilitar el dashboard de pareja).
- Entidad de Cuentas (Wallets): Tipos de cuentas (Efectivo, Débito, Crédito, Inversión). Propiedad (Individual, Compartida).
- Entidad de Transacciones: Monto, fecha, categoría, tipo (Ingreso, Gasto, Transferencia), y si es un gasto dividido.
- Entidad de Presupuestos (Budgets): Límites mensuales por categoría, alertas de sobregiro.

## 5. Reglas de Negocio Financieras (Business Logic)
- Lógica de División de Gastos: Cómo el sistema calcula "quién le debe a quién" a final de mes. ¿Se divide 50/50? ¿Se divide por proporción de ingresos?
- Transferencias Internas: Diferenciar entre un pago en un restaurante y una transferencia de liquidez entre cuentas propias o de la pareja.
- Cierres de Mes: Cómo se calculan los saldos iniciales y finales.

## 6. Analítica Predictiva y Reportes (Analytics & ML)
- Aprovechando la data financiera, se debe instruir a la IA para construir módulos de inteligencia.
- Dashboarding: KPIs clave (Tasa de ahorro, Gasto vs. Presupuesto, Patrimonio neto).
- Análisis Predictivo: Requerir la estructura para implementar algoritmos que analicen el histórico de transacciones y proyecten los gastos del mes siguiente, identificando patrones de consumo y riesgo de liquidez.