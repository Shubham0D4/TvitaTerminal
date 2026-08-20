# Tvita Client Portal - Design System & UI/UX Specification

This document serves as the **single source of truth** for the visual identity, design tokens, component architecture, layout rules, and page-by-page design specifications of the **Tvita Client Portal** mobile application. It outlines the current design implementation and provides guidelines for future extensions to maintain consistency.

---

## 1. Project Design Analysis

The Tvita Client Portal is a premium mobile application built with **Flutter**. It is designed to offer clients an overview of their projects, active timelines, milestones, notes, support tickets, and invoices.

### Existing Architecture & Screens
- **Authentication**: `LoginPage`
- **Shell & Navigation**: `HomePage` managing a 4-tab bottom navigation bar (`Home`, `Projects`, `Billing`, `Profile`).
- **Global Overlays**: `SpotlightSearchPage`
- **Project Scope**: `ProjectDetailPage`
- **Billing History**: `BillingHistoryDetailPage`
- **Collaborative Workspace**: `ProjectNotesPage` (list of projects), `ProjectNoteListPage` (notes under a specific project).
- **Client Support**: `TicketsPage`
- **System Messaging**: `NotificationsPage`
- **Forms & Sheets**: `MeetRequestSheet`, `QuoteRequestSheet`, `InvoiceSheet`, `RecurringSheet`, `PlanManagementSheet`, `AddOnSheet`, `EditProfileSheet`.
- **Media & Articles**: `ServiceDetailPage`, `BlogArticlePage`.

### Key Visual Elements
1. **The Card Stack (`CardStack`)**: Visual layers representing receding paper cards, creating depth.
2. **Quick Actions (`QuickActionsRow`)**: Accessible shortcuts for primary user activities.
3. **Phase Process (`PhaseTimeline`)**: Visual representation of project phases with status tags (`done`, `active`, `upcoming`).
4. **Hero Billings (`BillHeroCard`)**: Impactful carousel slides presenting active dues, recurring plans, and add-ons.

---

## 2. Design Philosophy

Tvita’s interface is crafted to feel **premium, structured, and fluid**.

- **Brand Personality**: Modern, professional, clean, minimal, trustworthy.
- **Visual Tone**: Curated color blocks, sleek dark overlays for depth, thin hairlines, and round pill shapes.
- **UX Principles**: Direct access, high tactile responsiveness (haptic/vibration feedback on selection and active taps), and zero clutter.
- **Accessibility Principles**: Contrast-conscious layouts, large touch targets (minimum 44x44 dp), readable system-native typography, and sensible validation feedback.
- **Content Density**: Moderate to compact layout spacing, minimizing vertical scrolling while maintaining whitespace.
- **Mobile-First Strategy**: The interface is designed exclusively for handheld viewports, prioritizing bottom-sheet drawers, card swiping, and gesture dismissals.

---

## 3. Complete Color System

The color palette is built around deep blue brand colors, bright status indicators, and clean white-grey card surfaces.

### Brand Colors
| CSS Variable Name | Color Role | HEX Value | RGB Value | HSL Value |
| :--- | :--- | :--- | :--- | :--- |
| `--color-accent` | Quiet panels, active pills | `#DBE2F8` | `rgb(219, 226, 248)` | `hsl(226, 68%, 92%)` |
| `--color-brand-light`| Icon strokes, light details | `#8FA4E6` | `rgb(143, 164, 230)` | `hsl(226, 66%, 73%)` |
| `--color-brand` | Primary buttons, links | `#2340B8` | `rgb(35, 64, 184)` | `hsl(228, 68%, 43%)` |
| `--color-brand-hover`| Pressed, focused buttons | `#16277A` | `rgb(22, 39, 122)` | `hsl(229, 70%, 28%)` |
| `--color-brand-dark` | Navy titles, elevated cards | `#101C6B` | `rgb(16, 28, 107)` | `hsl(232, 74%, 24%)` |

