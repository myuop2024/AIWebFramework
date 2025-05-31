import { HfInference } from '@huggingface/inference';
// We'll need access to the HF client, either by re-initializing or getting from ai-analytics-service
// For now, let's assume we might initialize a new one or get it passed.
// This might be better refactored later to have a single HfClient provider.
import { aiAnalyticsService } from './ai-analytics-service'; // To potentially use its HF client or models

// Placeholder for HfInference client. Will be initialized properly.
let hf: HfInference | null = null;
// TODO: Properly initialize 'hf' or use the one from ai-analytics-service

// We'll need to install these:
// import pdf from 'pdf-parse'; // For PDF text extraction
// import mammoth from 'mammoth'; // For DOCX text extraction

interface AIServiceOptions {
  summarize?: boolean;
  sentiment?: boolean;
  extractText?: boolean; // Implicitly true if other operations are requested
  // Potentially add more options like 'questionAnswering', 'topicModeling'
}

interface AIProcessingResult {
  originalFilename: string;
  mimetype: string;
  extractedText?: string;
  summary?: string;
  sentiment?: any; // Define a proper sentiment result type later
  error?: string;
}

class DocumentAIService {
  constructor() {
    // A more robust solution would be to ensure hf client from ai-analytics-service is used
    // or a shared HfInference client is initialized.
    // For now, this service might need its own initialization if used standalone.
    // This is a simplification for now.
    if (aiAnalyticsService && (aiAnalyticsService as any).hf) { // Unsafe access, for placeholder only
        hf = (aiAnalyticsService as any).hf;
    } else {
        // Fallback, ideally aiAnalyticsService.ensureHfClient() should be callable or client shared
        console.warn("DocumentAIService: Could not access HfInference client from AIAnalyticsService. AI features might be limited.");
        // hf = new HfInference(process.env.HUGGINGFACE_API_KEY_FALLBACK); // Or some other config
    }
  }

  private async ensureHfClient(): Promise<void> {
    // This is a temporary measure. Ideally, HfInference client should be managed centrally.
    // We're relying on ai-analytics-service to initialize it.
    // A better approach would be a dedicated HF client provider/service.
    if (!hf && aiAnalyticsService && typeof (aiAnalyticsService as any).ensureHfClient === 'function') {
        await (aiAnalyticsService as any).ensureHfClient();
        hf = (aiAnalyticsService as any).hf; // Try to get it after it's ensured
    }
    if (!hf) {
        // Fallback if still not initialized, perhaps with a default key if available or error
        const key = process.env.HUGGINGFACE_API_KEY; // Or from a config service
        if (key) hf = new HfInference(key);
        else console.error("HfInference client is not initialized and no API key found to initialize it.");
    }
    if (!hf) {
        throw new Error("HuggingFace client could not be initialized for DocumentAIService.");
    }
  }


  private async extractTextFromTxt(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
  }

  private async extractTextFromCsv(buffer: Buffer): Promise<string> {
    // For CSV, we might just return the content as text.
    // Or, for analysis, one might convert it to JSON or process rows/columns.
    // For now, treating it as plain text.
    return buffer.toString('utf-8');
  }

  // Placeholder for PDF text extraction
  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    // This will require pdf-parse library
    // For now, return placeholder
    console.warn("PDF parsing not yet fully implemented. Attempting basic text extraction if pdf-parse is not available.");
    try {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        return data.text;
    } catch (e) {
        console.error("Failed to load or use pdf-parse. Make sure it's installed.", e);
        return "PDF text extraction failed. The 'pdf-parse' library might be missing or the PDF is not parsable.";
    }
  }

  // Placeholder for DOCX text extraction
  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    // This will require mammoth library
    // For now, return placeholder
    console.warn("DOCX parsing not yet fully implemented. Attempting basic text extraction if mammoth is not available.");
     try {
        const mammoth = (await import('mammoth')).default;
        const { value } = await mammoth.extractRawText({ buffer });
        return value;
    } catch (e) {
        console.error("Failed to load or use mammoth. Make sure it's installed.", e);
        return "DOCX text extraction failed. The 'mammoth' library might be missing or the DOCX is not parsable.";
    }
  }

  public async processDocument(
    fileBuffer: Buffer,
    mimetype: string,
    originalFilename: string,
    options: AIServiceOptions = {}
  ): Promise<AIProcessingResult> {

    await this.ensureHfClient(); // Ensure HF client is available
    if (!hf) { // Check again after ensureHfClient
        return { originalFilename, mimetype, error: "AI client not initialized." };
    }

    let extractedText: string | undefined;
    let error: string | undefined;

    try {
      if (mimetype === 'text/plain' || mimetype === 'text/csv') {
        extractedText = await this.extractTextFromTxt(fileBuffer); // CSV treated as TXT for now
      } else if (mimetype === 'application/pdf') {
        extractedText = await this.extractTextFromPdf(fileBuffer);
      } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        extractedText = await this.extractTextFromDocx(fileBuffer);
      } else {
        error = `Unsupported file type for AI processing: ${mimetype}`;
      }
    } catch (extractionError: any) {
      console.error(`Error during text extraction for ${originalFilename}:`, extractionError);
      error = `Text extraction failed: ${extractionError.message}`;
    }

    if (error) { // If extraction failed, return early
        return { originalFilename, mimetype, error };
    }
    if (!extractedText && (options.summarize || options.sentiment)) {
         return { originalFilename, mimetype, error: "Text extraction yielded no content, cannot perform further AI analysis." };
    }


    let summary: string | undefined;
    if (options.summarize && extractedText) {
      try {
        const summarizationResult = await hf.summarization({
          model: 'facebook/bart-large-cnn', // Or from MODELS constant
          inputs: extractedText,
          parameters: { min_length: 30, max_length: 150 }
        });
        summary = summarizationResult.summary_text;
      } catch (e: any) {
        console.error(`Summarization error for ${originalFilename}:`, e);
        summary = "AI summarization failed.";
      }
    }

    let sentiment: any | undefined;
    if (options.sentiment && extractedText) {
      try {
        // Using a model appropriate for sentiment analysis
        const sentimentResult = await hf.textClassification({ // or zeroShotClassification if labels are dynamic
          model: 'siebert/sentiment-roberta-large-english', // Or from MODELS constant
          inputs: extractedText.substring(0, 512) // Truncate for some models
        });
        sentiment = sentimentResult; // This will be an array of { label, score }
      } catch (e: any) {
        console.error(`Sentiment analysis error for ${originalFilename}:`, e);
        sentiment = { error: "AI sentiment analysis failed." };
      }
    }

    return {
      originalFilename,
      mimetype,
      extractedText: options.extractText || (options.summarize || options.sentiment) ? extractedText : undefined, // Only return if requested or needed
      summary,
      sentiment,
      error // Will be undefined if no major errors occurred during AI processing steps
    };
  }
}

export const documentAiService = new DocumentAIService();
