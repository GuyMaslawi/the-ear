# The Ear / האוזן — Project Rules

## Product identity
- Folder name may be `spy-app`, but the product is called **The Ear** / **האוזן**.
- Do not rename the product to “Spy App”.
- The app is location-based civic intelligence: users ask location-tied questions (“drops”), others answer from the field, and the app shows nearby relevant activity on a map/feed.

## Tech stack
- Backend: NestJS, MongoDB/Mongoose, Socket.io, class-validator, ngeohash, Jest e2e.
- Mobile: Expo, React Native, TypeScript, React Navigation, react-native-maps, expo-location, socket.io-client, Async Storage.
- Local DB: Docker Compose MongoDB.
- Monorepo uses npm/concurrently.

## Working style
- Do not rewrite large parts of the app unless absolutely required.
- Prefer small, focused fixes.
- Before changing code, inspect the existing implementation and reuse existing patterns.
- Do not create mock data unless explicitly requested.
- Do not remove working functionality.
- Avoid over-engineering.
- Keep TypeScript strict and clean.

## UX rules
- Every visible UI element must be functional or clearly disabled.
- Buttons must respond to press events.
- Loading, empty, error, and success states must exist where needed.
- Mobile UI must not overlap, overflow, or hide important actions.
- Prioritize smooth field-user experience: fast posting, fast answering, nearby relevance, clear map/feed behavior.

## Backend rules
- Keep REST API contracts stable unless asked.
- Preserve anonymous auth flow.
- Preserve location update flow.
- Preserve MongoDB 2dsphere geo search.
- Preserve Socket.io live events for nearby drops/updates.
- Validate request bodies with DTOs/class-validator.
- Do not add fake backend behavior just to satisfy UI.

## Mobile rules
- Use real API calls.
- Keep socket connection lifecycle safe.
- Handle permissions for location properly.
- Store anonymous user/session data safely with Async Storage.
- Make map, feed, drop creation, drop view, answers, and my questions actually usable.

## AI behavior
- Do not waste time explaining obvious basics.
- First identify the exact broken flow.
- Then patch only the required files.
- After every fix, explain briefly:
  1. What was broken
  2. What changed
  3. How to test manually
- If a change touches API contracts, mention it clearly.

## Testing
- Run relevant type checks/tests when possible.
- For backend changes, consider Jest/e2e impact.
- For mobile changes, verify runtime behavior in Expo.
- Always include manual test steps.

## Premium UX / Product Experience Rules

- Treat every task as both a product task and an engineering task.
- Before changing UI, think like a senior mobile product designer:
  - What is the user trying to do?
  - What is the fastest path to success?
  - What is confusing, hidden, slow, or visually noisy?
  - What should be the single primary action on this screen?
- Do not only make the UI prettier. Improve clarity, speed, confidence, and usability.
- Every screen must be understandable within 3 seconds by a first-time user.
- Every screen should have one clear primary action.
- Prefer fewer choices, clearer labels, and stronger hierarchy.
- Avoid UI clutter, duplicate CTAs, vague icons, and hidden actions.
- Make touch targets comfortable for mobile usage.
- Important actions must give immediate feedback: pressed, loading, success, error.
- Empty states should guide the user toward the next useful action.
- Error states should explain what happened and how to recover.
- Loading states should feel intentional, not broken.
- Map interactions must be predictable:
  - show current location clearly
  - allow selecting any point on the map
  - make selected location obvious
  - make nearby drops/questions easy to discover
- The main flow must always stay simple:
  1. Open app
  2. See my area
  3. Select a place or use my location
  4. Ask a question/drop
  5. See nearby questions
  6. Open a question
  7. Answer or follow activity
- Suggested answers/questions should feel contextual, natural, and relevant to the selected location/question.
- Do not introduce large redesigns unless the current flow is fundamentally broken.
- When improving UX, prefer small high-impact changes over visual decoration.

## UX execution behavior

For every UX/UI-related task:
1. First describe the broken or weak user flow in 3-6 bullets.
2. Then define the ideal flow.
3. Then implement the smallest code changes that make the flow better.
4. After coding, check:
   - Are all buttons functional?
   - Is the primary CTA obvious?
   - Are loading/empty/error states covered?
   - Is the mobile layout clean with no overlap?
   - Can a first-time user understand the screen without explanation?
5. Finish with manual test steps from the user's perspective.