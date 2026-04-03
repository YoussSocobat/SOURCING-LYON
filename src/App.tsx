import { useState, useCallback, useEffect, ChangeEvent } from "react";
import { Mail, FileText, Info, ExternalLink, CheckCircle, Send, Loader2 } from "lucide-react";
import { callGemini, parseJSON, generateApplicationEmail } from "./services/geminiService";

// ─── SOURCING DATA ─────────────────────────────────────────────────────────────
const TARGETS = [
  { id:1, name:"Tenacy", secteur:"Cybersécurité SaaS", site:"tenacy.io", ville:"Lyon", taille:"50–70 sal.", tag:"🏆 Priorité 1", pertinence:"Série A 6M€ déc. 2023 → hypercroissance. Head of Marketing identifiée. Offre SDR active.", contacts:[{nom:"Aurélie Demeusy",poste:"Head of Marketing",linkedin:"https://www.linkedin.com/in/aureliedemeusytisserand",emails:[{addr:"aurelie.demeusy@tenacy.io",score:"🟢",note:"Confirmé RocketReach"},{addr:"aurelie@tenacy.io",score:"🟡",note:"Variante prenom@"}]},{nom:"Cyril Guillet",poste:"CEO & Co-Fondateur",linkedin:"https://www.linkedin.com/in/cyril-guillet-tenacy",emails:[{addr:"cyril.guillet@tenacy.io",score:"🟢",note:"Confirmé"},{addr:"cyril@tenacy.io",score:"🟡",note:"Variante"}]}], emailsEntreprise:[{addr:"contact@tenacy.io",score:"🟡",note:"Email générique"},{addr:"hello@tenacy.io",score:"🔴",note:"Hypothèse"}], canal:"LinkedIn → Email", moment:"Lun–Mar, 8h30–10h30", offreActive:true },
  { id:2, name:"Wikit", secteur:"IA conversationnelle SaaS", site:"wikit.ai", ville:"Lyon 5e", taille:"20–50 sal.", tag:"🏆 Priorité 1", pertinence:"Chatbot IA no-code. Incubé EM Lyon. Format prenom@ confirmé Hunter 55%.", contacts:[{nom:"Alban Costa",poste:"CEO & Co-Fondateur",linkedin:"https://www.linkedin.com/in/alban-costa",emails:[{addr:"alban@wikit.ai",score:"🟢",note:"Format prenom@ confirmé Hunter (55%)"},{addr:"alban.costa@wikit.ai",score:"🟡",note:"Format prenom.nom"}]},{nom:"Nassim Nouna",poste:"Co-Fondateur",linkedin:"https://www.linkedin.com/company/wikit-ai",emails:[{addr:"nassim@wikit.ai",score:"🟡",note:"Format prenom@ probable"}]}], emailsEntreprise:[{addr:"contact@wikit.ai",score:"🟡",note:"Email générique"},{addr:"hello@wikit.ai",score:"🔴",note:"Hypothèse"}], canal:"LinkedIn", moment:"Mar–Jeu, 9h–11h" },
  { id:3, name:"Clim8", secteur:"DeepTech / IoT textile", site:"myclim8.com", ville:"Limonest", taille:"15–25 sal.", tag:"🔥 Forte pertinence", pertinence:"16M$ levés. Gordini & Mechanix partenaires. Format prenom@ confirmé Hunter.", contacts:[{nom:"Florian Miguet",poste:"CEO & Co-Fondateur",linkedin:"https://www.linkedin.com/in/florian-miguet-clim8",emails:[{addr:"florian@myclim8.com",score:"🟢",note:"Format prenom@ confirmé (55.6%)"},{addr:"florian.miguet@myclim8.com",score:"🟡",note:"Format prenom.nom (30%)"}]}], emailsEntreprise:[{addr:"contact@myclim8.com",score:"🟡",note:"Présent sur site"},{addr:"info@myclim8.com",score:"🔴",note:"Hypothèse"}], canal:"LinkedIn", moment:"Mar–Jeu, 9h–11h" },
  { id:4, name:"2Emotion", secteur:"SaaS vidéo B2B", site:"2emotion.com", ville:"Lyon", taille:"10–30 sal.", tag:"🔥 Forte pertinence", pertinence:"Offre BizDev alternance active (site + Indeed). Clients SNCF, ENGIE, BNP, Croix-Rouge.", contacts:[{nom:"Direction",poste:"CEO / Directeur",linkedin:"https://www.linkedin.com/company/2emotion",emails:[{addr:"contact@2emotion.com",score:"🟡",note:"Email principal site officiel"}]}], emailsEntreprise:[{addr:"contact@2emotion.com",score:"🟢",note:"Visible site officiel"},{addr:"jobs@2emotion.com",score:"🔴",note:"Hypothèse recrutement"}], canal:"Email → LinkedIn", moment:"Mar, 9h–11h", offreActive:true },
  { id:5, name:"Rerow", secteur:"Growth Outbound B2B", site:"rerow.io", ville:"Lyon", taille:"5–15 sal.", tag:"🔥 Forte pertinence", pertinence:"Agence growth ex-Payfit/Airbnb/Doctrine. Clients Eskimoz, Obypay. Profil 100% aligné.", contacts:[{nom:"CEO / Fondateur",poste:"CEO (ex-Payfit)",linkedin:"https://www.linkedin.com/company/rerow",emails:[{addr:"contact@rerow.io",score:"🟡",note:"À confirmer LinkedIn"}]}], emailsEntreprise:[{addr:"contact@rerow.io",score:"🟡",note:"À confirmer"},{addr:"hello@rerow.io",score:"🔴",note:"Hypothèse"}], canal:"LinkedIn prioritaire", moment:"Mar, 9h–11h" },
  { id:6, name:"Prismea", secteur:"Fintech / Néobanque B2B", site:"prismea.fr", ville:"Lyon", taille:"15–30 sal.", tag:"🔥 Forte pertinence", pertinence:"Recrute SDR/Sales Indeed Mars 2026. Double canal : offre active + cold outreach.", contacts:[{nom:"Head of Sales",poste:"Directeur Commercial",linkedin:"https://www.linkedin.com/company/prismea",emails:[{addr:"contact@prismea.fr",score:"🟡",note:"Décideur à identifier LinkedIn"}]}], emailsEntreprise:[{addr:"contact@prismea.fr",score:"🟡",note:"Visible site"},{addr:"bonjour@prismea.fr",score:"🔴",note:"Style fintech"}], canal:"LinkedIn + Email", moment:"Lun–Mar, 9h–11h", offreActive:true },
  { id:7, name:"410 Gone", secteur:"Agence SEO / E-commerce", site:"410gone.fr", ville:"Lyon", taille:"5–15 sal.", tag:"✅ Bonne cible", pertinence:"PME lyonnaise SEO + e-com. Fondateur identifié. Accès direct décideur.", contacts:[{nom:"Patrick Valibus",poste:"Fondateur",linkedin:"https://www.linkedin.com/in/patrick-valibus",emails:[{addr:"patrick@410gone.fr",score:"🟡",note:"Format prenom@ PME"},{addr:"patrick.valibus@410gone.fr",score:"🟡",note:"Format prenom.nom"}]}], emailsEntreprise:[{addr:"contact@410gone.fr",score:"🟡",note:"Standard agence"},{addr:"hello@410gone.fr",score:"🔴",note:"Hypothèse"}], canal:"Email directe", moment:"Lun–Mar, 9h–11h" },
  { id:8, name:"Growth Room", secteur:"Agence Growth Marketing", site:"growth-room.co", ville:"Lyon/Remote", taille:"30–40 sal.", tag:"✅ Bonne cible", pertinence:"35 pers. Clients ManoMano, Talent.io, Veolia. Missions exactes ton profil.", contacts:[{nom:"CEO / Associé",poste:"CEO",linkedin:"https://www.linkedin.com/company/growth-room",emails:[{addr:"contact@growth-room.co",score:"🟡",note:"CEO à identifier LinkedIn"}]}], emailsEntreprise:[{addr:"contact@growth-room.co",score:"🟡",note:"Site officiel"},{addr:"hello@growth-room.co",score:"🔴",note:"Hypothèse agence"}], canal:"LinkedIn prioritaire", moment:"Mar–Mer, 10h–12h" },
  { id:9, name:"Cynapps", secteur:"IA industrielle", site:"cynapps.ai", ville:"Lyon", taille:"10–20 sal.", tag:"✅ Bonne cible", pertinence:"Scale Up Excellence 2024. CEO très visible (conférences, presse). IA agriculture/industrie.", contacts:[{nom:"Fayçal Rezgui",poste:"CEO & Président",linkedin:"https://www.linkedin.com/in/faycal-rezgui",emails:[{addr:"faycal.rezgui@cynapps.ai",score:"🟡",note:"Format prenom.nom B2B"},{addr:"faycal@cynapps.ai",score:"🟡",note:"Format prenom@"}]}], emailsEntreprise:[{addr:"contact@cynapps.ai",score:"🟡",note:"Standard B2B"},{addr:"info@cynapps.ai",score:"🔴",note:"Hypothèse"}], canal:"LinkedIn", moment:"Mar–Jeu, 10h–12h" },
  { id:10, name:"Obypay", secteur:"SaaS F&B", site:"obypay.fr", ville:"Lyon", taille:"15–30 sal.", tag:"✅ Bonne cible", pertinence:"SaaS restauration scale-up. Client Rerow. CEO identifiable LinkedIn.", contacts:[{nom:"Matthieu Lassagne",poste:"CEO & Co-Fondateur",linkedin:"https://www.linkedin.com/in/matthieu-lassagne",emails:[{addr:"matthieu.lassagne@obypay.fr",score:"🟡",note:"Format prenom.nom"},{addr:"matthieu@obypay.fr",score:"🟡",note:"Format prenom@"}]}], emailsEntreprise:[{addr:"contact@obypay.fr",score:"🟡",note:"Standard SaaS"},{addr:"hello@obypay.fr",score:"🔴",note:"Hypothèse"}], canal:"LinkedIn + Email", moment:"Mar–Jeu, 10h–12h" },
  { id:11, name:"Audiowizard", secteur:"HealthTech / Audio", site:"audiowizard.io", ville:"Lyon", taille:"15–30 sal.", tag:"✅ Bonne cible", pertinence:"Scale Up Excellence 2024 French Tech STL. Acquisition B2B audioprothésistes.", contacts:[{nom:"CEO & Co-Fondateur",poste:"CEO",linkedin:"https://www.linkedin.com/company/audiowizard",emails:[{addr:"contact@audiowizard.io",score:"🟡",note:"CEO à identifier LinkedIn"}]}], emailsEntreprise:[{addr:"contact@audiowizard.io",score:"🟡",note:"Site officiel"},{addr:"hello@audiowizard.io",score:"🔴",note:"Hypothèse"}], canal:"LinkedIn", moment:"Mar–Jeu, 9h–11h" },
  { id:12, name:"Digital BTP", secteur:"Proptech / BTP", site:"digitalbtp.fr", ville:"Lyon", taille:"5–15 sal.", tag:"✅ Bonne cible", pertinence:"Early stage BTP digital. Fondateur confirmé RocketReach. Accès direct décideur.", contacts:[{nom:"Victor Revel",poste:"Fondateur",linkedin:"https://www.linkedin.com/in/victor-revel",emails:[{addr:"victor@digitalbtp.fr",score:"🟡",note:"Format prenom@ early stage"},{addr:"victor.revel@digitalbtp.fr",score:"🟡",note:"Format prenom.nom"}]}], emailsEntreprise:[{addr:"contact@digitalbtp.fr",score:"🟡",note:"Standard PME"}], canal:"Email directe", moment:"Mar–Mer, 9h–11h" },
  { id:13, name:"Leyton Lyon", secteur:"Conseil R&D", site:"leyton.com", ville:"Lyon", taille:"50–200 sal.", tag:"✅ Bonne cible", pertinence:"Cabinet financement R&D. Recrute commercial B2B Indeed 2026. Cycle vente DG/DAF.", contacts:[{nom:"Directeur Régional",poste:"Head of Sales",linkedin:"https://www.linkedin.com/company/leyton",emails:[{addr:"contact.lyon@leyton.com",score:"🟡",note:"Format bureau régional"}]}], emailsEntreprise:[{addr:"lyon@leyton.com",score:"🟡",note:"Bureau régional"},{addr:"contact@leyton.com",score:"🟡",note:"Générique groupe"}], canal:"Email + LinkedIn", moment:"Lun–Mar, 9h–11h" },
  { id:14, name:"Toporder", secteur:"SaaS / Restauration", site:"toporder.fr", ville:"Écully", taille:"15–30 sal.", tag:"✅ Bonne cible", pertinence:"Caisse SaaS restaurants. Recrute BizDev Indeed actif. Fondateur à identifier LinkedIn.", contacts:[{nom:"CEO / Fondateur",poste:"CEO",linkedin:"https://www.linkedin.com/company/toporder",emails:[{addr:"contact@toporder.fr",score:"🟡",note:"CEO à identifier LinkedIn"}]}], emailsEntreprise:[{addr:"contact@toporder.fr",score:"🟡",note:"Site officiel"},{addr:"hello@toporder.fr",score:"🔴",note:"Hypothèse SaaS"}], canal:"LinkedIn + Email", moment:"Mar, 9h–11h", offreActive:true },
  { id:15, name:"Volago", secteur:"Mode éco-responsable", site:"volago.fr", ville:"Lyon", taille:"2–10 sal.", tag:"⚡ À explorer", pertinence:"Early stage mode durable. Offre BizDev publiée. Accès direct co-fondateurs.", contacts:[{nom:"Co-fondateurs",poste:"CEO",linkedin:"https://www.linkedin.com/company/volago",emails:[{addr:"contact@volago.fr",score:"🔴",note:"Décideur à confirmer"}]}], emailsEntreprise:[{addr:"contact@volago.fr",score:"🟡",note:"Email principal probable"}], canal:"LinkedIn", moment:"Lun–Mar, 10h–12h", offreActive:true },
];

