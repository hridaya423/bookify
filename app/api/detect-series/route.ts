import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

interface BookInfo {
  title: string;
  author: string;
  description?: string;
  publishedDate?: string;
}

interface SeriesInfo {
  isPartOfSeries: boolean;
  seriesName?: string;
  seriesOrder?: number;
  totalBooks?: number;
  confidence: number;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});


function fallbackPatternDetection(title: string): SeriesInfo {
  const basicPatterns = [
    /book\s+(\d+)/i,
    /#(\d+)/,
    /\((\d+)\)/,
    /volume\s+(\d+)/i
  ];

  for (const pattern of basicPatterns) {
    const match = title.match(pattern);
    if (match) {
      const order = parseInt(match[1]);
      if (!isNaN(order)) {
        return {
          isPartOfSeries: true,
          seriesOrder: order,
          confidence: 0.5
        };
      }
    }
  }

  return {
    isPartOfSeries: false,
    confidence: 0.3
  };
}

export async function POST(request: NextRequest) {
  try {
    const bookInfo: BookInfo = await request.json();

    if (!process.env.GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not found, using fallback detection');
      return NextResponse.json(fallbackPatternDetection(bookInfo.title));
    }

    
    const prompt = `Analyze this book and determine if it's part of a series:

Title: "${bookInfo.title}"
Author: ${bookInfo.author}
${bookInfo.description ? `Description: ${bookInfo.description.substring(0, 500)}...` : ''}
${bookInfo.publishedDate ? `Published: ${bookInfo.publishedDate}` : ''}

Please respond with ONLY a valid JSON object containing:
- isPartOfSeries: boolean (true if this book is part of a series)
- seriesName: string (the series name without book numbers, e.g., "Harry Potter" not "Harry Potter Book 1")
- seriesOrder: number (the book's position in the series, can be decimal like 1.5 for novellas)
- totalBooks: number (total books in series if known, otherwise null)
- confidence: number (0-1, how confident you are in this assessment)

Examples:
- "Harry Potter and the Philosopher's Stone" → {"isPartOfSeries": true, "seriesName": "Harry Potter", "seriesOrder": 1, "totalBooks": 7, "confidence": 0.95}
- "Harry Potter and the Order of the Phoenix" → {"isPartOfSeries": true, "seriesName": "Harry Potter", "seriesOrder": 5, "totalBooks": 7, "confidence": 0.95}
- "The Fellowship of the Ring" → {"isPartOfSeries": true, "seriesName": "The Lord of the Rings", "seriesOrder": 1, "totalBooks": 3, "confidence": 0.9}
- "To Kill a Mockingbird" → {"isPartOfSeries": false, "seriesName": null, "seriesOrder": null, "totalBooks": null, "confidence": 0.95}
- "Dune" by Frank Herbert → {"isPartOfSeries": true, "seriesName": "Dune", "seriesOrder": 1, "totalBooks": 6, "confidence": 0.9}

Consider:
- Well-known book series and their order
- Author's other works in the same universe
- Publication patterns and numbering
- Subtitles that indicate series position
- Prequels, sequels, and spin-offs

Respond with ONLY the JSON object, no other text:`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 200,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Groq API');
    }

    
    const parsed = JSON.parse(response.trim());
    
    
    if (typeof parsed.isPartOfSeries !== 'boolean') {
      throw new Error('Invalid response format');
    }

    const result: SeriesInfo = {
      isPartOfSeries: parsed.isPartOfSeries,
      seriesName: parsed.seriesName || undefined,
      seriesOrder: parsed.seriesOrder || undefined,
      totalBooks: parsed.totalBooks || undefined,
      confidence: Math.min(Math.max(parsed.confidence || 0, 0), 1)
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Groq series detection failed:', error);
    
    
    const bookInfo: BookInfo = await request.json();
    return NextResponse.json(fallbackPatternDetection(bookInfo.title));
  }
} 