import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function callGemini(prompt: string, useSearch = false) {
  try {
    const config: any = {
      responseMimeType: "application/json",
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config,
    });
    
    if (!response.text) {
      throw new Error("Réponse vide de l'API Gemini");
    }
    
    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("429")) {
      throw new Error("Limite de requêtes atteinte (429). Veuillez patienter une minute.");
    }
    throw error;
  }
}

export function parseJSON(text: string) {
  try {
    // 1. markdown code block
    const md = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (md) { return JSON.parse(md[1].trim()); }
    
    // 2. first JSON object
    const obj = text.match(/\{[\s\S]*\}/);
    if (obj) { return JSON.parse(obj[0]); }
    
    // 3. first JSON array
    const arr = text.match(/\[[\s\S]*\]/);
    if (arr) { return JSON.parse(arr[0]); }
    
    throw new Error("Impossible d'extraire le JSON de la réponse");
  } catch (e) {
    console.error("JSON Parse Error:", e, "Text:", text);
    throw new Error("Erreur lors de l'analyse des données reçues.");
  }
}
