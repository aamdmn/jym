# Monorepo Setup Issues and Solutions

## 🔧 **Issues Found and Fixed:**

### 1. **Mismatched Convex Deployment URLs**

- **Backend**: `https://precious-horse-862.convex.cloud`
- **Frontend**: `https://adjective-animal-123.convex.cloud`
- **Fix**: Created `apps/web/.env.local` with matching URLs

### 2. **Better Auth Token Function**

- **Issue**: The `getToken()` function needed proper async handling in monorepo setup
- **Fix**: Added proper error handling and async wrapper

### 3. **Server Component Error Handling**

- **Issue**: Server components crashed without proper error boundaries
- **Fix**: Added try/catch blocks and detailed error messages

## 📁 **Key Files Updated:**

### `apps/web/.env.local` (NEW)

```env
# Deployment used by `npx convex dev`
CONVEX_DEPLOYMENT=dev:precious-horse-862 # team: adam-c1769, project: jym

# These should match your backend deployment
NEXT_PUBLIC_CONVEX_URL=https://precious-horse-862.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://precious-horse-862.convex.site
SITE_URL=http://localhost:3000
```

### `apps/web/lib/auth-server.ts`

```typescript
export const getToken = async () => {
  try {
    const tokenFn = getTokenNextjs(createAuth);
    return await tokenFn();
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return undefined;
  }
};
```

## 🚀 **Testing Components:**

1. **SimpleServerProfile**: Tests basic server-side `fetchQuery` without auth
2. **ServerUserProfile**: Tests `fetchQuery` with authentication token
3. **PreloadedUserWrapper**: Tests `preloadQuery` with authentication token
4. **AuthTest**: Client-side authentication testing

## 📋 **Environment Variable Checklist:**

- [ ] `NEXT_PUBLIC_CONVEX_URL` matches backend deployment
- [ ] `NEXT_PUBLIC_CONVEX_SITE_URL` matches backend deployment
- [ ] `SITE_URL` set to correct local development URL
- [ ] `CONVEX_DEPLOYMENT` matches backend
- [ ] Backend and frontend use same Convex deployment

## 🔍 **Common Monorepo Issues:**

1. **Import Path Issues**: Use `@jym/backend/convex/_generated/api` for cross-package imports
2. **Environment Variables**: Each app needs its own `.env.local` with proper URLs
3. **TypeScript Configuration**: Ensure proper paths in `tsconfig.json`
4. **Build Dependencies**: Make sure shared packages are built before apps

## 📚 **References:**

- [Convex Better Auth Docs](https://www.better-auth.com/docs/integrations/convex)
- [Convex Next.js Server Rendering](https://docs.convex.dev/client/nextjs/app-router/server-rendering)
- [Convex Better Auth Next.js Guide](https://convex-better-auth.netlify.app/framework-guides/next)
