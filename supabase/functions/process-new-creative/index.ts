import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessCreativeRequest {
  assetId: string
  storagePath: string
  campaignId: string
  mimeType: string
  assetName: string
}

interface AssemblyAITranscriptResponse {
  id: string
  status: string
  text?: string
  words?: Array<{
    text: string
    start: number
    end: number
    confidence: number
  }>
  error?: string
  audio_duration?: number
  language_code?: string
  confidence?: number
}

interface FrameAnalysis {
  timestamp: number
  frame_number: number
  visual_description: string
  detected_elements: {
    logos: string[]
    text: string[]
    colors: string[]
    objects: string[]
    people: number
    scenes: string[]
  }
  brand_elements: {
    logo_visible: boolean
    brand_colors_present: boolean
    product_visible: boolean
  }
  ugc_indicators: {
    handheld_camera: boolean
    casual_setting: boolean
    authentic_feel: boolean
    professional_lighting: boolean
    studio_setup: boolean
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { assetId, storagePath, campaignId, mimeType, assetName } = await req.json() as ProcessCreativeRequest
    console.log(`Processing creative asset: ${assetId}`)

    // Process in background using a simple promise
    const processPromise = new Promise((resolve) => {
      processCreativeAsset(assetId, storagePath, campaignId, mimeType, assetName)
        .then(() => resolve(true))
        .catch((error) => {
          console.error('Background processing error:', error)
          resolve(false)
        })
    })
    
    // Use EdgeRuntime.waitUntil if available
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processPromise)
    } else {
      // Fallback to direct processing
      await processPromise
    }

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        message: 'Creative processing started',
        assetId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202,
      }
    )
  } catch (error) {
    console.error('Error in process-new-creative:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function processCreativeAsset(
  assetId: string,
  storagePath: string,
  campaignId: string,
  mimeType: string,
  assetName: string
) {
  try {
    // Get environment variables inside the function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY')!
    const bedrockApiKey = Deno.env.get('AWS_BEDROCK_API_KEY')!

    // Create clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const openai = new OpenAI({ apiKey: openaiApiKey })

    // Update status to processing
    await supabase
      .from('campaign_assets')
      .update({ 
        status: 'processing'
      })
      .eq('id', assetId)

    // Download the asset from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('campaign-assets')
      .download(storagePath)

    if (downloadError) {
      throw new Error(`Failed to download asset: ${downloadError.message}`)
    }

    // Get file properties
    const fileBuffer = await fileData.arrayBuffer()
    const fileSize = fileBuffer.byteLength
    
    // Convert to base64 - for large files, we'll skip the base64 encoding
    // and only analyze if it's an image (videos are too large for Vision API anyway)
    let fileBase64 = ''
    
    // Only convert images to base64 for Vision API
    if (mimeType.startsWith('image/') && fileSize < 20 * 1024 * 1024) { // 20MB limit
      const bytes = new Uint8Array(fileBuffer)
      const len = bytes.byteLength
      let binary = ''
      
      // Convert in chunks to avoid stack overflow
      const chunkSize = 32768 // 32KB chunks
      for (let i = 0; i < len; i += chunkSize) {
        const end = Math.min(i + chunkSize, len)
        for (let j = i; j < end; j++) {
          binary += String.fromCharCode(bytes[j])
        }
      }
      
      fileBase64 = btoa(binary)
    }

    // Extract source properties
    const sourceProperties = {
      file_size: fileSize,
      mime_type: mimeType,
      file_name: assetName,
      uploaded_at: new Date().toISOString(),
    }

    // Initialize analysis arrays
    const frameAnalyses: FrameAnalysis[] = []
    let ugcVotes = {
      total_frames: 0,
      ugc_frames: 0,
      produced_frames: 0,
      confidence_scores: [] as number[],
    }

    if (mimeType.startsWith('video/')) {
      // For videos, skip visual analysis for now (would need frame extraction)
      console.log('Video visual analysis skipped - focusing on audio transcription')
      
      // Set default values for video
      ugcVotes.total_frames = 1
      ugcVotes.ugc_frames = 1 // Default to UGC for videos
      ugcVotes.confidence_scores.push(0.7)
    } else if (mimeType.startsWith('image/') && fileBase64) {
      // For images, analyze the single frame
      const analysis = await analyzeFrame(fileBase64, 0, openai, mimeType)
      frameAnalyses.push(analysis)
      
      // Update UGC detection data
      ugcVotes.total_frames = 1
      const isUgc = calculateUgcScore(analysis.ugc_indicators) > 0.5
      if (isUgc) {
        ugcVotes.ugc_frames++
      } else {
        ugcVotes.produced_frames++
      }
      ugcVotes.confidence_scores.push(calculateUgcScore(analysis.ugc_indicators))
    }

    // Calculate creative type based on UGC votes
    const ugcPercentage = ugcVotes.ugc_frames / ugcVotes.total_frames
    const creativeType = ugcPercentage > 0.5 ? 'UGC' : 'Produced'
    const avgConfidence = ugcVotes.confidence_scores.reduce((a, b) => a + b, 0) / ugcVotes.confidence_scores.length

    // Transcription for video files
    let transcriptData: AssemblyAITranscriptResponse | null = null
    
    if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      console.log('Starting audio transcription for asset')
      
      // Get the public URL for the asset
      const { data: { publicUrl } } = supabase
        .storage
        .from('campaign-assets')
        .getPublicUrl(storagePath)
      
      if (publicUrl) {
        try {
          transcriptData = await transcribeWithAssemblyAI(publicUrl, assemblyAIKey)
          console.log('Transcription completed:', {
            text_length: transcriptData.text?.length || 0,
            word_count: transcriptData.words?.length || 0,
            duration: transcriptData.audio_duration,
          })
        } catch (transcriptError) {
          console.error('Transcription failed:', transcriptError)
          // Continue processing even if transcription fails
        }
      }
    }

    // Vocabulary and Pronunciation Check
    let vocabularyCheckResult: BrandVocabularyCheckResult | null = null
    
    if (transcriptData && transcriptData.text) {
      console.log('Performing vocabulary and pronunciation check')
      
      try {
        // Fetch campaign to get brand_id
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('brand_id')
          .eq('id', campaignId)
          .single()
        
        if (campaignError || !campaign) {
          throw new Error(`Failed to fetch campaign: ${campaignError?.message || 'Campaign not found'}`)
        }
        
        // Fetch brand data
        const { data: brand, error: brandError } = await supabase
          .from('brands')
          .select('name, phonetic_pronunciation, banned_terms')
          .eq('id', campaign.brand_id)
          .single()
        
        if (brandError || !brand) {
          throw new Error(`Failed to fetch brand: ${brandError?.message || 'Brand not found'}`)
        }
        
        // Perform vocabulary check
        vocabularyCheckResult = await checkBrandVocabulary(
          transcriptData,
          {
            name: brand.name,
            phonetic_pronunciation: brand.phonetic_pronunciation,
            banned_terms: brand.banned_terms || []
          },
          bedrockApiKey
        )
        
        console.log('Vocabulary check result:', vocabularyCheckResult.status)
      } catch (vocabError) {
        console.error('Vocabulary check failed:', vocabError)
        // Continue processing even if vocabulary check fails
      }
    }

    // Prepare legend results (detailed analysis)
    const legendResults = {
      visual_analysis: {
        frames_analyzed: frameAnalyses,
        summary: {
          total_frames: ugcVotes.total_frames,
          brand_elements_detected: extractBrandElementsSummary(frameAnalyses),
          dominant_colors: extractDominantColors(frameAnalyses),
          text_detected: extractAllText(frameAnalyses),
        }
      },
      ugc_classification: {
        result: creativeType,
        confidence: avgConfidence,
        votes: ugcVotes,
      },
      vocabulary_compliance: vocabularyCheckResult || {
        status: 'pass',
        notes: 'No audio content to analyze',
        citations: []
      },
      processing_metadata: {
        processed_at: new Date().toISOString(),
        processing_version: '2.0',
        models_used: ['openai-vision-preview', 'assemblyai-transcription', 'claude-3-sonnet'],
      }
    }

    // Generate frontend report and calculate overall status
    const frontendReport = generateFrontendReport(legendResults)
    const overallStatus = calculateOverallStatus(frontendReport)
    
    // Calculate compliance score based on frontend report
    const totalChecks = frontendReport.length
    const passedChecks = frontendReport.filter(item => item.result === 'pass').length
    const complianceScore = Math.round((passedChecks / totalChecks) * 100)

    // Update the asset with all the analysis results
    const { error: updateError } = await supabase
      .from('campaign_assets')
      .update({
        source_properties: sourceProperties,
        ugc_detection_data: ugcVotes,
        creative_type: creativeType,
        legend_results: legendResults,
        raw_transcript_data: transcriptData,
        frontend_report: frontendReport,
        overall_status: overallStatus,
        compliance_score: complianceScore,
        status: 'completed',
      })
      .eq('id', assetId)

    if (updateError) {
      throw new Error(`Failed to update asset: ${updateError.message}`)
    }

    console.log(`Successfully processed creative asset: ${assetId}`)
  } catch (error) {
    console.error(`Error processing creative ${assetId}:`, error)
    
    // Update status to failed
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    await supabase
      .from('campaign_assets')
      .update({ 
        status: 'failed',
        legend_results: { error: error.message }
      })
      .eq('id', assetId)
  }
}

