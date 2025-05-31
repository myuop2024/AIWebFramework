import { documentAiService, DocumentAIService, AIProcessingResult, AIServiceOptions } from './document-ai-service';
import { HfInference } from '@huggingface/inference';
import { aiAnalyticsService } from './ai-analytics-service'; // For potential shared HF client
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// Mock dependencies
jest.mock('@huggingface/inference');
jest.mock('pdf-parse');
jest.mock('mammoth');

// Mock ai-analytics-service to control its HfInference client or ensureHfClient method
// This is a simplified mock. A more complex mock might be needed if DocumentAIService
// directly calls other methods of aiAnalyticsService.
const mockEnsureHfClientAnalytics = jest.fn().mockResolvedValue(undefined);
const mockHfClientFromAnalytics = new HfInference('mock-key-from-analytics-service');
jest.mock('./ai-analytics-service', () => ({
  aiAnalyticsService: {
    ensureHfClient: mockEnsureHfClientAnalytics, // Mock if DocumentAIService uses this
    hf: mockHfClientFromAnalytics, // Provide a mock client if DocumentAIService tries to access it
    // Mock any other properties/methods DocumentAIService might try to access
  },
}));


// Mock HfInference methods that DocumentAIService might use
const mockHfSummarization = jest.fn();
const mockHfTextClassification = jest.fn();
(HfInference as jest.Mock).mockImplementation(() => {
  return {
    summarization: mockHfSummarization,
    textClassification: mockHfTextClassification,
    // Add other methods if used by DocumentAIService
  };
});
// Also mock the client potentially accessed via aiAnalyticsService.hf
(mockHfClientFromAnalytics.summarization as jest.Mock) = mockHfSummarization;
(mockHfClientFromAnalytics.textClassification as jest.Mock) = mockHfTextClassification;


// Mock pdf-parse
const mockPdfParse = pdf as jest.MockedFunction<typeof pdf>;

// Mock mammoth
const mockMammothExtract = mammoth.extractRawText as jest.MockedFunction<typeof mammoth.extractRawText>;


