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

export async function callGemini(prompt: string, useSearch = false) {
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
    if (error.message?.includes("429")) {
      throw new Error("Limite de requêtes atteinte (429). Veuillez patienter une minute.");
    }
    throw error;
  }
}

export async function generateApplicationEmail(jobTitle: string, company: string, description: string, recruiterName?: string) {
  const ai = getAi();
  const prompt = `Tu es Charid Youssef, étudiant en Master à l'INSEEC Lyon, spécialisé en Digital Marketing, E-commerce et Growth.
Écris un email de candidature court, percutant et personnalisé pour le poste de "${jobTitle}" chez "${company}".

${recruiterName ? `Le destinataire est : ${recruiterName}.` : "Le destinataire est le Responsable du Recrutement."}

CONTEXTE DE L'OFFRE :
${description}

CONTRAT : Alternance (Octobre 2026).

TES POINTS FORTS & AVANT-GARDE IA (Autodidacte) :
- Débutant motivé en Ads (Meta/Google) et SEO, avec une grande envie d'apprendre et de progresser.
- Maîtrise d'outils IA de pointe (appris en autodidacte) : Vibecoding, Claude Code, Agents IA via OpenClaw.
- Automatisation via n8n.
- Profil hybride Business Dev & Growth Strategy (INSEEC Lyon).

DIRECTIVES CRUCIALES :
1. NE METS AUCUN ESPACE VIDE À COMPLÉTER (pas de [Nom], pas de [Date], pas de [Entreprise]).
2. L'email doit être prêt à l'envoi tel quel.
3. Si le nom du recruteur est connu (${recruiterName || "non connu"}), utilise-le poliment. Sinon, utilise une formule professionnelle comme "Bonjour," ou "Madame, Monsieur,".
4. Le ton doit être professionnel, humble mais déterminé. Souligne que tu es en phase d'apprentissage sur les Ads/SEO mais que tu maîtrises déjà des outils IA très avancés.
5. Évite absolument les familiarités comme "prendre un café". Propose plutôt un "entretien" ou un "échange professionnel".
6. Termine par "Cordialement, Charid Youssef".
6. Ne mets pas d'objet (je le générerai séparément).

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
