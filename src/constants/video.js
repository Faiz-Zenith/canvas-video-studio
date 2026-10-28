// Preset resolusi Microstock beserta bitrate native-nya (Mbps)
export const RESOLUTIONS = [
  { id: '720p', label: 'HD 720p', short: 'HD', width: 1280, height: 720, bitrateMbps: 8 },
  { id: '1080p', label: 'FHD 1080p', short: 'FHD', width: 1920, height: 1080, bitrateMbps: 25 },
  { id: '2k', label: '2K QHD', short: '2K', width: 2560, height: 1440, bitrateMbps: 45 },
  { id: '4k', label: '4K UHD', short: '4K', width: 3840, height: 2160, bitrateMbps: 80 },
];

export const ASPECT_RATIOS = ['16:9', '9:16', '1:1'];
export const FPS_OPTIONS = [24, 30, 60];

// Pilihan durasi (detik)
export const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

export const VIDEO_FORMATS = [
  { id: 'mp4', label: 'MP4', mime: 'video/mp4' },
  { id: 'mov', label: 'MOV', mime: 'video/quicktime' },
];

/** Hitung lebar & tinggi video dari preset resolusi dan rasio aspek */
export function getDimensions(resolutionId, aspectRatio) {
  const { width: w, height: h } =
    RESOLUTIONS.find((r) => r.id === resolutionId) ?? RESOLUTIONS[1];

  if (aspectRatio === '9:16') return { width: h, height: w };
  if (aspectRatio === '1:1') return { width: h, height: h };
  return { width: w, height: h };
}