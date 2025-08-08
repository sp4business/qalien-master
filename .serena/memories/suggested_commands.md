# QAlien - Suggested Development Commands

## Essential Development Commands

### Frontend Development
```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Supabase Development
```bash
# Start Supabase local development
supabase start

# Serve Edge Functions locally
supabase functions serve

# Run database migrations
supabase db push

# Reset local database
supabase db reset

# Generate TypeScript types from database
supabase gen types typescript --local > src/types/supabase.ts
```

### Git Commands (Darwin/macOS)
```bash
# Standard git operations
git status
git add .
git commit -m "message"
git push
git pull

# View file changes
git diff
git log --oneline
```

### File Operations (Darwin/macOS)
```bash
# List files
ls -la

# Find files
find . -name "*.tsx" -type f

# Search content (use ripgrep if available)
grep -r "searchterm" src/
# or
rg "searchterm" src/

# File operations
cp source destination
mv source destination
rm filename
```

### Development Workflow
1. **Start Development Environment**:
   ```bash
   # Terminal 1: Start Supabase
   supabase start
   
   # Terminal 2: Start Next.js
   npm run dev
   
   # Terminal 3: Serve Edge Functions (if needed)
   supabase functions serve
   ```

2. **Before Committing**:
   ```bash
   npm run lint
   npm run build  # Ensure build passes
   ```

## Important Notes
- No testing framework is currently configured
- ESLint and TypeScript errors are ignored during builds (next.config.ts settings)
- The project uses Turbopack for faster development builds
- Supabase local development uses port 54321 for API, 54323 for Studio