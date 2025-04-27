import pdf from "pdf-parse";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { translateText } from "./translate.js"; // Your existing translation utility

// Function to extract text from a PDF
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdf(pdfBuffer);
    return data.text; // Extracted text
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  }
}

// Function to translate extracted text
async function translatePDFText(text, targetLanguage) {
  try {
    const translatedText = await translateText(text, targetLanguage);
    return translatedText;
  } catch (error) {
    console.error("Error translating text:", error);
    throw error;
  }
}

// Function to create a new PDF with translated text
async function createTranslatedPDF(translatedText) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  page.drawText(translatedText, {
    x: 50,
    y: height - 50,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Main function to handle PDF translation
export async function handlePDFTranslation(pdfBuffer, targetLanguage) {
  try {
    // Step 1: Extract text from PDF
    const extractedText = await extractTextFromPDF(pdfBuffer);

    // Step 2: Translate the extracted text
    const translatedText = await translatePDFText(extractedText, targetLanguage);

    // Step 3: Reconstruct the PDF (optional)
    const translatedPDF = await createTranslatedPDF(translatedText);

    return translatedPDF;
  } catch (error) {
    console.error("Error handling PDF translation:", error);
    throw error;
  }
}