# Store Compliance Checklist — האוזן (The Ear)

This checklist captures everything the team must complete before submitting to
Apple TestFlight or Google Play internal testing. The mobile app already ships
an in-app "מידע, פרטיות ובטיחות" screen, report/hide flows, and a backend
reports collection — this document covers the *store-facing* metadata and
disclosures that still need to be filled in by a human reviewer.

Support / privacy contact (placeholder — see `apps/mobile/src/lib/support.ts`):
`support@theear.app`

Public legal URLs (production domain, see `apps/mobile/src/lib/legal.ts`):
- Privacy Policy: https://theear.app/privacy.html
- Terms / Community Guidelines: https://theear.app/terms.html

> TODO: create real support/privacy inbox before store submission.

---

## Data the app collects

| Data type | Why collected | Shared with 3rd parties | Encrypted in transit |
| --- | --- | --- | --- |
| Coarse / precise device location (when in use) | Show questions and updates relevant to the user's area; verify that an answer comes from someone within the relevant radius | No (used only on our backend for relevance and answer eligibility) | Yes (HTTPS) |
| Anonymous session identifier | Bind a user's questions/answers/reports to a stable anonymous ID without requiring sign-up | No | Yes (HTTPS) |
| User-generated content (questions, answers, reports, optional report details) | Core product functionality (display content, moderation) | No | Yes (HTTPS) |
| Approximate location captured at the moment of a question/answer | Local relevance and answer eligibility verification | No | Yes (HTTPS) |

The app does **not** collect: name, email, phone number, contacts, photos,
health data, financial data, or advertising identifiers. There is no analytics
SDK, no tracking SDK, and no third-party ad SDK.

User data deletion request path: user contacts `support@theear.app` from the
in-app About screen; we manually delete the requested content / records tied
to their anonymous session ID.

---

## Apple — App Store Connect / TestFlight

### App Privacy labels (to fill in App Store Connect)

- **Location** → "Precise Location" + "Coarse Location"
  - Linked to user: **No** (anonymous session, no identity)
  - Used for tracking: **No**
  - Purposes: **App Functionality**
- **User Content** → "Other User Content" (questions, answers, report details)
  - Linked to user: **No**
  - Used for tracking: **No**
  - Purposes: **App Functionality**
- **Identifiers** → "User ID" (the anonymous session ID we generate; not the
  device IDFA/IDFV)
  - Linked to user: **No**
  - Used for tracking: **No**
  - Purposes: **App Functionality**
- All other categories: **Data Not Collected**

### Location usage explanation

`NSLocationWhenInUseUsageDescription` is set in `apps/mobile/app.json`:

> "האוזן משתמשת במיקום שלך כדי להראות שאלות ועדכונים שנמצאים קרוב אליך,
> וכדי לוודא שתשובות מגיעות מאנשים שבאמת נמצאים באזור. המיקום המדויק שלך
> לא מוצג למשתמשים אחרים."

The app uses **When In Use** only — no background location, no
`NSLocationAlwaysAndWhenInUseUsageDescription`.

### UGC moderation / reporting (Apple Guideline 1.2 + 1.7)

Apple requires every app with user-generated content to support:

- [x] A method for filtering objectionable material — in-app report flow per
      question and per answer (`ReportContentScreen` → backend `Report`
      collection)
- [x] A mechanism to report offensive content and timely responses to
      concerns — report alert confirms receipt and points to
      `support@theear.app` for urgent cases
- [x] The ability to block abusive users from the service — backend reports
      collection enables manual review and removal; users may hide content on
      device via the "הסתר תוכן כזה" action
- [x] Published contact information so users can reach the developer —
      surfaced in the About screen and this checklist (`support@theear.app`)

### Other Apple metadata

- **Support URL**: TODO — needs a public-facing support page (or a `mailto:`
  redirect page) before submission.
- **Privacy Policy URL**: https://theear.app/privacy.html (served from the
  public legal site in `docs/`).
- **Age rating recommendation**: 12+ (user-generated content, unrestricted
  web access to location-tagged content, infrequent/mild references possible
  via UGC). Not directed at children.
- **Test account / demo notes**: not required — the app uses anonymous
  sessions and grants access without sign-up. Include a note for the App
  Review team: "No sign-in required. Launch the app, allow location
  permission ('When In Use'), and the map will populate with nearby
  questions. To test report flow: open any question → menu → 'דווח'."

---

## Google Play — Play Console / Internal Testing

### Data Safety form fields

- **Data collected**: Location (approximate + precise), App activity (user-
  generated content), App info and performance (crash logs only if/when
  added — currently none), Device or other IDs (our own anonymous session
  ID, not AAID).
- **Data shared**: None.
- **Data collected is encrypted in transit**: Yes (HTTPS to backend).
- **Users can request data deletion**: Yes — via email to
  `support@theear.app`, surfaced in the in-app About screen.
- **Data collection optional?**: Location is required to deliver the core
  product (without it, the app cannot show local content); the user
  controls the OS-level permission.

### Location data disclosure (Play)

- Foreground location only (`ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`
  in `apps/mobile/app.json`).
- No background location permission requested.
- No `ACCESS_BACKGROUND_LOCATION` usage — do not enable on Play Console.

### User-generated content moderation (Play UGC policy)

- [x] In-app reporting per question and per answer
- [x] In-app blocking/hiding of content on device
- [x] Backend storage of reports (`reports` collection) for human review
- [x] Community guidelines surfaced inside the app (About screen → "תוכן
      משתמשים וכללי קהילה")
- [x] Contact channel for moderation escalations: `support@theear.app`
- [ ] **TODO**: document moderation SLA / review cadence internally before
      first public release

### Other Play metadata

- **Privacy Policy URL**: https://theear.app/privacy.html (served from the
  public legal site in `docs/`).
- **App access instructions**: "No sign-in required. Launch the app and
  allow location permission ('While using the app'). Map will populate with
  nearby questions; tap any pin to view, answer, or report content."
- **Content rating questionnaire**: declare user-generated content,
  user-to-user communication via questions/answers, location sharing for
  relevance only. Expected rating: Teen (PEGI 12 equivalent).
- **Target audience**: 13+ / not children. Do **not** opt into the Designed
  for Families program. The app contains user-generated content and is not
  appropriate for children under 13.
- **Internal testing requirements**: at least one tester on the testers
  list, signed APK/AAB uploaded, Data Safety + Content Rating + Target
  Audience + Privacy Policy filled in. Internal testing does not require
  store listing review but does require the Data Safety form.

---

## Cross-store summary

- [x] In-app legal/safety screen ("מידע, פרטיות ובטיחות") with sections for
      location use, what data is kept, community rules, reporting/hiding,
      data deletion request, and contact info.
- [x] Hebrew community guidelines visible in the About screen.
- [x] `support@theear.app` placeholder constant referenced from About screen
      and report-confirmation flow.
- [x] Reporting flow (questions + answers) wired to backend.
- [x] Hide-on-device flow for questions + answers.
- [x] Close-own-question flow.
- [x] All network traffic over HTTPS (enforced for shippable builds via
      `apps/mobile/app.config.js`).
- [x] Public Privacy Policy URL — https://theear.app/privacy.html.
- [x] Public Terms / Community Guidelines URL —
      https://theear.app/terms.html (linked from the About screen).
- [ ] Real `support@theear.app` inbox — **blocker for both stores** (users
      must be able to reach a human).
- [ ] Lawyer-reviewed copy for the in-app About screen — TODO before public
      launch (placeholder copy is acceptable for closed TestFlight /
      internal testing).
