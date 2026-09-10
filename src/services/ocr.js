// services/ocr.js
// Simulated OCR + entity extraction — swap-in ready for Google Vision, Tesseract, or AI4Bharat OCR
// Swap-in: replace extractDocument() with your OCR API call

import { getMockDocument } from '../data/mockDocuments.js';

// Simulate OCR processing delay + extraction
export async function extractDocument(file) {
  // Simulate network/processing delay
  await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));

  // Return mock extracted data based on filename heuristics
  const mock = getMockDocument(file.name);

  return {
    ...mock,
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    name: file.name,
    uploadDate: new Date().toISOString().split('T')[0],
    status: 'extracted',
    rawFile: null, // Don't store the actual file in state
    fileSize: file.size,
    fileType: file.type,
  };
}