const SCRAPE_QUERIES = [
  "alternance marketing digital Lyon",
  "alternance growth marketing Lyon",
  "alternance e-commerce Lyon",
  "alternance business developer Lyon startup",
  "alternance assistant marketing Lyon",
  "alternance communication digitale Lyon",
  "alternance webmarketing Lyon",
  "alternance marketing automation Lyon",
  "alternance acquisition marketing Lyon",
  "alternance marketing stratégique Lyon",
  "alternance chef de projet digital Lyon",
  "alternance marketing opérationnel Lyon",
  "alternance marketing b2b Lyon",
  "alternance marketing b2c Lyon",
  "alternance marketing luxe Lyon",
];

const SC: Record<string, string> = { "🟢":"#22c55e", "🟡":"#eab308", "🔴":"#ef4444" };
const TAG_BG: Record<string, string> = { "🏆 Priorité 1":"#1e3a5f","🔥 Forte pertinence":"#3b1f00","✅ Bonne cible":"#0d2d1a","⚡ À explorer":"#2a1a3e" };
const TAG_FX: Record<string, string> = { "🏆 Priorité 1":"#60a5fa","🔥 Forte pertinence":"#fb923c","✅ Bonne cible":"#4ade80","⚡ À explorer":"#c084fc" };

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("offres");
  const [selected, setSelected] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [applied, setApplied] = useState<Record<string | number, boolean>>(() => {
    const s = localStorage.getItem("applied_v2");
    return s ? JSON.parse(s) : {};
  });
  const [saved, setSaved] = useState<Record<string | number, boolean>>(() => {
    const s = localStorage.getItem("saved_v2");
    return s ? JSON.parse(s) : {};
  });

  // Persist states
  useEffect(() => {
    localStorage.setItem("applied_v2", JSON.stringify(applied));
  }, [applied]);
  useEffect(() => {
    localStorage.setItem("saved_v2", JSON.stringify(saved));
  }, [saved]);

  // Live offers
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [radius, setRadius] = useState(30);
  const [offerFilter, setOfferFilter] = useState("Toutes");
  const [expandedOffer, setExpandedOffer] = useState<number | null>(null);

  // Maps scraper & Dynamic Targets
  const [dynamicTargets, setDynamicTargets] = useState<any[]>([]);
  const [loadingScrape, setLoadingScrape] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeCount, setScrapeCount] = useState(0);

  // Email Draft Generation
  const [emailDraft, setEmailDraft] = useState<any>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Gmail & CV Management
  const [gmailConnected, setGmailConnected] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [cvFile, setCvFile] = useState<string | null>("CV_Charid_Youssef.pdf");
  const [sendingAppId, setSendingAppId] = useState<string | number | null>(null);
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Preview Modal
  const [previewEmail, setPreviewEmail] = useState<{ target: any, emailAddr: string, subject: string, body: string } | null>(null);
  
  const checkAuthStatus = async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' });
      const data = await res.json();
      setGmailConnected(data.connected);
    } catch (e) {
      console.error("Error checking auth:", e);
      setGmailConnected(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Check Gmail & CV status on load
  useEffect(() => {
    checkAuthStatus();
      
    fetch('/api/cv-status', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCvFile(data.filename || "CV_Charid_Youssef.pdf"))
      .catch(() => setCvFile("CV_Charid_Youssef.pdf"));
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // Listen for OAuth success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setGmailConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const [showDebug, setShowDebug] = useState(false);
  const redirectUri = `${window.location.origin}/auth/callback`;

  const handleConnectGmail = async () => {
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(origin)}`, { credentials: 'include' });
      const { url } = await res.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (e) {
      console.error('Failed to get auth URL', e);
    }
  };

  const handleLogoutGmail = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setGmailConnected(false);
  };

  const handleUploadCV = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('cv', file);
    
    setAppStatus("Téléchargement du CV...");
    try {
      const res = await fetch('/api/upload-cv', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (res.ok) {
        setCvFile(file.name);
        setAppStatus("CV téléchargé avec succès !");
        setTimeout(() => setAppStatus(null), 3000);
      } else {
        throw new Error("Échec du téléchargement");
      }
    } catch (e: any) {
      setAppStatus(`Erreur: ${e.message}`);
      setTimeout(() => setAppStatus(null), 5000);
    }
  };

  const handleSendApplication = async (target: any, emailAddr: string) => {
    if (!gmailConnected || !cvFile) {
      setAppStatus("Erreur: Gmail non connecté ou CV manquant");
      setTimeout(() => setAppStatus(null), 3000);
      return;
    }
    
    setSendingAppId(target.id);
    setAppStatus("Génération de l'email personnalisé...");
    
    try {
      const jobTitle = target.titre || target.secteur || "Alternant Marketing Digital";
      const company = target.entreprise || target.name;
      const description = target.description || target.pertinence || "";
      const recruiterName = target.contacts?.[0]?.nom;
      
      const body = await generateApplicationEmail(jobTitle, company, description, recruiterName);
      const subject = `Candidature Alternance - ${jobTitle} - Charid Youssef`;
      
      // Instead of sending immediately, show preview
      setPreviewEmail({ target, emailAddr, subject, body });
      setAppStatus(null);
    } catch (e: any) {
      setAppStatus(`Erreur: ${e.message}`);
      setSendingAppId(null);
      setTimeout(() => setAppStatus(null), 5000);
    }
  };

  const confirmSendApplication = async () => {
    if (!previewEmail) return;
    const { target, emailAddr, subject, body } = previewEmail;
    
    setAppStatus("Envoi de l'email via Gmail...");
    setPreviewEmail(null); // Close modal
    
    try {
      // 2. Send via Gmail API
      const res = await fetch('/api/send-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: emailAddr,
          subject,
          body
        })
      });
      
      if (res.ok) {
        setApplied(prev => ({ ...prev, [target.id]: true }));
        setAppStatus("Candidature envoyée avec succès !");
        setTimeout(() => setAppStatus(null), 3000);
      } else {
        const err = await res.json();
        if (res.status === 401) {
          setGmailConnected(false);
        }
        throw new Error(err.error || "Erreur lors de l'envoi");
      }
    } catch (e: any) {
      setAppStatus(`Erreur: ${e.message}`);
      setTimeout(() => setAppStatus(null), 5000);
    } finally {
      setSendingAppId(null);
    }
  };

  // ── FETCH OFFERS ─────────────────────────────────────────────────────────────
  const fetchOffers = useCallback(async () => {
    if (cooldown > 0) return;
    setLoadingOffers(true);
    setApiError(null);
    try {
      const prompt = `Tu es un assistant expert en recrutement et sourcing. UTILISE GOOGLE SEARCH pour trouver des offres d'alternance RÉELLES, ACTUELLES et VÉRIFIÉES (publiées il y a moins de 15 jours) pour Charid Youssef (étudiant Master INSEEC Lyon).

DOMAINES CIBLÉS : Communication, Marketing Digital, Growth Marketing, E-commerce, Business Developer, IA Automation.
PROFIL : Débutant motivé cherchant à monter en compétences sur les outils Ads (Meta/Google) et SEO. Passionné par l'IA (automatisation n8n, agents IA).
LIEU : Lyon et sa région (rayon ${radius}km).
CIBLE : Entreprises innovantes, startups tech, agences digital/growth, et PME dynamiques.

SOURCES OBLIGATOIRES (VÉRIFIE LES LIENS) :
1. Indeed, Hellowork, La Bonne Alternance, Meteojob, LinkedIn, Welcome to the Jungle.
2. SITES CARRIÈRES directs des entreprises lyonnaises (ex: Cegid, GL Events, LDLC, startups de H7, etc.).

CONSIGNES DE QUALITÉ (CRITICAL) :
- NE DONNE PAS D'OFFRES EXPIRÉES ou de liens morts (404). Vérifie que l'annonce est toujours en ligne.
- EXCLURE TOUTES LES ÉCOLES et centres de formation.
- Trouve au moins 15-20 offres distinctes.
- Priorise les offres publiées DIRECTEMENT sur le site de l'entreprise.

IMPORTANT (EFFORT MAXIMUM REQUIS) : Pour CHAQUE offre, tu DOIS faire un effort particulier pour trouver l'adresse email directe du recruteur ou du responsable. 
- Cherche sur la page de l'offre, mais aussi sur le site carrière de l'entreprise.
- Si l'email n'est pas sur l'annonce, essaie de déduire l'email du responsable RH ou du CEO (ex: rh@entreprise.com, jobs@, ou prenom.nom@).
- Indique l'email uniquement si tu as une forte présomption de validité.

Retourne UNIQUEMENT ce JSON (aucun autre texte, aucune explication) :
{"offres":[{"titre":"","entreprise":"","ville":"","contrat":"Alternance","salaire":"","description":"","date":"YYYY-MM-DD","url":"LIEN_DIRECT_ET_VALIDE","email":"EMAIL_TROUVE_OU_PROBABLE","source":"NOM_DU_SITE"}]}

Si aucun email n'est trouvé malgré tes recherches, laisse le champ "email" vide.`;

      const text = await callGemini(prompt, true);
      const parsed = parseJSON(text);
      let newOffres = [];
      if (Array.isArray(parsed)) {
        newOffres = parsed;
      } else if (parsed && typeof parsed === 'object') {
        newOffres = parsed.offres || parsed.offers || [];
      }
      
      if (!newOffres.length) throw new Error("Aucune offre réelle trouvée pour le moment.");
      
      // Add offers with emails to dynamicTargets
      const offersWithEmails = newOffres.filter(o => o.email && o.email.includes("@"));
      if (offersWithEmails.length > 0) {
        const targetsFromOffers = offersWithEmails.map((o: any, idx: number) => ({
          id: `off-${Date.now()}-${idx}`,
          name: o.entreprise,
          secteur: o.titre,
          site: o.url,
          ville: o.ville,
          taille: "N/A",
          tag: "📡 Offre Live",
          pertinence: `Source: ${o.source}`,
          contacts: [{
            nom: "Responsable Recrutement",
            poste: "RH / Manager",
            linkedin: "#",
            emails: [{ addr: o.email, score: "🟢", note: "Trouvé sur l'offre" }]
          }],
          emailsEntreprise: [],
          canal: "Email",
          moment: "Matin",
          offreActive: true
        }));

        setDynamicTargets(prev => {
          const combined = [...targetsFromOffers, ...prev];
          const seen = new Set();
          return combined.filter(t => {
            const email = t.contacts[0]?.emails[0]?.addr;
            if (!email || seen.has(email)) return false;
            seen.add(email);
            return true;
          }).slice(0, 100);
        });
      }

      setOffers(prev => {
        const combined = [...newOffres, ...prev];
        // Deduplicate by URL
        const seen = new Set();
        return combined.filter(o => {
          if (!o.url || seen.has(o.url)) return false;
          seen.add(o.url);
          return true;
        }).slice(0, 100); // Keep last 100
      });

      setLastRefresh(new Date());
      setCooldown(15);
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setLoadingOffers(false);
    }
  }, [radius, cooldown]);

  // ── MAPS EMAIL SCRAPER ────────────────────────────────────────────────────────
  const scrapeEmails = useCallback(async () => {
    if (cooldown > 0) return;
    setLoadingScrape(true);
    setScrapeError(null);
    setScrapeCount(c => c + 1);

    const shuffled = [...SCRAPE_QUERIES].sort(() => Math.random() - 0.5);
    const queries = shuffled.slice(0, 3).join(" | ");

    try {
      const text = await callGemini(
        `Recherche des entreprises réelles à Lyon via Google Search pour ces catégories : ${queries}.
Identifie les décideurs (CEO, Head of Growth, Marketing) et leurs emails probables.

Retourne UNIQUEMENT ce JSON (aucun autre texte) :
{"contacts":[{"entreprise":"","site":"","ville":"Lyon","decideur":"Nom","poste":"Poste","email_probable":"email","email_format":"format","score":"🟢","score_label":"Fiable","source":"Source","note":"Note"}]}`,
        true
      );
      const parsed = parseJSON(text);
      let contacts = [];
      if (Array.isArray(parsed)) {
        contacts = parsed;
      } else if (parsed && typeof parsed === 'object') {
        contacts = parsed.contacts || [];
      }
      
      if (!contacts.length) throw new Error("Aucun contact trouvé");
      
      // Add to dynamic targets
      const newTargets = contacts.map((c: any, idx: number) => ({
        id: Date.now() + idx,
        name: c.entreprise,
        secteur: c.poste,
        site: c.site,
        ville: c.ville,
        taille: "N/A",
        tag: "⚡ Nouveau",
        pertinence: c.note,
        contacts: [{
          nom: c.decideur,
          poste: c.poste,
          linkedin: "#",
          emails: [{ addr: c.email_probable, score: c.score, note: c.score_label }]
        }],
        emailsEntreprise: [],
        canal: "Email",
        moment: "Matin",
        offreActive: false
      }));

      setDynamicTargets(prev => [...newTargets, ...prev].slice(0, 50));
      setCooldown(20);
    } catch (e: any) {
      setScrapeError(e.message);
    } finally {
      setLoadingScrape(false);
    }
  }, [cooldown]);

  const generateDraft = useCallback(async (contact: any, company: any) => {
    setLoadingDraft(true);
    setDraftError(null);
    setEmailDraft(null);
    try {
      const prompt = `Génère un email de prospection simple et direct pour une recherche d'alternance.
Destinataire : ${contact.nom} (${contact.poste}) chez ${company.name}.
Expéditeur : Charid Youssef, étudiant en Master Business Dev & Growth Strategy à l'INSEEC Lyon (dispo Octobre 2026).

CONTEXTE CV & COMPÉTENCES :
- Expérience : Assistant Digital chez Socobat (Meta/Google Ads, SEO, Emailing) + BizDev chez EMSP.
- HUMILITÉ : Je suis actuellement débutant en Ads (Meta/Google) et SEO, et je cherche justement une alternance pour monter en compétences sur ces sujets.
- AVANT-GARDE IA (Autodidacte) : Parallèlement, je me passionne pour les outils IA de pointe que l'on n'enseigne pas encore à l'école : Vibecoding, Claude Code, déploiement d'Agents IA via OpenClaw et automatisation via n8n.
- Langues : Anglais C2, Italien Maternel, Arabe Bilingue.

DIRECTIVES CRUCIALES :
1. NE METS AUCUN ESPACE VIDE À COMPLÉTER (pas de [Nom], pas de [Date], pas de [Entreprise]).
2. L'email doit être prêt à l'envoi tel quel.
3. Utilise le nom du destinataire (${contact.nom}) poliment dans l'introduction.
4. Souligne mon profil hybride : une base Marketing/Sales, une grande envie d'apprendre les Ads/SEO, et une expertise IA technique (Vibecoding, Agents, n8n) apprise en autodidacte.
5. Précise la recherche d'alternance pour Octobre 2026.
6. Mentionne que mon CV est joint en pièce jointe (PJ).
7. Le ton doit être professionnel, humble mais déterminé. Évite absolument les familiarités comme "prendre un café". Propose plutôt un "entretien" ou un "échange professionnel".
8. Termine par "Cordialement, Charid Youssef".

Retourne UNIQUEMENT ce JSON :
{"objet": "Sujet simple et accrocheur", "corps": "Contenu de l'email \\n"}`;

      const text = await callGemini(prompt, false); // No search needed for simple draft
      const parsed = parseJSON(text);
      setEmailDraft({ ...parsed, contact, company });
    } catch (e: any) {
      setDraftError(e.message);
    } finally {
      setLoadingDraft(false);
    }
  }, []);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const ageLabel = (d: string) => {
    if (!d) return "";
    const days = Math.floor((new Date().getTime() - new Date(d).getTime()) / 86400000);
    if (isNaN(days)) return "";
    if (days === 0) return "🔴 Aujourd'hui";
    if (days <= 2) return "🟡 " + days + "j";
    if (days <= 7) return days + "j";
    return Math.floor(days / 7) + "sem.";
  };

  const filteredOffers = offers.filter(o => {
    // Exclude already applied
    if (applied[o.id]) return false;
    
    if (offerFilter === "Nouvelles (7j)") return !o.date || (new Date().getTime() - new Date(o.date).getTime()) < 7*86400000;
    if (offerFilter === "Avec email") return !!o.email;
    return true;
  });

  const appliedOffers = offers.filter(o => applied[o.id]);

  // ── NAV ───────────────────────────────────────────────────────────────────────
  const NavBtn = ({ k, label, count, countBg }: { k: string, label: string, count?: number | null, countBg?: string }) => (
    <button onClick={() => { setView(k); setSelected(null); }}
      style={{ padding:"7px 14px", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", border:"none", display:"flex", alignItems:"center", gap:6, background:view===k?"#2563eb":"transparent", color:view===k?"#fff":"#a1a1aa", transition:"all 0.15s" }}>
      {label}
      {count != null && <span style={{ background:countBg, color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{count}</span>}
    </button>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'DM Sans','Inter',sans-serif", minHeight:"100vh", background:"#09090b", color:"#f4f4f5", display:"flex", flexDirection:"column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* NAV */}
      <div style={{ borderBottom:"1px solid #27272a", padding:"11px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"#2563eb", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13 }}>YC</div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:"#fff" }}>Charid Youssef</div>
            <div style={{ fontSize:11, color:"#71717a" }}>Business Dev & Growth · Alternance Oct. 2026 · INSEEC Lyon</div>
          </div>
        </div>
        <div style={{ display:"flex", background:"#18181b", borderRadius:12, padding:4, border:"1px solid #27272a", gap:2 }}>
          <NavBtn k="offres" label="📡 Offres Live" count={filteredOffers.length||null} countBg="#dc2626" />
          <NavBtn k="applied" label="✅ Mes Candidatures" count={appliedOffers.length||null} countBg="#16a34a" />
          <NavBtn k="sourcing" label="🎯 Sourcing" count={TARGETS.length + dynamicTargets.length} countBg="#374151" />
          <NavBtn k="emails" label="📧 Emails" count={(dynamicTargets.length + TARGETS.reduce((acc, t) => acc + t.contacts.reduce((a, c) => a + c.emails.length, 0), 0)) || null} countBg="#7c3aed" />
          <NavBtn k="candidature" label="💼 Candidature" count={cvFile ? 1 : null} countBg="#2563eb" />
        </div>
        <div style={{ display:"flex", gap:14, fontSize:11, color:"#52525b" }}>
          {lastRefresh && <span>🕐 {lastRefresh.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>}
          <span>✅ {Object.values(applied).filter(Boolean).length} postulé(s)</span>
          {dynamicTargets.length > 0 && <span>📧 {dynamicTargets.length} nouveaux</span>}
        </div>
      </div>

      {/* ══ OFFRES ══ */}
      {view === "offres" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", padding:16, gap:12, overflow:"hidden" }}>
          {/* Controls */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
            <select value={radius} onChange={e=>setRadius(+e.target.value)}
              style={{ background:"#18181b", border:"1px solid #3f3f46", color:"#e4e4e7", borderRadius:8, padding:"7px 12px", fontSize:12, cursor:"pointer" }}>
              {[10,20,30,50,100].map(r=><option key={r} value={r}>📍 {r} km</option>)}
            </select>
            {["Toutes","Nouvelles (7j)","Avec email"].map(f=>(
              <button key={f} onClick={()=>setOfferFilter(f)}
                style={{ padding:"7px 14px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:"1px solid "+(offerFilter===f?"#2563eb":"#3f3f46"), background:offerFilter===f?"#1d4ed8":"transparent", color:offerFilter===f?"#fff":"#a1a1aa" }}>
                {f}
              </button>
            ))}
            <button onClick={fetchOffers} disabled={loadingOffers || cooldown > 0}
              style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, padding:"8px 22px", borderRadius:10, fontWeight:700, fontSize:13, cursor:(loadingOffers || cooldown > 0)?"not-allowed":"pointer", border:"none", background:(loadingOffers || cooldown > 0)?"#27272a":"#2563eb", color:(loadingOffers || cooldown > 0)?"#71717a":"#fff", boxShadow:(loadingOffers || cooldown > 0)?"none":"0 0 20px rgba(37,99,235,0.35)" }}>
              <span style={{ display:"inline-block", animation:loadingOffers?"spin 0.8s linear infinite":"none" }}>⟳</span>
              {loadingOffers ? "Chargement…" : cooldown > 0 ? `Attendre ${cooldown}s` : "Refresh Live"}
            </button>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              { val:filteredOffers.length, label:"offres", c:"#fff" },
              { val:filteredOffers.filter(o=>o.date&&(new Date().getTime()-new Date(o.date).getTime())<86400000).length, label:"aujourd'hui", c:"#f87171" },
              { val:filteredOffers.filter(o=>o.date&&(new Date().getTime()-new Date(o.date).getTime())<604800000).length, label:"cette semaine", c:"#fbbf24" },
              { val:filteredOffers.filter(o=>o.email).length, label:"📧 email direct", c:"#34d399" },
              { val:Object.values(applied).filter(Boolean).length, label:"postulé(s)", c:"#a78bfa" },
            ].map((s,i)=>(
              <div key={i} style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:10, padding:"8px 14px", textAlign:"center", minWidth:76 }}>
                <div style={{ fontSize:20, fontWeight:900, color:s.c }}>{s.val}</div>
                <div style={{ fontSize:10, color:"#71717a" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {apiError && (
            <div style={{ background:"#450a0a", border:"1px solid #991b1b", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#fca5a5", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>⚠️ {apiError}</span>
              <button onClick={fetchOffers} style={{ background:"#991b1b", border:"none", color:"#fca5a5", padding:"4px 12px", borderRadius:6, fontSize:11, cursor:"pointer", fontWeight:600 }}>Réessayer</button>
            </div>
          )}

          {!loadingOffers && !apiError && !offers.length && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
              <div style={{ fontSize:42 }}>📡</div>
              <div style={{ fontSize:14, color:"#71717a" }}>Clique sur <strong style={{color:"#fff"}}>Refresh Live</strong> pour charger les offres</div>
              <div style={{ fontSize:11, color:"#3f3f46" }}>Powered by Gemini AI</div>
            </div>
          )}

          {loadingOffers && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
              <div style={{ fontSize:38, animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</div>
              <div style={{ fontSize:14, color:"#71717a" }}>Recherche des offres autour de Lyon…</div>
            </div>
          )}

          {!loadingOffers && filteredOffers.length > 0 && (
            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:9, paddingRight:4 }}>
              {filteredOffers.map((o,i)=>{
                const isToday = o.date&&(new Date().getTime()-new Date(o.date).getTime())<86400000;
                const isRecent = o.date&&(new Date().getTime()-new Date(o.date).getTime())<259200000;
                const isExp = expandedOffer===i;
                return (
                  <div key={i} style={{ background:"#18181b", border:"1px solid "+(isToday?"#7f1d1d":isRecent?"#451a03":"#27272a"), borderRadius:12, padding:"14px 16px" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:4 }}>
                          {isToday&&<span style={{ fontSize:10, fontWeight:700, background:"#7f1d1d", color:"#fca5a5", padding:"2px 7px", borderRadius:20 }}>🔴 NOUVEAU</span>}
                          {!isToday&&isRecent&&<span style={{ fontSize:10, fontWeight:700, background:"#451a03", color:"#fdba74", padding:"2px 7px", borderRadius:20 }}>🟡 RÉCENT</span>}
                          {o.email&&<span style={{ fontSize:10, fontWeight:700, background:"#052e16", color:"#4ade80", padding:"2px 7px", borderRadius:20 }}>📧 Email direct</span>}
                          <span style={{ fontWeight:700, fontSize:14, color:"#fff" }}>{o.titre||"Offre d'alternance"}</span>
                        </div>
                        <div style={{ fontSize:13, color:"#a1a1aa", fontWeight:500 }}>{o.entreprise}</div>
                        <div style={{ display:"flex", gap:10, marginTop:5, fontSize:11, color:"#71717a", flexWrap:"wrap" }}>
                          {o.ville&&<span>📍 {o.ville}</span>}
                          {o.contrat&&<span>📄 {o.contrat}</span>}
                          {o.salaire&&<span>💶 {o.salaire}</span>}
                          {o.date&&<span style={{ color:isToday?"#f87171":isRecent?"#fbbf24":"#71717a", fontWeight:600 }}>{ageLabel(o.date)}</span>}
                          {o.source&&<span style={{ background:"#27272a", padding:"1px 6px", borderRadius:4 }}>{o.source}</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end", flexShrink:0 }}>
                        <div style={{ display:"flex", gap:5 }}>
                          <button onClick={()=>setSaved(p=>({...p,[i]:!p[i]}))}
                            style={{ padding:"5px 9px", borderRadius:7, fontSize:12, cursor:"pointer", border:"1px solid "+(saved[i]?"#ca8a04":"#3f3f46"), background:saved[i]?"#422006":"transparent", color:saved[i]?"#fbbf24":"#71717a" }}>
                            {saved[i]?"🔖":"☆"}
                          </button>
                          <button onClick={()=>setApplied(p=>({...p,[o.id]:!p[o.id]}))}
                            style={{ padding:"5px 11px", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", border:"1px solid "+(applied[o.id]?"#16a34a":"#3f3f46"), background:applied[o.id]?"#052e16":"transparent", color:applied[o.id]?"#4ade80":"#a1a1aa" }}>
                            {applied[o.id]?"✓ Postulé":"Cocher"}
                          </button>
                          {o.url&&<a href={o.url} target="_blank" rel="noreferrer" style={{ padding:"5px 11px", borderRadius:7, fontSize:11, fontWeight:600, textDecoration:"none", border:"1px solid #1e40af", background:"#1e3a8a", color:"#93c5fd" }}>Voir →</a>}
                        </div>
                        {o.email&&(
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                            <span style={{ fontSize: 9, color: "#4ade80", fontWeight: 700, textTransform: "uppercase" }}>Contact Direct :</span>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={()=>copy(o.email,"oe-"+i)} style={{ padding:"4px 12px", borderRadius:7, fontSize:11, cursor:"pointer", border:"1px solid #15803d", background:"#052e16", color:"#4ade80", fontFamily:"monospace", fontWeight: 600 }}>
                                {copied==="oe-"+i?"✓ Copié":o.email}
                              </button>
                              <button 
                                onClick={() => handleSendApplication(o, o.email)}
                                disabled={sendingAppId === o.id || !gmailConnected || !cvFile}
                                style={{ 
                                  padding:"4px 12px", 
                                  borderRadius:7, 
                                  fontSize:11, 
                                  cursor:(sendingAppId === o.id || !gmailConnected || !cvFile) ? "not-allowed" : "pointer", 
                                  border:"1px solid #2563eb", 
                                  background:applied[o.id] ? "#1e3a8a" : "#2563eb", 
                                  color:"#fff", 
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                              >
                                {sendingAppId === o.id ? "..." : applied[o.id] ? "✓ Envoyé" : "🚀 Postuler"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {o.description&&(
                      <div style={{ marginTop:9 }}>
                        <div style={{ fontSize:12, color:"#71717a", lineHeight:1.6, background:"#0a0a0b", borderRadius:7, padding:"8px 12px", overflow:isExp?"visible":"hidden", maxHeight:isExp?"none":44 }}>{o.description}</div>
                        {o.description.length>80&&<button onClick={()=>setExpandedOffer(isExp?null:i)} style={{ fontSize:11, color:"#3b82f6", background:"none", border:"none", cursor:"pointer", marginTop:4 }}>{isExp?"▲ Réduire":"▼ Plus"}</button>}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ textAlign:"center", padding:"12px 0", fontSize:11, color:"#3f3f46" }}>
                {filteredOffers.length} offres · {lastRefresh?.toLocaleString("fr-FR")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ PREVIEW MODAL ══ */}
      {previewEmail && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
          <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:16, width:"100%", maxWidth:600, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:20, borderBottom:"1px solid #27272a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:700 }}>Vérification de l'email</h3>
              <button onClick={() => { setPreviewEmail(null); setSendingAppId(null); }} style={{ background:"none", border:"none", color:"#71717a", cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ padding:20, overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <div style={{ fontSize:11, color:"#71717a", textTransform:"uppercase", fontWeight:700, marginBottom:4 }}>Destinataire</div>
                <div style={{ fontSize:14, color:"#fff" }}>{previewEmail.emailAddr} ({previewEmail.target.entreprise || previewEmail.target.name})</div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#71717a", textTransform:"uppercase", fontWeight:700, marginBottom:4 }}>Objet</div>
                <div style={{ fontSize:14, color:"#fff", background:"#09090b", padding:10, borderRadius:8, border:"1px solid #27272a" }}>{previewEmail.subject}</div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#71717a", textTransform:"uppercase", fontWeight:700, marginBottom:4 }}>Corps du message</div>
                <textarea 
                  value={previewEmail.body}
                  onChange={(e) => setPreviewEmail({ ...previewEmail, body: e.target.value })}
                  style={{ width:"100%", height:300, background:"#09090b", color:"#cbd5e1", border:"1px solid #27272a", borderRadius:8, padding:12, fontSize:13, lineHeight:1.5, resize:"none" }}
                />
              </div>
              {cvFile && (
                <div style={{ display:"flex", alignItems:"center", gap:8, color:"#3b82f6", fontSize:12 }}>
                  <FileText size={14} />
                  <span>Pièce jointe : {cvFile}</span>
                </div>
              )}
            </div>
            <div style={{ padding:20, borderTop:"1px solid #27272a", display:"flex", gap:12 }}>
              <button onClick={() => { setPreviewEmail(null); setSendingAppId(null); }} style={{ flex:1, padding:12, borderRadius:10, background:"transparent", border:"1px solid #3f3f46", color:"#a1a1aa", fontWeight:600, cursor:"pointer" }}>Annuler</button>
              <button onClick={confirmSendApplication} style={{ flex:2, padding:12, borderRadius:10, background:"#2563eb", border:"none", color:"#fff", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <Send size={16} />
                Confirmer et envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MES CANDIDATURES ══ */}
      {view === "applied" && (
        <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ maxWidth:1000, margin:"0 auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:24, fontWeight:800, color:"#fff", display:"flex", alignItems:"center", gap:12, margin:0 }}>
                <CheckCircle size={24} color="#16a34a" />
                Mes Candidatures ({appliedOffers.length})
              </h2>
              {appliedOffers.length > 0 && (
                <button 
                  onClick={() => { if(window.confirm("Vider toute la liste ?")) setApplied({}); }}
                  style={{ padding:"6px 12px", borderRadius:8, fontSize:12, cursor:"pointer", border:"1px solid #3f3f46", background:"transparent", color:"#71717a" }}
                >
                  Vider la liste
                </button>
              )}
            </div>
            
            {!appliedOffers.length ? (
              <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:16, padding:48, textAlign:"center" }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📝</div>
                <h3 style={{ fontSize:18, fontWeight:700, color:"#fff", marginBottom:8 }}>Aucune candidature pour le moment</h3>
                <p style={{ fontSize:14, color:"#71717a" }}>Les offres auxquelles tu postules apparaîtront ici pour ton suivi.</p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(350px, 1fr))", gap:16 }}>
                {appliedOffers.map((o, i) => (
                  <div key={i} style={{ background:"#18181b", border:"1px solid #16a34a", borderRadius:12, padding:16, position:"relative" }}>
                    <div style={{ position:"absolute", top:12, right:12, background:"#052e16", color:"#4ade80", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>POSTULÉ</div>
                    <div style={{ fontWeight:700, fontSize:15, color:"#fff", marginBottom:4 }}>{o.titre}</div>
                    <div style={{ fontSize:13, color:"#a1a1aa", marginBottom:12 }}>{o.entreprise}</div>
                    <div style={{ display:"flex", gap:10, fontSize:11, color:"#71717a", marginBottom:16 }}>
                      <span>📍 {o.ville}</span>
                      <span>📅 {o.date}</span>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      {o.url && <a href={o.url} target="_blank" rel="noreferrer" style={{ flex:1, textAlign:"center", padding:"8px", borderRadius:8, fontSize:12, fontWeight:600, textDecoration:"none", border:"1px solid #3f3f46", color:"#a1a1aa" }}>Voir l'offre</a>}
                      <button 
                        onClick={() => setApplied(p => { const n = {...p}; delete n[o.id]; return n; })}
                        style={{ padding:"8px 12px", borderRadius:8, fontSize:12, cursor:"pointer", border:"1px solid #450a0a", background:"transparent", color:"#f87171" }}
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ CANDIDATURE ══ */}
      {view === "candidature" && (
        <div style={{ flex:1, overflowY:"auto", padding:24 }}>
          <div style={{ maxWidth:800, margin:"0 auto", display:"flex", flexDirection:"column", gap:24 }}>
            <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:16, padding:32, boxShadow:"0 20px 25px -5px rgba(0,0,0,0.1)" }}>
              <h2 style={{ fontSize:24, fontWeight:800, marginBottom:24, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:"rgba(37,99,235,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"#3b82f6" }}>
                  <Mail size={24} />
                </div>
                Configuration Candidature
              </h2>
              
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:32 }}>
                {/* Gmail Connection */}
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <h3 style={{ fontSize:18, fontWeight:700, color:"#e4e4e7" }}>Connexion Gmail</h3>
                  <p style={{ fontSize:13, color:"#71717a", lineHeight:1.5 }}>Connecte ton compte Gmail pour envoyer tes candidatures en un clic avec l'IA.</p>
                  {gmailConnected ? (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:16, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12, color:"#4ade80", fontSize:14, fontWeight:600 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80", animation:"pulse 2s infinite" }} />
                        Gmail Connecté
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button 
                          onClick={checkAuthStatus} 
                          disabled={checkingAuth}
                          style={{ fontSize:11, color:"#71717a", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", opacity: checkingAuth ? 0.5 : 1 }}
                        >
                          {checkingAuth ? "Vérification..." : "Rafraîchir"}
                        </button>
                        <button onClick={handleLogoutGmail} style={{ fontSize:11, color:"#71717a", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Déconnecter</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={handleConnectGmail}
                        style={{ width:"100%", padding:"14px", background:"#fff", color:"#000", fontWeight:800, borderRadius:12, border:"none", cursor:"pointer", transition:"all 0.2s", fontSize:14 }}
                      >
                        Connecter Gmail
                      </button>
                      
                      <div style={{ marginTop: 8 }}>
                        <button 
                          onClick={() => setShowDebug(!showDebug)}
                          style={{ fontSize: 11, color: "#71717a", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                        >
                          {showDebug ? "Masquer l'aide" : "Problème de connexion ? Voir la config"}
                        </button>
                        
                        {showDebug && (
                          <div style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }}>
                            <p style={{ color: "#f87171", marginBottom: 8, fontWeight: 700 }}>⚠️ Important : Si vous vous déconnectez tout seul, ouvrez l'application dans un nouvel onglet (bouton en haut à droite d'AI Studio).</p>
                            <p style={{ color: "#a1a1aa", marginBottom: 8, fontWeight: 700 }}>À copier dans Google Cloud :</p>
                            <div style={{ marginBottom: 8 }}>
                              <span style={{ color: "#3b82f6", display: "block", marginBottom: 4 }}>Origine JavaScript :</span>
                              <code style={{ background: "#000", padding: "4px 8px", borderRadius: 4, display: "block", color: "#e4e4e7", wordBreak: "break-all" }}>{window.location.origin}</code>
                            </div>
                            <div>
                              <span style={{ color: "#3b82f6", display: "block", marginBottom: 4 }}>URI de redirection :</span>
                              <code style={{ background: "#000", padding: "4px 8px", borderRadius: 4, display: "block", color: "#e4e4e7", wordBreak: "break-all" }}>{redirectUri}</code>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* CV Upload */}
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <h3 style={{ fontSize:18, fontWeight:700, color:"#e4e4e7" }}>Ton CV (PDF)</h3>
                  <p style={{ fontSize:13, color:"#71717a", lineHeight:1.5 }}>Télécharge ton CV pour qu'il soit joint automatiquement à tes emails.</p>
                  <div style={{ position:"relative" }}>
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleUploadCV}
                      style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0, cursor:"pointer", zIndex:10 }}
                    />
                    <div style={{ padding:24, border:"2px dashed "+(cvFile ? "rgba(37,99,235,0.4)" : "rgba(255,255,255,0.1)"), background:cvFile ? "rgba(37,99,235,0.05)" : "transparent", borderRadius:12, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, transition:"all 0.2s" }}>
                      <FileText size={28} color={cvFile ? "#3b82f6" : "#52525b"} />
                      <span style={{ fontSize:13, fontWeight:600, color:cvFile ? "#3b82f6" : "#a1a1aa" }}>{cvFile || "Choisir un fichier PDF"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Avant-garde IA Skills */}
              <div style={{ marginTop:24, padding:20, background:"rgba(124,58,237,0.05)", border:"1px solid rgba(124,58,237,0.1)", borderRadius:12 }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:"#a78bfa", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
                  🚀 Apprentissage IA Avant-garde (Autodidacte)
                </h3>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {["Vibecoding", "Claude Code", "Agents IA (OpenClaw)", "n8n Automation"].map(skill => (
                    <span key={skill} style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:20, background:"rgba(124,58,237,0.1)", color:"#c084fc", border:"1px solid rgba(124,58,237,0.2)" }}>
                      {skill}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize:12, color:"#71717a", marginTop:12, fontStyle:"italic" }}>
                  Je suis actuellement débutant en Ads/SEO et je cherche à progresser. Parallèlement, je me passionne pour ces outils IA de pointe.
                </p>
              </div>

              <div style={{ background:"rgba(37,99,235,0.1)", border:"1px solid rgba(37,99,235,0.2)", borderRadius:12, padding:16, display:"flex", gap:12, marginTop:24 }}>
                <Info size={20} color="#3b82f6" style={{ flexShrink:0, marginTop:2 }} />
                <div style={{ fontSize:13, color:"#93c5fd", lineHeight:1.6 }}>
                  <strong>Comment ça marche ?</strong> Une fois configuré, un bouton <strong>🚀 Postuler</strong> apparaîtra sur chaque offre. 
                  L'IA rédigera un email personnalisé basé sur l'annonce et ton profil, puis l'enverra directement via ton Gmail avec ton CV en pièce jointe.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ══ SOURCING ══ */}
      {view === "sourcing" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {/* LEFT LIST */}
          <div style={{ width:272, borderRight:"1px solid #27272a", display:"flex", flexDirection:"column", flexShrink:0 }}>

            {/* SCRAPER BUTTON */}
            <div style={{ padding:"12px 12px", borderBottom:"1px solid #27272a", display:"flex", flexDirection:"column", gap:8 }}>
              <button onClick={scrapeEmails} disabled={loadingScrape || cooldown > 0}
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontWeight:700, fontSize:12, cursor:(loadingScrape || cooldown > 0)?"not-allowed":"pointer", border:"none", background:(loadingScrape || cooldown > 0)?"#27272a":"linear-gradient(135deg,#7c3aed,#4f46e5)", color:(loadingScrape || cooldown > 0)?"#71717a":"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:(loadingScrape || cooldown > 0)?"none":"0 0 18px rgba(124,58,237,0.4)" }}>
                <span style={{ display:"inline-block", animation:loadingScrape?"spin 0.8s linear infinite":"none", fontSize:15 }}>🔍</span>
                {loadingScrape ? "Scraping Maps…" : cooldown > 0 ? `Attendre ${cooldown}s` : "Scraper 15 nouveaux emails"}
              </button>
              {dynamicTargets.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:11, color:"#71717a" }}>{dynamicTargets.length} cibles ajoutées · {scrapeCount}x refresh</span>
                  <button onClick={()=>{ 
                    const csv = "Entreprise,Decideur,Poste,Email,Score,Note\n"+dynamicTargets.map(t=>`"${t.name}","${t.contacts[0].nom}","${t.contacts[0].poste}","${t.contacts[0].emails[0].addr}","${t.contacts[0].emails[0].score}","${t.contacts[0].emails[0].note}"`).join("\n"); 
                    const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download="nouveaux_contacts_lyon.csv"; a.click(); 
                  }}
                    style={{ fontSize:10, padding:"3px 8px", borderRadius:6, cursor:"pointer", border:"1px solid #3f3f46", background:"transparent", color:"#a1a1aa" }}>
                    ⬇ CSV
                  </button>
                </div>
              )}
              {scrapeError && <div style={{ fontSize:10, color:"#f87171", background:"#450a0a", borderRadius:6, padding:"6px 8px" }}>⚠️ {scrapeError}</div>}
            </div>

            {/* TARGETS LIST */}
            <div style={{ padding:"6px 12px 4px", fontSize:10, color:"#52525b", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", borderBottom:"1px solid #1c1c1e" }}>
              Cibles identifiées ({TARGETS.length + dynamicTargets.length})
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              {[...dynamicTargets, ...TARGETS].map(t=>(
                <div key={t.id} onClick={()=>setSelected(t)}
                  style={{ padding:"11px 13px", borderBottom:"1px solid #1c1c1e", cursor:"pointer", background:selected?.id===t.id?"#1e2a3a":"transparent", borderLeft:selected?.id===t.id?"2px solid #3b82f6":"2px solid transparent" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:5 }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                        <span style={{ fontWeight:700, fontSize:12, color:"#fff" }}>{t.name}</span>
                        {t.offreActive&&<span style={{ fontSize:9, background:"#052e16", color:"#4ade80", padding:"1px 4px", borderRadius:3, fontWeight:700 }}>OFFRE</span>}
                      </div>
                      <div style={{ fontSize:10, color:"#71717a", marginTop:1 }}>{t.secteur}</div>
                      <span style={{ fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:3, background:TAG_BG[t.tag]||"#27272a", color:TAG_FX[t.tag]||"#a1a1aa" }}>{t.tag}</span>
                    </div>
                    <span style={{ fontSize:10, color:"#52525b", flexShrink:0 }}>{t.taille}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT DETAIL */}
          <div style={{ flex:1, overflowY:"auto", padding:20 }}>
            {!selected ? (
              <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
                <div style={{ fontSize:40 }}>🎯</div>
                <div style={{ fontSize:14, color:"#71717a" }}>Sélectionne une entreprise pour voir tous les emails</div>
                <div style={{ fontSize:12, color:"#3f3f46" }}>Ou clique sur "Scraper 15 nouveaux emails" pour découvrir de nouvelles cibles</div>
              </div>
            ) : (
              <div style={{ maxWidth:680, display:"flex", flexDirection:"column", gap:14 }}>
                {/* Header */}
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <h2 style={{ fontSize:22, fontWeight:900, color:"#fff", margin:0 }}>{selected.name}</h2>
                    <span style={{ fontSize:10, fontWeight:700, padding:"3px 7px", borderRadius:4, background:TAG_BG[selected.tag], color:TAG_FX[selected.tag] }}>{selected.tag}</span>
                    {selected.offreActive&&<span style={{ fontSize:10, fontWeight:700, padding:"3px 7px", borderRadius:4, background:"#052e16", color:"#4ade80" }}>🟢 Offre active</span>}
                  </div>
                  <div style={{ fontSize:13, color:"#a1a1aa", marginTop:4 }}>{selected.secteur} · {selected.ville} · {selected.taille}</div>
                  <a href={"https://"+selected.site} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"#60a5fa", textDecoration:"none" }}>🌐 {selected.site}</a>
                </div>

                {/* Pertinence */}
                <div style={{ background:"#0c1a2e", border:"1px solid #1e3a5f", borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#60a5fa", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>Pourquoi cette cible ?</div>
                  <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.6 }}>{selected.pertinence}</div>
                </div>

                {/* Emails entreprise */}
                <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:10, padding:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#71717a", textTransform:"uppercase", letterSpacing:"0.08em" }}>📬 Emails entreprise (génériques)</div>
                    {selected.emailsEntreprise.length > 0 && (
                      <button 
                        onClick={() => handleSendApplication(selected, selected.emailsEntreprise[0].addr)}
                        disabled={sendingAppId === selected.id || !gmailConnected || !cvFile}
                        style={{ padding:"4px 10px", borderRadius:6, fontSize:10, cursor:"pointer", border:"1px solid #2563eb", background:"#2563eb", color:"#fff", fontWeight:700 }}
                      >
                        🚀 Postuler (Générique)
                      </button>
                    )}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {selected.emailsEntreprise.map((e: any,i: number)=>(
                      <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0a0a0b", borderRadius:8, padding:"8px 12px", gap:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0, flex:1 }}>
                          <span style={{ color:SC[e.score], fontSize:13, flexShrink:0 }}>{e.score}</span>
                          <span style={{ fontFamily:"monospace", fontSize:12, color:"#e4e4e7" }}>{e.addr}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                          <span style={{ fontSize:10, color:"#52525b" }}>{e.note}</span>
                          <button onClick={()=>copy(e.addr,"ent-"+selected.id+"-"+i)}
                            style={{ fontSize:10, padding:"3px 8px", borderRadius:5, cursor:"pointer", border:"1px solid #3f3f46", background:"transparent", color:"#a1a1aa" }}>
                            {copied==="ent-"+selected.id+"-"+i?"✓":"Copier"}
                          </button>
                          <button 
                            onClick={() => handleSendApplication(selected, e.addr)}
                            disabled={sendingAppId === selected.id || !gmailConnected || !cvFile}
                            style={{ padding:"3px 8px", borderRadius:5, fontSize:10, cursor:"pointer", border:"1px solid #2563eb", background:"#2563eb", color:"#fff", fontWeight:700 }}
                          >
                            🚀 Postuler
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contacts décideurs */}
                {selected.contacts.map((c: any,ci: number)=>(
                  <div key={ci} style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:10, padding:14 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14, color:"#fff" }}>{c.nom}</div>
                        <div style={{ fontSize:12, color:"#a1a1aa" }}>{c.poste}</div>
                        {ci===0&&<div style={{ fontSize:10, color:"#34d399", fontWeight:600, marginTop:2 }}>⭐ Contact prioritaire</div>}
                      </div>
                      <a href={c.linkedin} target="_blank" rel="noreferrer"
                        style={{ fontSize:11, padding:"5px 12px", borderRadius:8, background:"#172554", border:"1px solid #1e40af", color:"#93c5fd", textDecoration:"none", fontWeight:600 }}>
                        LinkedIn →
                      </a>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {c.emails.map((e: any,ei: number)=>(
                        <div key={ei} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0a0a0b", borderRadius:8, padding:"8px 12px", gap:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
                            <span style={{ color:SC[e.score], fontSize:13, flexShrink:0 }}>{e.score}</span>
                            <span style={{ fontFamily:"monospace", fontSize:12, color:"#e4e4e7" }}>{e.addr}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                            <span style={{ fontSize:10, color:"#52525b" }}>{e.note}</span>
                            <button onClick={()=>copy(e.addr,"c-"+selected.id+"-"+ci+"-"+ei)}
                              style={{ fontSize:10, padding:"3px 8px", borderRadius:5, cursor:"pointer", border:"1px solid #3f3f46", background:"transparent", color:"#a1a1aa" }}>
                              {copied==="c-"+selected.id+"-"+ci+"-"+ei?"✓":"Copier"}
                            </button>
                            <button 
                              onClick={() => handleSendApplication(selected, e.addr)}
                              disabled={sendingAppId === selected.id || !gmailConnected || !cvFile}
                              style={{ padding:"3px 8px", borderRadius:5, fontSize:10, cursor:"pointer", border:"1px solid #2563eb", background:"#2563eb", color:"#fff", fontWeight:700 }}
                            >
                              🚀 Postuler
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Stratégie */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:10, padding:12 }}>
                    <div style={{ fontSize:10, color:"#71717a", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Canal</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{selected.canal}</div>
                  </div>
                  <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:10, padding:12 }}>
                    <div style={{ fontSize:10, color:"#71717a", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Meilleur moment</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{selected.moment}</div>
                  </div>
                </div>
                <div style={{ background:"#0a0a0b", border:"1px solid #27272a", borderRadius:10, padding:12, fontSize:12, color:"#71717a", lineHeight:1.6 }}>
                  <span style={{ color:"#a1a1aa", fontWeight:600 }}>💡 Tip · </span>
                  LinkedIn DM 150 mots max → attendre 48h → relance email. Mention Socobat : Meta Ads, emailing Brevo, IA générative. Master INSEEC Biz Dev Oct. 2026.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ EMAILS ══ */}
      {view === "emails" && (
        <div style={{ flex:1, overflowY:"auto", padding:20, maxWidth:800, margin:"0 auto", width:"100%" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:"#fff", margin:0 }}>📧 Répertoire des emails collectés</h2>
            <button onClick={()=>{ 
              const allEmails = [...dynamicTargets, ...TARGETS].flatMap(t => t.contacts.flatMap(c => c.emails.map(e => ({ ...e, entreprise: t.name, nom: c.nom }))));
              const csv = "Entreprise,Nom,Email,Score,Note\n"+allEmails.map(e=>`"${e.entreprise}","${e.nom}","${e.addr}","${e.score}","${e.note}"`).join("\n");
              const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download="repertoire_emails_lyon.csv"; a.click();
            }} style={{ fontSize:12, padding:"6px 12px", borderRadius:8, cursor:"pointer", border:"1px solid #3f3f46", background:"#18181b", color:"#fff" }}>Exporter CSV</button>
          </div>

          {/* Draft Area */}
          {(loadingDraft || emailDraft || draftError) && (
            <div style={{ background:"#111", border:"1px solid #27272a", borderRadius:12, padding:16, marginBottom:20, position:"relative" }}>
              <button onClick={() => setEmailDraft(null)} style={{ position:"absolute", top:10, right:10, background:"none", border:"none", color:"#71717a", cursor:"pointer", fontSize:16 }}>✕</button>
              {loadingDraft ? (
                <div style={{ textAlign:"center", padding:20 }}>
                  <div style={{ fontSize:24, animation:"spin 1s linear infinite", display:"inline-block", marginBottom:10 }}>⟳</div>
                  <div style={{ fontSize:14, color:"#a1a1aa" }}>Rédaction de votre mail direct...</div>
                </div>
              ) : draftError ? (
                <div style={{ color:"#f87171", fontSize:13 }}>⚠️ {draftError}</div>
              ) : emailDraft && (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontSize:12, color:"#71717a", fontWeight:700, textTransform:"uppercase" }}>Draft pour {emailDraft.contact.nom} ({emailDraft.company.name})</div>
                  <div style={{ background:"#09090b", border:"1px solid #27272a", borderRadius:8, padding:12 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:4 }}>Objet : {emailDraft.objet}</div>
                    <div style={{ fontSize:13, color:"#cbd5e1", whiteSpace:"pre-wrap", lineHeight:1.5 }}>{emailDraft.corps}</div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => copy(emailDraft.corps, "draft-body")} style={{ flex:1, padding:"8px", borderRadius:8, background:"#2563eb", color:"#fff", border:"none", fontWeight:600, cursor:"pointer", fontSize:12 }}>
                      {copied === "draft-body" ? "✓ Copié" : "Copier le corps"}
                    </button>
                    <button onClick={() => copy(emailDraft.objet, "draft-obj")} style={{ flex:1, padding:"8px", borderRadius:8, background:"#27272a", color:"#fff", border:"1px solid #3f3f46", fontWeight:600, cursor:"pointer", fontSize:12 }}>
                      {copied === "draft-obj" ? "✓ Objet copié" : "Copier l'objet"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[...dynamicTargets, ...TARGETS].map(t => t.contacts.map((c, ci) => c.emails.map((e, ei) => (
              <div key={`${t.id}-${ci}-${ei}`} style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                  <span style={{ color:SC[e.score], fontSize:14 }}>{e.score}</span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{e.addr}</div>
                    <div style={{ fontSize:11, color:"#71717a" }}>{c.nom} · <span style={{color:"#a1a1aa"}}>{t.name}</span></div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => generateDraft(c, t)} disabled={loadingDraft} style={{ padding:"4px 10px", borderRadius:6, fontSize:11, cursor:"pointer", border:"1px solid #7c3aed", background:"#2e1065", color:"#a78bfa", fontWeight:600 }}>
                    ✍️ Mail
                  </button>
                  <button onClick={()=>copy(e.addr, `rep-${t.id}-${ci}-${ei}`)} style={{ padding:"4px 10px", borderRadius:6, fontSize:11, cursor:"pointer", border:"1px solid #3f3f46", background:"transparent", color:"#a1a1aa" }}>
                    {copied === `rep-${t.id}-${ci}-${ei}` ? "✓" : "Copier"}
                  </button>
                  <button 
                    onClick={() => handleSendApplication(t, e.addr)}
                    disabled={sendingAppId === t.id || !gmailConnected || !cvFile}
                    style={{ padding:"4px 10px", borderRadius:6, fontSize:11, cursor:"pointer", border:"1px solid #2563eb", background:applied[t.id] ? "#1e3a8a" : "#2563eb", color:"#fff", fontWeight:700 }}
                  >
                    {sendingAppId === t.id ? "..." : applied[t.id] ? "✓ Envoyé" : "🚀 Postuler"}
                  </button>
                </div>
              </div>
            )))).flat(2)}
          </div>
        </div>
      )}

      {/* ══ EMAIL PREVIEW MODAL ══ */}
      {previewEmail && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
          <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:16, width:"100%", maxWidth:600, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)" }}>
            <div style={{ padding:20, borderBottom:"1px solid #27272a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ fontSize:18, fontWeight:700 }}>Aperçu de votre candidature</h3>
              <button onClick={() => { setPreviewEmail(null); setSendingAppId(null); }} style={{ background:"none", border:"none", color:"#71717a", cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ padding:20, overflowY:"auto", display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ fontSize:11, color:"#71717a", fontWeight:700, textTransform:"uppercase", display:"block", marginBottom:4 }}>Destinataire</label>
                <div style={{ fontSize:14, color:"#fff", background:"#09090b", padding:"8px 12px", borderRadius:8, border:"1px solid #27272a" }}>{previewEmail.emailAddr}</div>
              </div>
              <div>
                <label style={{ fontSize:11, color:"#71717a", fontWeight:700, textTransform:"uppercase", display:"block", marginBottom:4 }}>Objet</label>
                <input 
                  value={previewEmail.subject} 
                  onChange={e => setPreviewEmail({...previewEmail, subject: e.target.value})}
                  style={{ width:"100%", fontSize:14, color:"#fff", background:"#09090b", padding:"8px 12px", borderRadius:8, border:"1px solid #27272a" }} 
                />
              </div>
              <div>
                <label style={{ fontSize:11, color:"#71717a", fontWeight:700, textTransform:"uppercase", display:"block", marginBottom:4 }}>Corps du message</label>
                <textarea 
                  value={previewEmail.body} 
                  onChange={e => setPreviewEmail({...previewEmail, body: e.target.value})}
                  style={{ width:"100%", height:300, fontSize:14, color:"#cbd5e1", background:"#09090b", padding:"12px", borderRadius:8, border:"1px solid #27272a", lineHeight:1.5, resize:"none" }} 
                />
              </div>
              <div style={{ fontSize:12, color: cvFile ? "#71717a" : "#ef4444", display:"flex", alignItems:"center", gap:8, fontWeight: cvFile ? 400 : 700 }}>
                <FileText size={14} /> {cvFile ? `Pièce jointe : ${cvFile}` : "⚠️ AUCUN CV TÉLÉCHARGÉ ! L'email sera envoyé sans pièce jointe."}
              </div>
            </div>
            <div style={{ padding:20, borderTop:"1px solid #27272a", display:"flex", gap:12 }}>
              <button 
                onClick={() => { setPreviewEmail(null); setSendingAppId(null); }}
                style={{ flex:1, padding:"12px", borderRadius:10, background:"transparent", color:"#a1a1aa", border:"1px solid #3f3f46", fontWeight:600, cursor:"pointer" }}
              >
                Annuler
              </button>
              <button 
                onClick={confirmSendApplication}
                style={{ flex:2, padding:"12px", borderRadius:10, background:"#2563eb", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", boxShadow:"0 10px 15px -3px rgba(37,99,235,0.4)" }}
              >
                Confirmer et envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ STATUS NOTIFICATION ══ */}
      {appStatus && (
        <div style={{ position:"fixed", bottom:24, right:24, background:"#18181b", border:"1px solid #27272a", padding:"16px 24px", borderRadius:12, boxShadow:"0 20px 25px -5px rgba(0,0,0,0.5)", display:"flex", alignItems:"center", gap:12, zIndex:2000, animation:"slide-in-from-bottom-4 0.3s ease-out" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:appStatus.includes("Erreur") ? "#ef4444" : "#3b82f6", animation:"pulse 2s infinite" }} />
          <span style={{ fontSize:14, fontWeight:600, color:appStatus.includes("Erreur") ? "#fca5a5" : "#fff" }}>{appStatus}</span>
          <button onClick={() => setAppStatus(null)} style={{ background:"none", border:"none", color:"#71717a", cursor:"pointer", marginLeft:8 }}>✕</button>
        </div>
      )}
    </div>
  );
}
