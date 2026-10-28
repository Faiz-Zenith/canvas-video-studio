/**
 * Menyisipkan 'free' box pada file MP4 untuk menggelembungkan ukuran file
 * sesuai batas minimal syarat pasar Microstock tanpa menurunkan kualitas video.
 * 
 * @param {ArrayBuffer} arrayBuffer - Buffer file MP4 asli dari WebCodecs
 * @param {number} targetSizeMB - Ukuran minimal yang diinginkan dalam Megabyte
 * @returns {ArrayBuffer} Buffer MP4 yang sudah dipadding
 */
export function padMp4Buffer(arrayBuffer, targetSizeMB) {
  if (!targetSizeMB || targetSizeMB <= 0) return arrayBuffer;

  const currentBytes = arrayBuffer.byteLength;
  const targetBytes = Math.round(targetSizeMB * 1024 * 1024);

  // Jika ukuran file asli sudah melebihi target, tidak perlu padding
  if (currentBytes >= targetBytes) {
    return arrayBuffer;
  }

  const paddingNeeded = targetBytes - currentBytes;

  // 'free' box MP4 membutuhkan minimal 8 bytes (4 byte size + 4 byte header 'free')
  if (paddingNeeded < 8) {
    return arrayBuffer;
  }

  const paddedUint8 = new Uint8Array(currentBytes + paddingNeeded);
  
  // Salin file MP4 asli di bagian depan
  paddedUint8.set(new Uint8Array(arrayBuffer), 0);

  // Tulis header 'free' box di bagian akhir
  const view = new DataView(paddedUint8.buffer, currentBytes, paddingNeeded);
  view.setUint32(0, paddingNeeded, false); // Big-Endian Size

  // Identifier ASCII untuk 'free' box
  paddedUint8[currentBytes + 4] = 0x66; // 'f'
  paddedUint8[currentBytes + 5] = 0x72; // 'r'
  paddedUint8[currentBytes + 6] = 0x65; // 'e'
  paddedUint8[currentBytes + 7] = 0x65; // 'e'

  return paddedUint8.buffer;
}