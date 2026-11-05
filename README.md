# Mi Control Financiero · PWA 2027

PWA de finanzas personales (HTML/CSS/JS) desplegable desde **GitHub Pages** y sincronizada mediante **Supabase Auth + Postgres**. Los movimientos individuales son privados por usuario mediante Row Level Security (RLS). La interfaz es estática y su código puede ser público; **nunca almacenes movimientos reales en GitHub**.

## Estado
- ✅ Dashboard, captura/eliminación de movimientos, listado mensual, presupuesto cargable, calendario catorcenal, exportaciones CSV y JSON para ChatGPT.
- ✅ HTML adaptable al móvil, manifest e interfaz instalable.
- ⏳ **Supabase requiere configuración manual**: crear proyecto y ejecutar SQL. Sin ello aparece "Conexión pendiente".
- ⏳ **GitHub Pages requiere activación** en Settings > Pages; haber subido código no significa que Pages esté publicado.
- ⚠️ PWA cachea la interfaz, no los movimientos: las operaciones requieren internet. La app no sustituye un estado bancario.

## Configurar Supabase
1. Crea un proyecto propio en https://supabase.com/dashboard y entra a **SQL Editor**.
2. Ejecuta el contenido de [schema.sql](schema.sql).
3. En **Authentication > Providers**, habilita Email; si eres el único usuario, puedes desactivar nuevos registros después de crear tu cuenta. Configura correctamente Site URL y Redirect URLs del sitio de GitHub Pages. Confirma tu correo.
4. Copia desde Supabase la URL del proyecto y su clave **publishable** o **anon** pública (Project Settings > API Keys).
5. Edita [config.js](config.js) y reemplaza las dos cadenas "YOUR_..." con esos valores. Nunca coloques claves service_role/secret, contraseñas, refresh tokens u otros secretos en GitHub.
6. Abre la app, registra tu cuenta e inicia sesión. En **Presupuesto**, pulsa **Cargar plantilla** una sola vez. Los datos de plantilla no constituyen pagos realizados.
7. Para iPhone: abrir en Safari, Compartir > Agregar a pantalla de inicio.

**Seguridad:** Las claves del frontend siempre son visibles en el navegador. La autorización proviene de RLS por auth.uid(). No desactives RLS. Usa una contraseña única y MFA si está disponible. Comprueba con una segunda cuenta de prueba que no es posible consultar registros de la primera antes de cargar datos reales.

## GitHub Pages
Activa **Settings > Pages > Deploy from a branch > main > / (root)**. El sitio estará bajo \`/MiControlFinanciero/\` al servir la raíz del repositorio. Si la organización o el plan no permite Pages en este repositorio privado, publica desde un repositorio separado de código **sin datos financieros**. La privacidad de los registros dependerá de Supabase, no de la visibilidad del repo.

## Planeación inicial
Sueldo neto $8,666 x 26 = $225,316; vales $3,500 despensa + $1,500 restaurante por mes = $60,000 brutos, $300/mes comisiones estimadas. Prestaciones esperadas: fondo $70,000, PTU $20,000, MIP $25,000, aguinaldo $30,000, caja $10,000 ya descontada de sueldo y cobrada en diciembre. Comidas de oficina $400 x 2 días/semana; apoyo mamá $200 x 5 días/semana; salida a comer con Karim $500 mensual. Los gastos anuales sin ropa variable suman **$241,060**, incluida comisión por vales. Ingresos estimados $440,316 y margen teórico $199,256 previo a ropa, gastos ocasionales y ajustes. **No equivalen a saldo bancario ni ahorro garantizado.**
- Luz se presupuestó $900 bimestrales ($5,400/año).
- Inglés Karim $130 x 52 ($6,760/año).
- Tenencia se registró como $3,200/año (dos pagos de $1,600), pendiente de confirmar.
- 15 cortes de cabello por $500 se estiman $7,500/año.
- No duplicar gastos presupuestados como movimientos reales.

## Reportar a ChatGPT
En Movimientos pulsa **Reporte ChatGPT**: genera un JSON descargable de movimientos y presupuestos, sin correo ni identificador de usuario. Aun así contiene información financiera privada; revisa antes de compartir. La app **no concede acceso automático a ChatGPT**.

## Limitaciones de la primera versión
Sin edición de movimientos, balances por cuenta, conciliación bancaria, gráficos por categoría, calendario dinámico de vencimientos, presupuestos mensuales comparados con movimiento real, cola offline ni subida automática a ChatGPT. El calendario catorcenal parte de 5/11/2026 cada 14 días; es una proyección, y no alterna vales automáticamente (12 depósitos mensuales, no 13). El icono SVG de la PWA puede requerir PNG adicional en iOS.

## Archivos
- \`index.html\`, \`styles.css\`, \`app.js\`: interfaz y funcionalidad.
- \`config.js\`: parámetros públicos de conexión Supabase, actualmente marcadores de posición.
- \`schema.sql\`: tablas, índices, validaciones y RLS.
- \`manifest.webmanifest\`, \`icon.svg\`, \`sw.js\`: instalación y caché de interfaz.
