import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'
import { detectVideoCharacteristics, isLikelyCompatible } from './video_utils.ts'
// Using Google Gemini for video analysis and brand compliance

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
    color_details?: Array<{  // New field for rich color data
      hex: string
      percentage: number
      location: string
    }>
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

interface BrandVocabularyCheckResult {
  status: 'pass' | 'warn' | 'fail'
  notes: string
  citations: Array<{
    type: 'banned_word' | 'mispronunciation'
    spoken_text: string
    timestamp: number
  }>
}

interface ColorPaletteCheckResult {
  status: 'pass' | 'warn' | 'fail'
  notes: string
  business_impact: string
  citations: Array<{
    type: 'off_brand_color' | 'missing_brand_color' | 'color_proportion'
    detected_color: string
    closest_brand_color?: string
    distance?: number  // Color distance
    timestamp: number
    frame_number: number
    location: string  // Where in frame
    percentage: number  // How much of frame
    severity: 'minor' | 'moderate' | 'severe'
    recommendation: string
  }>
}

interface LogoCheckResult {
  status: 'pass' | 'fail'
  notes: string
  business_impact: string
  citations: Array<{
    timestamp: number
    issue_description: string
    severity: 'minor' | 'moderate' | 'severe'
  }>
}

interface FrontendReportItem {
  check: string
  result: 'pass' | 'warn' | 'fail'
  details: string
}

/**
 * Extracts JSON from a string that may contain additional text before or after the JSON.
 * Handles cases where Claude includes explanatory text despite being told not to.
 */
function extractJSON<T>(content: string): T {
  // First, try to parse as-is (ideal case where response is pure JSON)
  try {
    return JSON.parse(content) as T
  } catch {
    // If that fails, try to extract JSON from the content
    console.log('Initial JSON parse failed, attempting extraction...')
  }

  // Try to find JSON object in the content
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T
    } catch (e) {
      console.error('Failed to parse extracted JSON:', e)
    }
  }

  // Try to find JSON starting from first { to last }
  const firstBrace = content.indexOf('{')
  const lastBrace = content.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const extracted = content.substring(firstBrace, lastBrace + 1)
      return JSON.parse(extracted) as T
    } catch (e) {
      console.error('Failed to parse substring JSON:', e)
    }
  }

  throw new Error(`No valid JSON found in response: ${content.substring(0, 200)}...`)
}

