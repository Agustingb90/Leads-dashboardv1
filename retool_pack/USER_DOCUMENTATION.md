# BAST Detail Intelligence — Guía de Usuario

Documento de referencia para el equipo de negocio que usa el dashboard BAST Detail Intelligence en Retool.

**Versión:** 1.0
**Fecha:** 2026-04-28
**Idioma:** Español (es-ES)
**Audiencia:** Compradores, traders, comercial, dirección.

---

## Tabla de contenido

1. [Bienvenida](#bienvenida)
2. [Acceso al dashboard](#acceso-al-dashboard)
3. [Vista general](#vista-general)
4. [Los 6 KPIs hero](#los-6-kpis-hero)
5. [Filtros y controles](#filtros-y-controles)
6. [Pipeline funnel](#pipeline-funnel)
7. [Top categorías](#top-categorías)
8. [La tabla de detalle](#la-tabla-de-detalle)
9. [Sistema de heatmap](#sistema-de-heatmap)
10. [Acciones por fila](#acciones-por-fila)
11. [Casos de uso típicos](#casos-de-uso-típicos)
12. [Exportar a CSV](#exportar-a-csv)
13. [Glosario](#glosario)
14. [Preguntas frecuentes](#preguntas-frecuentes)
15. [Soporte](#soporte)

---

## Bienvenida

BAST Detail Intelligence es el panel operativo que cruza, en una sola pantalla, las cuatro fuentes de información que el equipo necesita para decidir qué comprar, qué vender y a qué precio:

- Las ofertas que tenemos en cartera (lo que podemos comprar).
- La demanda real de los clientes (lo que nos están pidiendo).
- Los precios de la competencia (mayoristas, traders, MSRP).
- El margen y la ventaja competitiva en cada barcode.

El objetivo es responder, en segundos, preguntas como:

- ¿Dónde somos más baratos que el mercado.
- Qué barcodes ofrecen mayor margen acumulable.
- Qué categorías concentran la mejor oportunidad.
- Qué oferta cubre una necesidad de venta abierta.

Todo el dashboard está pensado para que el dato hable por colores y posición, no por tablas planas. Cuanto más intenso es el color, más relevante es ese valor dentro del conjunto.

---

## Acceso al dashboard

1. Abrir [Retool](https://retool.com/) e iniciar sesión con la cuenta corporativa.
2. En el listado de Apps, abrir **BAST Detail Intelligence**.
3. La app cargará automáticamente la vista materializada `detail_intelligence_v` desde Supabase.
4. La carga inicial tarda entre 1 y 3 segundos según red.

Si la pantalla aparece vacía o con un error en el banner superior, ver [Preguntas frecuentes](#preguntas-frecuentes) o contactar a soporte.

**Tema visual:** dark mode permanente, moneda EUR, fechas en formato YYYY-MM-DD.

---

## Vista general

La pantalla está organizada en cinco bloques verticales, de arriba hacia abajo:

```
┌─────────────────────────────────────────────────┐
│  1. Cabecera con título y sello de actualización │
├─────────────────────────────────────────────────┤
│  2. Fila de 6 KPIs hero                          │
├─────────────────────────────────────────────────┤
│  3. Filtros y controles                          │
├─────────────────────────────────────────────────┤
│  4. Pipeline funnel + Top categorías             │
├─────────────────────────────────────────────────┤
│  5. Tabla de detalle (heatmap por columna)       │
└─────────────────────────────────────────────────┘
```

Cada bloque es independiente. Los filtros aplicados afectan a la tabla y a los KPIs en tiempo real, sin recargar la página.

---

## Los 6 KPIs hero

La fila superior de tarjetas resume el estado del pipeline. Cada tarjeta usa un degradado distinto para que sean reconocibles de un vistazo.

| KPI | Qué mide | Cómo leerlo |
|---|---|---|
| **Items** | Número total de barcodes en el pipeline tras aplicar filtros. | Es el universo sobre el que se calcula todo lo demás. Si sube tras un cambio de filtro, hay más oportunidades cargadas. |
| **Con venta abierta** | Cuántos de esos items tienen una orden de venta activa esperando producto. | Indicador de demanda comprometida. Cuanto mayor, más presión por cerrar la compra. |
| **Con WS1** | Items con precio de mayorista 1 disponible para comparar. | Mide cobertura de inteligencia de mercado. Por debajo del 60 por ciento, el equipo de research debe completar fuentes. |
| **Con MSRP** | Items con precio de venta sugerido al público de fabricante. | Permite calcular el margen pleno. Si falta MSRP, la columna de margen aparece vacía. |
| **Somos más baratos** | Conteo de items donde nuestro coste neto es inferior al mínimo de la competencia. | Tarjeta clave. Es el subconjunto donde tenemos ventaja competitiva confirmada. |
| **Margen medio** | Porcentaje medio de margen entre coste y MSRP, en los items con datos completos. | Brújula de rentabilidad global. Comparar con el objetivo trimestral. |

Cada tarjeta muestra el número grande, una etiqueta corta y un degradado consistente con el bloque al que pertenece dentro de la tabla.

---

## Filtros y controles

La barra de filtros vive justo debajo de los KPIs y controla todo lo que se ve más abajo.

### Parámetro de orden

Selector principal. Reordena la tabla y reordena el ranking de oportunidades según el criterio elegido.

| Valor | Qué hace |
|---|---|
| **Best margin** | Ordena por margen porcentual descendente. Las mejores oportunidades de rentabilidad arriba. |
| **Cheapest** | Ordena por coste ascendente. Útil para identificar dónde podemos atacar precio. |
| **Highest MSRP** | Ordena por precio de venta sugerido descendente. Tickets más altos primero. |
| **Recent offer** | Ordena por fecha de oferta descendente. Lo más fresco arriba. |
| **Recent sale** | Ordena por fecha de venta descendente. Demanda reciente al frente. |
| **Highest qty** | Ordena por cantidad de la orden de venta descendente. Volúmenes grandes primero. |

### Filtro de categoría

Lista desplegable con todas las categorías presentes en el pipeline. Permite acotar la vista a Liquor, Spirits, FMCG, Tobacco u otras. La opción **Todas** restablece la vista global.

### Búsqueda libre

Campo de texto. Filtra por barcode, nombre de producto o marca. La coincidencia es parcial y no distingue mayúsculas. Ejemplo: escribir `johnnie` muestra todos los items de la marca Johnnie Walker.

### Botón Export CSV

Descarga el subconjunto visible de la tabla en formato CSV con encabezados, listo para abrir en Excel o Google Sheets. Ver [Exportar a CSV](#exportar-a-csv).

---

## Pipeline funnel

A la izquierda del bloque medio se muestra un funnel de seis etapas que cuenta cuántos items sobreviven a cada nivel de información disponible.

| Etapa | Significado |
|---|---|
| **Items** | Universo total tras filtros. |
| **With offer** | Tienen oferta de proveedor cargada. |
| **With WS1** | Suman precio de mayorista 1. |
| **With MSRP** | Suman precio de venta sugerido. |
| **With sale** | Tienen demanda activa (orden de venta abierta). |
| **We cheaper** | Tienen ventaja de precio confirmada frente al mercado. |

El funnel es la lectura más rápida del estado de cobertura del pipeline. Un funnel ancho y plano significa información completa. Uno muy estrecho hacia abajo significa que hay barcodes con coste pero sin contraste de mercado, y por tanto sin posibilidad de calcular margen ni ventaja.

Cada etapa usa el mismo color que el grupo correspondiente en la tabla, para que la asociación visual sea inmediata.

---

## Top categorías

A la derecha del funnel, una lista ordena las categorías por número de items con oportunidad. Cada barra muestra:

- Nombre de la categoría.
- Conteo absoluto de items.
- Porcentaje sobre el total visible.
- Barra de progreso con el degradado de la categoría.

Hacer clic sobre una categoría aplica el filtro correspondiente sobre la tabla. Hacer clic en **Todas** lo retira.

Esta vista responde de un vistazo a la pregunta: en qué categoría tenemos hoy más volumen de oportunidad.

---

## La tabla de detalle

Es el corazón del dashboard. Cada fila es un barcode con toda su información agregada. Las columnas se agrupan por bloques de color para reducir la carga cognitiva.

### Las 19 columnas explicadas

| Columna | Grupo | Descripción |
|---|---|---|
| **Barcode** | Item | Identificador único del producto (EAN/UPC). |
| **Producto** | Item | Nombre comercial del producto. |
| **Marca** | Item | Marca o casa propietaria. |
| **Categoría** | Item | Categoría operativa (Liquor, FMCG, etc.). |
| **Tamaño** | Item | Formato del envase (ej. 750ml, 1L). |
| **SKU** | Oferta | Referencia interna del proveedor que ofrece el barcode. |
| **Coste** | Oferta | Precio neto al que podemos comprar. Heatmap verde invertido: cuanto más bajo, más intenso. |
| **Fecha oferta** | Oferta | Fecha en la que se cargó la oferta vigente. |
| **Precio venta** | Venta | Precio que el cliente está dispuesto a pagar en la orden abierta. Heatmap azul. |
| **Fecha venta** | Venta | Fecha de la orden de venta. |
| **Cantidad** | Venta | Unidades pedidas en la orden. Heatmap azul. |
| **WS1** | Mayoristas | Precio del mayorista 1 (Tradeling). Heatmap cyan. |
| **WS2** | Mayoristas | Precio del mayorista 2 (Sarmad). Heatmap cyan. |
| **Trader** | Trader | Precio de trader externo de referencia. Heatmap ámbar. |
| **MSRP** | MSRP | Precio de venta sugerido al público. Heatmap rosa. |
| **MSRP2** | MSRP | Segundo precio MSRP de referencia (otra fuente). Heatmap rosa. |
| **Mín mercado** | Derivado | El menor entre WS1, WS2, Trader, MSRP, MSRP2. Es nuestro listón de competencia. |
| **Somos más baratos** | Derivado | Sí o no. Marca verde si nuestro coste es inferior al mínimo de mercado. |
| **Margen %** | Derivado | (MSRP − Coste) / MSRP. Heatmap violeta. Cuanto más intenso, mayor margen relativo. |

> Nota: aunque internamente la fila tiene 26 campos, la vista por defecto muestra las 19 columnas más relevantes para decidir. Las restantes están disponibles para queries y exports.

### Cómo leer una fila

De izquierda a derecha, la fila cuenta una historia:

1. **Qué es** el producto (Item).
2. **Cómo lo conseguimos** y a cuánto (Oferta).
3. **Quién lo necesita** y en qué condiciones (Venta).
4. **Cuánto cuesta en el mercado** (Mayoristas, Trader, MSRP).
5. **Qué ventaja y rentabilidad** ofrece (Derivados).

Cuando la fila tiene los seis bloques completos y con colores intensos, es una oportunidad madura. Cuando faltan bloques, es una oportunidad parcial que necesita más investigación.

---

## Sistema de heatmap

El heatmap es la herramienta visual central. Cada columna numérica se colorea por quintiles: el rango de valores se divide en cinco bandas, y cada fila recibe el tono correspondiente al quintil en el que cae.

### Las seis paletas

| Paleta | Color | Se usa en | Cómo leer |
|---|---|---|---|
| **Verde** | Verde oscuro a brillante | Coste (invertida) | Más oscuro es más caro. Más brillante es más barato. La inversión existe porque coste bajo es bueno. |
| **Azul** | Azul oscuro a celeste | Precio venta, cantidad | Más brillante es mayor precio o cantidad pedida. |
| **Cyan** | Petróleo a turquesa | WS1, WS2 | Más brillante es precio de mayorista más alto. |
| **Ámbar** | Marrón a dorado | Trader | Más brillante es trader más caro. |
| **Rosa** | Burdeos a fucsia | MSRP, MSRP2 | Más brillante es MSRP más alto, ticket más alto en estantería. |
| **Violeta** | Índigo a lavanda | Margen % | Más brillante es mayor margen relativo. La columna estrella. |

### Cómo interpretar visualmente

- Una fila con **violeta brillante** y **verde brillante** simultáneos es una oportunidad premium: alto margen y bajo coste.
- Una fila con **cyan oscuro** o sin color en mayoristas indica falta de inteligencia de mercado para ese barcode.
- Una columna entera apagada significa que ese campo está poco poblado para los items visibles.

### Por qué quintiles y no umbrales fijos

El quintil es relativo al conjunto visible. Cambiar el filtro recalcula los rangos y por tanto la intensidad. Esto evita que un barcode parezca caro o barato en términos absolutos cuando lo importante es su posición relativa al subconjunto que se está analizando.

---

## Acciones por fila

Cada fila ofrece tres atajos a las herramientas operativas del equipo:

### HubSpot

Abre el contacto o deal asociado en el [HubSpot Hub corporativo](https://app.hubspot.com/contacts/148358528/). Permite añadir notas, vincular el barcode al pipeline comercial o registrar interacciones.

### Slack

Comparte la fila en el canal [BAST de Slack](https://app.slack.com/client/T0B05EVQ19A/C0B08DKCUBU). Útil para pedir validación rápida del comprador, alertar de una oportunidad caliente o coordinar con el equipo de logística.

### Amazon

Abre Amazon en una pestaña nueva con el barcode prellenado. Sirve como verificación cruzada del MSRP de mercado y para detectar listings competidores.

---

## Casos de uso típicos

A continuación, los seis flujos más frecuentes y cómo resolverlos en el dashboard.

### 1. Dónde somos más baratos hoy

1. Dejar el filtro de categoría en **Todas**.
2. Cambiar el parámetro de orden a **Best margin**.
3. Mirar la columna **Somos más baratos**: las filas con marca verde son la respuesta.
4. Cruzar con la columna **Margen %** para priorizar por rentabilidad.

### 2. Mayor margen acumulable por categoría

1. Filtrar por la categoría objetivo (ej. Liquor & Spirits).
2. Ordenar por **Best margin**.
3. Sumar mentalmente las primeras diez filas para estimar el margen total disponible.
4. Exportar a CSV para análisis en Excel.

### 3. Atender una orden de venta abierta

1. Buscar el barcode o nombre del producto en el campo de búsqueda.
2. Comprobar la columna **Cantidad** y **Precio venta**.
3. Verificar **Coste** y **Somos más baratos** para validar viabilidad.
4. Si conviene, abrir la fila en HubSpot para registrar la decisión.

### 4. Identificar gaps de inteligencia

1. Recorrer las columnas **WS1**, **WS2** y **MSRP** buscando filas con valores vacíos o tonos muy oscuros.
2. Esos barcodes son candidatos a investigación de research.
3. Compartir el listado en Slack para asignar tarea.

### 5. Priorizar ofertas frescas

1. Cambiar el orden a **Recent offer**.
2. Las filas más recientes aparecen arriba.
3. Comparar **Coste** con **Mín mercado** para detectar ofertas agresivas.

### 6. Demanda urgente por volumen

1. Cambiar el orden a **Highest qty**.
2. Las órdenes de mayor volumen aparecen primero.
3. Verificar disponibilidad de oferta y margen antes de comprometer.

---

## Exportar a CSV

El botón **Export CSV** descarga el subconjunto visible (después de filtros y orden) con todas las columnas del schema. Características:

- Formato UTF-8 con BOM, compatible con Excel español.
- Separador coma, decimales con punto.
- Fechas en formato YYYY-MM-DD.
- Moneda EUR sin símbolo, solo número.
- Encabezados en español.

Útil para enviar por correo, archivar el snapshot del día o cruzar con otra fuente externa.

---

## Glosario

| Término | Definición |
|---|---|
| **Barcode** | Código EAN o UPC que identifica unívocamente un producto físico. |
| **Coste neto** | Precio que pagamos al proveedor sin IVA. La métrica crítica del pipeline. |
| **MSRP** | Manufacturer Suggested Retail Price. Precio de venta sugerido al público por el fabricante. |
| **WS1 / WS2** | Wholesale 1 y Wholesale 2. Precios de los dos mayoristas de referencia en nuestro mercado. |
| **Trader** | Precio de trader externo de referencia, normalmente más volátil que WS. |
| **Margen %** | (MSRP − Coste) / MSRP, expresado en porcentaje. |
| **Mín mercado** | El precio más bajo disponible entre todas las fuentes de mercado para un mismo barcode. |
| **Somos más baratos** | Indicador booleano: nuestro coste es inferior al Mín mercado. Ventaja competitiva confirmada. |
| **Quintil** | Cada uno de los cinco rangos en que se divide la distribución de una columna numérica para colorear el heatmap. |
| **Pipeline funnel** | Visualización de cuántos items sobreviven a cada nivel de información disponible. |

---

## Preguntas frecuentes

**¿Por qué algunas filas tienen huecos en MSRP o WS1.**
Porque la fuente correspondiente no tiene cargado ese barcode. El equipo de research completa la información de forma continua. Las celdas vacías son indicador de gap, no de error.

**¿Por qué cambian los colores cuando aplico un filtro.**
Porque el heatmap es relativo al conjunto visible. Si reduzco la vista a una sola categoría, el quintil se recalcula sobre ese subconjunto. Es deliberado: lo que importa es la posición relativa dentro de la comparación que estoy haciendo.

**¿Cada cuánto se actualiza la información.**
La vista materializada se refresca cada hora desde Supabase. La fecha y hora del último refresh aparece en la cabecera del dashboard.

**¿Puedo modificar datos desde el dashboard.**
No. El dashboard es solo de lectura. Las modificaciones se hacen en HubSpot, Supabase o Wix según la fuente.

**¿Por qué el orden Cheapest no siempre coincide con Best margin.**
Porque coste bajo no implica margen alto si el MSRP también es bajo. Los dos criterios pueden divergir y por eso son selectores distintos.

**¿La columna Somos más baratos compara contra MSRP también.**
Sí. Mín mercado considera WS1, WS2, Trader, MSRP y MSRP2. Si nuestro coste está por debajo de cualquiera de estos, ya es un punto de ventaja, pero la marca verde solo aparece cuando estamos por debajo del mínimo absoluto.

**¿Puedo guardar mis filtros para volver mañana.**
Por ahora no. Está previsto en la versión 6 del dashboard.

**¿Qué hago si el dashboard no carga.**
Revisar conexión, refrescar la página, y si el problema persiste contactar a soporte indicando hora aproximada y mensaje en pantalla.

---

## Soporte

| Canal | Para qué |
|---|---|
| **Slack** [#bast](https://app.slack.com/client/T0B05EVQ19A/C0B08DKCUBU) | Dudas operativas, solicitudes urgentes, alertas. |
| **Email** atlas@tradinglead.net | Reportes formales, peticiones de cambio. |
| **HubSpot** [Hub 148358528](https://app.hubspot.com/contacts/148358528/) | Trazabilidad comercial. |
| **Drive** [Carpeta BAST](https://drive.google.com/drive/folders/1e48ZJaKlnGbYIFEuPhu2RnLFzjLS5p3R) | Material de referencia y snapshots. |

Para sugerencias de mejora, abrir un hilo en Slack con el prefijo `[bast-feedback]` indicando vista afectada, comportamiento esperado y captura de pantalla cuando aplique.

---

**Documento mantenido por:** Equipo BAST
**Última revisión:** 2026-04-28
**Próxima revisión prevista:** con la entrega de la versión 6 del dashboard.
