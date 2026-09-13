# Plan: Security Audit Fixes H3, H4, H5, H6

## Context

Security audit identified 4 high-severity findings that need to be addressed:
- **H6**: Weak JWT secret (`tu-secreto-super-seguro` in `.env`)
- **H3**: No CORS restrictions (allows all origins)
- **H5**: No security headers (missing helmet)
- **H4**: No rate limiting (brute-force vulnerability on login)

These fixes harden the backend against common web attacks without changing business logic.

---

## Changes

### 1. H6: Strong JWT Secret

**File:** `backend/.env`
- Generate a 64-byte random hex string
- Replace `JWT_SECRET=tu-secreto-super-seguro` with the new secret
- Command: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

**Note:** The `vitest.config.ts` already sets `process.env.JWT_SECRET = 'test-secret'` for tests, so tests are unaffected.

---

### 2. H3: CORS Restrictions

**File:** `backend/src/index.ts`

Current (line 21):
```typescript
app.use(cors());
```

Change to:
```typescript
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : 'http://localhost:5173';

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
```

**File:** `backend/.env`
- Add `CORS_ORIGIN=http://localhost:5173` (default dev frontend)

**Behavior:**
- `CORS_ORIGIN` not set → allows `http://localhost:5173` (dev default)
- `CORS_ORIGIN=http://localhost:5173` → single origin
- `CORS_ORIGIN=http://localhost:5173,https://example.com` → multiple origins

---

### 3. H5: Helmet Security Headers

**File:** `backend/package.json`
- Install: `npm install helmet`
- Install types: `npm install -D @types/helmet`

**File:** `backend/src/index.ts`

Add after cors:
```typescript
import helmet from 'helmet';

app.use(helmet({
  hsts: false, // No HTTPS yet in dev
}));
```

**Production note:** When deploying with HTTPS, change to `helmet()` or `helmet({ hsts: { maxAge: 31536000 } })`.

---

### 4. H4: Rate Limiting

**File:** `backend/package.json`
- Install: `npm install express-rate-limit`
- Install types: `npm install -D @types/express-rate-limit`

**File:** `backend/src/infrastructure/api/v1/routes.ts`

Add at top:
```typescript
import rateLimit from 'express-rate-limit';
```

Add login limiter before the login route:
```typescript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

Apply to login route (line 52):
```typescript
router.post('/auth/login', loginLimiter, async (req, res) => {
```

Add general limiter for protected routes (after `router.use(authMiddleware)`):
```typescript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(apiLimiter);
```

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/.env` | New JWT_SECRET, add CORS_ORIGIN |
| `backend/package.json` | Add helmet, express-rate-limit + types |
| `backend/src/index.ts` | Add helmet, CORS config |
| `backend/src/infrastructure/api/v1/routes.ts` | Add rate limiters |

---

## Verification

1. **Typecheck:** `cd backend && npx tsc --noEmit`
2. **Backend tests:** `npm test` (from root)
3. **Integration tests:** `npm run test:integration`
4. **Manual test:** Start dev server, verify CORS headers, verify rate limiting on login

---

## Risk Assessment

- **Low risk:** These are middleware additions that don't change business logic
- **Test impact:** Integration tests use `supertest` with the `app` object, so helmet/rate-limit will be active during tests. Rate limits are high enough (100/15min) that tests won't hit them.
- **CORS impact:** Tests don't send Origin headers, so CORS changes won't affect them