export async function processCreativeAsset(assetId: string) {
  try {
    // Get environment variables inside the function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // OpenAI API key removed - using Twelve Labs for video analysis
    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY')!
    const bedrockApiKey = Deno.env.get('AWS_BEDROCK_API_KEY')!

    // Create clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      throw new Error(`Failed to fetch asset: ${assetError?.message || 'Asset not found'}`)
    }

    const { storage_path: storagePath, campaign_id: campaignId, mime_type: mimeType, asset_name: assetName } = asset

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

    // Fetch brand data early (needed for video analysis)
    let brand: any = null
    
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
      
      // Fetch brand data (including color_palette and logo_files for compliance checks)
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', campaign.brand_id)
        .single()
      
      if (brandError || !brandData) {
        throw new Error(`Failed to fetch brand: ${brandError?.message || 'Brand not found'}`)
      }
      
      brand = brandData
      console.log('Fetched brand data:', brand.name)
    } catch (error) {
      console.error('Failed to fetch brand data:', error)
      // Continue processing even without brand data
    }

    // Initialize analysis arrays
    const frameAnalyses: FrameAnalysis[] = []
    let ugcVotes = {
      total_frames: 0,
      ugc_frames: 0,
      produced_frames: 0,
      confidence_scores: [] as number[],
    }

    // Initialize Gemini analysis results
    let geminiResults: any = null

    if (mimeType.startsWith('video/')) {
      // For videos, use Gemini for visual analysis
      console.log('Starting video visual analysis with Gemini')
      
      // Get the public URL for the video
      const { data: { publicUrl } } = supabase
        .storage
        .from('campaign-assets')
        .getPublicUrl(storagePath)
      
      if (publicUrl && brand) {
        try {
          // Use Gemini for comprehensive video analysis
          console.log('🎬 Starting Gemini video analysis')
          console.log('🎬 Video Public URL:', publicUrl)
          geminiResults = await analyzeCreativeWithGemini(publicUrl, brand)
          
          console.log('\n🔍 GEMINI VIDEO ANALYSIS RESULTS:')
          console.log('============================================')
          console.log(`Brand: ${brand?.name || 'Unknown'}`)
          console.log(`Full Gemini Response:`, JSON.stringify(geminiResults, null, 2))
          console.log(`UGC Classification:`, geminiResults.ugc_classification)
          console.log(`Is UGC: ${geminiResults.ugc_classification?.is_ugc}`)
          console.log(`Confidence: ${geminiResults.ugc_classification?.confidence}`)
          console.log('============================================')
          
          // Create frame analyses from Gemini results for backward compatibility
          // This is a simplified representation since Gemini analyzes the video holistically
          // Use new content type analysis if available
          if (geminiResults.content_type_analysis) {
            console.log('📱 Using new content_type_analysis format')
            ugcVotes.total_frames = 1
            if (geminiResults.content_type_analysis.classification === 'UGC') {
              ugcVotes.ugc_frames = 1
              ugcVotes.produced_frames = 0
              ugcVotes.confidence_scores.push(geminiResults.content_type_analysis.confidence || 0.9)
            } else if (geminiResults.content_type_analysis.classification === 'Branded') {
              ugcVotes.ugc_frames = 0
              ugcVotes.produced_frames = 1
              ugcVotes.confidence_scores.push(geminiResults.content_type_analysis.confidence || 0.9)
            } else if (geminiResults.content_type_analysis.classification === 'Non-Marketing') {
              // Non-marketing content - neither UGC nor branded marketing
              ugcVotes.ugc_frames = 0
              ugcVotes.produced_frames = 0
              ugcVotes.confidence_scores.push(geminiResults.content_type_analysis.confidence || 0.9)
            }
          } else if (geminiResults.ugc_classification) {
            // Fallback to old format
            console.log('📱 Using legacy ugc_classification format')
            ugcVotes.total_frames = 1
            if (geminiResults.ugc_classification?.is_ugc === true) {
              ugcVotes.ugc_frames = 1
              ugcVotes.produced_frames = 0
              ugcVotes.confidence_scores.push(geminiResults.ugc_classification?.confidence || 0.9)
            } else {
              ugcVotes.ugc_frames = 0
              ugcVotes.produced_frames = 1
              ugcVotes.confidence_scores.push(1 - (geminiResults.ugc_classification?.confidence || 0.1))
            }
          }
        } catch (videoError) {
          console.error('Video analysis failed:', videoError)
          // Fallback to default values
          ugcVotes.total_frames = 1
          ugcVotes.ugc_frames = 1
          ugcVotes.confidence_scores.push(0.7)
        }
      }
    } else if (mimeType.startsWith('image/') && fileBase64) {
      // For images, provide basic placeholder analysis (focus is on videos)
      const analysis = createPlaceholderImageAnalysis()
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

    // Calculate creative type based on new content type analysis or legacy UGC votes
    let creativeType = 'Produced' // default
    let avgConfidence = 0.5 // default
    
    if (geminiResults?.content_type_analysis) {
      // Use new content type classification
      creativeType = geminiResults.content_type_analysis.classification
      avgConfidence = geminiResults.content_type_analysis.confidence || 0.9
      console.log('📱 CONTENT TYPE: Using new classification:', creativeType, 'with confidence:', avgConfidence)
    } else if (geminiResults?.ugc_classification) {
      // Fallback to legacy format
      creativeType = geminiResults.ugc_classification.is_ugc === true ? 'UGC' : 'Branded'
      avgConfidence = geminiResults.ugc_classification.confidence || 0.9
      console.log('📱 CONTENT TYPE: Using legacy classification:', creativeType)
    } else {
      // Final fallback to vote-based determination
      creativeType = (ugcVotes.ugc_frames / ugcVotes.total_frames > 0.5 ? 'UGC' : 'Branded')
      avgConfidence = ugcVotes.confidence_scores.length > 0 ? 
                     ugcVotes.confidence_scores.reduce((a, b) => a + b, 0) / ugcVotes.confidence_scores.length :
                     0.5
      console.log('📱 CONTENT TYPE: Using vote-based fallback:', creativeType)
    }
    
    console.log('\n📊 CREATIVE TYPE DETERMINATION:')
    console.log(`Type: ${creativeType}`)
    console.log(`Confidence: ${avgConfidence}`)

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
    
    if (transcriptData && transcriptData.text && brand) {
      console.log('Performing vocabulary and pronunciation check')
      
      try {
        // Perform vocabulary check with retry/backoff for Bedrock throttling
        vocabularyCheckResult = await withRetry(async () =>
          checkBrandVocabulary(
          transcriptData,
          {
            name: brand.name,
            phonetic_pronunciation: brand.phonetic_pronunciation,
            banned_terms: brand.banned_terms || []
          },
          bedrockApiKey
        ))
        
        console.log('Vocabulary check result:', vocabularyCheckResult.status)
      } catch (vocabError) {
        console.error('Vocabulary check failed:', vocabError)
        // Continue processing even if vocabulary check fails
      }
    }

    // Extract compliance results from Gemini analysis
    let colorPaletteCheckResult: ColorPaletteCheckResult | null = null
    let logoCheckResult: LogoCheckResult | null = null
    
    if (geminiResults) {
      console.log('\n🎯 MAPPING GEMINI COMPLIANCE CHECKS:')
      console.log('Gemini color_compliance:', geminiResults.color_compliance)
      console.log('Gemini logo_compliance:', geminiResults.logo_compliance)
      
      // Map Gemini's color compliance to our format
      if (geminiResults.color_compliance) {
        colorPaletteCheckResult = {
          status: geminiResults.color_compliance.status || 'pass',
          notes: geminiResults.color_compliance.notes || 'Color compliance analyzed by Gemini',
          business_impact: geminiResults.color_compliance.business_impact || 'Check brand color usage',
          citations: geminiResults.color_compliance.citations || []
        }
        console.log('Mapped color check result:', colorPaletteCheckResult.status)
      }
      
      // Map Gemini's logo compliance to our format
      if (geminiResults.logo_compliance) {
        logoCheckResult = {
          status: geminiResults.logo_compliance.status || 'pass',
          notes: geminiResults.logo_compliance.notes || 'Logo compliance analyzed by Gemini',
          business_impact: geminiResults.logo_compliance.business_impact || 'Check logo usage guidelines',
          citations: geminiResults.logo_compliance.citations || []
        }
        console.log('Mapped logo check result:', logoCheckResult.status)
      }
    }

    // Removed Bedrock color and logo check calls - using Gemini results instead

    // Prepare legend results (detailed analysis)
    const legendResults = {
      visual_analysis: geminiResults ? {
        frames_analyzed: [], // Gemini analyzes holistically, not frame-by-frame
        summary: {
          total_frames: 1,
          brand_elements_detected: geminiResults.brand_elements_detected || [],
          dominant_colors: geminiResults.dominant_colors || [],
          text_detected: geminiResults.text_detected || [],
          gemini_analysis: geminiResults.detailed_analysis || {}
        }
      } : {
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
        gemini_ugc_data: geminiResults?.ugc_classification || null,
        // Add new content type analysis data
        content_type_analysis: geminiResults?.content_type_analysis || null,
        is_marketing_content: geminiResults?.content_type_analysis?.is_marketing_content ?? true,
        reasoning: geminiResults?.content_type_analysis?.reasoning || null,
        signals: geminiResults?.content_type_analysis?.signals || null
      },
      vocabulary_compliance: vocabularyCheckResult || {
        status: 'pass',
        notes: 'No audio content to analyze',
        citations: []
      },
      color_compliance: colorPaletteCheckResult || {
        status: 'pass',
        notes: 'No color palette defined or no visual content',
        business_impact: 'N/A',
        citations: []
      },
      logo_compliance: logoCheckResult || {
        status: 'pass',
        notes: 'No logo files defined or no visual content',
        business_impact: 'N/A',
        citations: []
      },
      // Add tone_compliance from Gemini results
      tone_compliance: geminiResults?.tone_compliance || null,
      // Store all Gemini compliance checks if available
      gemini_compliance: geminiResults?.compliance_checks || null,
      processing_metadata: {
        processed_at: new Date().toISOString(),
        processing_version: '3.0',
        models_used: geminiResults ? ['gemini-1.5-pro', 'assemblyai-transcription', 'claude-3-sonnet-pronunciation'] : ['assemblyai-transcription', 'claude-3-sonnet'],
      }
    }
    
    // Log the constructed legendResults
    console.log('🎯 BRAND TONE DEBUG - LegendResults constructed:', {
      hasToneCompliance: !!legendResults.tone_compliance,
      toneComplianceFromGemini: geminiResults?.tone_compliance,
      toneInLegend: legendResults.tone_compliance,
      allLegendKeys: Object.keys(legendResults)
    })

    // Generate frontend report and calculate overall status
    console.log('\n📄 GENERATING FRONTEND REPORT:')
    console.log('🎯 BRAND TONE DEBUG - Legend results before generating report:', {
      hasToneCompliance: !!legendResults.tone_compliance,
      toneComplianceStatus: legendResults.tone_compliance?.status,
      toneComplianceNotes: legendResults.tone_compliance?.notes?.substring(0, 100),
      allTopLevelKeys: Object.keys(legendResults)
    })
    
    const frontendReport = generateFrontendReport(legendResults)
    console.log('Frontend report generated:', JSON.stringify(frontendReport, null, 2))
    console.log('🎯 BRAND TONE DEBUG - Frontend report summary:', {
      totalItems: frontendReport.length,
      hasBrandTone: frontendReport.some(item => item.check === 'Brand Tone'),
      allChecks: frontendReport.map(item => item.check)
    })
    
    const overallStatus = calculateOverallStatus(frontendReport)
    console.log('Overall status:', overallStatus)
    
    // Calculate compliance score based on frontend report
    const totalChecks = frontendReport.length
    const passedChecks = frontendReport.filter(item => item.result === 'pass').length
    const complianceScore = Math.round((passedChecks / totalChecks) * 100)
    console.log(`Compliance score: ${complianceScore}% (${passedChecks}/${totalChecks} passed)`)

    // Update the asset with all the analysis results
    console.log('\n💾 SAVING RESULTS TO DATABASE:')
    console.log('Asset ID:', assetId)
    console.log('Creative Type:', creativeType)
    console.log('Status: completed')
    
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
    
    throw error // Re-throw to be caught by the job processor
  }
}

