/**
 * Helper untuk mengunggah file langsung ke Google Drive milik pengguna
 * menggunakan token akses OAuth yang diperoleh saat login.
 */
export async function uploadToGoogleDrive(
  file: File,
  accessToken: string
): Promise<{ id: string; name: string; url: string }> {
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
  };

  const boundary = '314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file);
  });

  const fileData = await fileDataPromise;

  const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const mediaPartHeader = `\r\n--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

  const encoder = new TextEncoder();
  const delimiterBytes = encoder.encode(delimiter);
  const metadataBytes = encoder.encode(metadataPart);
  const mediaHeaderBytes = encoder.encode(mediaPartHeader);
  const closeBytes = encoder.encode(closeDelimiter);

  const combinedLength = 
    delimiterBytes.length + 
    metadataBytes.length + 
    mediaHeaderBytes.length + 
    fileData.byteLength + 
    closeBytes.length;

  const body = new Uint8Array(combinedLength);

  let offset = 0;
  body.set(delimiterBytes, offset);
  offset += delimiterBytes.length;
  body.set(metadataBytes, offset);
  offset += metadataBytes.length;
  body.set(mediaHeaderBytes, offset);
  offset += mediaHeaderBytes.length;
  body.set(new Uint8Array(fileData), offset);
  offset += fileData.byteLength;
  body.set(closeBytes, offset);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive Upload error: ${response.status} - ${errText}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    name: file.name,
    url: `https://drive.google.com/file/d/${result.id}/view?usp=drivesdk`,
  };
}