### Background & Surface Colors
| CSS Variable Name | Color Role | HEX Value | RGB Value |
| :--- | :--- | :--- | :--- |
| `--color-page-bg` | Main scaffold background | `#F4F4F5` | `rgb(244, 244, 245)` |
| `--color-nav-bg` | Bottom navigation & sheets | `#FFFFFF` | `rgb(255, 255, 255)` |
| `--color-surface` | Default card surfaces | `#FFFFFF` | `rgb(255, 255, 255)` |
| `--color-bell-circle`| Icon badges and button backing| `#FFFFFF` | `rgb(255, 255, 255)` |
| `--color-overlay-dark`| Deep backdrop gradients | `rgba(0,0,0,0.65)` | `rgba(0, 0, 0, 0.65)`|

### Text Colors
| CSS Variable Name | Color Role | HEX Value / Opacity | Usage |
| :--- | :--- | :--- | :--- |
| `--color-text-primary`| Headings, primary text | `#000000` | 100% Black on Light Backgrounds |
| `--color-text-secondary`| Subtitles, labels | `rgba(0,0,0,0.6)` / `0x99000000` | Excerpts, secondary details |
| `--color-text-muted` | Hints, placeholders | `rgba(0,0,0,0.4)` / `0x66000000` | Input helper text, search hint |
| `--color-text-white` | Inverse text on brand dark | `#FFFFFF` | Text on navy/dark backgrounds |

### Border Colors
| CSS Variable Name | Color Role | HEX Value / Opacity | Usage |
| :--- | :--- | :--- | :--- |
| `--color-border-hairline`| Card dividers, process lines | `rgba(16, 28, 107, 0.12)` / `0x1F101C6B` | Subtle separators |
| `--color-border-focus`| Active field borders | `#000000` | High-contrast focus borders |

### Semantic Colors
| CSS Variable Name | Color Role | HEX (Foreground) | HEX (Background) | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--color-success` | Completed steps, paid states | `#1E6B50` | `#DFF0E8` | `detailGreen` & `detailGreenTint` |
| `--color-warning` | Due invoices, active phases | `#8A6A0B` | `#FFF3D6` | `stripYellow` & `stripYellowTint` |
| `--color-error` | Validation errors, warning bars| `#E5484D` | `rgba(229, 72, 77, 0.1)`| `dangerRed` |

### Dark Theme Considerations (Proposed Extension)
Currently, dark mode is applied on the **Login Page** to provide a premium onboarding entrance. Expanding dark mode globally is recommended using the following mappings:
- `--color-page-bg` -> `#09090B`
- `--color-nav-bg` -> `#18181B`
- `--color-surface` -> `#18181B`
- `--color-text-primary` -> `#F4F4F5`
- `--color-text-secondary` -> `#A1A1AA`
- `--color-border-hairline` -> `rgba(255, 255, 255, 0.1)`

---

## 4. Typography System

The typography scale uses system sans-serif fonts (Roboto on Android, San Francisco on iOS) to ensure fast rendering speeds and platform consistency.

| Typography Token | Font Size | Font Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Name** | `28.0` | Bold (w700) | `1.2` | Hero names (Header greeting, screen titles) |
| **Section Title** | `22.0` | Semi-Bold (w700/w600) | `1.25` | Section headers across the application |
| **Service Headline**| `21.0` | Extra-Bold (w800) | `1.25` | Headlines in carousel service cards |
| **Card Title** | `18.0` | Semi-Bold (w600) | `1.3` | Titles in features, detail, and ongoing cards |
| **Greeting** | `16.0` | Medium (w500) | `1.2` | Greeting subtitle in header |
| **Body Large** | `15.0` | Regular (w400) | `1.5` | General text blocks (Service/Blog detail body) |
| **Body Medium** | `14.5` | Medium (w500) | `1.4` | Standard list tiles, input contents, note tiles |
| **Body Small** | `13.0` | Regular (w400) | `1.35` | Personal detail labels, secondary lines, dates |
| **Caption** | `12.0` | Medium (w500) | `1.3` | Bottom navigation labels, history metrics |
| **Label Small** | `11.5` | Regular (w400) | `1.2` | Excerpt metadata, action pill subtitles |
| **Tag Text** | `11.0` | Semi-Bold (w600) | `1.0` | Pill labels (Paid, Due, Active status) |

