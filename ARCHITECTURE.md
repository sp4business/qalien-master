# QAlien System Architecture

## Overview

QAlien is a multi-organization SaaS platform for AI-powered brand compliance and creative analysis. Our architecture follows modern cloud-native principles with a focus on developer experience, scalability, and best-in-class services for each component.

## Architecture Principles

1. **Best-of-Breed Composable Strategy**: We select individual, developer-first APIs that are leaders in their specific domain
2. **Developer Experience First**: Prioritize APIs with excellent documentation, SDKs, and debugging tools
3. **Serverless & Edge-First**: Leverage edge computing and serverless functions for optimal performance
4. **Type-Safe End-to-End**: Full TypeScript coverage from database to frontend

## System Components

### Core Platform Services

- **Frontend Hosting**: Vercel
  - Automatic deployments from Git
  - Edge network distribution
  - Built-in performance optimization
  
- **Backend & Database**: Supabase
  - PostgreSQL for relational data
  - Edge Functions for serverless compute
  - Realtime subscriptions
  - Built-in storage (S3-compatible)
  
- **Authentication**: Clerk
  - Zero-config multi-tenancy
  - JWT integration with Supabase
  - Organization management out-of-the-box

### AI Services Rationale

Our architectural approach for AI and ML services prioritizes a "best-of-breed" composable strategy over a single-vendor ecosystem. We select individual, developer-first APIs that are leaders in their specific domain. This provides higher-quality results and a superior developer experience, allowing for faster iteration. While we utilize AWS Bedrock to leverage existing credits and access state-of-the-art models, other specialized tasks are delegated to the best available API.

| Task | Chosen Service | Rationale |
|------|----------------|-----------|
| Core LLM Reasoning | AWS Bedrock (Claude) | A strategic choice to leverage existing credits and access a powerful, state-of-the-art foundation model. |
| Image Analysis | OpenAI Vision API | Chosen for its flexible, natural language query interface, which is more powerful than traditional fixed-endpoint vision services. |
| Video Understanding | Twelve Labs | Kept as a best-in-class, specialized tool. Its modern, API-first nature aligns perfectly with our developer-centric stack. |
| Speech-to-Text | AssemblyAI | Selected for its top-tier accuracy and superior developer experience. A modern replacement for traditional cloud STT services. |
| Pronunciation Analysis | AssemblyAI + Bedrock | This two-part approach combines best-in-class transcription with the powerful reasoning of our core LLM, which is more robust and flexible than performing manual vector comparisons. |

### Supporting Services

- **Transactional Email**: Resend
  - Developer-friendly email API
  - React email templates
  - Excellent deliverability
  
- **Monitoring & Analytics**: Vercel Analytics + Supabase Logs
  - Built-in performance monitoring
  - Real-time error tracking
  - Usage analytics

## Data Flow Architecture

```
User Upload → Supabase Storage → Edge Function → AI Service → Database → Real-time Update → Frontend
```

### Creative Analysis Pipeline

1. **Upload Phase**
   - User uploads creative (image/video) via frontend
   - File stored in Supabase Storage (public bucket)
   - Database record created with pending status

2. **Analysis Phase**
   - Edge Function triggered on upload
   - Appropriate AI service called based on media type:
     - Images → OpenAI Vision API
     - Videos → Twelve Labs
     - Audio → AssemblyAI
   - Results processed by Bedrock for brand compliance analysis

3. **Results Phase**
   - Analysis results stored in database
   - Real-time subscription updates frontend
   - Compliance scores and feedback generated

## Security Architecture

### Authentication Flow
```
Clerk JWT → Supabase RLS → Database Access
```

### Key Security Features
- Row Level Security (RLS) for automatic data isolation
- JWT validation at edge
- Organization-based access control
- Secure file uploads with presigned URLs

## Scalability Considerations

### Horizontal Scaling
- Edge Functions scale automatically
- Database connection pooling via Supabase
- CDN distribution for static assets

