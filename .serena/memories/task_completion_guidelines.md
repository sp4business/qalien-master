# QAlien - Task Completion Guidelines

## What to Do When a Task is Completed

### 1. Code Quality Checks
```bash
# Run linting to catch style issues
npm run lint

# Attempt to build the project
npm run build
```

### 2. Important Notes About Current Setup
- **No Testing Framework**: The project does not currently have unit tests, integration tests, or end-to-end tests configured
- **Build Warnings**: ESLint and TypeScript errors are ignored during builds (next.config.ts settings)
- **Local Development**: Always test changes in local development environment

### 3. Development Workflow
1. **Start local environment**:
   ```bash
   supabase start    # Start Supabase locally
   npm run dev       # Start Next.js development server
   ```

2. **Test changes locally**:
   - Verify functionality works as expected
   - Test authentication flows if affected
   - Check database operations if applicable

3. **Code quality**:
   ```bash
   npm run lint      # Check for linting issues
   npm run build     # Ensure production build succeeds
   ```

### 4. Database Changes
If task involves database schema changes:
```bash
# Create migration
supabase migration new migration_name

# Apply migration locally
supabase db push

# Generate updated TypeScript types
supabase gen types typescript --local > src/types/supabase.ts
```

### 5. Edge Functions
If task involves Supabase Edge Functions:
```bash
# Test functions locally
supabase functions serve

# Deploy to production (if needed)
supabase functions deploy function_name
```

### 6. Final Verification
- **Manual Testing**: Always test the feature manually in the browser
- **Error Handling**: Verify error states and edge cases
- **Responsive Design**: Test on different screen sizes
- **Dark Theme**: Ensure UI maintains QAlien dark theme consistency

### 7. Documentation
- Update inline code comments for complex logic
- Update ARCHITECTURE.md if architectural changes were made
- Consider updating README.md for user-facing changes

### 8. Deployment Considerations
- **Vercel**: Frontend deploys automatically on git push
- **Supabase**: Edge functions and migrations may need manual deployment
- **Environment Variables**: Ensure all required env vars are documented

## Quality Standards
- **Type Safety**: All code must be properly typed with TypeScript
- **Accessibility**: Follow basic accessibility guidelines
- **Performance**: Use React best practices (useMemo, useCallback where appropriate)
- **Security**: Never expose sensitive data or API keys in client code