# Compliance Legend - Modern Stack
> **Status**: Migration to Modern Stack - Legend v1.0 maintained  
> **Last Updated**: 7 Jan 2025  
> **Stack**: Supabase + Bedrock AI analysis

---

## 🎯 **Compliance Legend v1.0 (FROZEN)**

The 7-tag compliance legend remains **unchanged** during stack migration to ensure consistent analysis results.

### **Core Tags**
| Priority | Tag | Description | Modern Implementation |
|----------|-----|-------------|----------------------|
| **1** | **Logos / Iconography** | Logo presence, placement, and safe zones | Bedrock Vision + stored brand logos |
| **2** | **Colors / Palette** | Brand color compliance and tolerance | Bedrock analysis + brand color palette |
| **3** | **Brand Vocabulary** | Approved/banned terms detection | Bedrock text analysis + brand vocabulary |
| **4** | **Brand Tone** | Mood, formality, brand voice alignment | Bedrock LLM + brand tone guidelines |
| **5** | **Disclaimers & Required Language** | Legal text presence and placement | Bedrock OCR + required disclaimers |
| **6** | **Layout / Safe-zone** | Composition rules and positioning | Bedrock spatial analysis + layout rules |
| **7** | **Golden-Set Context** | Reference to approved examples | Vector similarity search with pgvector |

---

## 📊 **Modern Stack Implementation**

### **AI Analysis Pipeline**
```typescript
// Bedrock analysis via Edge Functions
export async function analyzeCreative(creativeId: string, brandId: string) {
  const bedrock = new BedrockRuntime({
    region: 'us-east-1',
    credentials: {
      accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')
    }
  })
  
  // Get brand guidelines
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()
  
  // Analyze with Bedrock
  const response = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: `Analyze this creative for brand compliance using our 7-tag system:
            
            Brand Guidelines: ${JSON.stringify(brand)}
            Creative URL: ${creativeUrl}
            
            Return analysis in the standard v1.0 format.`
        }
      ],
      max_tokens: 2000
    })
  })
  
  return parseAnalysisResult(response)
}
```

### **Database Schema (Supabase)**
```sql
-- Store analysis results
CREATE TABLE creative_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID REFERENCES creatives(id),
  brand_id UUID REFERENCES brands(id),
  
  -- Legend v1.0 compliance
  legend_version VARCHAR(10) DEFAULT '1.0',
  overall_status VARCHAR(20) CHECK (overall_status IN ('pass', 'warn', 'fail')),
  
  -- Tag results (JSONB for flexibility)
  tag_results JSONB NOT NULL,
  
  -- Analysis metadata
  analysis_timestamp TIMESTAMP DEFAULT NOW(),
  ai_model_version VARCHAR(50),
  confidence_score DECIMAL(5,2),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_creative_analysis_creative_id ON creative_analysis(creative_id);
CREATE INDEX idx_creative_analysis_brand_id ON creative_analysis(brand_id);
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