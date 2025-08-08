# QAlien - Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2017
- **Strict mode**: Enabled
- **Module resolution**: Bundler
- **Path aliases**: `@/*` maps to `./src/*`
- **JSX**: Preserve (handled by Next.js)

## ESLint Configuration
- **Base**: Next.js core-web-vitals + Next.js TypeScript rules
- **Build behavior**: Errors ignored during builds (configured in next.config.ts)

## React/Next.js Conventions

### Component Structure
- **Functional components**: Use function declarations with TypeScript
- **Props**: Define TypeScript interfaces for all props
- **Export**: Use default exports for components
- **File naming**: PascalCase for components (e.g., `ModernStackProvider.tsx`)

### Example Component Pattern
```typescript
interface ComponentProps {
  prop1: string;
  prop2?: number;
}

export default function Component({ prop1, prop2 }: ComponentProps) {
  // Component logic
  return <div>{prop1}</div>;
}
```

### State Management
- **Client State**: React useState and useReducer
- **Server State**: TanStack Query (React Query v5)
- **Authentication**: Clerk hooks (@clerk/nextjs)
- **Database**: Supabase with custom hooks

### Authentication Pattern
```typescript
import { useAuth } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase';

// Use in components
const { user } = useAuth();
const supabase = useSupabaseClient();
```

## Styling Conventions
- **Primary**: Tailwind CSS classes
- **Dark theme**: Extensive use of dark theme colors
- **QAlien branding**: Custom colors and animations in `styles/qalien-animations.css`
- **Responsive**: Mobile-first approach with Tailwind responsive utilities

## Database Conventions
- **Schema**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Clerk JWT integration with Supabase
- **Organization isolation**: All tables include organization-based access control
- **Migrations**: Version-controlled in `supabase/migrations/`

## Import/Export Patterns
- **Relative imports**: Use `@/` alias for src folder
- **External libraries**: Group at top, separate from internal imports
- **Type imports**: Use `import type` for TypeScript types

## Error Handling
- **Client errors**: Try/catch blocks with user-friendly messages
- **Server errors**: Edge functions return structured error responses
- **Loading states**: Consistent loading patterns with QAlien branding

## File Organization
- **Components**: One component per file
- **Hooks**: Custom hooks in `src/hooks/`
- **Types**: Shared types in `src/types/`
- **Utils**: Pure functions in `src/utils/`
- **Constants**: Application constants in `src/constants/`