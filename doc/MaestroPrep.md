# Maestro E2E Test Preparation - Full Codebase Audit & Setup

## Overview

I need you to prepare this React Native codebase for comprehensive Maestro end-to-end testing. This is a multi-phase process. Complete each phase fully before moving to the next.

---

## PHASE 1: TestID Audit

Scan the entire codebase and create a comprehensive inventory of all existing `testID` props.

### Search for:

- All `testID="..."` and `testID={'...'}` props
- All `accessibilityLabel` props (secondary targeting option)
- Any existing test utilities or constants files that define test identifiers

### Output a report in this format:

```
## TestID Audit Report

### Summary
- Total testIDs found: [number]
- Screens/components with testIDs: [list]
- Screens/components WITHOUT testIDs: [list]
- Coverage assessment: [Complete / Partial / Minimal / None]

### Inventory by Screen/Feature
[Screen Name]
  - [testID]: [component type] - [purpose]
  - [testID]: [component type] - [purpose]

### Gap Analysis
[List all interactive elements, forms, and key UI components that LACK testIDs]
```

---

## PHASE 2: TestID Implementation (If Needed)

**Only proceed with this phase if Phase 1 reveals incomplete coverage.**

### 2A: Create a TestID Constants System

Create a centralized constants file for all testIDs. This ensures consistency and prevents typos.

```typescript
// src/constants/testIDs.ts (or similar appropriate location)

export const TestIDs = {
  // Auth Flow
  Auth: {
    Screen: "auth-screen",
    EmailInput: "auth-email-input",
    PasswordInput: "auth-password-input",
    LoginButton: "auth-login-button",
    SignupButton: "auth-signup-button",
    ForgotPasswordLink: "auth-forgot-password-link",
    ErrorMessage: "auth-error-message",
  },

  // Follow this pattern for all features...
} as const;
```

### 2B: Naming Convention to Follow

Use this consistent naming pattern:

- Format: `[feature]-[component]-[element]`
- Use kebab-case
- Be descriptive but concise
- Examples:
  - `home-header-title`
  - `profile-avatar-image`
  - `checkout-submit-button`
  - `product-list-item-{id}` (for dynamic lists)
  - `modal-confirm-button`

### 2C: Apply TestIDs Systematically

Go through EVERY screen and component and add testIDs to:

1. **All interactive elements (CRITICAL)**
   - Buttons
   - TouchableOpacity/Pressable components
   - TextInputs
   - Switches/Toggles
   - Links
   - Dropdown/Picker triggers

2. **All form elements**
   - Input fields
   - Submit buttons
   - Validation error messages
   - Form containers

3. **Navigation elements**
   - Tab bar items
   - Drawer menu items
   - Header back buttons
   - Navigation links

4. **Key display elements**
   - Screen containers (the root view of each screen)
   - List containers
   - List items (use dynamic IDs: `testID={`item-${id}`}`)
   - Modal containers
   - Loading indicators
   - Empty states
   - Error states

5. **Conditional UI**
   - Elements that appear/disappear based on state
   - Auth-gated content
   - Feature flags content

### 2D: Implementation Checklist

Work through the codebase in this order:

1. [ ] Create the testIDs constants file
2. [ ] Auth/Login/Signup screens
3. [ ] Onboarding screens (if applicable)
4. [ ] Main navigation (tabs, drawer, stack navigators)
5. [ ] Home/Dashboard screen
6. [ ] Each feature area systematically
7. [ ] Shared/common components (buttons, inputs, modals, etc.)
8. [ ] Settings/Profile screens
9. [ ] Any remaining screens

**For each file you modify, list the testIDs you added.**

---

## PHASE 3: Navigation Mapping

After testIDs are complete, document the full navigation structure.

### Output format:

```
## Navigation Map

### Navigator Structure
[Describe the navigator hierarchy - e.g., Root Stack > Auth Stack / Main Tabs > Feature Stacks]

### Complete Screen Inventory

| Screen Name | Route Name | Navigator | Accessible From | Auth Required |
|-------------|------------|-----------|-----------------|---------------|
| Login       | Login      | AuthStack | App launch      | No            |
| Home        | Home       | MainTabs  | After login     | Yes           |
| ...         | ...        | ...       | ...             | ...           |

### Deep Links (if applicable)
[List any deep link configurations]
```

---

## PHASE 4: Critical User Flows Identification

Identify and document the most important end-to-end user journeys.

### Output format for each flow:

```
## Critical User Flows

### Flow 1: [Name - e.g., "New User Registration"]
**Priority:** [Critical / High / Medium]
**Description:** [What this flow accomplishes]
**Preconditions:** [App state before starting]

**Steps:**
1. [Action] → [Expected Result] → testID: [relevant-test-id]
2. [Action] → [Expected Result] → testID: [relevant-test-id]
3. ...

**Success Criteria:** [How to verify the flow completed successfully]
**Potential Failure Points:** [Where this flow might break]

---

### Standard Flows to Document:
1. New user registration (if applicable)
2. Existing user login
3. Password reset (if applicable)
4. Onboarding completion (if applicable)
5. Core feature flow #1 (the main thing users do in your app)
6. Core feature flow #2
7. Profile/settings modification
8. Logout
9. Error handling (network failure, validation errors)
10. [Any app-specific critical flows]
```

---

## PHASE 5: Maestro Context Document

Compile everything into a single comprehensive document that can be used to generate Maestro tests.

### Final output file: `MAESTRO_CONTEXT.md`

```markdown
# Maestro Test Context Document

Generated: [date]
App: [app name]

## Quick Reference

### App Entry Points

- Fresh install: [what screen appears]
- Logged in user: [what screen appears]
- Deep link base: [if applicable]

### Test User Credentials

[Note: Define these or indicate they need to be created]

- Test account email:
- Test account password:

## TestID Reference

[Full inventory from Phase 1/2]

## Navigation Structure

[From Phase 3]

## User Flows

[From Phase 4]

## Environment Notes

- API base URL for testing:
- Any required test flags:
- Mock data considerations:

## Known Quirks

[Any timing issues, animation delays, or platform-specific behaviors that tests should account for]
```

---

## Execution Instructions

1. Start with Phase 1 and show me the audit report
2. If coverage is incomplete, proceed through Phase 2 and implement testIDs - show me each file you modify
3. After testIDs are complete, proceed through Phases 3-5
4. Deliver the final MAESTRO_CONTEXT.md file

Ask clarifying questions if you need more context about specific features or user flows in this application.
