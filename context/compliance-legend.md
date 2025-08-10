# Compliance Legend - Modern Stack (Gemini-Powered)
> **Status**: Migration to Google Gemini - Legend v1.0 maintained  
> **Last Updated**: 15 Jan 2025  
> **Stack**: Supabase + Google Gemini 1.5 Pro + AWS Bedrock (vocabulary) + AssemblyAI

---

## 🎯 **Compliance Legend v1.0 (FROZEN)**

The 7-tag compliance legend remains **unchanged** during stack migration to ensure consistent analysis results.

### **Core Tags**
| Priority | Tag | Description | Modern Implementation |
|----------|-----|-------------|----------------------|
| **1** | **Logos / Iconography** | Logo presence, placement, and safe zones | **Google Gemini** vision analysis + stored brand logos |
| **2** | **Colors / Palette** | Brand color compliance and tolerance | **Google Gemini** color analysis + brand palette |
| **3** | **Brand Vocabulary** | Approved/banned terms detection | **AWS Bedrock** text analysis + pronunciation check |
| **4** | **Brand Tone** | Mood, formality, brand voice alignment | **Google Gemini** + brand tone_keywords |
| **5** | **Disclaimers & Required Language** | Legal text presence and placement | **Google Gemini** OCR + required disclaimers |
| **6** | **Layout / Safe-zone** | Composition rules and positioning | **Google Gemini** spatial analysis + layout rules |
| **7** | **Content Type Classification** | UGC vs Produced detection | **Google Gemini** holistic analysis |

---

## 📊 **Modern Stack Implementation**

### **AI Analysis Pipeline** (Current Implementation)
```typescript
// Google Gemini + Queue-based analysis via Edge Functions
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'
import { processCreativeAsset } from '../_shared/ai_pipeline.ts'

// Main analysis function using AI Job Queue
export async function processAIJobQueue() {
  // Atomic job dequeuing
  const { data: job } = await supabase
    .rpc('dequeue_next_job_if_idle')
  
  if (!job) {
    return new Response(JSON.stringify({ message: 'No jobs available' }))
  }

  try {
    // Process with Gemini + Bedrock + AssemblyAI
    await processCreativeAsset(job.asset_id)
    
    // Mark job complete
    await supabase
      .from('ai_job_queue')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id)
      
  } catch (error) {
    // Mark job failed
    await supabase
      .from('ai_job_queue')
      .update({ 
        status: 'failed',
        error_message: error.message 
      })
      .eq('id', job.id)
  }
}

// Comprehensive Gemini analysis
async function analyzeWithGemini(videoUrl: string, brand: any) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
  
  const prompt = `You are an expert brand compliance analyst. Analyze this video against the brand guidelines and return a complete compliance assessment.

Brand Guidelines:
${JSON.stringify({
  name: brand.name,
  industry: brand.industry,
  color_palette: brand.color_palette,
  tone_keywords: brand.tone_keywords,
  required_disclaimers: brand.required_disclaimers,
  banned_terms: brand.banned_terms
}, null, 2)}

Return ONLY a valid JSON object with this structure:
{
  "logo_compliance": {
    "status": "pass|warn|fail",
    "notes": "detailed analysis",
    "business_impact": "impact description",
    "citations": []
  },
  "color_compliance": { /* same structure */ },
  "tone_compliance": { /* same structure */ },
  "disclaimer_compliance": { /* same structure */ },
  "layout_compliance": { /* same structure */ },
  "ugc_classification": {
    "is_ugc": true|false,
    "confidence": 0.0-1.0,
    "reasoning": "explanation"
  }
}`

  const result = await model.generateContent([
    { 
      inlineData: {
        mimeType: 'video/mp4',
        data: videoBase64
      }
    },
    { text: prompt }
  ])
  
  return extractJSON(result.response.text())
}
```

### **Database Schema (Supabase)** - Current Implementation
```sql
-- Campaign assets with integrated analysis results
CREATE TABLE campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  storage_path TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Analysis Results (Legend v1.0 format preserved)
  legend_results JSONB, -- Complete Gemini compliance analysis
  raw_transcript_data JSONB, -- AssemblyAI transcript
  frontend_report JSONB, -- User-facing 7-tag report
  overall_status TEXT CHECK (overall_status IN ('pass', 'warn', 'fail')),
  compliance_score INTEGER, -- 0-100 percentage
  creative_type TEXT CHECK (creative_type IN ('UGC', 'Produced')),
  
  -- Processing Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI job queue for async processing
CREATE TABLE ai_job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES campaign_assets(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);
```

