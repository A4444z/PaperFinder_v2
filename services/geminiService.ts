import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { SearchResult, Reference } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const parseAndValidateJsonResponse = (jsonString: string): { summary: string; references: Reference[] } => {
    // Sanitize the string: remove ```json ... ``` markers and trim whitespace
    const sanitizedString = jsonString.replace(/^```json\s*|```\s*$/g, '').trim();
    if (!sanitizedString) {
        throw new Error("Received an empty JSON string from the model.");
    }

    const data = JSON.parse(sanitizedString);
    if (!data.summary || !Array.isArray(data.references)) {
        throw new Error("JSON response is missing 'summary' or 'references' fields.");
    }
    return data;
};

const buildPrompt = (query: string, selectedSources: string[], withAbstract: boolean, dateRange?: { startYear: number; endYear?: number }): string => {
    const sourceInstruction = selectedSources.length > 0
      ? `Focus your search on these sources: ${selectedSources.join(', ')}.`
      : 'Search across a broad range of academic sources.';
      
    const dateInstruction = dateRange
      ? `Focus on literature published from ${dateRange.startYear}${dateRange.endYear ? ` to ${dateRange.endYear}` : ' onwards'}.`
      : 'Focus on recent literature.';

    const abstractInstruction = withAbstract
      ? '"abstract": "A concise, one-paragraph summary of the paper\'s key findings.",'
      : '';

    return `
      You are an expert research assistant. Your task is to find academic literature on "${query}".
      ${sourceInstruction}
      ${dateInstruction}
      Your goal is to find around 15-20 relevant sources, prioritizing a mix of foundational and recent papers within the specified date range.
      
      Your response must be structured as a single JSON object with the following schema:
      {
        "summary": "A comprehensive summary that integrates insights from the found literature.",
        "references": [
          {
            "title": "The full title of the paper.",
            "authors": ["Author One", "Author Two"],
            "publicationDate": "YYYY-MM-DD",
            ${abstractInstruction}
            "uri": "The direct URL to the paper."
          }
        ]
      }
      Do not include any text outside of this JSON object.
    `;
};


export const searchLiterature = async (query: string, selectedSources: string[], dateRange?: { startYear: number; endYear?: number }): Promise<SearchResult> => {
  const model = "gemini-2.5-flash";
  // This config is corrected by removing `responseMimeType`.
  const config = {
      tools: [{ googleSearch: {} }],
  };

  try {
      // First attempt: Ambitious search with abstracts
      const ambitiousPrompt = buildPrompt(query, selectedSources, true, dateRange);
      const response = await ai.models.generateContent({
          model,
          contents: ambitiousPrompt,
          config
      });
      return parseAndValidateJsonResponse(response.text);
  } catch (error) {
      console.warn("Ambitious search failed, trying simplified search. Error:", error);
      try {
          // Fallback: Simplified search without abstracts
          const simplifiedPrompt = buildPrompt(query, selectedSources, false, dateRange);
          const response = await ai.models.generateContent({
              model,
              contents: simplifiedPrompt,
              config,
          });
          const result = parseAndValidateJsonResponse(response.text);
          result.summary = `(Simplified search succeeded after an initial error) ${result.summary}`;
          return result;
      } catch (finalError) {
          console.error("Simplified search also failed:", finalError);
          if (finalError instanceof Error && finalError.message.includes("xhr error")) {
              throw new Error("A network communication error occurred with the AI service. This might be a temporary issue. Please try your search again shortly.");
          }
          throw new Error(`An error occurred during the literature search: ${finalError instanceof Error ? finalError.message : 'Unknown error'}`);
      }
  }
};

export const answerFromLiterature = async (
  originalQuery: string,
  selectedReferences: Reference[],
  question: string
): Promise<string> => {
  try {
    const context = selectedReferences.map(ref => 
      `Title: ${ref.title}\nAuthors: ${ref.authors.join(', ') || 'Not available'}\nAbstract: ${ref.abstract || 'Not available'}`
    ).join('\n---\n');

    const prompt = `
      You are an expert academic assistant.
      The user is researching "${originalQuery}".
      They have selected the following papers to focus on. Here are their details including titles and abstracts:

      <CONTEXT>
      ${context}
      </CONTEXT>

      Based ONLY on the information provided in the context above, please answer the user's specific question: "${question}"

      If the provided context does not contain enough information to answer, state that and explain what is missing. Do not use external knowledge.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    const answer = response.text;
    if (!answer) {
        throw new Error("The model could not generate an answer. Please try a different question.");
    }

    return answer;
  } catch (error) {
    console.error("Error answering question:", error);
    throw new Error("An error occurred while communicating with the AI service. Please check your network connection.");
  }
};