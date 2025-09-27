# Server-Side Rendering with Convex

This guide shows you how to fetch user data in Server Components using Convex, based on the [official Convex Next.js documentation](https://docs.convex.dev/client/nextjs/app-router/server-rendering).

## 🔧 Setup

### 1. Server Auth Helper (`lib/auth-server.ts`)

```typescript
import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";
import { createAuth } from "@jym/backend/convex/auth";

export const getToken = () => {
  return getTokenNextjs(createAuth);
};
```

## 📊 Two Approaches for Server-Side Data

### Approach 1: `fetchQuery` - Static Server Components

**When to use:** When you need data on the server but don't need reactivity after initial render.

```typescript
// components/ServerUserProfile.tsx
import { fetchQuery } from "convex/nextjs";
import { api } from "@jym/backend/convex/_generated/api";
import { getToken } from "@/lib/auth-server";

export async function ServerUserProfile() {
  const token = await getToken();

  // Static fetch - won't update if data changes
  const user = await fetchQuery(
    api.auth.getCurrentUser,
    {},
    { token }
  );

  return <div>User: {user?.email}</div>;
}
```

**Benefits:**

- ✅ Server-side rendering (faster initial load)
- ✅ SEO friendly
- ✅ Works without JavaScript

**Limitations:**

- ❌ Non-reactive (won't update if data changes)
- ❌ Static after initial render

### Approach 2: `preloadQuery` + `usePreloadedQuery` - Hybrid

**When to use:** When you want server-side rendering AND client-side reactivity.

**Server Component (PreloadedUserWrapper.tsx):**

```typescript
import { preloadQuery } from "convex/nextjs";
import { api } from "@jym/backend/convex/_generated/api";
import { getToken } from "@/lib/auth-server";
import { ReactiveUserProfile } from "./ReactiveUserProfile";

export async function PreloadedUserWrapper() {
  const token = await getToken();

  // Preload on server
  const preloadedUser = await preloadQuery(
    api.auth.getCurrentUser,
    {},
    { token }
  );

  return <ReactiveUserProfile preloadedUser={preloadedUser} />;
}
```

**Client Component (ReactiveUserProfile.tsx):**

```typescript
"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@jym/backend/convex/_generated/api";

type Props = {
  preloadedUser: Preloaded<typeof api.auth.getCurrentUser>;
};

export function ReactiveUserProfile({ preloadedUser }: Props) {
  // Use preloaded data - this WILL be reactive to changes
  const user = usePreloadedQuery(preloadedUser);

  return <div>User: {user?.email}</div>;
}
```

**Benefits:**

- ✅ Server-side rendering (faster initial load)
- ✅ Client-side reactivity (updates when data changes)
- ✅ SEO friendly
- ✅ Best of both worlds

**Limitations:**

- ⚠️ Slightly more complex setup
- ⚠️ Requires client-side JavaScript for reactivity

## 🚀 Usage in Page Components

```typescript
// app/page.tsx (Server Component)
import { ServerUserProfile } from "@/components/ServerUserProfile";
import { PreloadedUserWrapper } from "@/components/PreloadedUserWrapper";
import { Suspense } from "react";

export default function Page() {
  return (
    <div>
      {/* Static approach */}
      <Suspense fallback={<div>Loading...</div>}>
        <ServerUserProfile />
      </Suspense>

      {/* Reactive approach */}
      <Suspense fallback={<div>Loading...</div>}>
        <PreloadedUserWrapper />
      </Suspense>
    </div>
  );
}
```

## 🔒 Authentication Requirements

Both approaches require:

1. **Environment Variable:** `NEXT_PUBLIC_CONVEX_URL` must be set
2. **Auth Token:** Pass the user's JWT token in the options parameter
3. **Server Context:** Must be called from a Server Component/Action/Route Handler

## 📝 Important Notes

- **Consistency:** `fetchQuery` calls are not guaranteed to be consistent with each other (they're stateless)
- **Performance:** `preloadQuery` uses `cache: 'no-store'` so pages won't be statically rendered
- **Error Handling:** Wrap server components in `Suspense` boundaries for better UX

## 🤝 Choose Your Approach

| Feature                | `fetchQuery`                 | `preloadQuery` + `usePreloadedQuery` |
| ---------------------- | ---------------------------- | ------------------------------------ |
| Server-side rendering  | ✅                           | ✅                                   |
| Client-side reactivity | ❌                           | ✅                                   |
| SEO friendly           | ✅                           | ✅                                   |
| Setup complexity       | Simple                       | Medium                               |
| Best for               | Static content, initial data | Dynamic UIs, real-time updates       |