---

## 5. Spacing System

All components utilize a base **4px grid system** to maintain layout rhythm.

| Spacing Token | Value (px) | Typical Placement |
| :--- | :--- | :--- |
| `space-1` | `2.0` | Micro line spacings, text nudge adjustments |
| `space-2` | `4.0` | Spacer between text and tags, small dividers |
| `space-3` | `8.0` | Input field labels, inner card paddings, grid layouts |
| `space-4` | `12.0` | Spacers between buttons, list items, headers |
| `space-5` | `16.0` | Standard list tile padding, inner card margins |
| `space-6` | `20.0` | Default Page Margin (`AppDimens.pageMargin`), outer gutters |
| `space-7` | `24.0` | Spacers between cards, sections, bottom sheet headers |
| `space-8` | `32.0` | Major section breaks, sheet bottom paddings |
| `space-9` | `48.0` | Empty state vertical spacing, custom header heights |

---

## 6. Layout System

The Tvita app follows a mobile-focused layout with structural constraints to handle larger screen viewports gracefully.

- **Maximum Width**: All screen bodies constrain content width to `480.0` on tablet viewports to prevent awkward text wrapping.
- **Page Margin**: A standard margin of `20.0` is applied on the left and right borders of all screens.
- **Grid Systems**: Lists of historical items, actions, and profile tiles stack vertically using scrollable views.
- **Horizontal Rhythm**: Carousels (Services, Blogs, Hero cards) have cards peeking on the right, providing clear horizontal swipe affordances.
- **Breakpoints**:
  - `Mobile` (< 600px): Primary portrait stack layout, modal sheets, full-bleed lists.
  - `Tablet` (600px - 900px): Centered container (480px) with background pads, compact bottom sheets.

---

## 7. Responsive Design Strategy

Since the app is optimized for portable devices, UI changes adapt dynamically between standard mobile phone viewports and tablets.

- **Stacking**: List rows that are compact on small screens remain centered on tablets. 
- **Collapsing elements**: Image frames on `OngoingProjectStrip` collapse (`showImage: false`) when rendered in dense tabs (e.g., Home Page feed) and expand (`showImage: true`) when displayed on standalone screens (e.g., Projects Tab).
- **Navigation**: Bottom navigation stays pinned to the screen bottom but uses extended widths with maximum 480px boundaries on tablets.
- **Scroll offsets**: Carousel spacing is dynamically tuned so card peeking works seamlessly on varying view widths.

---

## 8. Component Design System

### CardStack
- **Purpose**: Creates visual layering that mimics stacked papers, showing depth beneath main content elements.
- **Anatomy**: A main child widget container painted on top of 1 or more underlying receding decorative bars.
- **Styling**: Receding layers are colored with a gradient transition from `--color-accent` to `--color-brand-light`.
- **States**: Default.

### OngoingProjectStrip
- **Purpose**: Displays the status and process updates of the user's primary ongoing project.
- **Anatomy**: Title, subtitle, description, vertical progress bar with custom heights, horizontal process checklist, image overlay.
- **Radius**: `20.0`
- **States**: Default, Hover/Pressed (Haptic click).

### FeatureCard
- **Purpose**: Call-to-action blocks promoting new projects or quotes.
- **Anatomy**: Title header, illustration image, action button.
- **Radius**: `24.0`
- **States**: Default, Active (Tapping opens the Quote Form).