---

## 🔍 **Tag Implementation Details**

### **1. Logos / Iconography**
```typescript
// Modern logo detection
export async function analyzeLogo(imageUrl: string, brandLogos: string[]) {
  const analysis = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: await getBase64Image(imageUrl)
              }
            },
            {
              type: 'text',
              content: `Analyze logo presence and placement. 
              Brand logos: ${brandLogos.join(', ')}
              
              Check for:
              - Logo presence
              - Correct placement
              - Safe zone compliance
              - Logo integrity (no stretching/distortion)`
            }
          ]
        }
      ]
    })
  })
  
  return {
    status: 'pass' | 'warn' | 'fail',
    confidence: 0.95,
    notes: 'Logo correctly placed in safe zone'
  }
}
```

### **2. Colors / Palette**
```typescript
// Color compliance analysis
export async function analyzeColors(imageUrl: string, brandColors: string[]) {
  const analysis = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: await getBase64Image(imageUrl)
              }
            },
            {
              type: 'text',
              content: `Analyze color compliance.
              Brand colors: ${brandColors.join(', ')}
              
              Check for:
              - Dominant colors match brand palette
              - No off-brand colors
              - Color harmony and consistency`
            }
          ]
        }
      ]
    })
  })
  
  return {
    status: 'pass' | 'warn' | 'fail',
    confidence: 0.88,
    notes: 'Colors align with brand palette',
    dominant_hex: ['#37B34A', '#FFFFFF']
  }
}
```

### **3. Brand Vocabulary**
```typescript
// Text analysis for vocabulary compliance
export async function analyzeVocabulary(
  textContent: string,
  approvedTerms: string[],
  bannedTerms: string[]
) {
  const analysis = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: `Analyze text for brand vocabulary compliance:
          
          Text: "${textContent}"
          Approved terms: ${approvedTerms.join(', ')}
          Banned terms: ${bannedTerms.join(', ')}
          
          Check for:
          - Presence of required terms
          - Absence of banned terms
          - Proper usage of brand terminology`
        }
      ]
    })
  })
  
  return {
    status: 'pass' | 'warn' | 'fail',
    confidence: 0.92,
    notes: 'All required terms present, no banned terms found'
  }
}
```

### **4. Brand Tone**
```typescript
// Tone analysis using brand guidelines
export async function analyzeTone(content: string, brandTone: string) {
  const analysis = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: `Analyze content tone against brand guidelines:
          
          Content: "${content}"
          Brand tone: "${brandTone}"
          
          Evaluate:
          - Tone alignment (formal/casual, friendly/professional)
          - Voice consistency
          - Emotional resonance
          - Appropriateness for target audience`
        }
      ]
    })
  })
  
  return {
    status: 'pass' | 'warn' | 'fail',
    confidence: 0.85,
    notes: 'Tone aligns with brand voice guidelines'
  }
}
```

### **5. Disclaimers & Required Language**
```typescript
// Legal compliance checking
export async function analyzeDisclaimers(
  content: string,
  requiredDisclaimers: string[]
) {
  const analysis = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: `Check for required legal disclaimers:
          
          Content: "${content}"
          Required disclaimers: ${requiredDisclaimers.join(', ')}
          
          Verify:
          - All required disclaimers present
          - Correct wording and placement
          - Appropriate font size and visibility
          - Legal compliance`
        }
      ]
    })
  })
  
  return {
    status: 'pass' | 'warn' | 'fail',
    confidence: 0.98,
    notes: 'All required disclaimers present and properly formatted'
  }
}
```

### **6. Layout / Safe-zone**
```typescript
// Layout and composition analysis
export async function analyzeLayout(imageUrl: string, layoutRules: any) {
  const analysis = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: await getBase64Image(imageUrl)
              }
            },
            {
              type: 'text',
              content: `Analyze layout compliance:
              
              Layout rules: ${JSON.stringify(layoutRules)}
              
              Check:
              - Logo placement in safe zones
              - Text area percentage
              - Composition balance
              - Spacing and margins`
            }
          ]
        }
      ]
    })
  })
  
  return {
    status: 'pass' | 'warn' | 'fail',
    confidence: 0.90,
    notes: 'Layout follows brand guidelines',
    text_area_pct: 15.5
  }
}
```