// Simple exponential backoff helper with retry support
class RetryableError extends Error {
  retryAfterMs?: number
  constructor(message: string, retryAfterMs?: number) {
    super(message)
    this.name = 'RetryableError'
    this.retryAfterMs = retryAfterMs
  }
}

async function withRetry<T>(fn: () => Promise<T>, options?: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number }) {
  const maxAttempts = options?.maxAttempts ?? 5
  const base = options?.baseDelayMs ?? 2000  // Increased from 1000ms
  const maxDelay = options?.maxDelayMs ?? 30000  // Increased from 16000ms
  let attempt = 0
  let lastError: any

  while (attempt < maxAttempts) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      attempt++

      const isRetryable = err instanceof RetryableError
      if (!isRetryable || attempt >= maxAttempts) {
        break
      }

      // Honor server-provided Retry-After if present, or use exponential backoff
      const retryAfterMs = (err as RetryableError).retryAfterMs
      // For 429 errors, be more aggressive with backoff
      const is429 = err.message?.includes('429')
      const multiplier = is429 ? 3 : 2  // Use 3x multiplier for rate limits
      const backoff = retryAfterMs ?? Math.min(maxDelay, base * Math.pow(multiplier, attempt - 1))
      console.warn(`Retryable error on attempt ${attempt}/${maxAttempts}. Waiting ${backoff}ms. Error:`, err.message)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }

  throw lastError
}

// Import Google Generative AI SDK for Gemini

/**
 * Analyzes a creative video using Google Gemini 1.5 Pro
 * Returns complete legend_results for all compliance checks except pronunciation
 */
// Supported MIME types for Gemini API
const GEMINI_SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg', 
  'video/mov',
  'video/avi',
  'video/x-flv',
  'video/mpg',
  'video/webm',
  'video/wmv',
  'video/3gpp'
]

const GEMINI_MAX_INLINE_SIZE_MB = 20
const GEMINI_MAX_INLINE_SIZE_BYTES = GEMINI_MAX_INLINE_SIZE_MB * 1024 * 1024

