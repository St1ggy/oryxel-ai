# Oryxel — Figma design system handoff

This document mirrors the **code tokens** in [`src/routes/layout.css`](../src/routes/layout.css) and links the canonical Figma file.

## Figma file

| Field | Value |
| --- | --- |
| **URL** | [Figma — Untitled (Oryxel)](https://www.figma.com/design/5cYUVrx268cHOD2VePndDH/Untitled?node-id=0-1) |
| **fileKey** | `5cYUVrx268cHOD2VePndDH` |
| **Main section** | `1:2` (URL `focus-id=1-2`) |
| **Main frame** | `1:3` — «Парфюмерный дневник с ИИ» |

## Themes

| Theme ID         | Name           | Page background | Accent                              | Text      |
| ---------------- | -------------- | --------------- | ----------------------------------- | --------- |
| `light-aura`     | Light Aura     | `#FAFAFA`       | Gold gradient `#E6D3A7` → `#C4A982` | `#1A1A1A` |
| `midnight-scent` | Midnight Scent | `#0F0F11`       | Emerald `#2D5A4A` → `#1A3A2F`       | `#F0F0F0` |
| `botanical`      | Botanical      | `#F8F9F5`       | Sage `#8A9A8B`                      | `#2C332E` |

## Semantic tokens (CSS variables)

- **Surfaces:** `--oryx-bg-page`, `--oryx-bg-surface`, `--oryx-bg-muted`, `--oryx-bg-chat-user`, `--oryx-bg-chat-ai`
- **Text:** `--oryx-fg`, `--oryx-fg-muted`, `--oryx-fg-on-accent`
- **Borders:** `--oryx-border`, `--oryx-border-strong`
- **Actions:** `--oryx-btn-primary-bg`, `-hover`, `-active`, `--oryx-btn-secondary-*`
- **Inputs:** `--oryx-input-bg`, `--oryx-input-border`
- **Feedback:** `--oryx-success`, `--oryx-warning`, `--oryx-destructive`, `--oryx-ring`
- **Table:** `--oryx-table-hover`
- **Badges / stars / owned icon:** `--oryx-badge-*`, `--oryx-star-*`, `--oryx-owned-icon`

## Typography

- **Headings:** **Outfit** (Google Fonts), weights 500–700
- **Body:** **Inter** (Google Fonts), weights 400–600

## Motion

- **Fast interactions:** `--oryx-motion-fast` ≈ 160ms
- **Theme background:** `--oryx-motion-theme` = 300ms on `html`

## Radii & elevation

- **Base radius:** `--oryx-radius-base` = `0.75rem`; `sm` / `md` / `lg` / `xl` derived from it
- **Cards / profile / stat cards:** `rounded-[24px]` (explicit 24px as per Figma)
- **Chat bubbles:** asymmetric — assistant `8px 20px 20px 20px`, user `20px 8px 20px 20px`
- **Chips:** `rounded-full` (pill)
- **Shadows:** `--oryx-shadow-sm` = `0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)` (from Figma); `--oryx-shadow-md`, `--oryx-shadow-lg`

## Layout notes (implemented)

- **Navigation:** diary route (`/`) shows no global header — navigation via tab row. Secondary routes (`/settings`, `/profile`, `/profile/edit`, `/design/ui-kit`) use a compact back-arrow header (`SecondaryHeader`).
- **Desktop diary:** chat ~35% + main ~65%; main **header 64px** with tab row (order: Collection → To try → Liked → Disliked → Profile), chat toggle left, settings icon right.
- **Mobile:** bottom nav **h-16**, three items — Chat, Tables, Profile; FAB hidden on profile tab.

## Figma checklist (for designers)

1. Color styles from the three theme columns + semantic aliases (Surface / Muted / Border / Accent).
2. Text styles: Heading (Outfit), Body (Inter).
3. Components: Button, Input, Textarea, Card, Badge, Tabs, Table, Chat bubbles, Modal, FAB, etc.
4. Artboards: **1440** desktop, **375** mobile.

## Icons

Lucide (`@lucide/svelte`), stroke ~1.5, aligned with linear icons in the file.

## Changelog

| Date | Change |
| --- | --- |
| 2026-03-31 | Replaced AppTopNav with SecondaryHeader on non-diary routes. Aligned card radius (24px), chat bubble asymmetric radius, shadow tokens, typography, and profile/carousel/radar to Figma specs. Added `oryxel_back` i18n key. |
