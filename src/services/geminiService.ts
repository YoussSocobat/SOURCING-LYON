import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function callGemini(prompt: string, useSearch = false) {
  try {
    const config: any = {};

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    } else {
      config.responseMimeType = "application/json";
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
  const cleaned = text.trim();
  try {
    // 0. Try direct parse
    return JSON.parse(cleaned);
  } catch (e) {
    try {
      // 1. markdown code block
      const md = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (md) { return JSON.parse(md[1].trim()); }
      
      // 2. first JSON object (non-greedy to avoid capturing too much if multiple)
      const obj = cleaned.match(/\{[\s\S]*\}/);
      if (obj) { return JSON.parse(obj[0]); }
      
      // 3. first JSON array
      const arr = cleaned.match(/\[[\s\S]*\]/);
      if (arr) { return JSON.parse(arr[0]); }
      
      throw new Error("Impossible d'extraire le JSON de la réponse");
    } catch (e2) {
      console.error("JSON Parse Error:", e2, "Text:", text);
      throw new Error("Erreur lors de l'analyse des données reçues.");
    }
  }
}
