<wizard-report>
# PostHog Post-Wizard Report

The wizard has completed a deep integration of PostHog analytics into your Palatro pointing poker application. This integration includes both client-side and server-side event tracking, user identification, and comprehensive business metrics.

## Integration Summary

### Infrastructure Changes
- **Package Added**: `@posthog/react` (v1.8.2) for client-side analytics
- **Provider Setup**: PostHogProvider configured in `apps/web/src/routes/__root.tsx`
- **Environment Variables**: Configured in `apps/web/.env`
  - `VITE_PUBLIC_POSTHOG_KEY`: PostHog API key for project ID 174554
  - `VITE_PUBLIC_POSTHOG_HOST`: https://us.i.posthog.com

### Client-Side Events (6 events)

| Event Name | Description | File Path | Properties |
|------------|-------------|-----------|------------|
| `user_signed_up` | Track when a new user creates an account - critical for user acquisition funnel | apps/web/src/components/sign-up-form.tsx | method: email |
| `user_signed_in` | Track when an existing user logs in - critical for user retention and engagement | apps/web/src/components/sign-in-form.tsx | method: email |
| `landing_page_viewed` | Track landing page views for top of funnel analytics | apps/web/src/routes/index.tsx | is_authenticated: false |
| `dashboard_viewed` | Track dashboard views to measure user engagement and activation | apps/web/src/routes/dashboard.tsx | rooms_count: number |
| `round_results_viewed` | Track when voting results are revealed - critical conversion event for core value delivery | apps/web/src/components/round-results.tsx | round_number, votes_count, result_type, scale_type |
| `room_url_copied` | Track when users copy room URL - viral sharing metric | apps/web/src/routes/rooms/$slug.tsx | room_id, room_slug, is_owner |

### Server-Side Events (2 events)

| Event Name | Description | File Path | Properties |
|------------|-------------|-----------|------------|
| `room_password_failed` | Track failed password attempts - security and UX metric | packages/backend/convex/participants.ts | room_id, room_slug, is_returning_participant |
| `vote_changed` | Track when a user changes their vote - indicates decision-making process | packages/backend/convex/rounds.ts | room_id, round_id, participant_kind, old_value, new_value |

### Existing Server-Side Events (Already Implemented)
The following events were already implemented in the backend (Convex):
- `room_created`, `room_config_updated`, `room_password_updated`, `room_deleted`
- `guest_joined_room`, `host_joined_room`, `participant_left_room`, `participant_kicked`
- `voting_round_started`, `voting_round_restarted`, `vote_cast`, `voting_round_forced_finished`
- `round_completed_naturally`, `room_viewed`

### User Identification
- **Client-Side**: Users are identified on signup/signin using `posthog.identify(userId, { email, name })`
- **Properties Captured**: Email, name for user profiles
- **Session Tracking**: Automatic session tracking via PostHog SDK

## Key Funnels and Metrics to Track

### 1. User Acquisition Funnel
```
landing_page_viewed → user_signed_up → user_signed_in → dashboard_viewed
```
This funnel tracks how effectively anonymous visitors convert to active users.

### 2. Core Value Activation Funnel
```
user_signed_in → dashboard_viewed → room_created → round_results_viewed
```
This funnel measures how many users create rooms and successfully complete voting rounds.

### 3. Viral Sharing Metric
```
room_created → room_url_copied
```
Track how often room owners share their rooms, indicating viral growth potential.

### 4. Security & UX Metric
```
room_password_failed
```
Monitor failed password attempts to identify potential security issues or UX problems.

### 5. Engagement Depth
```
vote_changed frequency
```
Track how often users change their votes, indicating decision-making patterns and engagement depth.

## Next Steps

### Recommended Dashboards & Insights

To get started with your analytics, we recommend creating these dashboards in PostHog:

#### Dashboard 1: User Acquisition & Activation
- **Insight 1**: Signup conversion rate (landing_page_viewed → user_signed_up)
- **Insight 2**: Day 1 activation rate (users who view dashboard within 24h of signup)
- **Insight 3**: Room creation rate by user cohort

#### Dashboard 2: Core Product Metrics
- **Insight 4**: Average rounds completed per room
- **Insight 5**: Vote distribution by scale type (fibonacci, powers_of_two, t_shirt)
- **Insight 6**: Time between round start and completion

#### Dashboard 3: Engagement & Retention
- **Insight 7**: Daily active users (DAU) and monthly active users (MAU)
- **Insight 8**: User retention by cohort (week 1, week 2, week 4)
- **Insight 9**: Room sharing rate (room_url_copied / room_created)

### PostHog Project Details
- **Project ID**: 174554
- **PostHog App URL**: https://us.i.posthog.com
- **Environment**: Production

### Implementation Notes
- **Error Handling**: All PostHog calls are wrapped in try-catch blocks to prevent analytics errors from breaking the application
- **Performance**: Events are captured asynchronously and don't block UI operations
- **Privacy**: User email and name are only captured on explicit signup/signin actions
- **Compliance**: No sensitive data (passwords, tokens) is captured in events

## Technical Implementation Details

### Client-Side Pattern
All client-side events use the `usePostHog()` hook:
```typescript
const posthog = usePostHog();
posthog.capture('event_name', { property: value });
```

### Server-Side Pattern
Server-side events use the singleton PostHog client:
```typescript
const posthog = getPostHogClient();
posthog.capture({
  distinctId: userId,
  event: 'event_name',
  properties: { ... }
});
```

### Build Verification
✅ Build completed successfully with all PostHog integrations
✅ No TypeScript errors
✅ All event tracking code properly integrated

### Agent Skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-tanstack-start/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog into TanStack Start applications.

## Files Modified

### Client-Side Files
- `apps/web/src/routes/__root.tsx` - Added PostHogProvider
- `apps/web/src/components/sign-up-form.tsx` - User signup tracking
- `apps/web/src/components/sign-in-form.tsx` - User signin tracking
- `apps/web/src/routes/index.tsx` - Landing page tracking
- `apps/web/src/routes/dashboard.tsx` - Dashboard tracking
- `apps/web/src/components/round-results.tsx` - Round results tracking
- `apps/web/src/routes/rooms/$slug.tsx` - Room URL copying tracking

### Server-Side Files
- `packages/backend/convex/participants.ts` - Password failure tracking
- `packages/backend/convex/rounds.ts` - Vote change tracking

### Configuration Files
- `apps/web/package.json` - Added @posthog/react dependency
- `apps/web/.env` - Added PostHog environment variables

</wizard-report>
