# Contribution Guide

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- A Firebase project (see `firebase.md`)
- A code editor (VS Code recommended)

### First-Time Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd secure-exam-platform

# 2. Setup Backend
cd backend
cp .env.example .env
# Edit .env with your Firebase credentials
npm install
npm run dev

# 3. Setup Frontend (new terminal — Zero .env config required!)
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Git Workflow

### Branching Strategy

```
main  ←  stable, deployable code
  └── feature/<module>  ←  your work
```

**Always** create a feature branch before starting work:

```bash
git checkout -b feature/your-feature-name
```

**Example branch names:**
- `feature/auth`
- `feature/admin-users`
- `feature/test-builder`
- `feature/exam-engine`
- `feature/security`

### Making Changes

```bash
# 1. Create your branch
git checkout -b feature/auth

# 2. Make your changes

# 3. Stage and commit
git add .
git commit -m "feat: implement student registration flow"

# 4. Push your branch
git push origin feature/auth

# 5. Open a Pull Request on GitHub
```

### Commit Message Format

Use this format for clear history:

```
<type>: <short description>

Types:
  feat      — new feature
  fix       — bug fix
  docs      — documentation only
  style     — formatting, no logic change
  refactor  — code restructure, no behavior change
  test      — adding tests
  chore     — build/config changes
```

Examples:
- `feat: add student heartbeat endpoint`
- `fix: handle missing Firebase credentials gracefully`
- `docs: update API reference for test access endpoints`

---

## Code Standards

### TypeScript

- Strict mode is enabled — fix all TypeScript errors before pushing
- Always define return types for functions
- No `any` types unless absolutely necessary (add a comment explaining why)

### File Naming

- Components: `PascalCase.tsx` (e.g., `ExamInterface.tsx`)
- Utilities/hooks: `camelCase.ts` (e.g., `useAuth.ts`)
- Pages: `page.tsx` (Next.js App Router convention)

### Backend Structure

Follow the Controllers → Services → Firebase pattern:

```typescript
// ❌ Wrong — business logic in controller
router.get("/users", async (req, res) => {
  const users = await db.collection("users").get(); // logic here is wrong
  res.json(users);
});

// ✅ Correct
// controller just calls the service
export function getUsers(req, res) {
  const users = await userService.getAllUsers();
  res.json({ success: true, data: users });
}

// service contains the logic
export async function getAllUsers() {
  const snapshot = await db.collection("users").get();
  return snapshot.docs.map(doc => doc.data());
}
```

### Environment Variables

- **Never commit `.env` or `.env.local`** — they are in `.gitignore`
- Update `.env.example` when adding a new environment variable
- Frontend variables must start with `NEXT_PUBLIC_`
- Backend Firebase Admin credentials must **never** appear in frontend code

### API Responses

All API responses must use the standard format:

```typescript
// Success
res.status(200).json({ success: true, data: result });

// Error
res.status(400).json({ success: false, error: "Meaningful error message" });
```

---

## Testing Your Work

Before opening a Pull Request, verify:

1. **Backend starts without errors:** `npm run dev` in `/backend`
2. **Frontend starts without errors:** `npm run dev` in `/frontend`
3. **Health check works:** `GET http://localhost:5000/api/health`
4. **TypeScript compiles:** `npm run build` in `/backend`
5. **No console errors** in the browser

---

## Questions

- Read `docs/architecture.md` to understand the system design
- Read `docs/api.md` for all API endpoints
- Read `docs/team-modules.md` to understand your module boundaries
- Ask your team lead if unsure about anything