### Performance Optimization
- Edge-first architecture reduces latency
- Intelligent caching strategies
- Optimistic UI updates
- Background job processing for heavy AI tasks

## Development Workflow

### Local Development
```bash
# Frontend
npm run dev

# Supabase
supabase start

# Edge Functions
supabase functions serve
```

### Deployment Pipeline
1. Push to GitHub
2. Vercel auto-deploys frontend
3. Supabase migrations run via GitHub Actions
4. Edge Functions deploy automatically

## Cost Optimization

### Pay-per-Use Model
- Vercel: Pay for bandwidth and compute
- Supabase: Predictable pricing tiers
- AI APIs: Usage-based pricing
- No idle infrastructure costs

### Cost Controls
- Request throttling for AI APIs
- Intelligent caching to reduce API calls
- Background job batching
- Storage optimization with automatic cleanup

## Future Architecture Considerations

### Planned Enhancements
1. **Multi-Region Deployment**: Leverage Vercel and Supabase edge locations
2. **Advanced Caching**: Redis layer for frequently accessed data
3. **ML Model Fine-Tuning**: Custom models for brand-specific analysis
4. **Webhook System**: For third-party integrations

### Technology Radar
- **Evaluating**: Bun runtime for Edge Functions
- **Monitoring**: WebAssembly for client-side processing
- **Considering**: GraphQL layer for complex queries

## Architecture Decision Records (ADRs)

### ADR-001: Choosing Clerk over Supabase Auth
**Decision**: Use Clerk for authentication instead of Supabase Auth
**Rationale**: Built-in multi-tenancy, better organization management, seamless JWT integration

### ADR-002: OpenAI Vision vs AWS Rekognition
**Decision**: Use OpenAI Vision API for image analysis
**Rationale**: Natural language queries, better creative understanding, superior API experience

### ADR-003: Edge Functions vs Traditional Serverless
**Decision**: Use Supabase Edge Functions over AWS Lambda
**Rationale**: Lower latency, better integration with database, simpler deployment

### ADR-004: Best-of-Breed AI Services
**Decision**: Use specialized APIs for each AI task rather than a single provider
**Rationale**: Better quality results, superior developer experience, ability to switch providers

## Campaign Management Architecture

### Overview
QAlien's campaign management system provides comprehensive tools for creating, tracking, and analyzing marketing campaigns across multiple brands within an organization.

### Key Features
1. **Campaign Creation**: Multi-field forms with budget tracking and timeline management
2. **Real-time Updates**: Live campaign list updates using Supabase subscriptions
3. **Multi-currency Support**: Global campaign management with 10+ currency options
4. **Secure Operations**: Edge Functions with RLS policies for data isolation

### Technical Implementation

#### Database Schema
```sql
campaigns
├── id (UUID, primary key)
├── brand_id (UUID, foreign key)
├── name (text, required)
├── campaign_type (text)
├── description (text)
├── start_date (timestamptz)
├── end_date (timestamptz)
├── budget (numeric)
├── currency (varchar(3))
├── country (varchar(100))
└── created_at (timestamptz)
```

#### Edge Functions
- **create-campaign**: Handles secure campaign creation with validation
  - JWT authentication via Clerk
  - Input validation and sanitization
  - PostHog event tracking (optional)
  - CORS support for browser requests

#### Frontend Components
- **CreateCampaignModal**: QAlien-themed modal with form controls
- **DatePicker**: Custom calendar component matching dark theme
- **useCampaigns**: React hook with real-time subscriptions
- **QAlienModal**: Reusable dark-themed modal component

### Security Model
```
User → Clerk JWT → Edge Function → RLS Policies → Database
```

- Row Level Security ensures users only see campaigns in their organization
- Edge Functions validate user permissions before operations
- All data operations respect organization boundaries

## Conclusion

This architecture provides a solid foundation for a modern, scalable SaaS application with sophisticated AI capabilities. By choosing best-in-class services for each component and following cloud-native principles, we ensure both developer productivity and system reliability.