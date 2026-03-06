import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface QAResult {
  status: "approved" | "needs_revision";
  feedback: string;
  wordCount: number;
  toneScore: number; // 0-100
}

export async function auditSectionContent(
  sectionType: string,
  content: string,
  wordLimit: number
): Promise<QAResult> {
  const prompt = `
    You are the AI Managing Editor for the Wake Forest University "Moral Imagination" newsletter.
    Your task is to audit a submission for the section: "${sectionType}".
    
    Guidelines:
    1. Word Limit: ${wordLimit} words.
    2. Tone: Academic yet accessible, compassionate, intellectually rigorous, and aligned with the "Moral Imagination" theme (ethics, community, spirituality, and social impact).
    3. Check for clarity, grammar, and alignment with Wake Forest values.

    Content to audit:
    """
    ${content}
    """

    Provide a structured feedback report.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ["approved", "needs_revision"] },
            feedback: { type: Type.STRING },
            wordCount: { type: Type.INTEGER },
            toneScore: { type: Type.INTEGER }
          },
          required: ["status", "feedback", "wordCount", "toneScore"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Audit failed:", error);
    return {
      status: "needs_revision",
      feedback: "AI Editor was unable to process this request. Please try again.",
      wordCount: content.split(/\s+/).length,
      toneScore: 0
    };
  }
}

export async function compileNewsletter(sections: any[]): Promise<string> {
  const prompt = `
    You are a professional layout designer. Given the following approved sections for the "Moral Imagination" newsletter, 
    create a cohesive, beautiful narrative flow or summary for the editorial team.
    
    Sections:
    ${sections.map(s => `[${s.type}]: ${s.content}`).join("\n\n")}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text || "Failed to compile.";
}
