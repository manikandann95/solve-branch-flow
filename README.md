# TroubleshootFlow — Interactive IT Decision Tree Builder

Transforming complex Tier-3 engineering knowledge into executable, step-by-step diagnostic workflows for frontline IT support teams.

[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![React Flow](https://img.shields.io/badge/Canvas-React%20Flow-FF007A?style=flat-square)](https://reactflow.dev/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20%2F%20Postgres-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Zustand](https://img.shields.io/badge/State-Zustand-443322?style=flat-square)](https://github.com/pmndrs/zustand)

TroubleshootFlow is a SaaS-style web application built to bridge the gap between Tier-3 systems administrators and Tier-1/2 helpdesk agents. Rather than searching through static Word documents and wikis, L3 engineers build interactive, branching decision trees on an infinite canvas. Frontline support technicians run these workflows in a focused "Guided Walkthrough" UI, eliminating decision fatigue and accelerating incident resolution times.

---

## 🏗️ Technical Architecture

TroubleshootFlow utilizes a modern, decoupled stack built for canvas state management and relational data persistence:

- **UI/UX Layer**: Built with **React**, styled with **Tailwind CSS** and **shadcn/ui** components. Animations and transitions are powered by **Framer Motion** to deliver a premium frosted-glass design system.
- **State & Canvas Logic**: Powered by **React Flow** for infinite whiteboard panning and connection vector drawing. **Zustand** acts as the high-performance global state manager, synchronizing changes across the canvas.
- **Backend & Database**: **Supabase** handles identity management (Auth), real-time collaboration, and stores the branching topologies inside highly flexible **PostgreSQL JSONB** columns to allow infinite node expansions without database migrations.

---

## 🎮 The Dual-Engine Strategy

TroubleshootFlow serves two distinct user personas through specialized interface modes:

| Feature | Engine 1: Builder Mode | Engine 2: Guided Walkthrough Mode |
| :--- | :--- | :--- |
| **Primary User** | L3 Systems Administrators & Site Reliability Engineers | L1/L2 Technical Support Agents |
| **UX Paradigm** | Infinite, zoomable vector whiteboard canvas | Focused, distraction-free single-card interface |
| **Core Action** | Drag-and-drop node creation and connection routing | Step-by-step question selection and command execution |
| **Format Output** | Scalable JSONB node tree saved to database | Exportable PDF Walkthrough Audit Report for tickets |

---

## 🔬 Node Typology & Anatomy

Diagnostic workflows are structured around a rigid, **6-node diagnostic typology**:

```text
[Start] (Symptom/Category) ➔ [Question] (Yes/No branches) ➔ [Action] (Commands) ➔ [Resolution/Escalation]
```

- **Start (🚀)**: The entry point outlining the symptom (e.g. "VPN Failure").
- **Question (❓)**: A binary or multiple-choice diagnostic branch point.
- **Action (⚙️)**: Explicit instructions, including terminal/PowerShell code blocks (e.g. `gpupdate /force`).
- **Info (ℹ️)**: Contextual background knowledge or external KB articles.
- **Resolution (✔️)**: Successful end of a troubleshooting branch.
- **Escalation (⚠️)**: Unresolved endpoint generating a ticket-ready handoff report.

Each node is rendered as an isolated structural layers containing input/output anchors, rich markdown descriptors, difficulty metadata tags (L1 vs L2), and category badges (e.g., *Azure Entra*, *Active Directory*).

---

## 🗄️ Database Schema & Security

The database layer runs on PostgreSQL hosted by Supabase with Row Level Security (RLS) policies enforced at the API layer:

- **`Users`**: Holds auth credentials.
- **`Trees`**: Contains `tree_id`, `user_id` (foreign key), `title`, and `tree_data` stored as a `JSONB` structure. JSONB allows deeply nested logic paths to load and save in a single query.
- **`Comments`**: Implements node-level comment threads allowing L3 engineers to collaborate on logic reviews.

**Security RLS Rule Example:**
```sql
CREATE POLICY "Users can only edit their own trees" 
ON public.trees FOR UPDATE 
USING (auth.uid() = user_id);
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase account (free tier)

### Installation
1. Clone the project and install dependencies:
   ```bash
   cd troubleshootflow
   npm install
   ```
2. Create a `.env.local` file and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 💼 Resume Highlights

Showcase this project on your resume as follows:

### **TroubleshootFlow — Interactive IT Decision Tree Builder (React, Supabase, Zustand)**
- Architected a web application that converts static documentation into interactive, logical diagnostic decision trees powered by **React Flow** and **Zustand**.
- Implemented a flexible schema using **Supabase** and **PostgreSQL JSONB** columns to handle dynamic, complex logic routing paths.
- Built a distraction-free "Walkthrough Engine" featuring step-by-step diagnostic paths and automated PDF audit report generation for IT ticketing systems.