async function analyzeCreativeWithGemini(
  videoUrl: string,
  brand: any,
  mimeType?: string
): Promise<any> {
  console.log('\n🚀 === GEMINI VIDEO ANALYSIS STARTING ===')
  console.log('📹 Video URL:', videoUrl)
  console.log('🏢 Brand:', brand?.name || 'Unknown')
  console.log('🏭 Industry:', brand?.industry || 'Not specified')
  console.log('🎨 Brand Colors:', brand?.color_palette || [])
  console.log('🏷️ Logo variations:', brand?.logo_files?.length || 0)
  console.log('📄 Input MIME Type:', mimeType || 'Not provided')
  
  try {
    // Initialize Gemini client
    const GEMINI_API_KEY = 'AIzaSyByCOOyRuHFPheolnaPRtNr27yUd3Etbj8'
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    
    // Pre-flight validation
    let videoMimeType = mimeType || 'video/mp4' // Default to mp4 if not provided
    
    // Clean up MIME type (remove parameters like codecs)
    videoMimeType = videoMimeType.split(';')[0].trim().toLowerCase()
    
    // Map common variations to standard types
    const mimeTypeMap: Record<string, string> = {
      'video/quicktime': 'video/mp4',  // MOV files work as MP4
      'video/x-m4v': 'video/mp4',       // M4V files work as MP4
      'application/octet-stream': 'video/mp4' // Generic binary, assume MP4
    }
    
    if (mimeTypeMap[videoMimeType]) {
      console.log(`📝 Remapping MIME type from ${videoMimeType} to ${mimeTypeMap[videoMimeType]}`)
      videoMimeType = mimeTypeMap[videoMimeType]
    }
    
    // Validate MIME type
    if (!GEMINI_SUPPORTED_VIDEO_TYPES.includes(videoMimeType)) {
      const error = `Unsupported video MIME type: ${videoMimeType}. Supported types: ${GEMINI_SUPPORTED_VIDEO_TYPES.join(', ')}`
      console.error('❌ VALIDATION ERROR:', error)
      throw new Error(error)
    }
    console.log('✅ MIME type validation passed:', videoMimeType)
    
    // Check video size to determine upload method
    console.log('📥 Checking video size...')
    const headResponse = await fetch(videoUrl, { method: 'HEAD' })
    const contentLength = headResponse.headers.get('content-length')
    const videoSizeBytes = contentLength ? parseInt(contentLength) : 0
    const videoSizeMB = videoSizeBytes / (1024 * 1024)
    
    console.log(`📊 Video size: ${videoSizeMB.toFixed(2)} MB (${videoSizeBytes} bytes)`)
    console.log(`📊 Max inline size: ${GEMINI_MAX_INLINE_SIZE_MB} MB (${GEMINI_MAX_INLINE_SIZE_BYTES} bytes)`)
    
    // Check for codec compatibility (detect HEVC/H.265 from iPhone)
    const compatibility = isLikelyCompatible(videoMimeType, videoSizeBytes, videoUrl)
    if (!compatibility.compatible) {
      console.error('❌ VIDEO CODEC INCOMPATIBILITY DETECTED')
      console.error('Reason:', compatibility.reason)
      
      // Extract filename from URL for better detection
      const urlParts = videoUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const videoMeta = detectVideoCharacteristics(videoMimeType, videoSizeBytes, fileName)
      
      console.error('Video characteristics:', {
        codec: videoMeta.codec,
        isHEVC: videoMeta.isHEVC,
        is4K: videoMeta.is4K,
        requiresConversion: videoMeta.requiresConversion
      })
      
      throw new Error(`Video codec incompatibility: ${compatibility.reason}`)
    }
    
    let videoData: any
    
    // For videos under the size limit, use inline base64
    if (videoSizeBytes < GEMINI_MAX_INLINE_SIZE_BYTES) {
      console.log('📥 Using inline method (video < 20MB)...')
      const videoResponse = await fetch(videoUrl)
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.status}`)
      }
      
      const videoBlob = await videoResponse.blob()
      const videoArrayBuffer = await videoBlob.arrayBuffer()
      
      // Convert to base64 properly
      const uint8Array = new Uint8Array(videoArrayBuffer)
      
      // Build binary string first, then encode once
      let binaryString = ''
      const chunkSize = 32768 // Process in 32KB chunks to avoid stack overflow
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize)
        binaryString += Array.from(chunk)
          .map(byte => String.fromCharCode(byte))
          .join('')
      }
      
      // Encode the complete binary string to base64
      const videoBase64 = btoa(binaryString)
      
      // Validate base64 string
      if (!videoBase64 || videoBase64.length === 0) {
        throw new Error('Failed to encode video to base64: result is empty')
      }
      
      // Check for valid base64 characters
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (!base64Regex.test(videoBase64.substring(0, 1000))) {
        console.error('❌ Invalid base64 detected in first 1000 chars')
        throw new Error('Invalid base64 encoding detected')
      }
      
      videoData = {
        inlineData: {
          mimeType: videoMimeType,
          data: videoBase64
        }
      }
      console.log('✅ Video encoded to base64')
      console.log(`📊 Base64 length: ${videoBase64.length} characters`)
    } else {
      // For larger videos, we need to use Files API or direct URL
      // Since Gemini may not be able to access Supabase URLs directly,
      // we'll try with the public URL first
      console.log('📥 Using URL method (video >= 20MB)...')
      console.log('⚠️ Note: Large video support via URL - Gemini may have access issues')
      
      // Try to use the video URL directly
      // For now, throw an error for large files until we implement Files API
      const error = `Video size (${videoSizeMB.toFixed(2)} MB) exceeds Gemini inline limit of ${GEMINI_MAX_INLINE_SIZE_MB} MB. Files API integration needed for large videos.`
      console.error('❌ SIZE ERROR:', error)
      throw new Error(error)
    }
    
    // Prepare brand guidelines JSON
    const brandGuidelines = {
      name: brand.name,
      industry: brand.industry || 'consumer goods',
      description: brand.description || '',
      color_palette: brand.color_palette || [],
      logo_files_count: brand.logo_files?.length || 0,
      tone_keywords: brand.tone_keywords || [],
      approved_terms: brand.approved_terms || [],
      banned_terms: brand.banned_terms || [],
      required_disclaimers: brand.required_disclaimers || []
    }
    
    console.log('🎯 BRAND TONE DEBUG - Brand Guidelines:', {
      brandName: brandGuidelines.name,
      hasToneKeywords: brandGuidelines.tone_keywords.length > 0,
      toneKeywords: brandGuidelines.tone_keywords,
      toneKeywordsCount: brandGuidelines.tone_keywords.length
    })
    
    // Master prompt for Gemini
    const masterPrompt = `You are an expert brand compliance analyst. I am providing you with a video creative and a JSON object containing the brand's complete guidelines.

Brand Guidelines:
${JSON.stringify(brandGuidelines, null, 2)}

Your Task:
Analyze the entire video—its visuals and its transcribed audio—against the provided brand guidelines. Return a single, valid JSON object that represents the legend_results.

For each compliance check, provide:
- status: 'pass', 'warn', or 'fail'
- notes: detailed string explaining your reasoning
- business_impact: the business impact if failing/warning (or 'N/A' if passing)
- citations: array with timestamps for specific issues found

The checks you must perform:
1. Logos/Iconography: Is the brand properly represented with appropriate logo usage?
2. Colors/Palette: Do the brand colors appear correctly on products/packaging?
3. Brand Tone: CRITICAL - Perform nuanced analysis as a human brand expert would. Analyze whether the spoken audio, on-screen text, and overall creative mood align with the brand's desired tone, which is: [${brandGuidelines.tone_keywords && brandGuidelines.tone_keywords.length > 0 ? brandGuidelines.tone_keywords.join(', ') : 'No specific tone keywords provided'}]. Consider vocabulary choice, speaking style, energy level, emotional resonance, and whether the content authentically represents the brand's voice and personality.
4. Disclaimers: Are required disclaimers present?
5. Layout: Is the visual composition appropriate?
6. Content Type: CRITICAL - First determine if this is marketing/advertising content at all. Then classify its style.
   
   Definitions:
   - Marketing Content: Any content created with intent to promote, advertise, or endorse a product/service/brand
   - Branded Content: Professional marketing with high production quality, stable camera, scripted elements
   - UGC Content: Authentic marketing with casual feel, potentially handheld camera, unscripted testimonials
   - Non-Marketing: Personal videos, random footage, content without any promotional intent
   
   Analyze:
   - Is there clear marketing/promotional intent?
   - Is a product or service being featured intentionally?
   - Is there any call to action (explicit or implied)?
   - What's the production style and quality?
   
   IMPORTANT: Personal videos or random content should be classified as "Non-Marketing" even if a product appears incidentally.

Do NOT analyze brand name pronunciation - that will be handled separately.

Return ONLY a valid JSON object in this exact structure:
{
  "logo_compliance": {
    "status": "pass|warn|fail",
    "notes": "explanation",
    "business_impact": "impact or N/A",
    "citations": []
  },
  "color_compliance": {
    "status": "pass|warn|fail",
    "notes": "explanation",
    "business_impact": "impact or N/A",
    "citations": []
  },
  "tone_compliance": {
    "status": "pass|warn|fail",
    "notes": "explanation",
    "business_impact": "impact or N/A",
    "citations": []
  },
  "disclaimer_compliance": {
    "status": "pass|warn|fail",
    "notes": "explanation",
    "business_impact": "impact or N/A",
    "citations": []
  },
  "layout_compliance": {
    "status": "pass|warn|fail",
    "notes": "explanation",
    "business_impact": "impact or N/A",
    "citations": []
  },
  "content_type_analysis": {
    "is_marketing_content": true|false,
    "classification": "'Branded' or 'UGC' or 'Non-Marketing'",
    "confidence": 0.0-1.0,
    "reasoning": "clear explanation of the verdict",
    "signals": {
      "marketing_intent": "'clear' or 'unclear' or 'absent'",
      "product_focus": "'prominent' or 'incidental' or 'none'",
      "call_to_action": "'present' or 'implied' or 'absent'",
      "camera_stability": "'stable' or 'shaky' or 'mixed'",
      "production_quality": "'professional' or 'amateur' or 'semi-professional'"
    }
  }
}`
    
    // Enhanced logging for debugging Gemini API issues
    console.log('🔍 DEBUG: Preparing to call Gemini API')
    console.log('📊 DEBUG: Prompt Text Length:', masterPrompt.length)
    console.log('📊 DEBUG: Brand Guidelines:', JSON.stringify(brandGuidelines, null, 2))
    
    // Log the actual tone section of the prompt
    const toneSection = masterPrompt.match(/3\. Brand Tone:.*?(?=\n4\.|$)/s)?.[0]
    console.log('🎯 BRAND TONE DEBUG - Actual prompt tone section:', toneSection)
    
    // Log the video data structure
    if (videoData.inlineData) {
      console.log('📹 DEBUG: Using inline video data')
      console.log('📹 DEBUG: Video MIME Type:', videoData.inlineData.mimeType)
      console.log('📹 DEBUG: Video Data Length (Base64):', videoData.inlineData.data.length)
      console.log('📹 DEBUG: Estimated size in MB:', (videoData.inlineData.data.length * 0.75 / (1024 * 1024)).toFixed(2))
      // Log first 100 chars of base64 to verify format
      console.log('📹 DEBUG: Base64 sample (first 100 chars):', videoData.inlineData.data.substring(0, 100))
    } else if (videoData.fileData) {
      console.log('📹 DEBUG: Using file URI method')
      console.log('📹 DEBUG: Video MIME Type:', videoData.fileData.mimeType)
      console.log('📹 DEBUG: Video URI:', videoData.fileData.fileUri)
    }
    
    console.log('🤖 Sending to Gemini for analysis...')
    
    // Call Gemini with video and prompt
    let result
    try {
      result = await model.generateContent([
        videoData,
        { text: masterPrompt }
      ])
    } catch (geminiError: any) {
      console.error('❌ Gemini API call failed with error:', geminiError)
      console.error('Error details:', {
        message: geminiError.message,
        status: geminiError.status,
        statusText: geminiError.statusText,
        errorDetails: geminiError.errorDetails
      })
      
      // Log the request details for debugging
      console.error('Request details:', {
        mimeType: videoData.inlineData?.mimeType,
        dataLength: videoData.inlineData?.data?.length,
        promptLength: masterPrompt.length
      })
      
      // Check if this might be an iPhone HEVC video issue
      if (geminiError.status === 400 && geminiError.message?.includes('invalid argument')) {
        const urlParts = videoUrl.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const videoMeta = detectVideoCharacteristics(
          videoData.inlineData?.mimeType || 'video/mp4',
          videoSizeBytes,
          fileName
        )
        
        if (videoMeta.isHEVC || fileName.toLowerCase().endsWith('.mov')) {
          console.error('🎥 LIKELY CAUSE: iPhone HEVC/H.265 video codec not supported by Gemini')
          throw new Error(
            'Video appears to be encoded with HEVC/H.265 codec (common for iPhone 4K videos). ' +
            'Please convert the video to H.264/AVC format using HandBrake, FFmpeg, or an online converter. ' +
            'TikTok and most social media videos use H.264 which is compatible.'
          )
        }
      }
      
      // Re-throw with more context
      throw new Error(`Gemini API error: ${geminiError.message || 'Unknown error'}. MIME: ${videoData.inlineData?.mimeType}, Size: ${videoData.inlineData?.data?.length} chars`)
    }
    
    const response = await result.response
    const responseText = response.text()
    
    console.log('📝 Gemini raw response received, length:', responseText.length)
    console.log('🔍 First 500 chars:', responseText.substring(0, 500))
    
    // Extract JSON from response
    const geminiResults = extractJSON<any>(responseText)
    
    console.log('✅ Successfully parsed Gemini response')
    
    // Detailed logging for brand tone debugging
    console.log('🎯 BRAND TONE DEBUG - Gemini Response Analysis:', {
      hasToneCompliance: !!geminiResults.tone_compliance,
      toneStatus: geminiResults.tone_compliance?.status,
      toneNotes: geminiResults.tone_compliance?.notes?.substring(0, 200),
      toneBusinessImpact: geminiResults.tone_compliance?.business_impact,
      toneCitationsCount: geminiResults.tone_compliance?.citations?.length || 0
    })
    
    // Log content type analysis
    console.log('📱 CONTENT TYPE DEBUG - Gemini Response:', {
      hasContentTypeAnalysis: !!geminiResults.content_type_analysis,
      isMarketingContent: geminiResults.content_type_analysis?.is_marketing_content,
      classification: geminiResults.content_type_analysis?.classification,
      confidence: geminiResults.content_type_analysis?.confidence,
      reasoning: geminiResults.content_type_analysis?.reasoning,
      signals: geminiResults.content_type_analysis?.signals
    })
    
    console.log('📊 All Compliance results:', {
      logo: geminiResults.logo_compliance?.status,
      color: geminiResults.color_compliance?.status,
      tone: geminiResults.tone_compliance?.status,
      disclaimer: geminiResults.disclaimer_compliance?.status,
      layout: geminiResults.layout_compliance?.status,
      is_ugc: geminiResults.ugc_classification?.is_ugc
    })
    
    return geminiResults
    
  } catch (error: any) {
    console.error('❌ Gemini analysis failed:', error)
    
    // Check if it's a codec issue
    const isCodecIssue = error.message?.includes('HEVC') || error.message?.includes('codec')
    const userFriendlyMessage = isCodecIssue 
      ? 'Video format not supported. iPhone 4K videos need conversion from HEVC to H.264 format.'
      : `Analysis failed: ${error.message}`
    
    // Return default results on error
    return {
      logo_compliance: {
        status: 'warn',
        notes: userFriendlyMessage,
        business_impact: isCodecIssue ? 'Convert video to H.264 format for analysis' : 'Manual review required',
        citations: []
      },
      color_compliance: {
        status: 'warn',
        notes: userFriendlyMessage,
        business_impact: isCodecIssue ? 'Convert video to H.264 format for analysis' : 'Manual review required',
        citations: []
      },
      tone_compliance: {
        status: 'warn',
        notes: userFriendlyMessage,
        business_impact: isCodecIssue ? 'Convert video to H.264 format for analysis' : 'Manual review required',
        citations: []
      },
      disclaimer_compliance: {
        status: 'warn',
        notes: userFriendlyMessage,
        business_impact: isCodecIssue ? 'Convert video to H.264 format for analysis' : 'Manual review required',
        citations: []
      },
      layout_compliance: {
        status: 'warn',
        notes: userFriendlyMessage,
        business_impact: isCodecIssue ? 'Convert video to H.264 format for analysis' : 'Manual review required',
        citations: []
      },
      ugc_classification: {
        is_ugc: false,
        confidence: 0,
        reasoning: 'Unable to classify due to analysis error'
      }
    }
  }
}



  /* Original Jamba implementation - keeping for reference
  const prompt = `Analyze this video and provide detailed visual analysis for key frames throughout the video.

For EACH significant frame or scene change (aim for 5-10 key moments), provide:

1. Timestamp and frame information
2. Visual elements:
   - Dominant colors as HEX codes with percentages and locations
   - Logos or brand marks visible
   - Text overlays or captions
   - Objects and products
   - People count and positioning
   - Scene/location description

3. Brand elements:
   - Is a logo visible?
   - Are brand colors present?
   - Is a product visible?

4. Production quality indicators:
   - Camera work (handheld/stabilized)
   - Setting (casual/professional)
   - Lighting quality
   - Overall production value

Return a JSON array of frame analyses, each with this structure:
[
  {
    "timestamp": 0,
    "frame_number": 0,
    "visual_description": "Description of this moment",
    "detected_elements": {
      "colors": [
        {"hex": "#FF0000", "percentage": 30, "location": "background"},
        {"hex": "#FFFFFF", "percentage": 40, "location": "foreground"}
      ],
      "logos": ["brand names"],
      "text": ["visible text"],
      "objects": ["items"],
      "people": 0,
      "scenes": ["location"]
    },
    "brand_elements": {
      "logo_visible": true/false,
      "brand_colors_present": true/false,
      "product_visible": true/false
    },
    "ugc_indicators": {
      "handheld_camera": true/false,
      "casual_setting": true/false,
      "authentic_feel": true/false,
      "professional_lighting": true/false,
      "studio_setup": true/false
    }
  }
]

Focus on extracting accurate color information for brand compliance checking.
Return ONLY the JSON array.`

  try {
    const response = await withRetry(async () => {
      const res = await fetch('https://bedrock-runtime.us-east-1.amazonaws.com/model/ai21.jamba-1-5-large-v1:0/invoke', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bedrockApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Analyze this video at URL: ${videoUrl}\n\n${prompt}`
            }
          ],
          max_tokens: 4096,
          temperature: 0.1,
          top_p: 0.9,
        }),
      })
      
      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after')
        const body = await res.text().catch(() => '')
        throw new RetryableError(`Bedrock 429 Too Many Requests: ${body}`, retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined)
      }
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        throw new Error(`Jamba API failed: ${res.status} ${res.statusText} - ${errorText}`)
      }
      
      return res
    })

    const result = await response.json()
    console.log('Jamba video analysis response structure:', JSON.stringify(result, null, 2))
    
    // Extract content based on response structure
    let content: string
    if (result.content && Array.isArray(result.content) && result.content[0]?.text) {
      content = result.content[0].text
    } else if (result.choices && result.choices[0]?.message?.content) {
      content = result.choices[0].message.content
    } else if (typeof result === 'string') {
      content = result
    } else {
      console.error('Unexpected Jamba response format:', result)
      // Return default frame analysis
      return {
        frames: [{
          timestamp: 0,
          frame_number: 0,
          visual_description: 'Video analysis unavailable',
          detected_elements: {
            logos: [],
            text: [],
            colors: [],
            color_details: [],
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
        }]
      }
    }
    
    // Parse the JSON array of frames
    try {
      const frames = JSON.parse(content) as any[]
      
      // Transform to our FrameAnalysis format
      const frameAnalyses: FrameAnalysis[] = frames.map((frame, index) => ({
        timestamp: frame.timestamp || index * 1000,
        frame_number: frame.frame_number || index,
        visual_description: frame.visual_description || '',
        detected_elements: {
          logos: frame.detected_elements?.logos || [],
          text: frame.detected_elements?.text || [],
          colors: (frame.detected_elements?.colors || []).map((c: any) => c.hex).filter(Boolean),
          color_details: frame.detected_elements?.colors || [],
          objects: frame.detected_elements?.objects || [],
          people: frame.detected_elements?.people || 0,
          scenes: frame.detected_elements?.scenes || [],
        },
        brand_elements: frame.brand_elements || {
          logo_visible: false,
          brand_colors_present: false,
          product_visible: false,
        },
        ugc_indicators: frame.ugc_indicators || {
          handheld_camera: false,
          casual_setting: false,
          authentic_feel: false,
          professional_lighting: false,
          studio_setup: false,
        },
      }))
      
      console.log(`Jamba analyzed ${frameAnalyses.length} key frames from video`)
      return { frames: frameAnalyses }
      
    } catch (parseError) {
      console.error('Failed to parse Jamba video analysis:', parseError)
      // Return single default frame
      return {
        frames: [{
          timestamp: 0,
          frame_number: 0,
          visual_description: 'Failed to parse video analysis',
          detected_elements: {
            logos: [],
            text: [],
            colors: [],
            color_details: [],
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
        }]
      }
    }
  } catch (error) {
    console.error('Jamba video analysis error:', error)
    throw error
  }
  */


// Placeholder function for image analysis
function createPlaceholderImageAnalysis(): FrameAnalysis {
  return {
    timestamp: 0,
    frame_number: 0,
    visual_description: 'Image analysis placeholder - system optimized for video content',
    detected_elements: {
      logos: [],
      text: [],
      colors: ['#808080', '#FFFFFF', '#000000'],
      color_details: [
        { hex: '#808080', percentage: 40, location: 'general' },
        { hex: '#FFFFFF', percentage: 35, location: 'background' },
        { hex: '#000000', percentage: 25, location: 'foreground' }
      ],
      objects: [],
      people: 0,
      scenes: ['static image']
    },
    brand_elements: {
      logo_visible: false,
      brand_colors_present: false,
      product_visible: false
    },
    ugc_indicators: {
      handheld_camera: false,
      casual_setting: true,
      authentic_feel: true,
      professional_lighting: false,
      studio_setup: false
    }
  }
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
    // Call AWS Bedrock Claude 3.5 Sonnet with simple retry/backoff on 429
    const response = await withRetry(async () => {
      const res = await fetch('https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-3-5-sonnet-20240620-v1:0/invoke', {
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
      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after')
        const body = await res.text().catch(() => '')
        throw new RetryableError(`Bedrock 429 Too Many Requests: ${body}`, retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined)
      }
      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        throw new Error(`Bedrock API failed: ${res.status} ${res.statusText} - ${errorText}`)
      }
      return res
    })

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
      const checkResult = extractJSON<BrandVocabularyCheckResult>(content)
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

// Color and Logo checks removed - now handled by Gemini

function generateFrontendReport(legendResults: any): FrontendReportItem[] {
  const report: FrontendReportItem[] = []
  
  // Brand Tone Compliance Check (replacing old Logo Usage check)
  console.log('🎯 BRAND TONE DEBUG - Generating Frontend Report:', {
    hasToneCompliance: !!legendResults.tone_compliance,
    toneComplianceData: legendResults.tone_compliance
  })
  
  if (legendResults.tone_compliance) {
    const toneCheck = legendResults.tone_compliance
    let details = toneCheck.notes || 'Brand tone analysis completed.'
    
    // Add business impact if present
    if (toneCheck.business_impact && toneCheck.business_impact !== 'N/A') {
      details += ` Impact: ${toneCheck.business_impact}`
    }
    
    const toneItem = {
      check: 'Brand Tone',
      result: toneCheck.status === 'fail' ? 'fail' : toneCheck.status === 'warn' ? 'warn' : 'pass',
      details: details
    }
    
    console.log('🎯 BRAND TONE DEBUG - Adding to frontend report:', toneItem)
    report.push(toneItem)
  } else {
    // Fallback if tone_compliance is missing
    console.log('⚠️ BRAND TONE DEBUG - No tone_compliance in legendResults, using fallback')
    report.push({
      check: 'Brand Tone',
      result: 'warn',
      details: 'Brand tone analysis not available. Manual review recommended.'
    })
  }
  
  // Visual Analysis Checks (kept for backward compatibility)
  if (legendResults.visual_analysis) {
    const visual = legendResults.visual_analysis
    
    // Note: Logo Usage moved to Gemini's logo_compliance
    // Color palette check as fallback only
    if (!legendResults.color_compliance && visual.summary?.dominant_colors) {
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
  
  // Content Type Classification with Marketing Intent
  if (legendResults.ugc_classification) {
    const ugc = legendResults.ugc_classification
    const isMarketing = ugc.is_marketing_content
    const classification = ugc.result
    
    console.log('📱 CONTENT TYPE DEBUG - Frontend Report:', {
      classification,
      isMarketing,
      reasoning: ugc.reasoning,
      signals: ugc.signals
    })
    
    // Determine pass/fail based on marketing intent
    let result: 'pass' | 'fail' | 'warn' = 'pass'
    let details = ''
    
    if (classification === 'Non-Marketing') {
      // Non-marketing content should fail
      result = 'fail'
      details = `Non-marketing content detected. ${ugc.reasoning || 'This appears to be personal content without promotional intent.'}`
    } else if (classification === 'UGC') {
      result = 'pass'
      details = `UGC marketing content (${Math.round(ugc.confidence * 100)}% confidence). ${ugc.reasoning || 'Authentic user-generated promotional content.'}`
    } else if (classification === 'Branded') {
      result = 'pass'
      details = `Branded marketing content (${Math.round(ugc.confidence * 100)}% confidence). ${ugc.reasoning || 'Professional advertisement with clear marketing intent.'}`
    } else {
      // Unclear or legacy format
      result = isMarketing === false ? 'fail' : 'pass'
      details = `Classified as ${classification} content with ${Math.round(ugc.confidence * 100)}% confidence.`
    }
    
    report.push({
      check: 'Content Type',
      result,
      details
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
  
  // Logo and Iconography Check
  if (legendResults.logo_compliance) {
    const logoCheck = legendResults.logo_compliance
    let details = logoCheck.notes || 'Logo compliance check completed.'
    
    // Add business impact if present
    if (logoCheck.business_impact && logoCheck.business_impact !== 'N/A') {
      details += ` Impact: ${logoCheck.business_impact}`
    }
    
    // Add specific issues if present
    if (logoCheck.citations && logoCheck.citations.length > 0) {
      const issues = logoCheck.citations
        .slice(0, 3)
        .map((c: any) => {
          const timeInSeconds = (c.timestamp / 1000).toFixed(1)
          return `${c.issue_description} at ${timeInSeconds}s`
        })
        .join('; ')
      details += ` Issues: ${issues}`
    }
    
    report.push({
      check: 'Logo & Iconography',
      result: logoCheck.status === 'fail' ? 'fail' : logoCheck.status === 'warn' ? 'warn' : 'pass',
      details: details
    })
  }
  
  // Color Palette Compliance Check (Enhanced)
  if (legendResults.color_compliance) {
    const colorCheck = legendResults.color_compliance
    let details = colorCheck.notes || 'Color compliance check completed.'
    
    // Add business impact if present
    if (colorCheck.business_impact && colorCheck.business_impact !== 'N/A') {
      details += ` Impact: ${colorCheck.business_impact}`
    }
    
    // Add specific violations if present
    if (colorCheck.citations && colorCheck.citations.length > 0) {
      const topIssues = colorCheck.citations
        .slice(0, 3)
        .map(c => {
          const timeInSeconds = (c.timestamp / 1000).toFixed(1)
          return `${c.type.replace(/_/g, ' ')} at ${timeInSeconds}s (${c.severity})`
        })
      details += ` Issues: ${topIssues.join('; ')}`
    }
    
    report.push({
      check: 'Color Palette',
      result: colorCheck.status,
      details: details
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

