# Stage 4: Video Presentation Script

**Total Duration**: ~5 minutes

## Part 1: Problem & Approach (0:00 - 1:00)
**Visual**: Show Slide 1 & Slide 2.
**Script**: "Hi, I'm presenting the Smart Asset Reservation System built for the Tactive Assessment. The problem I tackled is corporate equipment management—specifically preventing overlapping reservations, enforcing max duration limits, and managing quotas. My approach was to build a Node.js REST API with a modern, glassmorphic frontend, prioritizing strict server-side validation and automated testing."

## Part 2: The Solution & AI Change Loop (1:00 - 2:00)
**Visual**: Show Slide 4 & Slide 5, then switch to code editor showing `docs/AI_CHANGE_LOOP_EVIDENCE.md`.
**Script**: "Security and reliability are handled by a robust Jest test suite. To demonstrate the AI change loop, I had the AI implement a feature where exceeding your reservation quota places your booking in a 'PENDING_APPROVAL' state rather than outright rejecting it. This predictably broke our existing strict-rejection test. The AI caught the regression in the Red Run, and then self-corrected the test suite to expect the new behavior, resulting in our final Green Run."

## Part 3: Live Demo (2:00 - 5:00)
**Visual**: Switch to web browser showing `http://localhost:3000`.
**Script Breakdown**:
- **[2:00 - 2:30] Asset Catalog**: "Here is the UI. You can see available assets and items in maintenance which are disabled."
- **[2:30 - 3:30] Validation Rules**: "I'll try to book the MacBook. If I try to book it for 20 days, the server rejects it because the max duration is 14 days. If I try to book in the past, it fails."
- **[3:30 - 4:15] Quota Limit**: "I'll book two valid reservations. They succeed. Now, because of our AI-implemented feature, if I try to book a third, it doesn't fail, but it goes into 'PENDING_APPROVAL' status."
- **[4:15 - 5:00] Cancellation**: "Finally, if plans change, I can cancel an active reservation right here, freeing up the asset immediately. Thank you for your time."
