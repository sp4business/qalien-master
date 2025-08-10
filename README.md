# QAlien - UGC Compliance Platform

## Overview

QAlien is a comprehensive multi-tenant SaaS platform that enables organizations to analyze user-generated content (UGC) for brand compliance using advanced AI. The platform helps marketing teams ensure that creative content aligns with brand guidelines across visual identity, messaging, tone, and legal requirements.

## What QAlien Does

**Core Value Proposition**: Automated brand compliance analysis for marketing creative content, with intelligent UGC vs. Produced content classification and real-time feedback.

### Key Features

- **Multi-Organization Management**: Complete tenant isolation with role-based access control
- **Brand Guideline Setup**: AI-powered PDF analysis to extract brand colors, logos, and compliance rules  
- **Creative Upload & Analysis**: Drag-and-drop interface with real-time AI processing
- **UGC Classification**: Intelligent detection of user-generated vs. professional content
- **Compliance Scoring**: 7-category analysis system (tone, layout, disclaimers, vocabulary, etc.)
- **Campaign Management**: End-to-end campaign creation and asset tracking
- **Team Collaboration**: Granular invitation and permission system

## Tech Stack

### Modern Cloud-Native Architecture

**Core Platform**
- **Frontend**: Next.js 15 + React 19 + TypeScript on Vercel
- **Backend**: Supabase (PostgreSQL + Edge Functions + Storage)
- **Authentication**: Clerk (multi-tenant organizations)
- **State Management**: TanStack Query with real-time subscriptions

**AI & ML Services** (Best-of-breed approach)
- **Core LLM Reasoning**: AWS Bedrock (Claude 3.5 Sonnet)
- **Image Analysis**: OpenAI Vision API
- **Video Understanding**: Twelve Labs API
- **Speech-to-Text**: AssemblyAI
- **Email**: Resend

**Infrastructure**
- **Hosting**: Vercel Edge Network
- **Database**: Supabase PostgreSQL with Row Level Security
- **Storage**: Supabase Storage (S3-compatible)
- **Functions**: Supabase Edge Functions (TypeScript/Deno)

## System Architecture

### Modular Design Philosophy

QAlien follows a modular, composable architecture that prioritizes developer experience and best-in-class services:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Edge Functions │    │   AI Services   │
│   (Next.js)     │◄──►│   (Supabase)     │◄──►│   (Bedrock)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        │
┌─────────────────┐    ┌──────────────────┐               │
│   Auth/Org      │    │   Database       │               │
│   (Clerk)       │    │   (PostgreSQL)   │               │
└─────────────────┘    └──────────────────┘               │
                                │                         │
                                ▼                         │
                    ┌──────────────────┐                  │
                    │   File Storage   │◄─────────────────┘
                    │   (Supabase)     │
                    └──────────────────┘
```

### Key Modules

**Authentication Module** (`Clerk`)
- Multi-tenant organization management
- JWT integration with database
- Role-based permissions (OrgAdmin, BrandAdmin, Editor, Viewer)

**Brand Management Module**
- PDF guideline analysis and extraction
- Visual identity management (colors, logos)
- Verbal identity configuration (tone, vocabulary)
- Golden set creative examples

**Creative Analysis Module**
- Multi-format upload support (images, videos, audio)
- AI-powered UGC classification
- 7-category compliance analysis
- Real-time processing with queue system

**Campaign Module**
- Campaign creation and management
- Asset linking and organization
- Budget and timeline tracking
- Multi-currency support

**Team Management Module**
- Organization and brand-level invitations
- Granular permission system
- User role management and transfers

## Quick Start for Developers

### Prerequisites
```bash
Node.js 18+
Supabase CLI
Git
```

### Local Development Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd qalien-master
npm install
```

2. **Environment Setup**
```bash
# Copy environment template
cp .env.example .env.local

# Add your keys:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

3. **Start Development Servers**
```bash
# Frontend
npm run dev

# Supabase (in separate terminal)
supabase start
supabase functions serve
```

4. **Database Setup**
```bash
# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/types/database.ts
```

Visit `http://localhost:3000` to see the application.

## Project Structure

