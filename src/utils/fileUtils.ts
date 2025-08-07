// src/utils/fileUtils.ts

// Helper to convert Blob to base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]); // Get only the base64 part
      } else {
        reject(new Error("Failed to read Blob as base64 string."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to read file content (text or base64)
export const readFileContent = (file: File): Promise<{ name: string, type: string, content: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const mimeType = file.type || 'application/octet-stream';

    if (mimeType.startsWith('text/') || 
        ['application/json', 'application/xml', 'application/javascript', 'application/csv', 'application/rtf', 'application/xhtml+xml'].includes(mimeType)
    ) {
      reader.onload = () => resolve({ name: file.name, type: 'text', content: reader.result as string, mimeType });
      reader.onerror = reject;
      reader.readAsText(file);
    } else if (mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
      reader.onload = () => {
        const base64Content = (reader.result as string).split(',')[1];
        resolve({ name: file.name, type: 'base64', content: base64Content, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      // For other file types, just resolve with name and type, content might be too large or not processable by AI directly
      resolve({ name: file.name, type: 'binary', content: `File type ${mimeType} not directly processed.`, mimeType });
    }
  });
};
