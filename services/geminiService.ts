import { GoogleGenAI } from "@google/genai";
import { DEFAULT_SIZE } from "../constants";

export const generatePixelArt = async (prompt: string): Promise<string | null> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("No API Key found");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // We use gemini-2.5-flash-image for fast image generation
    const model = 'gemini-2.5-flash-image';
    
    // Enhance the prompt for pixel art
    const enhancedPrompt = `
      Pixel art sprite of ${prompt}. 
      White background. 
      Minimalist style, 8-bit, retro game asset. 
      Clear outlines, vibrant colors.
      Centered.
      No text.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: enhancedPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    // Extract image
    let base64Image: string | null = null;
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
         if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
         }
      }
    }

    if (!base64Image) return null;
    return `data:image/png;base64,${base64Image}`;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