### Frontend Organization
```
src/
├── app/                     # Next.js App Router
│   ├── (auth)/             # Protected routes
│   ├── brand/              # Brand management
│   ├── campaign/           # Campaign pages
│   └── api/                # API routes (webhooks)
├── components/
│   ├── ui/                 # Base UI components
│   ├── settings/           # Brand settings components
│   └── campaigns/          # Campaign-specific components
├── hooks/                  # Custom React hooks
│   ├── useBrands.ts       # Brand data management
│   ├── useCampaigns.ts    # Campaign operations
│   └── useTeamManagement.ts # Team operations
├── lib/
│   ├── supabase.ts        # Database client
│   ├── clerk.ts           # Auth configuration
│   └── api.ts             # API utilities
└── types/
    ├── campaign.ts        # Campaign types
    └── database.ts        # Generated DB types
```

### Backend Organization
```
supabase/
├── functions/              # Edge Functions
│   ├── create-campaign/   # Campaign creation
│   ├── process-new-creative/ # AI analysis pipeline
│   └── invite-team-members/ # Team management
├── migrations/            # Database schema
└── config.toml           # Supabase configuration
```

## Key Implementation Details

### Multi-Tenant Data Isolation

All data access is organization-scoped using Row Level Security:

```sql
-- Example RLS Policy
CREATE POLICY "brands_org_access" ON brands
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM organization_memberships 
      WHERE user_id = auth.current_user_id()
    )
  );
```

### Real-time Processing Pipeline

Creative analysis uses a queue-based system to handle multiple uploads:

```typescript
// AI processing with queue management
const processCreative = async (creativeId: string) => {
  // 1. Queue the job
  await supabase.from('ai_job_queue').insert({
    asset_id: creativeId,
    status: 'pending'
  })
  
  // 2. Background processor picks up job
  // 3. Real-time updates via Supabase subscriptions
}
```

### UGC Classification System

Intelligent content type detection using multimodal AI:

```typescript
// Bedrock-powered classification
const classifyContent = async (fileUrl: string) => {
  const analysis = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet',
    body: {
      messages: [{
        role: 'user',
        content: `Classify this as UGC or Produced content...`
      }]
    }
  })
  return parseClassification(analysis)
}
```

## Development Workflow

### Feature Development
1. Create feature branch from `main`
2. Implement with TypeScript types
3. Add database migrations if needed
4. Test locally with Supabase local instance
5. Deploy Edge Functions to staging
6. Create PR for review

### Deployment Process
- **Frontend**: Auto-deploy via Vercel on push to `main`
- **Database**: Manual migration deployment via Supabase CLI
- **Edge Functions**: Deploy via `supabase functions deploy`

## Architecture Decisions

### Why This Stack?

**Clerk over Supabase Auth**: Built-in multi-tenancy and organization management reduces custom implementation complexity.

**Best-of-breed AI**: Using specialized APIs (OpenAI Vision, Twelve Labs, AssemblyAI) provides superior results compared to single-vendor solutions.

**Edge Functions over Lambda**: Lower latency, better Supabase integration, and simpler deployment model.

**PostgreSQL over NoSQL**: Complex relational data with strong consistency requirements make SQL the right choice.

### Migration Achievement

Successfully migrated from AWS Amplify to modern stack:
- ✅ Removed all AWS dependencies except Bedrock
- ✅ Improved developer experience significantly  
- ✅ Maintained all existing functionality
- ✅ Added real-time capabilities
- ✅ Enhanced type safety throughout

## Key Features Deep Dive

### Brand Onboarding
Multi-step wizard that analyzes PDF guidelines and extracts:
- Brand colors and visual elements
- Logo variations and usage rules
- Tone and messaging guidelines
- Golden set creative examples

### Compliance Analysis
7-category scoring system:
1. **Brand Tone**: Voice and messaging consistency
2. **Layout Safe Zone**: Visual composition rules
3. **Disclaimers**: Required legal text
4. **Vocabulary**: Approved/banned terms
5. **Visual Identity**: Logo and color compliance
6. **Audio Quality**: Sound standards
7. **Content Appropriateness**: General suitability

### Campaign Management
End-to-end campaign lifecycle:
- Creation with budget and timeline tracking
- Asset upload and linking
- Real-time collaboration
- Multi-currency support
- Analytics and reporting

### Team Collaboration
Granular permission system:
- Organization-level roles (Admin/Member)
- Brand-level roles (Admin/Editor/Viewer)  
- Secure invitation system with email verification
- Role transfer and management

## Contributing

### Code Standards
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Zod for runtime type validation
- React Query for data fetching
- Tailwind for styling

### Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Type safety as primary quality gate

This documentation provides engineers with a comprehensive understanding of QAlien's modular architecture, enabling quick onboarding and effective contribution to the codebase.
