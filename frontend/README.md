# ResolveIQ Frontend Workspace

ResolveIQ is a premium, high-performance customer support orchestration platform designed for D2C brands. This directory houses the Next.js 14 Web Application client, utilizing Tailwind CSS, Framer Motion, Zustand, and TanStack React Query.

---

## 🛠️ Tech Stack & Badges

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)
![React Query](https://img.shields.io/badge/React_Query-5.0-ff4154?logo=react-query)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11.0-e10098?logo=framer)
![Zustand](https://img.shields.io/badge/Zustand-4.5-ea580c?logo=react)

---

## ✨ Key Features

1. **Ultra-Premium Landing Page**: Dynamic scrolling navbar, Bento Grid features showcase, interactive pricing cards, and live reviews marquee.
2. **Workstation Overview Dashboard**: High-level support statistics (Total Tickets, Open Tickets, SLA Times), animated number counters, interactive area charts (tickets over 30d), sentiment breakdown donut charts, and tickets by priority list.
3. **Tickets Queue Workspace**: Sortable ticket tracking list with debounced filtering, bulk action assignment/status updates/deletion, and slide-in ticket creation.
4. **Interactive Chat Detail Panel**: Split-screen (60/40) live support workspace with inline priority/agent assignment controls, message sentiment meters, typing indicator animations, quick AI suggested replies, and file attachment uploads.
5. **Passwordless Customer Portal**: Public hub allowing customers to search for their active support sessions using just their email. Supports reading, replying, and rating resolved tickets with a 1-5 star feedback form.
6. **Embeddable Chat Widget**: Client-facing floating button widget customizable for any web store. Includes bot auto-response and immediate ticket creation triggers.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js (v18+)** and **npm** installed.

### 2. Environment Setup
Copy the environment variables template and configure the base API endpoint of the ResolveIQ FastAPI backend:
```bash
cp .env.example .env.local
```
Inside `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=ResolveIQ
```

### 3. Installation
Install all required package dependencies:
```bash
npm install
```

### 4. Running Locally
Launch the Next.js local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
Compile and verify the TypeScript production build:
```bash
npm run build
npm run start
```

---

## 🖥️ Screenshots Showcase

### Premium Landing Page Homepage
![Landing Page Homepage](https://raw.githubusercontent.com/username/repository/main/screenshots/landing_page.png)

### Workstation Overview Dashboard
![Overview Dashboard](https://raw.githubusercontent.com/username/repository/main/screenshots/dashboard.png)

### Live Support Workspace
![Live Support Workspace](https://raw.githubusercontent.com/username/repository/main/screenshots/live_chat.png)

---

## 🌐 Deploy to Vercel

The easiest way to deploy the ResolveIQ Frontend is using Vercel:

1. Push your repository code to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com/new) and import the project.
3. Select `Next.js` as the framework preset.
4. In the **Environment Variables** section, configure the production backend API URL:
   - `NEXT_PUBLIC_API_URL`: `https://your-resolveiq-backend-url.com`
   - `NEXT_PUBLIC_APP_NAME`: `ResolveIQ`
5. Click **Deploy**. Vercel will build and launch your edge-optimized global distribution!