### **7. Golden-Set Context (Vector Search)**
```typescript
// Vector similarity with pgvector
export async function analyzeGoldenSet(creativeEmbedding: number[], brandId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Find similar golden creatives
  const { data: similarCreatives } = await supabase
    .from('creative_embeddings')
    .select(`
      *,
      creatives!inner(
        id,
        filename,
        is_golden
      )
    `)
    .eq('creatives.brand_id', brandId)
    .eq('creatives.is_golden', true)
    .order('embedding <-> $1', { ascending: true })
    .limit(5)
  
  // Calculate similarity scores
  const similarities = similarCreatives.map(item => ({
    creative_id: item.creatives.id,
    similarity: calculateCosineSimilarity(creativeEmbedding, item.embedding)
  }))
  
  const avgSimilarity = similarities.reduce((sum, item) => sum + item.similarity, 0) / similarities.length
  
  return {
    status: avgSimilarity > 0.8 ? 'pass' : avgSimilarity > 0.6 ? 'warn' : 'fail',
    confidence: 0.87,
    notes: `Average similarity to golden set: ${(avgSimilarity * 100).toFixed(1)}%`,
    similarity: avgSimilarity
  }
}
```

---

## 📋 **Analysis Result Format (v1.0)**

### **Complete Analysis Result**
```typescript
interface AnalysisResult {
  creative_id: string
  brand_id: string
  legend_version: '1.0'
  creative_type: 'UGC' | 'Produced'
  analysis_timestamp: string
  overall_status: 'pass' | 'warn' | 'fail'
  tag_results: {
    logos_iconography: TagBlock
    colors_palette: TagBlock
    brand_vocabulary: TagBlock
    brand_tone: TagBlock
    disclaimers_required_language: TagBlock
    layout_safe_zone: TagBlock
    golden_set_similarity: TagBlock
  }
}

interface TagBlock {
  status: 'pass' | 'warn' | 'fail'
  confidence?: number
  notes: string
  dominant_hex?: string[]
  deltaE_max?: number
  similarity?: number
  text_area_pct?: number
  llm_score?: number
}
```

### **Frontend Display**
```typescript
// components/ComplianceResults.tsx
export function ComplianceResults({ analysis }: { analysis: AnalysisResult }) {
  const tagConfig = {
    logos_iconography: { label: 'Logos & Iconography', icon: '🏷️' },
    colors_palette: { label: 'Colors & Palette', icon: '🎨' },
    brand_vocabulary: { label: 'Brand Vocabulary', icon: '📝' },
    brand_tone: { label: 'Brand Tone', icon: '💬' },
    disclaimers_required_language: { label: 'Disclaimers', icon: '⚖️' },
    layout_safe_zone: { label: 'Layout & Safe Zone', icon: '📐' },
    golden_set_similarity: { label: 'Golden Set Match', icon: '⭐' }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StatusBadge status={analysis.overall_status} />
        <span className="text-lg font-medium">
          Overall: {analysis.overall_status.toUpperCase()}
        </span>
      </div>
      
      {Object.entries(analysis.tag_results).map(([tag, result]) => (
        <div key={tag} className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{tagConfig[tag].icon}</span>
            <span className="font-medium">{tagConfig[tag].label}</span>
            <StatusBadge status={result.status} />
          </div>
          <p className="text-gray-600">{result.notes}</p>
          {result.confidence && (
            <p className="text-sm text-gray-500 mt-1">
              Confidence: {(result.confidence * 100).toFixed(1)}%
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## 🔄 **Migration Considerations**

### **Maintaining Compatibility**
- **Legend v1.0 format preserved** - no breaking changes
- **Same 7-tag structure** - consistent UI/UX
- **Improved AI analysis** - better accuracy with Bedrock
- **Faster processing** - Edge Functions vs Lambda cold starts

### **Performance Improvements**
- **Vector search** - pgvector for golden set similarity
- **Real-time updates** - Supabase realtime for analysis status
- **Better caching** - Supabase built-in caching
- **Parallel processing** - Multiple Bedrock calls in parallel

### **Future Enhancements**
- **Custom models** - Train brand-specific models
- **A/B testing** - Test different analysis approaches
- **Feedback loops** - Learn from user corrections
- **Advanced metrics** - More detailed compliance scoring

---

The compliance legend remains the core foundation of QAlien's brand analysis while benefiting from the modern stack's improved performance, reliability, and developer experience.