describe('DocumentAIService', () => {
  let serviceInstance: DocumentAIService;

  beforeEach(() => {
    serviceInstance = new DocumentAIService();
    // Reset Hugging Face client mocks for each test
    mockHfSummarization.mockReset();
    mockHfTextClassification.mockReset();
    // Reset text extraction mocks
    mockPdfParse.mockReset();
    mockMammothExtract.mockReset();

    // Ensure HF client is "initialized" for DocumentAIService if it has its own init logic or relies on ensure
    // This simulates that the ensureHfClient in DocumentAIService (or the one it calls) works.
    // For this test setup, we're essentially saying the HfInference mock above is what it gets.
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Text Extraction', () => {
    it('should extract text from TXT file', async () => {
      const buffer = Buffer.from('Hello TXT world!');
      const result = await serviceInstance.processDocument(buffer, 'text/plain', 'test.txt', { extractText: true });
      expect(result.extractedText).toBe('Hello TXT world!');
      expect(result.error).toBeUndefined();
    });

    it('should extract text from CSV file (as plain text)', async () => {
      const buffer = Buffer.from('col1,col2\nval1,val2');
      const result = await serviceInstance.processDocument(buffer, 'text/csv', 'test.csv', { extractText: true });
      expect(result.extractedText).toBe('col1,col2\nval1,val2');
      expect(result.error).toBeUndefined();
    });

    it('should extract text from PDF file', async () => {
      const buffer = Buffer.from('PDF content');
      mockPdfParse.mockResolvedValue({ text: 'Parsed PDF text' } as any);
      const result = await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { extractText: true });
      expect(result.extractedText).toBe('Parsed PDF text');
      expect(mockPdfParse).toHaveBeenCalledWith(buffer);
      expect(result.error).toBeUndefined();
    });

    it('should handle PDF parsing error', async () => {
      const buffer = Buffer.from('Invalid PDF content');
      mockPdfParse.mockRejectedValue(new Error('PDF parsing failed'));
      const result = await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { extractText: true });
      expect(result.extractedText).toContain("PDF text extraction failed");
      expect(result.error).toBeUndefined(); // Error is within extractedText for this case in service
    });

    it('should extract text from DOCX file', async () => {
      const buffer = Buffer.from('DOCX content');
      mockMammothExtract.mockResolvedValue({ value: 'Parsed DOCX text', messages: [] });
      const result = await serviceInstance.processDocument(buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'test.docx', { extractText: true });
      expect(result.extractedText).toBe('Parsed DOCX text');
      expect(mockMammothExtract).toHaveBeenCalledWith({ buffer });
      expect(result.error).toBeUndefined();
    });

    it('should return error for unsupported file type', async () => {
      const buffer = Buffer.from('Some content');
      const result = await serviceInstance.processDocument(buffer, 'application/zip', 'test.zip', {});
      expect(result.error).toContain('Unsupported file type for AI processing: application/zip');
      expect(result.extractedText).toBeUndefined();
    });
  });

  describe('AI Processing Features', () => {
    const textContent = 'This is a long document about elections and voting procedures. It details many important aspects.';
    const buffer = Buffer.from(textContent);

    beforeEach(() => {
      // Ensure text extraction part works for these tests
      mockPdfParse.mockResolvedValue({ text: textContent } as any); // Default for PDF
    });

    it('should summarize document if options.summarize is true', async () => {
      mockHfSummarization.mockResolvedValue({ summary_text: 'Elections and voting procedures details.' });
      const result = await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { summarize: true });
      expect(result.summary).toBe('Elections and voting procedures details.');
      expect(mockHfSummarization).toHaveBeenCalledTimes(1);
      expect(mockHfSummarization).toHaveBeenCalledWith(expect.objectContaining({ inputs: textContent }));
      expect(result.error).toBeUndefined();
    });

    it('should NOT summarize document if options.summarize is false or undefined', async () => {
      await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { summarize: false });
      expect(mockHfSummarization).not.toHaveBeenCalled();
      await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', {});
      expect(mockHfSummarization).not.toHaveBeenCalled();
    });

    it('should analyze sentiment if options.sentiment is true', async () => {
      mockHfTextClassification.mockResolvedValue([{ label: 'NEUTRAL', score: 0.9 }]);
      const result = await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { sentiment: true });
      expect(result.sentiment).toEqual([{ label: 'NEUTRAL', score: 0.9 }]);
      expect(mockHfTextClassification).toHaveBeenCalledTimes(1);
      expect(mockHfTextClassification).toHaveBeenCalledWith(expect.objectContaining({ inputs: textContent.substring(0, 512) }));
      expect(result.error).toBeUndefined();
    });

    it('should NOT analyze sentiment if options.sentiment is false or undefined', async () => {
      await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { sentiment: false });
      expect(mockHfTextClassification).not.toHaveBeenCalled();
      await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', {});
      expect(mockHfTextClassification).not.toHaveBeenCalled();
    });

    it('should return extracted text if extractText is true, even if other options are false', async () => {
      const result = await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { extractText: true, summarize: false, sentiment: false });
      expect(result.extractedText).toBe(textContent);
      expect(mockHfSummarization).not.toHaveBeenCalled();
      expect(mockHfTextClassification).not.toHaveBeenCalled();
      expect(result.error).toBeUndefined();
    });

    it('should return extracted text if other AI options are true (implicitly extractText=true)', async () => {
      mockHfSummarization.mockResolvedValue({ summary_text: 'Summary.' });
      const result = await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { summarize: true });
      expect(result.extractedText).toBe(textContent);
    });

    it('should handle errors during summarization gracefully', async () => {
      mockHfSummarization.mockRejectedValue(new Error('Summarization API error'));
      const result = await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { summarize: true });
      expect(result.summary).toBe('AI summarization failed.');
      // Optionally check if other parts like extractedText are still present
      expect(result.extractedText).toBe(textContent);
    });

    it('should handle errors during sentiment analysis gracefully', async () => {
      mockHfTextClassification.mockRejectedValue(new Error('Sentiment API error'));
      const result = await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { sentiment: true });
      expect(result.sentiment).toEqual({ error: "AI sentiment analysis failed." });
      expect(result.extractedText).toBe(textContent);
    });

     it('should not proceed with AI if text extraction yields no content', async () => {
      mockPdfParse.mockResolvedValue({ text: '' } as any); // Empty text
      const result = await serviceInstance.processDocument(buffer, 'application/pdf', 'test.pdf', { summarize: true, sentiment: true });
      expect(result.error).toBe("Text extraction yielded no content, cannot perform further AI analysis.");
      expect(mockHfSummarization).not.toHaveBeenCalled();
      expect(mockHfTextClassification).not.toHaveBeenCalled();
    });
  });
});