### HomeSearchField
- **Purpose**: Entry bar into Spotlight Search.
- **Anatomy**: Curved pill with search icon, placeholder text, search bar tag.
- **Height**: `52.0`
- **Radius**: `28.0`
- **States**: Focused/Active (Triggers `SpotlightSearchPage` transition).

### BillHeroCard
- **Purpose**: Present billing item status in the payment carousel.
- **Anatomy**: Avatar, Project title, status tag, money amount, description line, action buttons with platform icons (Upwork, Fiverr).
- **Radius**: `24.0`
- **States**: Default, Active, Selected.

### ProjectAvatar
- **Purpose**: Display initials or logo icons for client projects.
- **Anatomy**: Circle containing initials or assets.
- **Size**: Default `34.0`
- **Radius**: Circular (Full)

### TagChip
- **Purpose**: Inline labels representing states (e.g., Paid, Due, In progress).
- **Anatomy**: Rounded pill with thin uppercase fonts.
- **Radius**: Circular (Full)

---

## 9. Border Radius System

To deliver a premium look, border corners use a curated scale of radii. Hard corners are avoided.

```text
radius-sm (8px)  ───> Tags, Attachment preview chips
radius-md (12px) ───> Action buttons, inner sheet tiles
radius-lg (14px) ───> Service cards, Blog cards, Form text fields
radius-xl (20px) ───> Project strips, detail card sections, Dialogs
radius-xxl (24px) ───> Main dashboard cards, Bottom sheets, Tab bars
radius-full (999px)─> Circular icons, User avatars, Pill state chips
```

---

## 10. Shadow / Elevation System

The project avoids heavy shadows. Depths are indicated using high-contrast borders and low-opacity dark shadows.

| Shadow Token | Color Value | Blur Radius | Offset (X, Y) | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `shadow-bottom-nav`| `0x14101C6B` (8% Navy) | `16.0` | `(0, -4)` | Bottom navigation bar elevation |
| `shadow-dialog` | `rgba(0, 0, 0, 0.15)` | `30.0` | `(0, -8)` | Login bottom sheet / modals |
| `shadow-fab` | `0x14101C6B` (8% Navy) | `12.0` | `(0, 4)` | Bell icon, floating buttons |

---

## 11. Iconography

- **Icon Library**: Google Material Icons (Outlined variants preferred).
- **Sizes**:
  - Small / Button: `18.0`
  - Default List / Field: `20.0`
  - Navigation / App Bar: `24.0`
  - Spotlight Search / Large: `26.0`
- **Rules**: Icons are colored `--color-brand-dark` or `--color-brand-light` in normal states, black on light pages, and `--color-text-white` on navy panels. Always pair icons with descriptive textual labels or semantic action states.

---

## 12. Buttons

```text
┌──────────────────────────────────────────────┐
│  Primary Button (brand, height: 52px)       │
├──────────────────────────────────────────────┤
│  Secondary Icon Button (brand, height: 46px) │
├──────────────────────────────────────────────┤
│  Ghost Button (transparent text, height: 40px)│
└──────────────────────────────────────────────┘
```

- **Primary Button**:
  - Height: `52.0`
  - Background: `--color-brand`
  - Radius: `16.0`
  - Typography: Size 16.0, weight w600, White.
  - Usage: Quote submissions, scheduler confirmations.
- **Secondary Icon Button**:
  - Height: `46.0`
  - Background: `--color-brand`
  - Radius: `12.0`
  - Icon size: `18.0`
  - Usage: Detail screen shortcuts (Notes, Meet).
- **Ghost/Text Button**:
  - Height: `40.0`
  - Background: Transparent
  - Typography: Size 14.5, weight w600.
  - Usage: Dismiss dialogs, cancel actions.

---

## 13. Forms & Inputs

All input fields have a flat, light grey background with custom validation behaviors.

