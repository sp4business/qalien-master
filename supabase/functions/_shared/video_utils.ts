// Video utility functions for codec detection and conversion recommendations

export interface VideoMetadata {
  codec?: string
  isHEVC: boolean
  is4K: boolean
  requiresConversion: boolean
  recommendation?: string
}

/**
 * Detect if a video is likely HEVC/H.265 based on file characteristics
 * This is a heuristic approach since we can't easily read codec info in edge functions
 */
export function detectVideoCharacteristics(
  mimeType: string,
  fileSize: number,
  fileName?: string
): VideoMetadata {
  const metadata: VideoMetadata = {
    isHEVC: false,
    is4K: false,
    requiresConversion: false
  }
  
  // iPhone videos are often HEVC if:
  // 1. File extension is .mov or .MOV
  // 2. MIME type is video/quicktime
  // 3. Relatively small file size for assumed quality (HEVC is more efficient)
  
  const isLikelyiPhone = 
    mimeType === 'video/quicktime' || 
    fileName?.toLowerCase().endsWith('.mov') ||
    fileName?.toLowerCase().includes('img_') || // iPhone default naming
    fileName?.toLowerCase().includes('image_') // Some iPhone apps
  
  // Heuristic: If it's from iPhone and file is relatively small for high quality
  // (HEVC is ~50% more efficient than H.264)
  const fileSizeMB = fileSize / (1024 * 1024)
  const efficientForSize = fileSizeMB < 10 // Small file but likely high quality
  
  if (isLikelyiPhone && efficientForSize) {
    metadata.isHEVC = true
    metadata.codec = 'HEVC/H.265 (likely)'
    metadata.requiresConversion = true
    metadata.recommendation = 'This appears to be an iPhone video using HEVC/H.265 codec. Please convert to H.264 format for compatibility. You can use tools like HandBrake, FFmpeg, or online converters.'
  }
  
  // Check for 4K based on file patterns
  if (fileName) {
    const name = fileName.toLowerCase()
    if (name.includes('4k') || name.includes('uhd') || name.includes('2160')) {
      metadata.is4K = true
    }
  }
  
  // If file is very large, it might be 4K
  if (fileSizeMB > 50) {
    metadata.is4K = true
    metadata.recommendation = metadata.recommendation || 'Large video file detected. Consider compressing or reducing resolution for faster processing.'
  }
  
  return metadata
}

/**
 * Check if video format is likely compatible with Gemini
 */
export function isLikelyCompatible(
  mimeType: string,
  fileSize: number,
  fileName?: string
): { compatible: boolean; reason?: string } {
  const metadata = detectVideoCharacteristics(mimeType, fileSize, fileName)
  
  if (metadata.isHEVC) {
    return {
      compatible: false,
      reason: 'Video appears to use HEVC/H.265 codec which may not be supported. Please convert to H.264/AVC format.'
    }
  }
  
  // Check for other problematic formats
  const problematicMimeTypes = [
    'video/x-matroska', // MKV
    'video/x-ms-wmv',   // Old Windows Media
    'video/divx',       // DivX
  ]
  
  if (problematicMimeTypes.includes(mimeType)) {
    return {
      compatible: false,
      reason: `Video format ${mimeType} may not be supported. Please convert to MP4 (H.264) format.`
    }
  }
  
  return { compatible: true }
}