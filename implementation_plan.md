# Implementation Plan: Navigation Redirection & Job Match Analysis Preview

Address navigation usability gaps by providing intuitive "previous menu" redirection buttons across all views, and resolve the premature redirect during job match analysis so recruiters can thoroughly preview candidate match results before deciding to proceed to assessment configuration.

---

## User Review Required

> [!IMPORTANT]
> **Key Flow Changes**:
> 1. **Job Match Flow**: Running "Analyze Job Match" will no longer automatically jump to Assessment Config. The recruiter remains on the Job Match screen, previews the complete AI analysis (score badge, matched skills, skill gaps, seniority evaluation), and explicitly clicks a **"Proceed to Assessment Config →"** button when ready.
> 2. **Global & In-Page Navigation**: Every view will now have a universal top header "← Back" button with history tracking and breadcrumbs (`Dashboard › Job Match`), plus in-card "← Previous Step" / "Next Step →" buttons for smooth workflow transitions.

---

## Proposed Changes

### Frontend Design & Navigation Enhancements

#### [MODIFY] [globals.css](file:///c:/xampp/htdocs/TalentAssessAI/frontend/src/app/globals.css)
- Add CSS styles for:
  - `.ta-back-btn`: Styled back button with hover effects, subtle borders, and smooth transitions.
  - `.ta-breadcrumbs`: Horizontal breadcrumb list with chevron separators and active states.
  - `.ta-nav-actions`: Action bar for bottom/top in-page navigation (aligns "Previous" on the left and "Next/Proceed" on the right).
  - `.ta-match-score-card`: Visual styling for the candidate match score card with color-coded score bands (high, moderate, low), score bar, and highlight cards.

---

#### [MODIFY] [page.tsx](file:///c:/xampp/htdocs/TalentAssessAI/frontend/src/app/page.tsx)
1. **Navigation History Stack & Helpers**:
   - Introduce `navHistory: Array<typeof activeNav>` state to track previous screens.
   - Update `goTo(section, pushHistory = true)` to record navigation history when moving forward.
   - Add `goBack()` function that pops from `navHistory` to return to the actual previous menu, with logical workflow fallbacks if history is empty (e.g., `match` -> `source`, `generate` -> `match`, `assessment` -> `generate`, `reports` -> `dashboard`).
   - Add human-readable section labels and breadcrumb helpers.

2. **Top Header Bar Redirection (`.ta-top`)**:
   - Render a user-friendly **`← Back to [Previous]`** button whenever `activeNav !== 'dashboard'`.
   - Render interactive breadcrumbs (e.g. `Dashboard › Job Match`) allowing quick navigation to parent sections.

3. **Job Match Analysis Preview Fix (Requirement 2)**:
   - In `handleAnalyzeMatch`:
     - Remove the premature `goTo('generate')` call.
     - Keep recruiter on the Job Match screen with clear status feedback ("Analysis Complete").
   - In `activeNav === 'match'`:
     - Render an enhanced Job Match preview card displaying:
       - Match Score percentage with color-coded recommendation pill (e.g. `>=75% Strong Match`, `50-74% Moderate Fit`, `<50% Significant Gaps`).
       - Visual progress indicator bar.
       - Matched Skills chips with check icons.
       - Skill Gaps chips with warning indicators.
       - Seniority & Experience Assessment breakdown.
     - Add a prominent, clear action bar:
       - Left: `← Back to Upload JD`
       - Right: **`Proceed to Assessment Config →`** (navigates to `generate`).

4. **In-Page Redirection Buttons Across All Menus (Requirement 1)**:
   - **Upload JD (`source`)**:
     - Navigation buttons: `← Back to Dashboard` and `Proceed to Job Match →` (when source content is extracted).
   - **Job Match (`match`)**:
     - Navigation buttons: `← Back to Upload JD` and `Proceed to Assessment Config →` (when match analysis is ready).
   - **Assessment Config (`generate`)**:
     - Navigation buttons: `← Back to Job Match` alongside `Generate Assessment` and `Reset`.
     - Optional candidate match badge for context.
   - **Candidate Assessment (`assessment`)**:
     - Navigation buttons: `← Back to Assessment Config` alongside candidate submission controls.
   - **Evaluation Reports (`reports`)**:
     - List view: `← Back to Dashboard`.
     - Detail view: Prominent `← Back to All Reports` button at both top and bottom of the detailed report view.
   - **Tech Stack & R&D (`tech`)**:
     - Navigation button: `← Back to Dashboard`.
   - **Profile (`profile`)**:
     - Navigation button: `← Back to Dashboard`.
   - **Change Password (`changePassword`)**:
     - Navigation buttons: `← Back to Profile` and `← Back to Dashboard`.

---

## Verification Plan

### Automated Verification
- Run TypeScript typecheck:
  ```bash
  npx tsc --noEmit
  ```
- Run Next.js build validation:
  ```bash
  npm run build
  ```

### Manual Verification Flow
1. **Navigation & Redirection Buttons**:
   - Navigate to **Upload JD**, check for top `← Back to Dashboard` button and breadcrumbs.
   - Ingest a JD, verify option to navigate or proceed to **Job Match**.
   - On **Job Match**, verify `← Back to Upload JD` redirection button works.
   - Check **Assessment Config**, **Candidate Assessment**, **Evaluation Reports**, **Tech Stack**, **Profile**, and **Change Password** for user-friendly redirection buttons.
   - Open a report in **Evaluation Reports** and verify `← Back to All Reports` works smoothly.
2. **Job Match Analysis Preview**:
   - Ingest a job description and candidate resume.
   - Click **Analyze Job Match**.
   - Confirm the page **does NOT immediately redirect** to Assessment Config.
   - Verify recruiter sees the full analysis preview (score, matched skills, gaps, seniority evaluation).
   - Click **Proceed to Assessment Config →** and confirm smooth transition to assessment controls.
