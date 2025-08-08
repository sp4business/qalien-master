# QAlien - Codebase Structure and Organization

## Root Directory Structure
```
qalien-master/
├── src/                    # Main source code
├── supabase/              # Supabase configuration and functions
├── public/                # Static assets
├── docs/                  # Documentation
├── context/               # Context-specific files
├── .serena/               # Serena agent configuration
├── .claude/               # Claude Code configuration
├── package.json           # Node.js dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── eslint.config.mjs      # ESLint configuration
├── next.config.ts         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration (implied)
└── ARCHITECTURE.md        # Detailed architecture documentation
```

## Source Code Organization (`src/`)
```
src/
├── app/                   # Next.js app router pages
│   ├── api/              # API routes
│   ├── brand/            # Brand-related pages
│   ├── campaign/         # Campaign pages
│   ├── sign-in/          # Authentication pages
│   └── sign-up/          # Registration pages
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── settings/        # Brand settings components
│   └── campaigns/       # Campaign-specific components
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries and configurations
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── styles/              # CSS files
├── constants/           # Application constants
└── middleware.ts        # Next.js middleware
```

## Supabase Organization (`supabase/`)
```
supabase/
├── config.toml          # Supabase configuration
├── migrations/          # Database migrations
├── functions/           # Edge functions
└── README.md           # Supabase setup instructions
```

## Key Files and Their Purposes
- **`src/lib/supabase.ts`**: Supabase client configuration with Clerk integration
- **`src/lib/clerk.ts`**: Clerk authentication configuration
- **`src/components/ModernStackProvider.tsx`**: Main provider setup (Clerk, TanStack Query, Toast)
- **`src/middleware.ts`**: Next.js middleware for authentication
- **`src/types/`**: TypeScript type definitions
- **`supabase/config.toml`**: Comprehensive Supabase configuration including edge functions