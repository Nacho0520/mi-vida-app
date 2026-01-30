# Guía de estilo (Apple Dark)

Esta guía define tokens visuales y reglas simples para mantener consistencia.

## Tokens principales (CSS)

Definidos en `src/index.css`:
- `--radius-card`: radios de tarjetas/modales
- `--radius-xl`: radios grandes (p. ej. paneles)
- `--radius-pill`: radios tipo cápsula
- `--shadow-apple`: sombra principal
- `--shadow-apple-soft`: sombra suave
- `--text-body`: tamaño base de texto
- `--text-caption`: texto pequeño y elegante
- `--text-title`: títulos principales

## Utilidades recomendadas

Estas clases ya existen en `src/index.css`:
- `radius-card`, `radius-xl`, `radius-pill`
- `shadow-apple`, `shadow-apple-soft`
- `text-body`, `text-caption`, `text-title`

## Reglas de uso

1. **Botón principal**: `bg-white text-black` + `shadow-apple-soft`.
2. **Card/Modal**: `radius-card` + `border-white/5` + `shadow-apple`.
3. **Elementos flotantes** (banners, dock): `radius-pill` + `shadow-apple-soft`.
4. **Inputs**: `border-neutral-800/60` y foco `border-neutral-400/50`.
5. **Textos secundarios**: usar `text-neutral-500` o `text-neutral-400`.

## Tipografía móvil

- `html` base: `15px`
- `body` line-height: `1.55`
- Evitar `text-[10px]` si hay alternativa; usar `text-caption` cuando sea posible.