- **Background (Fill)**: `--color-page-bg` (`#F4F4F5`)
- **Default Border**: Transparent border with `radius-lg` (`14.0`)
- **Focus Border**: High-contrast solid black border (`1.5px`)
- **Error Border**: Light red border (`1.0px` using `--color-error` at 50% opacity)
- **Validation Feedbacks**: Error text is presented in `--color-error` directly beneath the field.
- **Pill Pricing Selectors**: Interactive rate switch pill in `QuoteRequestSheet` dynamically animates background transition from `--color-page-bg` to active accent `--color-accent` when toggled.

---

## 14. Navigation

```text
  [App Startup]
       │
       ▼
 ┌───────────┐    Success    ┌───────────┐
 │LoginPage  ├──────────────>│ HomePage  │
 └───────────┘               └─────┬─────┘
                                   │
       ┌──────────────┬────────────┴─┬──────────────┐
       ▼              ▼              ▼              ▼
   ┌───────┐     ┌──────────┐   ┌─────────┐    ┌─────────┐
   │ Home  │     │ Projects │   │ Billing │    │ Profile │
   │ (Tab) │     │  (Tab)   │   │  (Tab)  │    │  (Tab)  │
   └───┬───┘     └────┬─────┘   └────┬────┘    └─────────┘
       │              │              │
       ▼              ▼              ▼
  [Spotlight]    [ProjDetail]   [BillDetail]
```

- **Bottom Navigation Bar**: Pinned navigation containing 4 routes. Active state highlighted using `--color-nav-indicator` pill, bold text, and vibrating selection cues.
- **Stack Headers**: Top screen bars feature consistent back arrows styled inside circular white elevation bubbles (`AppDimens.cardActionSize`).
- **Interactive Headers**: Text titles automatically transition into page headings as the user navigates tabs.

---

## 15. Page-by-Page Design Specification

### Page 1: Login Screen (`LoginPage`)
- **Purpose**: Authenticate client users.
- **Layout Structure**: 
```text
┌──────────────────────────────────────────────┐
│ Background Image: login_bg.png               │
│ Dark overlay gradient                        │
│                                              │
│ [Logo] (80x80)                               │
│ Welcome to Tvita                             │
│ Sign in to view your projects...             │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ (Grab Handle)                            │ │
│ │ Email address (Input field)              │ │
│ │ Password (Input field)                   │ │
│ │ Forgot Password? (Ghost Button)          │ │
│ │ Sign In (Primary Button)                 │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```
- **Interactions**: Tapping "Forgot Password" opens a clean system dialog guide.
- **Accessibility**: Email validations run instantly on submission. Input fields support standard keyboard actions.

### Page 2: Home Screen Tab (`HomePage` Index 0)
- **Purpose**: Main portal dashboard.
- **Layout Structure**:
```text
┌──────────────────────────────────────────────┐
│ Greeting (e.g. Good Afternoon, Pratik)       │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ FeatureCard (Let's start your project)   │ │
│ └──────────────────────────────────────────┘ │
│ [HomeSearchField] (Pill search entry)        │
│                                              │
│ [QuickActionsRow] (Meet | Notes | Tickets)   │
│                                              │
│ [CardStack] -> [OngoingProjectStrip]         │
│                                              │
│ Services (Section Title)                     │
│ [ServiceCarousel] (Swipeable cards)          │
│                                              │
│ Blog (Section Title)                         │
│ [BlogCarousel] (Swipeable cards)             │
└──────────────────────────────────────────────┘
```

### Page 3: Projects Tab (`HomePage` Index 1)
- **Purpose**: Overview of client's development items.
- **Layout Structure**: Ongoing project card stack at the top, followed by a flat scrollable panel containing past completed projects listed as `ProjectHistoryTile` rows separated by hairline dividers.

### Page 4: Billing Tab (`HomePage` Index 2)
- **Purpose**: Manage project invoices and payments.
- **Layout Structure**: Swipeable horizontal carousel (`BillCarousel`) displaying due milestone cards, care plan cards, and add-on plans. Underneath, a scrollable list view of historical invoices with status chips (Paid, Overdue, Cancelled).

