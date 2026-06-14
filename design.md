# 🎨 CampusFlow — Landing Page & Login Portals Design System

This document outlines the visual identity, typography, color palette, component design, and motion design guidelines for the CampusFlow Landing Page and Login Portals.

---

## 🎨 Color System

We employ a clean, data-dense, functional color system. The color palette combines neutral background tones with vibrant, role-specific accent colors to establish clear portal boundaries.

### 1. Base Neutrals
*   **Background Base (`--bg-base`)**: `#FFFFFF` (Pure white for default body backgrounds)
*   **Surface (`--surface`)**: `#F8FAFC` (Slate 50 for layout blocks, secondary panels, and container bounds)
*   **On-Background / Text Primary (`--on-background`)**: `#0F172A` (Slate 900 for dark slate body text and display headers)
*   **On-Surface Variant / Text Secondary (`--on-surface-variant`)**: `#475569` (Slate 600 for descriptions and muted text labels)
*   **Outline (`--outline`)**: `#E2E8F0` (Slate 200 for clean borders)
*   **Outline Variant (`--outline-variant`)**: `#CBD5E1` (Slate 300 for hover borders)

### 2. Role Accent Colors
To reinforce portal identity, each user role is assigned a distinct primary theme:
*   🎓 **STUDENT PORTAL (Sky Blue)**:
    *   Accent: `#0EA5E9` (Sky 500)
    *   Background Tint: `#0EA5E9` with 15% opacity (used for card containers and inputs)
*   👨‍🏫 **FACULTY PORTAL (Emerald Green)**:
    *   Accent: `#10B981` (Emerald 500)
    *   Background Tint: `#10B981` with 15% opacity
*   🔧 **ADMIN PORTAL (Indigo)**:
    *   Accent: `#6366F1` (Indigo 500)
    *   Background Tint: `#6366F1` with 15% opacity

---

## ✍️ Typography Hierarchy

The typography uses **Inter** for headers/body and **IBM Plex Mono** for technical data.

| Class Name | Font Size | Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `.font-display-lg` | 56px | 64px | Extra Bold (800) | Hero title text |
| `.font-headline-md` | 32px | 40px | Bold (700) | Section titles, left panels |
| `.font-headline-sm` | 24px | 32px | Semi-Bold (600) | Portal Card headings, card titles |
| `.font-body-lg` | 18px | 28px | Regular (400) | Sub-hero description |
| `.font-body-md` | 16px | 24px | Regular (400) | Standard page descriptions, login text |
| `.font-body-sm` | 14px | 20px | Regular (400) | Muted captions, form hints |
| `.font-nav-link` | 14px | 20px | Medium (500) | Navigation items, button labels |
| `.font-data-mono` | 14px | 20px | Medium (500) | Logs, code items, technical labels |
| `.font-label-caps` | 12px | 16px | Semi-Bold (600) | Uppercase uppercase headers, uppercase labels |

---

## 📦 Component Design & Layout

### 1. Landing Page (`/`)
*   **Background Geometric Grid**: Subtle linear grid lines spaced 40px apart with a fade-out mask to keep the focus on hero content.
*   **Top Navigation Bar**: Semitransparent white overlay (`bg-white/80`) with `backdrop-blur-md` for a clean scrolling experience.
*   **Hero Section**: Dual-column layout (7-column text, 5-column vector illustration).
*   **Illustration Centerpiece**: Themed academic vector illustration featuring server lines, screens, and database rings to match FastAPI/Next.js/Gemini infrastructure.
*   **Features Grid**: 3-column layout showcasing integrated systems (automated exams, real-time sync, smart grading, smart workflows) using group-hover borders and subtle lift animations.
*   **Portal Preview Cards**: Role-specific portals (Student, Faculty, Admin) represented by card elements that transition from grayscale to vibrant colors on hover.

### 2. Login Portal Pages
*   **Split Screen Layout (Desktop)**:
    *   **Left Branding Column (45% width)**: Deep solid fill matching the portal accent color (Sky, Emerald, or Indigo) with rounded graphic backdrops and quick-feature checkmarks.
    *   **Right Auth Column (55% width)**: Off-white canvas (`#F8FAFC`) with a centered modern form, using high outline contrast, custom inputs, and dynamic error state banners.
*   **Default Login Page (`/login`)**:
    *   **Dark Glassmorphism UI**: Uses a deep space background (`bg-[#0B0F19]`) with dynamic radial gradients (`--violet-glow` and `--cyan-glow`).
    *   **White Glass Card**: Translucent background (`glass-card` with `backdrop-blur-xl`), clean white text, and easily-accessible test credential shortcuts.

---

## ⚡ Motion & Micro-Animations

We employ **Emil Kowalski-inspired** snappy, lightweight transitions using `framer-motion` to keep the interface feeling responsive:
1.  **Custom Snappy Easing (`customEase`)**: `[0.23, 1, 0.32, 1]` (Fast exit with subtle acceleration peak).
2.  **Staggered Entrance**: Hero sections and cards fade in sequentially using staggered delay animations.
3.  **Active Button Scaling (`btn-active-scale`)**: Active buttons shrink slightly on click (`scale(0.97)`) to provide immediate tactile feedback.
4.  **Hover State Elevation**: Cards lift upwards (`translate-y-[-4px]`) and transition outlines smoothly on hover.
