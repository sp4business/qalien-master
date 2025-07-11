/**
 * Generates a thumbnail from a video file
 * @param file - The video file
 * @param seekTo - Time in seconds to capture (default: 2)
 * @returns Promise<string> - Base64 data URL of the thumbnail
 */
export async function generateVideoThumbnail(file: File, seekTo: number = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create video element
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Create object URL for the video file
      const videoUrl = URL.createObjectURL(file);
      
      // Set up video element
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      // Handle video load
      video.onloadedmetadata = () => {
        // Seek to specified time
        video.currentTime = Math.min(seekTo, video.duration * 0.1); // Use 10% if seekTo is beyond duration
      };
      
      // Handle seek complete
      video.onseeked = () => {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        // Clean up
        URL.revokeObjectURL(videoUrl);
        
        resolve(thumbnailUrl);
      };
      
      // Handle errors
      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Failed to load video'));
      };
      
      // Start loading video
      video.src = videoUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Checks if a file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}