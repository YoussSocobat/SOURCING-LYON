import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("La clé API Gemini est manquante. Veuillez la configurer dans les variables d'environnement.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function callGemini(prompt: string, useSearch = false, retryCount = 0) {
  try {
    const ai = getAi();
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
    
    // Handle 429 with exponential backoff
    const isRateLimit = error.message?.includes("429") || error.status === 429;
    if (isRateLimit && retryCount < 5) {
      const delay = Math.pow(2, retryCount) * 3000 + Math.random() * 1000;
      console.log(`Rate limit hit (429), retrying in ${Math.round(delay/1000)}s... (Attempt ${retryCount + 1}/5)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGemini(prompt, useSearch, retryCount + 1);
    }
    
    if (isRateLimit) {
      throw new Error("⚠️ Limite de requêtes atteinte (429). Veuillez patienter une minute avant de réessayer.");
    }
    throw error;
  }
}

export async function generateApplicationEmail(jobTitle: string, company: string, description: string, recruiterName?: string) {
  const ai = getAi();
  const prompt = `Tu es Charid Youssef, étudiant en Master à l'INSEEC Lyon, spécialisé en Digital Marketing, E-commerce et Growth.
Écris un email de candidature court, direct et professionnel pour le poste de "${jobTitle}" chez "${company}".

${recruiterName ? `Le destinataire est : ${recruiterName}.` : "Le destinataire est le Responsable du Recrutement."}

CONTEXTE DE L'OFFRE :
${description}

CONTRAT : Alternance (Octobre 2026).

TES POINTS FORTS :
- Étudiant en Master (INSEEC Lyon) spécialisé en Digital Marketing & Growth.
- Passionné par l'IA appliquée au marketing (automatisation n8n, agents IA).
- Profil hybride entre Business Development et Stratégie Growth.
- Très motivé pour apprendre et monter en compétences sur les outils Ads (Meta/Google) et SEO.

DIRECTIVES :
1. RESTE SIMPLE ET SOBRE. Pas de mention de "levée de fonds", "licorne" ou de flatterie excessive.
2. NE METS AUCUN ESPACE VIDE À COMPLÉTER (pas de [Nom], pas de [Date], pas de [Entreprise]).
3. L'email doit être prêt à l'envoi tel quel.
4. Utilise une formule de politesse adaptée au nom du recruteur (${recruiterName || "non connu"}).
5. Le ton doit être professionnel et déterminé.
6. Termine par "Cordialement, Charid Youssef".
7. Ne mets pas d'objet.

Retourne UNIQUEMENT le corps de l'email.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });
  return response.text;
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