async function analyzeFrame(
  base64Image: string,
  frameNumber: number,
  openai: OpenAI,
  mimeType: string
): Promise<FrameAnalysis> {
  const prompt = `Analyze this image/frame in detail. Provide a comprehensive visual analysis including:

1. Visual Description: Describe what you see in detail
2. Detected Elements:
   - Logos (brand logos, watermarks)
   - Text (any visible text, captions, labels)
   - Colors (dominant colors, color schemes)
   - Objects (products, props, items)
   - People (count and general description)
   - Scenes (location, setting, environment)
3. Brand Elements:
   - Is a logo visible?
   - Are brand colors present?
   - Is a product visible?
4. UGC vs Professional Indicators:
   - Does it appear handheld/shaky vs stabilized?
   - Is the setting casual/home vs studio?
   - Does it feel authentic/candid vs staged?
   - Is the lighting natural vs professional?
   - Is there evidence of a studio setup?

Provide your analysis in a structured format.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url', 
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    })

    const analysis = response.choices[0].message.content
    
    // Parse the response (in production, use structured output)
    return parseVisionResponse(analysis, frameNumber)
  } catch (error) {
    console.error('OpenAI Vision API error:', error)
    throw error
  }
}

function parseVisionResponse(responseText: string, frameNumber: number): FrameAnalysis {
  // This is a simplified parser - in production, use GPT-4's JSON mode or structured output
  const analysis: FrameAnalysis = {
    timestamp: frameNumber * 1000, // Assuming 1 second per frame for now
    frame_number: frameNumber,
    visual_description: responseText,
    detected_elements: {
      logos: [],
      text: [],
      colors: [],
      objects: [],
      people: 0,
      scenes: [],
    },
    brand_elements: {
      logo_visible: false,
      brand_colors_present: false,
      product_visible: false,
    },
    ugc_indicators: {
      handheld_camera: false,
      casual_setting: false,
      authentic_feel: false,
      professional_lighting: false,
      studio_setup: false,
    },
  }

  // Extract information from the response text
  // This is a placeholder - implement proper parsing based on structured output
  if (responseText.toLowerCase().includes('logo')) {
    analysis.brand_elements.logo_visible = true
  }
  if (responseText.toLowerCase().includes('handheld') || responseText.toLowerCase().includes('shaky')) {
    analysis.ugc_indicators.handheld_camera = true
  }
  if (responseText.toLowerCase().includes('home') || responseText.toLowerCase().includes('casual')) {
    analysis.ugc_indicators.casual_setting = true
  }
  if (responseText.toLowerCase().includes('authentic') || responseText.toLowerCase().includes('candid')) {
    analysis.ugc_indicators.authentic_feel = true
  }
  if (responseText.toLowerCase().includes('professional') && responseText.toLowerCase().includes('lighting')) {
    analysis.ugc_indicators.professional_lighting = true
  }
  if (responseText.toLowerCase().includes('studio')) {
    analysis.ugc_indicators.studio_setup = true
  }

  return analysis
}

function calculateUgcScore(indicators: FrameAnalysis['ugc_indicators']): number {
  let score = 0
  const weights = {
    handheld_camera: 0.25,
    casual_setting: 0.25,
    authentic_feel: 0.25,
    professional_lighting: -0.15,
    studio_setup: -0.25,
  }
  
  for (const [key, value] of Object.entries(indicators)) {
    if (value === true) {
      score += weights[key as keyof typeof weights] || 0
    }
  }
  
  // Normalize to 0-1 range
  return Math.max(0, Math.min(1, score + 0.5))
}

function extractBrandElementsSummary(analyses: FrameAnalysis[]) {
  const summary = {
    logo_appearances: 0,
    brand_color_appearances: 0,
    product_appearances: 0,
  }
  
  for (const analysis of analyses) {
    if (analysis.brand_elements.logo_visible) summary.logo_appearances++
    if (analysis.brand_elements.brand_colors_present) summary.brand_color_appearances++
    if (analysis.brand_elements.product_visible) summary.product_appearances++
  }
  
  return summary
}

function extractDominantColors(analyses: FrameAnalysis[]): string[] {
  const colorSet = new Set<string>()
  for (const analysis of analyses) {
    analysis.detected_elements.colors.forEach(color => colorSet.add(color))
  }
  return Array.from(colorSet)
}

function extractAllText(analyses: FrameAnalysis[]): string[] {
  const textSet = new Set<string>()
  for (const analysis of analyses) {
    analysis.detected_elements.text.forEach(text => textSet.add(text))
  }
  return Array.from(textSet)
}

async function transcribeWithAssemblyAI(
  fileUrl: string,
  assemblyAIKey: string
): Promise<AssemblyAITranscriptResponse> {
  console.log('Starting AssemblyAI transcription for:', fileUrl)
  
  try {
    // Step 1: Submit the file for transcription
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyAIKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: fileUrl
      }),
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text()
      throw new Error(`AssemblyAI upload failed: ${uploadResponse.statusText} - ${errorData}`)
    }

    const uploadData = await uploadResponse.json()
    const transcriptId = uploadData.id

    console.log('AssemblyAI transcript ID:', transcriptId)

    // Step 2: Poll for the transcript result
    let transcript: AssemblyAITranscriptResponse
    let attempts = 0
    const maxAttempts = 60 // 5 minutes with 5-second intervals

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            'Authorization': assemblyAIKey,
          },
        }
      )

      if (!statusResponse.ok) {
        throw new Error(`AssemblyAI status check failed: ${statusResponse.statusText}`)
      }

      transcript = await statusResponse.json()

      if (transcript.status === 'completed') {
        console.log('Transcription completed successfully')
        return transcript
      } else if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`)
      }

      // Wait 5 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
    }

    throw new Error('Transcription timed out after 5 minutes')
  } catch (error) {
    console.error('AssemblyAI transcription error:', error)
    throw error
  }
}

