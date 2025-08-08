# QAlien - Technology Stack and Services

## Core Platform Services
- **Frontend Hosting**: Vercel (automatic deployments, edge network, performance optimization)
- **Backend & Database**: Supabase (PostgreSQL, Edge Functions, realtime subscriptions, storage)
- **Authentication**: Clerk (zero-config multi-tenancy, JWT integration, organization management)

## Frontend Technologies
- **Framework**: Next.js 15 + React 19 + TypeScript
- **State Management**: TanStack Query (React Query v5)
- **Styling**: Tailwind CSS (v4)
- **Component Library**: Radix UI
- **Build Tool**: Turbopack (for development)

## AI Services (Best-of-Breed Approach)
- **Core LLM**: AWS Bedrock (Claude Sonnet/Opus) - leveraging existing credits
- **Image Analysis**: OpenAI Vision API - flexible natural language queries
- **Video Understanding**: Twelve Labs - specialized video analysis
- **Speech-to-Text**: AssemblyAI - top-tier accuracy and developer experience
- **Pronunciation Analysis**: AssemblyAI + Bedrock combination

## Supporting Services
- **Transactional Email**: Resend (developer-friendly, React email templates)
- **Monitoring**: Vercel Analytics + Supabase Logs
- **Version Control**: Git (GitHub for repository hosting)

## Development Dependencies
- **TypeScript**: v5 with strict configuration
- **ESLint**: Next.js configuration with TypeScript rules
- **Node.js**: Required for development
- **Supabase CLI**: For local development and edge functions