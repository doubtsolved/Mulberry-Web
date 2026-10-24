# Mulberry — User Profile Setup, Desk Greeting & Android Storage Enhancement

Integrates a seamless multi-step onboarding flow for first-time users (device folder selection followed by student profile setup), saves user profile metadata as `.profile` in JSON format at the root of the selected directory, adds a personalized `Hello, <User>` greeting on the Desk shelf, filters the library by the user's selected prof year, and enhances Android browser folder selection resilience.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX choices have been confirmed:

- **Confirmed Decision 1 (Multi-Step Onboarding)**: First-time setup presents a cohesive two-step Material 3 Expressive sheet: Step 1 selects the device storage directory (with robust Android fallback), followed immediately by Step 2 to configure the student profile (`displayName`, `selectedProf`, `institution`).
- **Confirmed Decision 2 (.profile JSON Persistence)**: The user profile is written to the root of the selected folder as `.profile` in JSON format following the exact specification, while syncing to local state and fallback storage.
- **Confirmed Decision 3 (Library Prof-Year Filtering)**: The Library dynamically filters books to match the user's `selectedProf` (e.g., 1st Prof, 2nd Prof, 3rd Prof Part 1, Final Prof) while providing an accessible prof-filter toggle to switch or view all profs anytime.
- **Confirmed Decision 4 (Desk Greeting)**: The Desk tab displays an organic, distraction-free `Hello, <displayName>` greeting header above the offline shelf, acknowledging their academic role and selected prof year.
- **Confirmed Decision 5 (Android Directory Selection Resilience)**: Enhances folder picker logic on Android where `showDirectoryPicker` may throw platform permission or security errors, providing an immediate friendly fallback so Android mobile users are never blocked.

---

### 1. Overview & Core Concept

- **What It Delivers**:
  - Step 1: Storage directory selection (native file picker on desktop/Chromium, resilient fallbacks on mobile/Android).
  - Step 2: Student profile setup (Name, Prof Year selection, Institution).
  - File Persistence: Writes `.profile` JSON file to the folder root:
    ```json
    {
      "academicRole": "Medical Student",
      "dailyUploadLimit": 999,
      "displayName": "Sahabul",
      "institution": "Medical College",
      "lastUpdated": 1792829436579,
      "selectedProf": "1st Prof",
      "vipBadgeLabel": "Core Architect",
      "vipCode": "MUL1064",
      "vipTier": "CORE_VIP"
    }
    ```
  - Desk Experience: Displays `Hello, <displayName>` greeting with subtle prof-year status above the downloaded books shelf.
  - Library Experience: Defaults to the user's prof year, showcasing only relevant textbooks and notes for their current curriculum.
  - Settings: Allows viewing and editing the user profile and switching prof years.

---

### 2. User Experience & Visual Design

- **Onboarding Modal (Multi-Step Flow)**:
  - Step 1 (Folder): Clean prompt with device storage picker, Android compatibility guard, and instant confirmation.
  - Step 2 (Profile): Clean Material 3 input fields for Name, Prof Year dropdown/segmented options (`1st Prof`, `2nd Prof`, `3rd Prof Part 1`, `Final Prof`), and optional Institution.
  - Fluid spring transition between steps.
- **Desk Tab ("Shelf")**:
  - Clean greeting header:
    - `Hello, Sahabul` in bold Display typography
    - Muted unboxed metadata: `Medical Student · 1st Prof`
  - Followed by the offline shelf grouped by book `type`.
- **Library Tab**:
  - Filtered to the user's `selectedProf` by default so they only see relevant books for their year.
  - A clean segmented control allows quickly toggling between their prof year and "All Profs".

---

### 3. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    First-Time Onboarding                        │
│                                                                 │
│  Step 1: Folder Selection ──► Step 2: Profile Setup (Name/Prof) │
└────────────────────────────────┬────────────────────────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
┌───────────────────────────────┐           ┌────────────────────┐
│ Selected Folder Root Storage  │           │   App State Sync   │
│ • .profile (JSON)             │           │ • activeProfile    │
│ • downloaded_books.json       │           │ • selectedProf     │
│ • <id>.bin                    │           │ • displayName      │
└───────────────────────────────┘           └─────────┬──────────┘
                                                      │
                       ┌──────────────────────────────┴──────────┐
                       ▼                                         ▼
           ┌───────────────────────┐                 ┌───────────────────────┐
           │     Library View      │                 │       Desk View       │
           │ • Filtered to user's  │                 │ • "Hello, <User>"     │
           │   selectedProf year   │                 │ • Offline Shelf       │
           └───────────────────────┘                 └───────────────────────┘
```

- **Profile Schema & Storage**:
  - `UserProfile`:
    - `academicRole: string` (default: "Medical Student")
    - `dailyUploadLimit: number` (default: 999)
    - `displayName: string`
    - `institution: string`
    - `lastUpdated: number`
    - `selectedProf: string`
    - `vipBadgeLabel: string` (default: "Core Architect")
    - `vipCode: string` (default: "MUL1064")
    - `vipTier: string` (default: "CORE_VIP")
  - Storage methods: `saveProfile(profile)` & `loadProfile()` reading/writing `.profile` at folder root.
