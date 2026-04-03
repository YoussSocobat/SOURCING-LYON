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

export async function callGemini(prompt: string, useSearch = false, retryCount = 0, model = "gemini-3-flash-preview") {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Timeout: L'API Gemini a mis trop de temps à répondre.")), 90000)
  );

  try {
    const ai = getAi();
    const config: any = {};

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    } else {
      config.responseMimeType = "application/json";
    }

    const generatePromise = ai.models.generateContent({
      model: model,
      contents: prompt,
      config,
    });

    const response: any = await Promise.race([generatePromise, timeoutPromise]);
    
    if (!response.text) {
      throw new Error("Réponse vide de l'API Gemini");
    }
    
    return response.text;
  } catch (error: any) {
    console.error(`Gemini API Error (${model}):`, error);
    
    const errStr = String(error).toLowerCase();
    const isRateLimit = errStr.includes("429") || errStr.includes("quota") || errStr.includes("rate limit") || error.status === 429;
    const isTimeout = errStr.includes("timeout");

    if (isTimeout) {
      throw error;
    }
    
    if (isRateLimit && model === "gemini-3-flash-preview") {
      console.log("Switching to fallback model gemini-flash-latest due to rate limit...");
      return callGemini(prompt, useSearch, retryCount, "gemini-flash-latest");
    }

    // More aggressive retries for Render
    if (isRateLimit && retryCount < 5) {
      const delay = Math.pow(2, retryCount) * 5000 + Math.random() * 2000;
      console.log(`Rate limit hit (429), retrying in ${Math.round(delay/1000)}s... (Attempt ${retryCount + 1}/5)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGemini(prompt, useSearch, retryCount + 1, model);
    }
    
    if (isRateLimit) {
      const isRender = typeof window !== 'undefined' && window.location.hostname.includes('render');
      let extraMsg = "";
      if (useSearch) extraMsg += "\n\n💡 L'outil de recherche Google (Search Tool) est très limité sur les comptes gratuits. Attendez 1 minute.";
      if (isRender) extraMsg += "\n\n⚠️ Note Render : Vérifiez que GEMINI_API_KEY est bien dans vos 'Environment Variables' sur Render.";
      
      throw new Error("⚠️ Limite de requêtes atteinte (429). " + extraMsg);
    }
    throw error;
  }
}

export async function generateApplicationEmail(jobTitle: string, company: string, description: string, recruiterName?: string) {
  const prompt = `Tu es Charid Youssef, étudiant en Master à l'INSEEC Lyon, spécialisé en Digital Marketing, E-commerce et Growth.
Écris un email de candidature court, direct et professionnel pour une alternance chez "${company}".

${recruiterName ? `Le destinataire est : ${recruiterName}.` : "Le destinataire est le Responsable du Recrutement."}

IMPORTANT : 
- Tu postules pour une ALTERNANCE (Octobre 2026) en Marketing Digital, Growth ou Business Development.
- NE POSTULE PAS pour le poste de "${jobTitle}" si c'est un poste de direction (ex: CEO, Fondateur, Head of...). Dans ce cas, dis simplement que tu postules pour rejoindre l'équipe en alternance.
- Si "${jobTitle}" semble être une offre d'alternance précise, mentionne-la.

CONTEXTE DE L'OFFRE / ENTREPRISE :
${description}

TES POINTS FORTS :
- Étudiant en Master (INSEEC Lyon) spécialisé en Digital Marketing & Growth.
- Passionné par l'IA appliquée au marketing (automatisation n8n, agents IA).
- Profil hybride entre Business Development et Stratégie Growth.
- Très motivé pour apprendre et monter en compétences sur les outils Ads (Meta/Google) et SEO.

DIRECTIVES :
1. RESTE SIMPLE ET SOBRE. Pas de mention de "levée de fonds", "licorne" ou de flatterie excessive.
2. NE METS AUCUN ESPACE VIDE À COMPLÉTER.
3. L'email doit être prêt à l'envoi tel quel.
4. Utilise une formule de politesse adaptée au nom du recruteur (${recruiterName || "non connu"}).
5. Le ton doit être professionnel et déterminé.
6. Termine par "Cordialement, Charid Youssef".
7. Ne mets pas d'objet.

Retourne UNIQUEMENT le corps de l'email.`;

  // Use callGemini to benefit from retry logic (without search tool)
  return callGemini(prompt, false);
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