interface BrandVocabularyCheckResult {
  status: 'pass' | 'warn' | 'fail'
  notes: string
  citations: Array<{
    type: 'banned_word' | 'mispronunciation'
    spoken_text: string
    timestamp: number
  }>
}

async function checkBrandVocabulary(
  transcriptData: AssemblyAITranscriptResponse,
  brand: {
    name: string
    phonetic_pronunciation?: string | null
    banned_terms: string[]
  },
  bedrockApiKey: string
): Promise<BrandVocabularyCheckResult> {
  console.log('Starting brand vocabulary and pronunciation check')
  console.log('Brand name:', brand.name)
  console.log('Phonetic pronunciation:', brand.phonetic_pronunciation)
  console.log('Banned terms:', brand.banned_terms)
  console.log('Transcript length:', transcriptData.text?.length || 0)
  
  // Get the ground truth pronunciation
  const groundTruthPronunciation = brand.phonetic_pronunciation || brand.name
  
  // Prepare the prompt for Claude
  const prompt = `You are an expert brand compliance analyst. The correct brand name is '${brand.name}' ${brand.phonetic_pronunciation ? `with phonetic pronunciation '${brand.phonetic_pronunciation}'` : ''}. 

IMPORTANT: Only flag CLEAR mispronunciations where the brand name is obviously said incorrectly. Common variations, accents, or slight differences should be considered acceptable. For example:
- "Ben and Jerry's" vs "Ben & Jerry's" is acceptable
- Minor accent differences are acceptable
- If the brand name sounds correct when spoken naturally, it should pass

Banned terms to check: ${JSON.stringify(brand.banned_terms)}.

Please review the following audio transcript and identify:

1. Banned Words: Any words from the banned terms list (be strict about these)
2. Brand Name Mispronunciation: ONLY flag if the brand name is clearly mispronounced in a way that would confuse listeners about the brand identity

Here is the transcript to analyze:
${transcriptData.text}

${transcriptData.words ? `\nDetailed word-level data (first 100 words):\n${JSON.stringify(transcriptData.words.slice(0, 100), null, 2)}` : ''}

Return a JSON object:
- "status": 'pass' if no issues; 'warn' for minor issues; 'fail' for major issues
- "notes": Brief explanation of your decision
- "citations": Array of issues found:
  - "type": 'banned_word' or 'mispronunciation'
  - "spoken_text": the exact problematic text
  - "timestamp": time in milliseconds
  - "confidence": your confidence level (0-1) that this is actually an issue

Only flag mispronunciations you are highly confident (>0.8) are actually wrong.

Return ONLY the JSON object.`

  try {
    // Call AWS Bedrock Claude 3.5 Sonnet
    const response = await fetch('https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-3-5-sonnet-20240620-v1:0/invoke', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bedrockApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        top_p: 0.9,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Bedrock API error response:', errorText)
      throw new Error(`Bedrock API failed: ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    console.log('Bedrock API response structure:', JSON.stringify(result, null, 2))
    
    // Extract content based on response structure
    let content: string
    if (result.content && Array.isArray(result.content) && result.content[0]?.text) {
      content = result.content[0].text
    } else if (result.body) {
      // Alternative response format
      content = result.body
    } else if (typeof result === 'string') {
      // Direct string response
      content = result
    } else {
      console.error('Unexpected Bedrock response format:', result)
      return {
        status: 'warn',
        notes: 'Vocabulary check completed but response format was unexpected',
        citations: []
      }
    }
    
    // Parse the JSON response
    try {
      const checkResult = JSON.parse(content) as BrandVocabularyCheckResult
      console.log('Vocabulary check completed:', checkResult.status)
      console.log('Full vocabulary check result:', JSON.stringify(checkResult, null, 2))
      
      // Filter out low confidence citations if they exist
      if (checkResult.citations && Array.isArray(checkResult.citations)) {
        checkResult.citations = checkResult.citations.filter((citation: any) => {
          // If confidence is provided and it's a mispronunciation, filter by confidence
          if (citation.type === 'mispronunciation' && citation.confidence !== undefined) {
            return citation.confidence > 0.8
          }
          // Keep all banned words and high confidence items
          return true
        })
      }
      
      return checkResult
    } catch (parseError) {
      console.error('Failed to parse Bedrock response content:', content)
      // Return a default result if parsing fails
      return {
        status: 'warn',
        notes: 'Failed to parse AI response - manual review recommended',
        citations: []
      }
    }
  } catch (error) {
    console.error('Brand vocabulary check error:', error)
    // Return error result
    return {
      status: 'warn',
      notes: `Vocabulary check failed: ${error.message}`,
      citations: []
    }
  }
}

interface FrontendReportItem {
  check: string
  result: 'pass' | 'warn' | 'fail'
  details: string
}

function generateFrontendReport(legendResults: any): FrontendReportItem[] {
  const report: FrontendReportItem[] = []
  
  // Visual Analysis Checks
  if (legendResults.visual_analysis) {
    const visual = legendResults.visual_analysis
    
    // Logo Usage Check
    if (visual.summary?.brand_elements_detected) {
      const logoAppearances = visual.summary.brand_elements_detected.logo_appearances || 0
      report.push({
        check: 'Logo Usage',
        result: logoAppearances > 0 ? 'pass' : 'warn',
        details: logoAppearances > 0 
          ? `Logo detected in ${logoAppearances} frame(s). Proper brand representation.`
          : 'No logo detected. Consider adding brand logo for better recognition.'
      })
    }
    
    // Color Palette Check
    if (visual.summary?.dominant_colors) {
      const hasColors = visual.summary.dominant_colors.length > 0
      report.push({
        check: 'Color Palette',
        result: hasColors ? 'pass' : 'warn',
        details: hasColors
          ? `Detected colors: ${visual.summary.dominant_colors.slice(0, 3).join(', ')}`
          : 'No dominant colors detected.'
      })
    }
  }
  
  // UGC Classification
  if (legendResults.ugc_classification) {
    const ugc = legendResults.ugc_classification
    report.push({
      check: 'Content Type',
      result: 'pass',
      details: `Classified as ${ugc.result} content with ${Math.round(ugc.confidence * 100)}% confidence.`
    })
  }
  
  // Vocabulary Compliance Check
  if (legendResults.vocabulary_compliance) {
    const vocab = legendResults.vocabulary_compliance
    let details = vocab.notes || 'No issues found.'
    
    // Add citation details if there are issues
    if (vocab.citations && vocab.citations.length > 0) {
      const citations = vocab.citations.map((c: any) => {
        const timeInSeconds = (c.timestamp / 1000).toFixed(1)
        return `'${c.spoken_text}' at ${timeInSeconds}s`
      }).join(', ')
      details += ` Issues found: ${citations}`
    }
    
    report.push({
      check: 'Brand Vocabulary',
      result: vocab.status,
      details: details
    })
  }
  
  // If no audio/transcript data
  if (!legendResults.vocabulary_compliance && !legendResults.raw_transcript_data) {
    report.push({
      check: 'Brand Vocabulary',
      result: 'pass',
      details: 'No audio content to analyze.'
    })
  }
  
  return report
}

function calculateOverallStatus(frontendReport: FrontendReportItem[]): 'pass' | 'warn' | 'fail' {
  // If any check fails, overall status is fail
  if (frontendReport.some(item => item.result === 'fail')) {
    return 'fail'
  }
  // If any check warns, overall status is warn
  if (frontendReport.some(item => item.result === 'warn')) {
    return 'warn'
  }
  // All checks passed
  return 'pass'
}