### Page 5: Profile Tab (`HomePage` Index 3)
- **Purpose**: Manage client preferences and configurations.
- **Layout Structure**: Grouped white card sections (`ProfileGroup`) containing identity profile metrics, editable address blocks, active care plan metadata, notification toggle switches, legal policy routes, and a red-themed logout trigger.

### Page 6: Spotlight Search Overlay (`SpotlightSearchPage`)
- **Purpose**: Instant project search across the portal.
- **Layout Structure**: Full screen dark overlay layout containing a hero search input text field that auto-focuses on entry. Search list suggestions and query matches animate dynamically beneath the bar.

### Page 7: Project Detail Screen (`ProjectDetailPage`)
- **Purpose**: Deep dive into active project scopes.
- **Layout Structure**: Pinned back button overlay. Scrollable body with custom `OverviewCard` (showing description and status), client details cards, process timelines, quick shortcut buttons (Notes, Meet), active revisions lists, and payment scopes.

### Page 8: Billing History Detail Screen (`BillingHistoryDetailPage`)
- **Purpose**: Details of past invoices.
- **Layout Structure**: Card displaying invoice metadata (Invoice ID, project name, billing date), cost breakdown item lists, tax calculations, payment status details, and download invoice action buttons.

### Page 9: Project Notes Screen (`ProjectNotesPage`)
- **Purpose**: Lists all workspace folders containing notes.
- **Layout Structure**: Header row, vertical list of active project notes cards showing count metrics, and a fixed primary action button ("Add note") pinned at the bottom.

### Page 10: Tickets Screen (`TicketsPage`)
- **Purpose**: Lists client support logs.
- **Layout Structure**: Vertical scroll list displaying cards of open, in-progress, and resolved tickets. Tapping "New ticket" opens the support form modal.

---

## 16. UX Interaction Rules

- **Hover/Click States**: Active items fade opacity slightly (from `1.0` to `0.8`) or change backgrounds dynamically on tap events.
- **Vibration & Haptic Feedback**:
  - `AppFeedback.vibrate()` (medium vibration) is triggered on critical button clicks, submission actions, and navigation stack transitions.
  - `AppFeedback.selection()` (light vibration tap) is triggered when swapping tabs, opening dialogs, and toggling forms.
- **Transition Durations**:
  - `Fast (100-150ms)`: Micro-animations (like checkbox toggles, tag transitions).
  - `Normal (150-250ms)`: Carousel swipes, inline switch transitions.
  - `Slow (250-350ms)`: Bottom sheet displays, page routes.

---

## 17. Animation & Motion Strategy

- **Entrance Transitions**: Spotlight search uses custom fade animation transitions (`380ms` entrance, `280ms` exit).
- **Form Navigation**: Step transitions inside bottom sheets (like `MeetRequestSheet`) slide horizontally (`SlideTransition` with `Interval(0.25, 1)`) depending on navigation direction (forward or backward) to guide task flow.
- **Reduced Motion**: If the operating system preference has `prefers-reduced-motion` enabled, slide transitions are automatically bypassed to present immediate page displays.

---

## 18. Accessibility

- **WCAG Guidelines**: Color combinations meet standard contrast requirements. Specifically, dark text overlays on imagery have gradient scrim backdrops to guarantee typography contrast.
- **Touch Target Sizes**: All interactive targets (buttons, links, icons, list tiles) maintain a minimum footprint size of `44x44` logical pixels.
- **Focus Indicators**: Focused text fields draw a bold, solid border to support clear input focus state visibility.

---

## 19. Images & Media

- **Border Radius**: Demo imagery, project avatars, and service graphics use uniform corner rounding (radii parameters: `AppDimens.cardRadius` or `AppDimens.blogCardRadius`).
- **Object Fit**: Media assets use `BoxFit.cover` or `BoxFit.contain` configurations with optimized positioning parameters (e.g. `Alignment(0.25, 1)`) to avoid distortion.
- **Caching & Fallbacks**: Image streams are stored locally to prevent load lags. Broken assets fallback to placeholder cards.

---

## 20. Data Visualization

- **Linear Progress Bars**: Ongoing project cards present a clean progress strip showing numerical completion metrics alongside colored visual fills.
- **Phase Timelines**: Vertical process lines with icons color-code current progress states:
  - Done: Green theme (`#1E6B50`)
  - Active: Yellow theme (`#8A6A0B`)
  - Upcoming: Gray theme (`#C6C9D2`)

---

## 21. Tables & Data-Dense UI

- **Lists**: Used to stack history details, payment invoices, and profile preference configurations.
- **Table Columns**: Column data (e.g., invoices list) aligns numeric parameters on the right and metadata text blocks on the left to maximize scanning speed.
- **Mobile Horizontal Scrolling**: Carousels display cards horizontally, peeking on the right edge to show swipe availability.

---

## 22. Design Tokens

Below is the consolidated token reference.

```dart
class AppColors {
  static const Color accent = Color(0xFFDBE2F8);
  static const Color brandLight = Color(0xFF8FA4E6);
  static const Color brand = Color(0xFF2340B8);
  static const Color brandHover = Color(0xFF16277A);
  static const Color brandDark = Color(0xFF101C6B);
  static const Color navBackground = Color(0xFFFFFFFF);
  static const Color pageBackground = Color(0xFFF4F4F5);
  static const Color stripYellow = Color(0xFF8A6A0B);
  static const Color stripYellowTint = Color(0xFFFFF3D6);
  static const Color detailGreen = Color(0xFF1E6B50);
  static const Color detailGreenTint = Color(0xFFDFF0E8);
  static const Color dangerRed = Color(0xFFE5484D);
}

class AppDimens {
  static const double pageMargin = 20.0;
  static const double cardRadius = 24.0;
  static const double blogCardRadius = 14.0;
  static const double stripRadius = 20.0;
  static const double searchRadius = 28.0;
  static const double navRadius = 24.0;
  static const double searchHeight = 52.0;
  static const double headerGreetingSize = 16.0;
  static const double headerNameSize = 28.0;
  static const double sectionTitleSize = 22.0;
}
```

---

## 23. Design Do's & Don'ts

### Do
- Always use predefined color variables from `AppColors`.
- Pair all interactive action buttons with tactile feedback (`AppFeedback.vibrate()`).
- Constrain maximum width to `480.0` on large viewports.
- Maintain `radius-xxl` (`24.0`) on bottom sheet layouts.

### Don't
- Do not introduce hard-coded raw HEX colors outside the `AppColors` parameters.
- Do not use sharp border corners for containers or input fields.
- Avoid using custom animation curves that conflict with `Curves.easeOutCubic`.
- Do not use raw sizes for text without referencing the typography system.

---

## 24. Implementation Guidelines

Developers must adhere to these rules when building components:

1. **Consume Tokens**: Never hardcode colors, margins, or padding. Reference `AppColors` and `AppDimens` values.
2. **Vibration Feedback**: All click handlers on clickable rows, switches, or custom tiles should trigger `AppFeedback.vibrate()` or `AppFeedback.selection()`.
3. **Accessibility Integration**: Ensure all inputs include validation feedback. Always support screen-readers by providing proper accessibility properties (semantic labels, descriptions).

---

## 25. Final Design Checklist

- [x] Color system implemented
- [x] Typography system defined
- [x] Spacing system standardized
- [x] Responsive breakpoints implemented
- [x] Navigation flows completed
- [x] Form validation visual states verified
- [x] Tactile feedback wired up
- [x] Layout constraints applied to tablets
- [x] Assets properly configured
- [x] Accessibility touch target sizes met
