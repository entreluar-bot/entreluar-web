"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import InstallAppButton from "../ui/InstallAppButton";

type NewsletterStatus = "idle" | "preparing" | "sending" | "complete" | "partial" | "failed";

type NewsletterResult = {
  success: boolean;
  dispatchId: string;
  requested: number;
  accepted: number;
  failed: number;
  skipped: number;
  message?: string;
  errors: Array<{ batch: number; failed: number; message: string }>;
};

type EmailDelivery = {
  id?: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt?: string;
  type: "marketing" | "resposta";
};

type TrafficSourceStat = {
  source: "instagram" | "facebook" | "direct" | "internet";
  label: string;
  visits: number;
  uniqueSessions: number;
  conversions: number;
  conversionRate: number;
};

type TrafficPeriod = {
  label: string;
  visits: number;
  uniqueSessions: number;
  conversions: number;
  conversionRate: number;
  sources: TrafficSourceStat[];
  topPages: Array<{ path: string; visits: number }>;
};

type TrafficAnalytics = {
  generatedAt: string;
  periods: {
    today: TrafficPeriod;
    last7: TrafficPeriod;
    last30: TrafficPeriod;
    all: TrafficPeriod;
  };
  recentConversions: Array<{ email: string; path?: string | null; source?: string | null; created_at: string }>;
};

type LuanaMemory = {
  id: string;
  category: "identidade" | "rotina" | "experiencia" | "opiniao" | "linguagem" | "limite";
  content: string;
  tags: string[];
  privacy: "publica" | "editorial" | "privada";
  status: "sugerida" | "aprovada" | "arquivada";
  allow_in_content: boolean;
  valid_until?: string | null;
};

type SiteComment = {
  id: string;
  journal_id: string;
  email: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  source_path?: string | null;
  created_at: string;
  approved_at?: string | null;
  moderated_at?: string | null;
  journal?: { title?: string | null; category?: string | null } | { title?: string | null; category?: string | null }[] | null;
};

type AiUsageSummary = {
  inputTokens: number; outputTokens: number; thoughtTokens: number; totalTokens: number; searches: number;
  costBrl: number; retries: number; cacheHits: number; latency: { p50: number; p95: number };
  last24h: { costBrl: number; totalTokens: number }; last7d: { costBrl: number; totalTokens: number };
  byType: Array<{ type: string; costBrl: number; totalTokens: number }>;
};

type ManageType = "papo" | "estudei" | "vitrine";

const formatPostDate = (value?: string) => value
  ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value))
  : "Sem data";

const toDateInputValue = (value?: string) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const emptyAiUsage: AiUsageSummary = {
  inputTokens: 0, outputTokens: 0, thoughtTokens: 0, totalTokens: 0, searches: 0, costBrl: 0, retries: 0, cacheHits: 0,
  latency: { p50: 0, p95: 0 }, last24h: { costBrl: 0, totalTokens: 0 }, last7d: { costBrl: 0, totalTokens: 0 }, byType: [],
};

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], "image.jpg", { type: "image/jpeg" }));
          } else {
            reject(new Error("Falha ao comprimir imagem"));
          }
        }, "image/jpeg", 0.7);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"product" | "blog" | "manage" | "comments" | "inbox" | "quotes" | "drops" | "newsletter" | "memory">("product");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [impressions, setImpressions] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [displayImageFile, setDisplayImageFile] = useState<File | null>(null);
  const [displayPreviewUrl, setDisplayPreviewUrl] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [postDate, setPostDate] = useState("");
  const [productCategory, setProductCategory] = useState("SkinCare");
  const [isAccessory, setIsAccessory] = useState(false);
  const [productExperience, setProductExperience] = useState<"nao_informado" | "pesquisado" | "impressao_inicial" | "testado">("nao_informado");
  const [productTestDuration, setProductTestDuration] = useState("");
  
  const [quoteText, setQuoteText] = useState("");
  const [quotes, setQuotes] = useState<any[]>([]);

  const [dropTitle, setDropTitle] = useState("");
  const [dropUrl, setDropUrl] = useState("");
  const [drops, setDrops] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [generatedProductName, setGeneratedProductName] = useState("");
  const [generatedReview, setGeneratedReview] = useState("");
  const [generatedBlogTitle, setGeneratedBlogTitle] = useState("");
  const [generatedBlogPost, setGeneratedBlogPost] = useState("");
  const [accessoryDetailsUsed, setAccessoryDetailsUsed] = useState<string[]>([]);
  const [accessoryHumorApplied, setAccessoryHumorApplied] = useState(false);

  const [emails, setEmails] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");

  const [products, setProducts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [manageType, setManageType] = useState<ManageType>("papo");
  
  const [blogCategory, setBlogCategory] = useState("Papo de Mulher Madura");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isMostViewed, setIsMostViewed] = useState(false);
  const [isNew, setIsNew] = useState(true);
  
  // Newsletter
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [subscriberNotes, setSubscriberNotes] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<NewsletterStatus>("idle");
  const [newsletterDispatchId, setNewsletterDispatchId] = useState<string | null>(null);
  const [emailSubscribers, setEmailSubscribers] = useState<string[]>([]);
  const [emailDeliveries, setEmailDeliveries] = useState<EmailDelivery[]>([]);
  const [emailAdminSearch, setEmailAdminSearch] = useState("");
  const [nlType, setNlType] = useState<"site" | "blog" | "produto" | "resenha" | "pilula">("site");
  const [nlContext, setNlContext] = useState("");
  const [nlSubject, setNlSubject] = useState("");
  const [nlHtml, setNlHtml] = useState("");
  const [trafficAnalytics, setTrafficAnalytics] = useState<TrafficAnalytics | null>(null);
  const [trafficAnalyticsStatus, setTrafficAnalyticsStatus] = useState("Carregando tráfego...");

  const [memories, setMemories] = useState<LuanaMemory[]>([]);
  const [comments, setComments] = useState<SiteComment[]>([]);
  const [memoryContent, setMemoryContent] = useState("");
  const [memoryTags, setMemoryTags] = useState("");
  const [memoryCategory, setMemoryCategory] = useState<LuanaMemory["category"]>("opiniao");
  const [memoryPrivacy, setMemoryPrivacy] = useState<LuanaMemory["privacy"]>("editorial");
  const [memoryAllowInContent, setMemoryAllowInContent] = useState(false);
  const [aiUsage, setAiUsage] = useState<AiUsageSummary>(emptyAiUsage);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = "/admin/login";
      else setUser(data.user);
    });
  }, []);

  useEffect(() => {
    if (activeTab === "inbox") fetchEmails();
    if (activeTab === "manage" || activeTab === "quotes" || activeTab === "drops") fetchManageData();
    if (activeTab === "newsletter") {
      fetchSubscribers();
      fetchTrafficAnalytics();
    }
    if (activeTab === "comments") fetchComments();
    if (activeTab === "memory") fetchMemories();
  }, [activeTab]);

  const adminRequest = async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}`, ...(init?.headers || {}) },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a ação.");
    return data;
  };

  const memoryRequest = async (path = "", init?: RequestInit) => {
    return adminRequest(`/api/luana-memory${path}`, init);
  };

  const fetchComments = async () => {
    try {
      const data = await adminRequest("/api/comments/admin");
      setComments(data.comments || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar comentários.");
    }
  };

  const fetchMemories = async () => {
    try {
      const data = await memoryRequest();
      setMemories(data.memories || []);
      setAiUsage({ ...emptyAiUsage, ...(data.usage || {}) });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar a memória.");
    }
  };

  useEffect(() => {
    if (user) fetchMemories();
  }, [user]);

  const confirmAiSpend = () => aiUsage.costBrl < 10 || confirm("A meta mensal de R$ 10 já foi alcançada. Deseja mesmo gerar outro conteúdo com custo de IA?");

  const handleSaveMemory = async () => {
    if (memoryContent.trim().length < 3) return setMessage("Escreva uma lembrança um pouco mais completa.");
    setLoading(true);
    try {
      await memoryRequest("", { method: "POST", body: JSON.stringify({ content: memoryContent, tags: memoryTags, category: memoryCategory, privacy: memoryPrivacy, allowInContent: memoryAllowInContent }) });
      setMemoryContent(""); setMemoryTags(""); setMemoryAllowInContent(false);
      setMessage("Memória aprovada e guardada ✨");
      await fetchMemories();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível guardar a memória."); }
    setLoading(false);
  };

  const handleMemoryStatus = async (memory: LuanaMemory, status: LuanaMemory["status"]) => {
    try {
      await memoryRequest("", { method: "PATCH", body: JSON.stringify({ id: memory.id, status }) });
      await fetchMemories();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a memória."); }
  };

  const handleCommentStatus = async (comment: SiteComment, status: SiteComment["status"]) => {
    try {
      setLoading(true);
      await adminRequest("/api/comments/admin", { method: "PATCH", body: JSON.stringify({ id: comment.id, status }) });
      await fetchComments();
      setMessage(status === "approved" ? "Comentário aprovado e publicado na roda. ✨" : status === "rejected" ? "Comentário rejeitado e escondido do site." : "Comentário voltou para pendente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível moderar comentário.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMemory = async (memory: LuanaMemory) => {
    const content = prompt("Corrija esta memória:", memory.content)?.trim();
    if (!content || content === memory.content) return;
    try {
      await memoryRequest("", { method: "PATCH", body: JSON.stringify({ id: memory.id, content }) });
      await fetchMemories();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível corrigir a memória."); }
  };

  const handleMemoryPrivacy = async (memory: LuanaMemory, privacy: LuanaMemory["privacy"]) => {
    try {
      await memoryRequest("", { method: "PATCH", body: JSON.stringify({ id: memory.id, privacy, allowInContent: privacy === "publica" ? memory.allow_in_content : false }) });
      await fetchMemories();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível mudar a privacidade."); }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm("Excluir esta memória da Luana?")) return;
    try {
      await memoryRequest(`?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await fetchMemories();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível excluir a memória."); }
  };

  const fetchSubscribers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/send-newsletter", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível consultar a base.");
      setSubscribersCount(data.requested || 0);
      setEmailSubscribers(data.subscribers || []);
      setEmailDeliveries(data.deliveries || []);
      const ignored = (data.invalid || 0) + (data.duplicates || 0);
      setSubscriberNotes(ignored > 0 ? `${ignored} cadastro${ignored === 1 ? " foi ignorado" : "s foram ignorados"} por estar inválido ou repetido.` : "Base validada e pronta para envio.");
    } catch (error) {
      setSubscribersCount(0);
      setEmailSubscribers([]);
      setEmailDeliveries([]);
      setSubscriberNotes(error instanceof Error ? error.message : "Não foi possível consultar a base.");
    }
  };

  const fetchTrafficAnalytics = async () => {
    try {
      setTrafficAnalyticsStatus("Carregando tráfego...");
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/traffic-analytics", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível consultar o tráfego.");
      setTrafficAnalytics(data);
      setTrafficAnalyticsStatus("");
    } catch (error) {
      setTrafficAnalytics(null);
      setTrafficAnalyticsStatus(error instanceof Error ? error.message : "Não foi possível consultar o tráfego.");
    }
  };

  const fetchEmails = async () => {
    const { data } = await supabase.from("emails").select("*").order("created_at", { ascending: false });
    if (data) setEmails(data);
  };

  const fetchManageData = async () => {
    const { data: pData } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (pData) setProducts(pData);
    const { data: jData } = await supabase.from("journal").select("*").order("created_at", { ascending: false });
    if (jData) setJournals(jData);
    const { data: qData } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    if (qData) setQuotes(qData);
    const { data: dData } = await supabase.from("drops").select("*").order("created_at", { ascending: false });
    if (dData) setDrops(dData);
  };

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    if (!displayImageFile) {
      setDisplayPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(displayImageFile);
    setDisplayPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [displayImageFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          if (generatedReview || generatedBlogPost) {
            setDisplayImageFile(file);
            setMessage("Foto Oficial colada com sucesso!");
          } else {
            setImageFile(file);
            setMessage("Foto copiada com sucesso!");
          }
        }
      }
    }
  }, [generatedReview, generatedBlogPost]);

  const handleGenerateText = async () => {
    if (!confirmAiSpend()) return;
    if (!imageFile) return setMessage("Você precisa colar uma imagem do produto primeiro!");
    if (!link) return setMessage("O link da loja é obrigatório!");

    setLoading(true);
    setAccessoryDetailsUsed([]);
    setAccessoryHumorApplied(false);
    setMessage("Iniciando mágica (pode demorar uns 15 segundos)...");
    const progressTimers = [
      window.setTimeout(() => setMessage(title ? "Consultando a pesquisa já guardada..." : "Identificando o produto na foto..."), 1200),
      window.setTimeout(() => setMessage("Conferindo fórmula e evidências..."), 4500),
      window.setTimeout(() => setMessage("Escrevendo a Vitrine e o artigo..."), 9500),
    ];
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      let tempAiImageUrl = "";
      if (imageFile) {
        setMessage("Enviando foto para a IA analisar...");
        const compressedFile = await compressImage(imageFile);
        const fileName = `ai_temp_${Math.random()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("products").upload(fileName, compressedFile);
        if (!uploadError) {
          const { data } = supabase.storage.from("products").getPublicUrl(fileName);
          tempAiImageUrl = data.publicUrl;
        }
      }

      setMessage("A IA está lendo o nome na foto e pesquisando o ativo...");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ title, link, impressions, imageUrl: tempAiImageUrl, isAccessory, experienceStatus: productExperience, testDuration: productTestDuration, requestId: crypto.randomUUID() })
      });

      const textRes = await res.text();
      let data;
      try {
        data = JSON.parse(textRes);
      } catch (e) {
        if (textRes.includes("502") || textRes.includes("Timeout") || textRes.includes("<html")) {
           throw new Error("A IA demorou muito para responder. Tente gerar novamente.");
        }
        throw new Error("Erro na formatação da resposta: " + textRes.substring(0, 50));
      }

      if (!res.ok || data.error) throw new Error(data.error || "Não consegui gerar o texto agora.");

      setGeneratedProductName(data.productName);
      setGeneratedReview(data.productReview);
      setGeneratedBlogTitle(data.blogTitle);
      setGeneratedBlogPost(data.blogPost);
      setAccessoryDetailsUsed(Array.isArray(data.inputDetailsUsed) ? data.inputDetailsUsed : []);
      setAccessoryHumorApplied(Boolean(data.humorApplied));
      setBlogCategory("Estudei para te explicar");
      const seconds = data.performance?.durationMs ? ` em ${(data.performance.durationMs / 1000).toFixed(1)}s` : "";
      const cacheNote = data.performance?.cached ? " usando o cache econômico" : "";
      setMessage(`Textos gerados${seconds}${cacheNote}! Revise e publique.`);
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    progressTimers.forEach(window.clearTimeout);
    setLoading(false);
  };

  const handleBrainstorm = async () => {
    if (!confirmAiSpend()) return;
    setLoading(true);
    setMessage("Pensando em ideias polêmicas e divertidas...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ action: "brainstorm" })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setImpressions(data.text);
      setMessage("Ideias geradas! Escolha uma e coloque no Título.");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setLoading(false);
  };

  const handleGenerateBlogOnly = async () => {
    if (!confirmAiSpend()) return;
    if (!title && !impressions) return setMessage("Digite um tema ou impressões para gerar o artigo!");
    setLoading(true);
    setMessage("Escrevendo crônica do Diário...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      let tempAiImageUrl = "";
      if (imageFile) {
        const compressedFile = await compressImage(imageFile);
        const fileName = `ai_temp_${Math.random()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("products").upload(fileName, compressedFile);
        if (!uploadError) {
          const { data } = supabase.storage.from("products").getPublicUrl(fileName);
          tempAiImageUrl = data.publicUrl;
        }
      }

      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ title, impressions, category: blogCategory, imageUrl: tempAiImageUrl })
      });
      
      const textRes = await res.text();
      let data;
      try {
        data = JSON.parse(textRes);
      } catch (e) {
        throw new Error("A IA falhou em formatar a resposta. Tente novamente.");
      }

      if (data.error) throw new Error(data.error);

      setGeneratedBlogTitle(data.title || title || "Crônica da Luana");
      setGeneratedBlogPost(data.text);
      
      if (data.imagePrompt) {
        setMessage("Buscando inspiração de imagem fotográfica...");
        try {
          const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(data.imagePrompt)}?width=800&height=800&nologo=true`;
          const imageResponse = await fetch(imgUrl);
          const blob = await imageResponse.blob();
          const file = new File([blob], "ai_generated_blog.jpg", { type: "image/jpeg" });
          setDisplayImageFile(file);
        } catch (imgError) {
          console.error("Erro ao baixar imagem da IA:", imgError);
        }
      }

      setMessage("Crônica gerada com sucesso! Revise e publique.");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setLoading(false);
  };

  const handleGenerateNewsletter = async () => {
    if (!confirmAiSpend()) return;
    setLoading(true);
    setNewsletterStatus("preparing");
    setMessage("Escrevendo email...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const res = await fetch("/api/generate-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ emailType: nlType, contextText: nlContext })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNlSubject(data.subject);
      setNlHtml(data.html);
      setNewsletterDispatchId(null);
      setNewsletterStatus("idle");
      setMessage("Email gerado! Revise o assunto e o corpo abaixo antes de disparar.");
    } catch (error: any) {
      setNewsletterStatus("failed");
      setMessage("Erro: " + error.message);
    }
    setLoading(false);
  };

  const handleSendNewsletter = async () => {
    if (!nlSubject || !nlHtml) return setMessage("Gere ou preencha o email antes de disparar!");
    if (!confirm(`Tem certeza que deseja enviar este email para ${subscribersCount} assinantes?`)) return;
    
    setLoading(true);
    setNewsletterStatus("sending");
    setMessage("Disparando emails...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const dispatchId = newsletterDispatchId || crypto.randomUUID();
      setNewsletterDispatchId(dispatchId);
      const res = await fetch("/api/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ subject: nlSubject, html: nlHtml, emailType: nlType, dispatchId })
      });
      const data = await res.json() as NewsletterResult & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error || data.errors?.[0]?.message || "O disparo não foi aceito.");
      if (data.success && data.requested === 0 && data.skipped > 0) {
        setNewsletterStatus("complete");
        setMessage(data.message || `Envio protegido: ${data.skipped} assinantes já tinham recebido este conteúdo.`);
      } else if (data.success) {
        setNewsletterStatus("complete");
        const historyWarning = data.errors?.find((item) => item.batch === 0)?.message;
        const skippedMessage = data.skipped > 0 ? ` ${data.skipped} destinatária${data.skipped === 1 ? " foi preservada" : "s foram preservadas"} porque já havia recebido este conteúdo.` : "";
        setMessage(`Concluído! ${data.accepted} de ${data.requested} emails foram aceitos pelo provedor. 🎉${skippedMessage}${historyWarning ? ` ${historyWarning}` : ""}`);
        setNlSubject("");
        setNlHtml("");
        setNewsletterDispatchId(null);
        await fetchSubscribers();
      } else {
        setNewsletterStatus("partial");
        setMessage(`Envio parcial: ${data.accepted} aceitos e ${data.failed} não enviados. Você pode tentar novamente com segurança.`);
      }
    } catch (error: any) {
      setNewsletterStatus("failed");
      setMessage("Erro: " + error.message);
    }
    setLoading(false);
  };

  const handleGenerateQuote = async () => {
    if (!confirmAiSpend()) return;
    setLoading(true);
    setMessage("Buscando inspiração nas estrelas...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
      });
      
      const responseText = await res.text();
      let data: { text?: string; quotes?: string[]; error?: string };
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("A resposta veio incompleta. Tente gerar novamente.");
      }
      if (!res.ok || data.error) throw new Error(data.error || "Não consegui gerar as pílulas agora.");

      const generatedQuotes = Array.isArray(data.quotes) ? data.quotes : String(data.text || "").split("\n").filter(Boolean);
      if (generatedQuotes.length !== 15) throw new Error("O lote não trouxe as 15 pílulas esperadas. Tente novamente.");
      setQuoteText(generatedQuotes.join("\n"));
      setMessage("15 pílulas geradas! Revise, edite e só publique quando estiver feliz com o lote.");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setLoading(false);
  };

  const handlePublishQuote = async () => {
    if (!quoteText) return;
    setLoading(true);
    try {
      const quotesArray = quoteText.split('\n').map(q => q.trim()).filter(q => q.length > 5);
      const insertData = quotesArray.map(q => ({ quote: q }));
      
      const { error } = await supabase.from("quotes").insert(insertData);
      if (error) throw error;
      
      setQuoteText("");
      setMessage(`${quotesArray.length} Pílulas publicadas com sucesso!`);
    } catch (error: any) {
      setMessage("Erro ao publicar: " + error.message);
    }
    setLoading(false);
  };

  const handlePublishDrop = async () => {
    if (!dropUrl) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("drops").insert([{ title: "Drop", instagram_url: dropUrl }]);
      if (error) throw error;
      setDropUrl("");
      setMessage("Drop publicado com sucesso!");
    } catch (error: any) {
      setMessage("Erro ao publicar Drop: " + error.message);
    }
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!generatedReview && !generatedBlogPost) return;
    
    setLoading(true);
    setMessage("Fazendo upload da foto...");
    
    try {
      let finalPublicUrl = "";
      const fileToUpload = displayImageFile || imageFile;
      
      if (fileToUpload) {
        const compressedFile = await compressImage(fileToUpload);
        const fileName = `official_${Math.random()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("products").upload(fileName, compressedFile);
        if (uploadError) throw new Error("Erro no upload da foto oficial.");
        
        const { data } = supabase.storage.from("products").getPublicUrl(fileName);
        finalPublicUrl = data.publicUrl;
      }

      setMessage("Publicando nos canais...");

      const insertPayload: any = {};
      if (postDate) {
        insertPayload.created_at = new Date(postDate + "T12:00:00").toISOString();
      }

      let journalId = null;
      if (generatedBlogPost && !isAccessory) {
        const { data: journalData, error: blogError } = await supabase.from("journal").insert([{
          title: generatedBlogTitle,
          content: generatedBlogPost,
          image_url: finalPublicUrl,
          category: blogCategory,
          is_featured: isFeatured,
          is_most_viewed: isMostViewed,
          is_new: isNew,
          ...insertPayload
        }]).select("id").single();
        
        if (blogError) throw blogError;
        journalId = journalData?.id;

        if (isNew && journalId) {
          const previousNew = supabase.from("journal").update({ is_new: false }).neq("id", journalId);
          if (blogCategory === "Estudei para te explicar") {
            await previousNew.eq("category", "Estudei para te explicar");
          } else {
            await previousNew.or('category.is.null,category.neq."Estudei para te explicar"');
          }
        }
      }

      if (activeTab === "product" && generatedReview) {
        const finalTitle = generatedProductName || title;
        
        // Se gerou um post de diário, atualizar o link genérico para o link exato da resenha
        let finalReview = generatedReview;
        if (journalId) {
          finalReview = finalReview.replace(/href="\/blog"/g, `href="/resenhas/${journalId}"`);
        }

        const { data: prodData, error: prodError } = await supabase.from("products").insert([{
          title: finalTitle,
          description: finalReview,
          shopee_link: link,
          image_url: finalPublicUrl,
          price,
          category: productCategory,
          is_featured: isFeatured,
          is_most_purchased: isMostViewed,
          is_most_viewed: isMostViewed,
          is_new: isNew,
          ...insertPayload
        }]).select("id").single();
        if (prodError) throw prodError;

        if (isNew && prodData?.id) {
          await supabase.from("products").update({ is_new: false }).neq("id", prodData.id);
        }
      }

      setMessage("Sucesso! Tudo publicado no ar!");
      setTitle(""); setLink(""); setImpressions("");
      setImageFile(null); setDisplayImageFile(null); setPrice("");
      setGeneratedReview(""); setGeneratedProductName("");
      setGeneratedBlogTitle(""); setGeneratedBlogPost("");
      setPostDate("");

    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setLoading(false);
  };

  const handleSendReply = async () => {
    if (!replyTo || !replyBody) return;
    setLoading(true);
    setMessage("Enviando resposta...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ to: replyTo, subject: replySubject || "Resposta - Entreluar", text: replyBody, dispatchId: crypto.randomUUID() })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "O email não foi aceito.");
      setMessage(data.warning || "E-mail enviado com sucesso!");
      setReplyTo(""); setReplySubject(""); setReplyBody("");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Certeza que deseja deletar este produto da vitrine?")) {
      await supabase.from("products").delete().eq("id", id);
      fetchManageData();
    }
  };

  const handleDeleteJournal = async (id: string) => {
    if (!confirm("Deletar este artigo?")) return;
    try {
      await supabase.from("journal").delete().eq("id", id);
      fetchManageData();
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm("Deletar esta pílula?")) return;
    try {
      await supabase.from("quotes").delete().eq("id", id);
      fetchManageData();
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteDrop = async (id: string) => {
    if (!confirm("Deletar este Drop?")) return;
    try {
      await supabase.from("drops").delete().eq("id", id);
      fetchManageData();
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    if (!editingItem.created_at) return setMessage("Escolha a data da publicação antes de salvar.");
    setLoading(true);
    const createdAt = new Date(`${editingItem.created_at}T12:00:00-03:00`).toISOString();
    try {
      if (editingItem.type === "product") {
        const { error } = await supabase.from("products").update({
          title: editingItem.title,
          description: editingItem.content,
          category: editingItem.category,
          is_featured: Boolean(editingItem.is_featured),
          is_most_purchased: Boolean(editingItem.is_most_purchased),
          is_most_viewed: Boolean(editingItem.is_most_viewed),
          is_new: Boolean(editingItem.is_new),
          created_at: createdAt,
        }).eq("id", editingItem.id);
        if (error) throw error;
        if (editingItem.is_new) {
          await supabase.from("products").update({ is_new: false }).neq("id", editingItem.id);
        }
      } else {
        const { error } = await supabase.from("journal").update({ 
          title: editingItem.title, 
          content: editingItem.content, 
          category: editingItem.category,
          is_featured: Boolean(editingItem.is_featured),
          is_most_viewed: Boolean(editingItem.is_most_viewed),
          is_new: Boolean(editingItem.is_new),
          created_at: createdAt,
        }).eq("id", editingItem.id);
        if (error) throw error;
        if (editingItem.is_new) {
          const previousNew = supabase.from("journal").update({ is_new: false }).neq("id", editingItem.id);
          if (editingItem.category === "Estudei para te explicar") {
            await previousNew.eq("category", "Estudei para te explicar");
          } else {
            await previousNew.or('category.is.null,category.neq."Estudei para te explicar"');
          }
        }
      }
      setEditingItem(null);
      fetchManageData();
      setMessage("Atualizado com sucesso! As classificações já estão refletidas nos filtros.");
    } catch (error: any) {
      alert(error.message);
    }
    setLoading(false);
  };

  const trafficPeriods = trafficAnalytics ? [
    trafficAnalytics.periods.today,
    trafficAnalytics.periods.last7,
    trafficAnalytics.periods.last30,
    trafficAnalytics.periods.all,
  ] : [];
  const trafficSourceRows = trafficAnalytics?.periods.last30.sources || [];

  if (!user) return <div className="admin-shell grid min-h-screen place-items-center text-[var(--color-gold)]"><div className="glass-panel rounded-3xl px-8 py-6">Preparando o seu ateliê… ✨</div></div>;

  return (
    <div className="admin-shell min-h-screen px-4 py-6 md:p-8" onPaste={handlePaste}>
      <div className="mx-auto max-w-5xl">
        <header className="glass-panel mb-8 flex flex-col gap-5 rounded-[28px] p-5 md:flex-row md:items-center md:justify-between md:p-7">
          <div>
            <p className="eyebrow mb-2">Ateliê de conteúdo</p>
            <h1 className="font-display text-4xl text-[var(--color-gold-light)]">Painel da Luana</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Crie, revise e publique. Para colar fotos, use Ctrl+V.</p>
          </div>
          <div className="flex flex-col items-end gap-3">
              <div className="text-right text-[var(--color-gold-light)] opacity-70 text-xs">
                <p className="font-bold tracking-widest uppercase">Versão 1.59</p>
                <p>Atualizado em 24/09/2026 às 20:32</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <InstallAppButton variant="admin" />
              <button onClick={() => { supabase.auth.signOut(); window.location.href = "/admin/login"; }} className="border border-[var(--color-gold)] text-[var(--color-gold)] px-4 py-2 rounded text-xs uppercase hover:bg-[var(--color-wine-light)] transition-colors">
                Sair do Painel
              </button>
            </div>
          </div>
        </header>

        <div className="admin-tabs mb-8 flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => { setActiveTab("product"); setGeneratedReview(""); }} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "product" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Vitrine (Mágica)
          </button>
          <button onClick={() => { setActiveTab("blog"); setGeneratedBlogPost(""); }} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "blog" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Papo de Mulher Madura
          </button>
          <button onClick={() => setActiveTab("manage")} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "manage" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Gerenciar
          </button>
          <button onClick={() => setActiveTab("comments")} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "comments" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Comentários
          </button>
          <button onClick={() => { setActiveTab("quotes"); setQuoteText(""); }} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "quotes" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Pílulas (Quotes)
          </button>
          <button onClick={() => setActiveTab("drops")} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "drops" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Drops (Insta)
          </button>
          <button onClick={() => setActiveTab("inbox")} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "inbox" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            E-mails
          </button>
          <button onClick={() => setActiveTab("newsletter")} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "newsletter" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Marketing
          </button>
          <button onClick={() => setActiveTab("memory")} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "memory" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Memória IA
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="glass-panel mx-auto w-full max-w-4xl rounded-[28px] p-4 shadow-lg md:p-8">
            
            {activeTab === "product" && (
              <div className="space-y-6">
                {!generatedReview ? (
                  <>
                    <div className="border-2 border-dashed border-[var(--color-wine-light)] rounded-xl p-6 text-center bg-[var(--color-wine-dark)] relative flex flex-col items-center justify-center">
                      <input type="file" id="aiFileInput" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]); }} />
                      {previewUrl ? (
                        <div className="relative inline-block mt-4 mb-4">
                          <img src={previewUrl} alt="Preview" className="mx-auto max-h-48 object-contain rounded" />
                          <button onClick={(e) => { e.stopPropagation(); setImageFile(null); }} className="absolute -top-3 -right-3 bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors shadow-lg border-2 border-[var(--color-wine-dark)]" title="Excluir Foto">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="text-[var(--color-gold-light)] mb-4">
                          <span className="text-3xl block mb-2">📸</span>
                          <p className="font-bold uppercase tracking-widest text-xs">Cole a Foto do Produto Aqui (Ctrl+V)</p>
                          <p className="text-xs opacity-70">A IA vai extrair o nome e os ingredientes</p>
                        </div>
                      )}
                      {!previewUrl && (
                        <button onClick={() => document.getElementById("aiFileInput")?.click()} className="border border-[var(--color-gold)] text-[var(--color-gold)] px-4 py-2 rounded text-xs uppercase hover:bg-[var(--color-wine)]">Ou clique para escolher</button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-1">Link de Compra (Shopee, etc) *Obrigatório</label>
                      <input type="text" value={link} onChange={(e) => setLink(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-60 hover:opacity-100 transition-opacity">
                      <div>
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1">Dica de Nome (Opcional)</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deixe a IA descobrir" className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]" />
                      </div>
                      <div>
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1">Preço (Opcional)</label>
                        <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]" />
                      </div>
                      <div>
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1">Categoria</label>
                        <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]">
                            {PRODUCT_CATEGORIES.map((category) => <option value={category} key={category}>{category}</option>)}
                        </select>
                      </div>
                    </div>

                      <div>
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1 font-bold">Data da Postagem (Opcional)</label>
                        <input type="date" value={postDate} onChange={(e) => setPostDate(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)] mb-4" />
                      </div>

                      <fieldset className="mb-5 rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                        <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Filtros Especiais da Postagem</legend>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${isFeatured ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "border-[var(--color-wine-light)]"}`}>
                              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-5 w-5 accent-[var(--color-gold)]" />
                              <span><span className="block text-sm font-bold text-[var(--color-gold-light)]">Em destaque</span></span>
                            </label>
                            <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${isMostViewed ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "border-[var(--color-wine-light)]"}`}>
                              <input type="checkbox" checked={isMostViewed} onChange={(e) => setIsMostViewed(e.target.checked)} className="h-5 w-5 accent-[var(--color-gold)]" />
                              <span><span className="block text-sm font-bold text-[var(--color-gold-light)]">Mais Lido/Visto</span></span>
                            </label>
                            <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${isNew ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "border-[var(--color-wine-light)]"}`}>
                              <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="h-5 w-5 accent-[var(--color-gold)]" />
                              <span><span className="block text-sm font-bold text-[var(--color-gold-light)]">Selo "Novo"</span><span className="block text-[11px] text-[var(--color-gold-light)] opacity-55">Apaga post anterior</span></span>
                            </label>
                        </div>
                      </fieldset>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-[var(--color-gold-light)] text-sm mb-1">Minha relação com este produto</label>
                          <select value={productExperience} onChange={(e) => setProductExperience(e.target.value as typeof productExperience)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]">
                            <option value="nao_informado">Não informada</option><option value="pesquisado">Ainda não usei; estou pesquisando</option><option value="impressao_inicial">Primeiras impressões</option><option value="testado">Usei e testei</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[var(--color-gold-light)] text-sm mb-1">Tempo de uso, se houver</label>
                          <input value={productTestDuration} onChange={(e) => setProductTestDuration(e.target.value)} placeholder="Ex.: três semanas" className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]" />
                        </div>
                      </div>

                      <div className="opacity-80 hover:opacity-100 transition-opacity">
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1">Suas Notas Pessoais (Opcional)</label>
                        <textarea placeholder="Se você não digitar nada, a IA foca nos benefícios científicos." value={impressions} onChange={(e) => setImpressions(e.target.value)} rows={2} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]"></textarea>
                      </div>

                      <div className="flex items-center gap-3 bg-[#1a0f12] p-4 rounded-lg border border-[var(--color-wine-light)]">
                        <input 
                          type="checkbox" 
                          id="isAccessory" 
                          checked={isAccessory} 
                          onChange={(e) => setIsAccessory(e.target.checked)} 
                          className="w-5 h-5 accent-[var(--color-gold)]"
                        />
                        <label htmlFor="isAccessory" className="text-[var(--color-gold-light)] text-sm cursor-pointer select-none">
                          👗 É um acessório, roupa ou item de estilo (não possui fórmula / não gera resenha científica).
                        </label>
                      </div>

                    {message && <p className="text-sm text-[#f3e5ab] mt-2 italic text-center font-bold">{message}</p>}
                    
                    <button onClick={handleGenerateText} disabled={loading} className="w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform mt-4">
                      {loading ? "A IA ESTÁ LENDO A FOTO..." : "GERAR MÁGICA TOTAL"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className={`bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)] ${isAccessory ? "md:col-span-2" : ""}`}>
                          <h3 className="text-[var(--color-gold)] font-serif text-xl mb-4 text-center">{isAccessory ? "Vitrine (Acessório/Estilo)" : `1. Vitrine: ${generatedProductName}`}</h3>
                          <textarea value={generatedReview} onChange={(e) => setGeneratedReview(e.target.value)} rows={8} className="w-full bg-transparent text-[var(--color-gold-light)] focus:outline-none resize-none leading-relaxed" ></textarea>
                          {isAccessory && (
                            <div className="mt-4 rounded-xl border border-[var(--color-wine-light)] bg-black/15 p-4 text-sm text-[var(--color-gold-light)]">
                              <p className="font-bold text-[var(--color-gold)]">Como a IA construiu este texto</p>
                              <p className="mt-2"><span className="font-bold">Detalhes das suas notas:</span> {accessoryDetailsUsed.length ? accessoryDetailsUsed.join(" • ") : "nenhuma nota pessoal foi informada"}</p>
                              <p className="mt-1"><span className="font-bold">Humor elegante:</span> {accessoryHumorApplied ? "aplicado ✓" : "não confirmado"}</p>
                            </div>
                          )}
                        </div>
                        {!isAccessory && (
                          <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                            <h3 className="text-[var(--color-gold)] font-serif text-xl mb-4 text-center">2. Artigo do Ativo (Blog)</h3>
                            <input type="text" value={generatedBlogTitle} onChange={(e) => setGeneratedBlogTitle(e.target.value)} className="w-full bg-transparent border-b border-[var(--color-wine-light)] mb-4 text-[var(--color-gold)] font-bold focus:outline-none" />
                            <textarea value={generatedBlogPost} onChange={(e) => setGeneratedBlogPost(e.target.value)} rows={12} className="w-full bg-transparent text-[var(--color-gold-light)] focus:outline-none resize-none leading-relaxed" ></textarea>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-2 border-dashed border-[var(--color-wine-light)] rounded-xl p-6 text-center bg-[var(--color-wine-dark)] relative mt-6 flex flex-col items-center">
                      <input type="file" id="officialFileInput" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setDisplayImageFile(e.target.files[0]); }} />
                      {displayPreviewUrl ? (
                         <div className="relative inline-block mt-4 mb-4">
                          <img src={displayPreviewUrl} alt="Preview" className="mx-auto max-h-48 object-contain rounded" />
                          <button onClick={(e) => { e.stopPropagation(); setDisplayImageFile(null); }} className="absolute -top-3 -right-3 bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors shadow-lg border-2 border-[var(--color-wine-dark)]" title="Excluir Foto">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="text-[var(--color-gold-light)] mb-4">
                          <p className="font-bold uppercase tracking-widest text-sm text-[var(--color-gold)]">A foto inicial será usada na vitrine.</p>
                          <p className="text-xs opacity-70 mt-2">Quer trocar por outra foto? (Cole com Ctrl+V)</p>
                        </div>
                      )}
                      {!displayPreviewUrl && (
                        <button onClick={() => document.getElementById("officialFileInput")?.click()} className="border border-[var(--color-wine-light)] text-[var(--color-gold)] px-6 py-2 rounded uppercase tracking-widest hover:bg-[var(--color-wine)] mt-2">Escolher Outra Foto</button>
                      )}
                    </div>

                    {message && <p className="text-sm text-[#f3e5ab] mt-2 italic text-center font-bold">{message}</p>}

                    <div className="flex gap-4 mt-6">
                       <button onClick={() => { setGeneratedReview(""); setGeneratedProductName(""); setGeneratedBlogTitle(""); setGeneratedBlogPost(""); setAccessoryDetailsUsed([]); setAccessoryHumorApplied(false); }} className="flex-1 border border-[var(--color-wine-light)] text-[var(--color-gold-light)] py-4 rounded font-bold uppercase hover:bg-[var(--color-wine-dark)] transition-colors">
                        Refazer Tudo
                      </button>
                      <button onClick={handlePublish} disabled={loading} className="flex-2 w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform">
                        {loading ? "PUBLICANDO..." : "PUBLICAR EM DOBRO"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "blog" && (
               <div className="space-y-6">
                {!generatedBlogPost ? (
                  <>
                    <div className="flex justify-between items-center border-b border-[var(--color-wine-light)] pb-4">
                        <h2 className="text-xl font-serif text-[var(--color-gold)]">Gerador de Crônicas</h2>
                        <button onClick={handleBrainstorm} disabled={loading} className="border border-[#b5952f] text-[var(--color-gold)] px-4 py-2 rounded text-xs uppercase hover:bg-[var(--color-gold)] hover:text-[var(--color-wine-dark)] transition-colors">
                            💡 Me dê Ideias!
                        </button>
                    </div>

                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-1">Título / Tema da Crônica</label>
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: A libertação que é parar de tingir o cabelo" className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]" />
                    </div>

                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-1">Categoria no Diário</label>
                      <select value={blogCategory} onChange={(e) => setBlogCategory(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]">
                        <option value="Papo de Mulher Madura">🍷 Papo de Mulher Madura</option>
                        <option value="Estudei para te explicar">🧠 Estudei para te explicar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-1 font-bold">Data da Postagem (Opcional)</label>
                      <input type="date" value={postDate} onChange={(e) => setPostDate(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)] mb-4" />
                    </div>

                    <fieldset className="mb-5 rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                      <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Filtros Especiais da Postagem</legend>
                      <div className="grid gap-3 sm:grid-cols-3">
                          <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${isFeatured ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "border-[var(--color-wine-light)]"}`}>
                            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-5 w-5 accent-[var(--color-gold)]" />
                            <span><span className="block text-sm font-bold text-[var(--color-gold-light)]">Em destaque</span></span>
                          </label>
                          <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${isMostViewed ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "border-[var(--color-wine-light)]"}`}>
                            <input type="checkbox" checked={isMostViewed} onChange={(e) => setIsMostViewed(e.target.checked)} className="h-5 w-5 accent-[var(--color-gold)]" />
                            <span><span className="block text-sm font-bold text-[var(--color-gold-light)]">Mais Lido/Visto</span></span>
                          </label>
                          <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${isNew ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "border-[var(--color-wine-light)]"}`}>
                            <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="h-5 w-5 accent-[var(--color-gold)]" />
                            <span><span className="block text-sm font-bold text-[var(--color-gold-light)]">Selo "Novo"</span><span className="block text-[11px] text-[var(--color-gold-light)] opacity-55">Apaga post anterior</span></span>
                          </label>
                      </div>
                    </fieldset>

                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-1">Suas Impressões / Anotações (A IA vai transformar isso em texto!)</label>
                      <textarea placeholder="O que você quer falar sobre esse tema? Ex: Na menopausa ninguém te avisa que a paciência acaba mais rápido que o colágeno..." value={impressions} onChange={(e) => setImpressions(e.target.value)} rows={5} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]"></textarea>
                    </div>

                     <div className="border-2 border-dashed border-[var(--color-wine-light)] rounded-xl p-6 text-center bg-[var(--color-wine-dark)] relative flex flex-col items-center justify-center">
                      <input type="file" id="blogFileInput" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]); }} />
                      {previewUrl ? (
                        <div className="relative inline-block mt-4 mb-4">
                          <img src={previewUrl} alt="Preview" className="mx-auto max-h-48 object-contain rounded" />
                          <button onClick={(e) => { e.stopPropagation(); setImageFile(null); }} className="absolute -top-3 -right-3 bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors shadow-lg border-2 border-[var(--color-wine-dark)]" title="Excluir Foto">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="text-[var(--color-gold-light)] mb-4">
                          <span className="text-3xl block mb-2">📸</span>
                          <p className="font-bold uppercase tracking-widest text-xs">Foto para a Postagem (Opcional)</p>
                          <p className="text-xs opacity-70">Pode colar com Ctrl+V</p>
                        </div>
                      )}
                      {!previewUrl && (
                        <button onClick={() => document.getElementById("blogFileInput")?.click()} className="border border-[var(--color-gold)] text-[var(--color-gold)] px-4 py-2 rounded text-xs uppercase hover:bg-[var(--color-wine)]">Escolher Arquivo</button>
                      )}
                    </div>

                    {message && <p className="text-sm text-[#f3e5ab] mt-2 italic text-center font-bold">{message}</p>}
                    
                    <button onClick={handleGenerateBlogOnly} disabled={loading} className="w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform mt-4">
                      {loading ? "A IA ESTÁ ESCREVENDO..." : "ESCREVER CRÔNICA"}
                    </button>
                  </>
                ) : (
                   <>
                    <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                      <h3 className="text-[var(--color-gold)] font-serif text-xl mb-4 text-center">Seu Novo Artigo</h3>
                      <input type="text" value={generatedBlogTitle} onChange={(e) => setGeneratedBlogTitle(e.target.value)} className="w-full bg-transparent border-b border-[var(--color-wine-light)] mb-4 text-[var(--color-gold)] font-bold focus:outline-none" />
                      <textarea value={generatedBlogPost} onChange={(e) => setGeneratedBlogPost(e.target.value)} rows={15} className="w-full bg-transparent text-[var(--color-gold-light)] focus:outline-none resize-none leading-relaxed" ></textarea>
                    </div>

                    <div className="border-2 border-dashed border-[var(--color-wine-light)] rounded-xl p-6 text-center bg-[var(--color-wine-dark)] relative mt-6 flex flex-col items-center">
                      <input type="file" id="blogOfficialFileInput" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setDisplayImageFile(e.target.files[0]); }} />
                      {displayPreviewUrl || previewUrl ? (
                         <div className="relative inline-block mt-4 mb-4">
                          <img src={displayPreviewUrl || previewUrl || ""} alt="Preview" className="mx-auto max-h-48 object-contain rounded" />
                          <button onClick={(e) => { e.stopPropagation(); setDisplayImageFile(null); setImageFile(null); }} className="absolute -top-3 -right-3 bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors shadow-lg border-2 border-[var(--color-wine-dark)]" title="Excluir Foto">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="text-[var(--color-gold-light)] mb-4">
                          <p className="font-bold uppercase tracking-widest text-sm text-[var(--color-gold)]">Sem foto selecionada.</p>
                          <p className="text-xs opacity-70 mt-2">Quer adicionar uma foto? (Cole com Ctrl+V)</p>
                        </div>
                      )}
                      {!(displayPreviewUrl || previewUrl) && (
                        <button onClick={() => document.getElementById("blogOfficialFileInput")?.click()} className="border border-[var(--color-wine-light)] text-[var(--color-gold)] px-6 py-2 rounded uppercase tracking-widest hover:bg-[var(--color-wine)] mt-2">Escolher Outra Foto</button>
                      )}
                    </div>

                    {message && <p className="text-sm text-[#f3e5ab] mt-2 italic text-center font-bold">{message}</p>}

                    <div className="flex gap-4 mt-6">
                       <button onClick={() => { setGeneratedBlogTitle(""); setGeneratedBlogPost(""); }} className="flex-1 border border-[var(--color-wine-light)] text-[var(--color-gold-light)] py-4 rounded font-bold uppercase hover:bg-[var(--color-wine-dark)] transition-colors">
                        Descartar
                      </button>
                      <button onClick={handlePublish} disabled={loading} className="flex-2 w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform">
                        {loading ? "PUBLICANDO..." : "PUBLICAR NO DIÁRIO"}
                      </button>
                    </div>
                  </>
                )}
               </div>
            )}

            {activeTab === "manage" && (
              <div className="space-y-8">
                {!editingItem && (
                  <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Tipo de conteúdo para gerenciar">
                    {([
                      ["papo", "Papo de Mulher", journals.filter(item => item.category !== "Estudei para te explicar").length],
                      ["estudei", "Estudei", journals.filter(item => item.category === "Estudei para te explicar").length],
                      ["vitrine", "Vitrine", products.length],
                    ] as Array<[ManageType, string, number]>).map(([value, label, count]) => (
                      <button key={value} type="button" onClick={() => setManageType(value)} aria-pressed={manageType === value} className={`flex min-h-16 items-center justify-between rounded-2xl border px-4 text-left transition ${manageType === value ? "border-[var(--color-gold)] bg-[var(--color-gold)]/12 text-[var(--color-gold)]" : "border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] text-[var(--color-gold-light)] opacity-70"}`}>
                        <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
                        <span className="rounded-full border border-current px-2 py-1 text-xs">{count}</span>
                      </button>
                    ))}
                  </div>
                )}
                {editingItem ? (
                  <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                    <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif">
                      Editando {editingItem.type === "product" ? "Produto da Vitrine" : "Artigo do Diário"}
                    </h3>
                    <div className="mb-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_11rem]">
                      <input type="text" value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} className="flex-1 bg-transparent border-b border-[var(--color-wine-light)] py-2 text-[var(--color-gold)] font-bold focus:outline-none" />
                      <select value={editingItem.category || ""} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-2 py-2 text-[var(--color-gold-light)] text-sm">
                        {editingItem.type === "product" ? (
                          <>
                            {PRODUCT_CATEGORIES.map((category) => <option value={category} key={category}>{category}</option>)}
                          </>
                        ) : (
                          <>
                            <option value="Papo de Mulher Madura">Papo de Mulher Madura</option>
                            <option value="Estudei para te explicar">Estudei para te explicar</option>
                          </>
                        )}
                      </select>
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-light)]">
                        Data da publicação
                        <input type="date" required value={editingItem.created_at || ""} onChange={(event) => setEditingItem({ ...editingItem, created_at: event.target.value })} className="mt-1 w-full px-3 text-sm normal-case tracking-normal" />
                      </label>
                    </div>
                    {editingItem.type === "product" ? (
                      <fieldset className="mb-5 rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                        <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Filtros especiais</legend>
                        <p className="mb-4 text-xs text-[var(--color-gold-light)] opacity-65">Você pode marcar mais de uma opção. Os selos e filtros aparecem imediatamente em Achados.</p>
                        <div className="grid gap-3 sm:grid-cols-4">
                          {[
                            ["is_featured", "Em destaque", "Curadoria principal"],
                            ["is_most_purchased", "Mais comprado", "Favorito de compra"],
                            ["is_most_viewed", "Mais visto", "Muito procurado"],
                            ["is_new", "Novo", "Postagem recente"],
                          ].map(([field, label, description]) => (
                            <label key={field} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${editingItem[field] ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "border-[var(--color-wine-light)]"}`}>
                              <input type="checkbox" checked={Boolean(editingItem[field])} onChange={(event) => setEditingItem({ ...editingItem, [field]: event.target.checked })} className="h-5 w-5 accent-[var(--color-gold)]" />
                              <span><span className="block text-sm font-bold text-[var(--color-gold-light)]">{label}</span><span className="block text-[11px] text-[var(--color-gold-light)] opacity-55">{description}</span></span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ) : (
                      <fieldset className="mb-5 rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                        <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Filtros especiais</legend>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            ["is_featured", "Em destaque", "Destaque"],
                            ["is_most_viewed", "Mais lido", "Top acessos"],
                            ["is_new", "Novo", "Postagem recente"],
                          ].map(([field, label, description]) => (
                            <label key={field} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${editingItem[field] ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "border-[var(--color-wine-light)]"}`}>
                              <input type="checkbox" checked={Boolean(editingItem[field])} onChange={(event) => setEditingItem({ ...editingItem, [field]: event.target.checked })} className="h-5 w-5 accent-[var(--color-gold)]" />
                              <span><span className="block text-sm font-bold text-[var(--color-gold-light)]">{label}</span><span className="block text-[11px] text-[var(--color-gold-light)] opacity-55">{description}</span></span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                    <textarea value={editingItem.content} onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })} rows={15} className="w-full bg-transparent text-[var(--color-gold-light)] focus:outline-none resize-none leading-relaxed border border-[var(--color-wine-light)] p-4 rounded" ></textarea>
                    <div className="flex gap-4 mt-4">
                      <button onClick={() => setEditingItem(null)} className="flex-1 border border-[var(--color-wine-light)] text-[var(--color-gold-light)] py-3 rounded font-bold uppercase">
                        Cancelar
                      </button>
                      <button onClick={handleUpdateItem} disabled={loading || !editingItem.created_at} className="flex-2 w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-3 rounded font-bold uppercase disabled:opacity-50">
                        {loading ? "Salvando..." : "Salvar Alterações"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {manageType === "vitrine" && <div>
                      <h3 className="text-2xl text-[var(--color-gold)] mb-6 font-serif border-b border-[var(--color-wine-light)] pb-2">Vitrine (Produtos)</h3>
                      {products.length === 0 ? <p className="text-[var(--color-gold-light)] opacity-70">Nenhum produto publicado.</p> : products.map(p => (
                        <div key={p.id} className="flex flex-col justify-between gap-3 bg-[var(--color-wine-dark)] p-4 rounded mb-4 border border-[var(--color-wine-light)] sm:flex-row sm:items-center">
                          <div>
                            <span className="text-[var(--color-gold-light)] font-bold">{p.title}</span>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-full border border-[var(--color-wine-light)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold-light)] opacity-70">{p.category || "Sem categoria"}</span>
                              <span className="rounded-full border border-[var(--color-wine-light)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold-light)] opacity-70">{formatPostDate(p.created_at)}</span>
                              {p.is_featured && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Destaque</span>}
                              {p.is_most_purchased && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Mais comprado</span>}
                              {p.is_most_viewed && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Mais visto</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingItem({ type: "product", id: p.id, title: p.title, content: p.description, category: p.category || "SkinCare", created_at: toDateInputValue(p.created_at), is_featured: Boolean(p.is_featured), is_most_purchased: Boolean(p.is_most_purchased), is_most_viewed: Boolean(p.is_most_viewed), is_new: Boolean(p.is_new) })} className="text-xs bg-[var(--color-wine-light)] text-[var(--color-gold)] px-3 py-1 rounded">Editar</button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="text-xs bg-red-900 text-white px-3 py-1 rounded">Deletar</button>
                          </div>
                        </div>
                      ))}
                    </div>}

                    {manageType === "papo" && <div>
                      <h3 className="text-2xl text-[var(--color-gold)] mb-6 font-serif border-b border-[var(--color-wine-light)] pb-2">Papo de Mulher Madura</h3>
                      {journals.filter(j => j.category !== "Estudei para te explicar").length === 0 ? <p className="text-[var(--color-gold-light)] opacity-70">Nenhum artigo publicado.</p> : journals.filter(j => j.category !== "Estudei para te explicar").map(j => (
                        <div key={j.id} className="mb-4 flex flex-col justify-between gap-3 rounded border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4 sm:flex-row sm:items-center">
                          <div>
                            <span className="text-[var(--color-gold-light)] font-bold block">{j.title}</span>
                            <span className="text-[var(--color-gold-light)] opacity-50 text-xs uppercase">{j.category || "Sem categoria"}</span>
                            <span className="ml-2 text-[var(--color-gold-light)] opacity-50 text-xs">• {formatPostDate(j.created_at)}</span>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {j.is_featured && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Destaque</span>}
                              {j.is_most_viewed && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Mais lido</span>}
                              {j.is_new && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Novo</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingItem({ type: "journal", id: j.id, title: j.title, content: j.content, category: j.category || "Geral", created_at: toDateInputValue(j.created_at), is_featured: Boolean(j.is_featured), is_most_viewed: Boolean(j.is_most_viewed), is_new: Boolean(j.is_new) })} className="text-xs bg-[var(--color-wine-light)] text-[var(--color-gold)] px-3 py-1 rounded">Editar</button>
                            <button onClick={() => handleDeleteJournal(j.id)} className="text-xs bg-red-900 text-white px-3 py-1 rounded">Deletar</button>
                          </div>
                        </div>
                      ))}
                    </div>}

                    {manageType === "estudei" && <div>
                      <h3 className="text-2xl text-[var(--color-gold)] mb-6 font-serif border-b border-[var(--color-wine-light)] pb-2">Estudei para te explicar</h3>
                      {journals.filter(j => j.category === "Estudei para te explicar").length === 0 ? <p className="text-[var(--color-gold-light)] opacity-70">Nenhuma resenha publicada.</p> : journals.filter(j => j.category === "Estudei para te explicar").map(j => (
                        <div key={j.id} className="mb-4 flex flex-col justify-between gap-3 rounded border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4 sm:flex-row sm:items-center">
                          <div>
                            <span className="text-[var(--color-gold-light)] font-bold block">{j.title}</span>
                            <span className="text-[var(--color-gold-light)] opacity-50 text-xs uppercase">{j.category || "Sem categoria"}</span>
                            <span className="ml-2 text-[var(--color-gold-light)] opacity-50 text-xs">• {formatPostDate(j.created_at)}</span>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {j.is_featured && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Destaque</span>}
                              {j.is_most_viewed && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Mais lido</span>}
                              {j.is_new && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Novo</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingItem({ type: "journal", id: j.id, title: j.title, content: j.content, category: j.category || "Geral", created_at: toDateInputValue(j.created_at), is_featured: Boolean(j.is_featured), is_most_viewed: Boolean(j.is_most_viewed), is_new: Boolean(j.is_new) })} className="text-xs bg-[var(--color-wine-light)] text-[var(--color-gold)] px-3 py-1 rounded">Editar</button>
                            <button onClick={() => handleDeleteJournal(j.id)} className="text-xs bg-red-900 text-white px-3 py-1 rounded">Deletar</button>
                          </div>
                        </div>
                      ))}
                    </div>}
                  </>
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-5">
                  <p className="eyebrow">O papo continuou por aqui</p>
                  <h2 className="font-display mt-2 text-3xl text-[var(--color-gold)]">Comentários para aprovar</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-gold-light)] opacity-70">As leitoras enviam email e impressão. O email fica só para você; no site aparece como Amiga Entreluar.</p>
                </div>
                {message && <p className="text-center text-sm font-bold italic text-[#f3e5ab]">{message}</p>}
                {comments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--color-wine-light)] p-8 text-center text-sm text-[var(--color-gold-light)] opacity-70">Nenhum comentário chegou por enquanto.</div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => {
                      const journal = Array.isArray(comment.journal) ? comment.journal[0] : comment.journal;
                      return (
                        <article key={comment.id} className={`rounded-2xl border p-5 ${comment.status === "pending" ? "border-[var(--color-gold)] bg-[#3a1820]" : "border-[var(--color-wine-light)] bg-[var(--color-wine-dark)]"}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">{comment.status === "pending" ? "Pendente" : comment.status === "approved" ? "Aprovado" : "Rejeitado"}</p>
                              <h3 className="mt-2 font-serif text-xl text-[var(--color-gold-light)]">{journal?.title || "Papo de Mulher"}</h3>
                              <p className="mt-1 text-xs text-[var(--color-gold-light)] opacity-55">{comment.email} • {new Date(comment.created_at).toLocaleString("pt-BR")}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {comment.status !== "approved" && <button onClick={() => handleCommentStatus(comment, "approved")} disabled={loading} className="rounded border border-[var(--color-gold)] px-3 py-1 text-xs text-[var(--color-gold)]">Aprovar</button>}
                              {comment.status !== "rejected" && <button onClick={() => handleCommentStatus(comment, "rejected")} disabled={loading} className="rounded border border-red-900 px-3 py-1 text-xs text-red-300">Rejeitar</button>}
                              {comment.status !== "pending" && <button onClick={() => handleCommentStatus(comment, "pending")} disabled={loading} className="rounded border border-[var(--color-wine-light)] px-3 py-1 text-xs text-[var(--color-gold-light)]">Voltar para pendente</button>}
                            </div>
                          </div>
                          <p className="mt-4 whitespace-pre-wrap leading-7 text-[var(--color-gold-light)]">{comment.body}</p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "newsletter" && (
              <div className="space-y-6">
                <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-wine-light)] mb-8 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl text-[var(--color-gold)] font-serif mb-1">Base de Assinantes</h3>
                    <p className="text-[var(--color-gold-light)] opacity-70 text-sm">Leitoras que querem te ouvir.</p>
                    <p className="mt-2 text-xs text-[var(--color-gold-light)] opacity-60">{subscriberNotes || "Validando a base..."}</p>
                  </div>
                  <div className="text-4xl font-bold text-[var(--color-gold)]">
                    {subscribersCount}
                  </div>
                </div>

                <section className="rounded-2xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-6" aria-labelledby="traffic-analytics-title">
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="eyebrow mb-2">Tráfego do site</p>
                      <h3 id="traffic-analytics-title" className="font-serif text-2xl text-[var(--color-gold)]">Visitas por origem</h3>
                      <p className="mt-1 text-sm text-[var(--color-gold-light)] opacity-70">Mede todos os acessos gravados no site e separa por Instagram, Facebook, Direto e Internet.</p>
                    </div>
                    <button type="button" onClick={fetchTrafficAnalytics} className="border border-[var(--color-gold)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] hover:bg-[var(--color-wine-light)]">Atualizar</button>
                  </div>

                  {trafficAnalytics ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-4">
                        {trafficPeriods.map((period) => (
                          <div key={period.label} className="rounded-xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                            <p className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">{period.label}</p>
                            <p className="mt-1 text-2xl font-bold text-[var(--color-gold)]">{period.visits.toLocaleString("pt-BR")}</p>
                            <p className="mt-2 text-xs text-[var(--color-gold-light)] opacity-60">{period.uniqueSessions.toLocaleString("pt-BR")} visitantes · {period.conversions.toLocaleString("pt-BR")} cadastros</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                          <p className="mb-3 text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">Origem nos últimos 30 dias</p>
                          {trafficSourceRows.map((source) => (
                            <div key={source.source} className="border-t border-[var(--color-wine-light)] py-2 text-sm text-[var(--color-gold-light)]">
                              <div className="flex justify-between gap-4">
                                <span>{source.label}</span>
                                <strong className="text-[var(--color-gold)]">{source.visits.toLocaleString("pt-BR")}</strong>
                              </div>
                              <p className="text-xs opacity-55">{source.uniqueSessions.toLocaleString("pt-BR")} visitantes · {source.conversions.toLocaleString("pt-BR")} cadastros · {source.conversionRate.toFixed(1).replace(".", ",")}%</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                          <p className="mb-3 text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">Páginas mais visitadas em 30 dias</p>
                          {trafficAnalytics.periods.last30.topPages.length ? trafficAnalytics.periods.last30.topPages.map((page) => (
                            <div key={page.path} className="flex justify-between gap-4 border-t border-[var(--color-wine-light)] py-2 text-sm text-[var(--color-gold-light)]">
                              <span className="truncate">{page.path}</span>
                              <strong className="text-[var(--color-gold)]">{page.visits}</strong>
                            </div>
                          )) : <p className="text-sm text-[var(--color-gold-light)] opacity-60">Sem visitas registradas ainda.</p>}
                        </div>
                      </div>
                      <p className="mt-4 text-xs leading-5 text-[var(--color-gold-light)] opacity-55">Direto inclui quem digitou o endereço, abriu favorito ou veio sem origem identificável. Internet agrupa Google, outros sites e navegadores externos.</p>
                    </>
                  ) : (
                    <p className="rounded-xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4 text-sm text-[var(--color-gold-light)] opacity-70">{trafficAnalyticsStatus}</p>
                  )}
                </section>

                <div className="space-y-4">
                  <label className="block text-[var(--color-gold-light)] text-sm">Qual experiência você quer criar?</label>
                  <select value={nlType} onChange={(e) => setNlType(e.target.value as typeof nlType)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)] focus:outline-none">
                    <option value="site">Boas-vindas à Entreluar</option>
                    <option value="blog">Nova conversa no Diário</option>
                    <option value="produto">Novo achado na Vitrine</option>
                    <option value="resenha">Nova resenha com ciência</option>
                    <option value="pilula">Pílula de inspiração e autocuidado</option>
                  </select>

                  <textarea 
                    placeholder="Conte o tema, o sentimento que quer transmitir e, se houver, cole o link exato da página. Ex.: 'Apresentar minha resenha sobre vitamina C: https://entreluar.com.br/resenhas/...'" 
                    value={nlContext} 
                    onChange={(e) => setNlContext(e.target.value)} 
                    rows={3} 
                    className="w-full bg-transparent border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)] focus:outline-none resize-none"
                  ></textarea>

                  <button onClick={handleGenerateNewsletter} disabled={loading} className="w-full bg-transparent border border-[var(--color-gold)] text-[var(--color-gold)] py-3 rounded font-bold uppercase tracking-widest hover:bg-[var(--color-wine-light)] transition-colors mt-2">
                    {loading ? "Gerando..." : "Gerar Texto com IA ✨"}
                  </button>
                </div>

                {nlHtml && (
                  <div className="mt-8 pt-8 border-t border-[var(--color-wine-light)] space-y-6">
                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-2">Assunto do E-mail</label>
                      <input 
                        type="text" 
                        value={nlSubject} 
                        onChange={(e) => { setNlSubject(e.target.value); setNewsletterDispatchId(null); setNewsletterStatus("idle"); }}
                        className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-gold)] rounded px-4 py-3 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-2">Corpo do E-mail (HTML)</label>
                      <textarea 
                        value={nlHtml} 
                        onChange={(e) => { setNlHtml(e.target.value); setNewsletterDispatchId(null); setNewsletterStatus("idle"); }}
                        rows={10} 
                        className="w-full bg-[#1a0f12] border border-[var(--color-wine-light)] rounded p-4 text-[var(--color-gold-light)] font-mono text-xs focus:outline-none"
                      ></textarea>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between"><label className="text-sm text-[var(--color-gold-light)]">Prévia fiel do email</label><span className="eyebrow">Desktop e mobile</span></div>
                      <iframe title="Prévia do email premium" srcDoc={nlHtml} className="h-[620px] w-full rounded-[22px] border border-[var(--line)] bg-[#12070a]" sandbox="allow-popups allow-popups-to-escape-sandbox" />
                    </div>

                    {newsletterStatus !== "idle" && (
                      <div className={`rounded-xl border px-4 py-3 text-sm ${newsletterStatus === "complete" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : newsletterStatus === "partial" ? "border-amber-300/40 bg-amber-300/10 text-amber-100" : newsletterStatus === "failed" ? "border-red-300/40 bg-red-300/10 text-red-100" : "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 text-[var(--color-gold-light)]"}`} role="status" aria-live="polite">
                        {newsletterStatus === "preparing" && "Preparando o conteúdo..."}
                        {newsletterStatus === "sending" && "Enviando os lotes com segurança. Não feche esta página..."}
                        {newsletterStatus === "complete" && "Disparo concluído e confirmado pelo provedor."}
                        {newsletterStatus === "partial" && "Parte da lista foi aceita. O conteúdo foi mantido para uma nova tentativa segura."}
                        {newsletterStatus === "failed" && "O envio não foi concluído. O conteúdo foi preservado."}
                      </div>
                    )}

                    <button onClick={handleSendNewsletter} disabled={loading || subscribersCount === 0} className="w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform text-lg mt-4 shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100">
                      {newsletterStatus === "sending" ? "Enviando lotes..." : `🚀 Disparar para ${subscribersCount} Assinantes`}
                    </button>
                  </div>
                )}

                <section className="mt-10 border-t border-[var(--color-wine-light)] pt-8" aria-labelledby="email-control-title">
                  <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="eyebrow mb-2">Histórico individual</p>
                      <h3 id="email-control-title" className="font-serif text-2xl text-[var(--color-gold)]">Controle de emails enviados</h3>
                      <p className="mt-1 text-sm text-[var(--color-gold-light)] opacity-70">Veja quem recebeu cada conteúdo. Mensagens idênticas não serão reenviadas para a mesma pessoa.</p>
                    </div>
                    <input
                      type="search"
                      value={emailAdminSearch}
                      onChange={(event) => setEmailAdminSearch(event.target.value)}
                      placeholder="Buscar email ou assunto"
                      className="min-h-11 w-full rounded-xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] px-4 text-sm text-[var(--color-gold-light)] outline-none focus:border-[var(--color-gold)] md:max-w-xs"
                    />
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4">
                      <p className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">Cadastrados</p>
                      <p className="mt-1 text-2xl font-bold text-[var(--color-gold)]">{emailSubscribers.length}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4">
                      <p className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">Envios registrados</p>
                      <p className="mt-1 text-2xl font-bold text-[var(--color-gold)]">{emailDeliveries.length}</p>
                    </div>
                    <div className="col-span-2 rounded-xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4 md:col-span-1">
                      <p className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">Nunca receberam</p>
                      <p className="mt-1 text-2xl font-bold text-[var(--color-gold)]">{emailSubscribers.filter((subscriber) => !emailDeliveries.some((delivery) => delivery.recipient === subscriber)).length}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {emailSubscribers
                      .filter((subscriber) => {
                        const query = emailAdminSearch.trim().toLowerCase();
                        if (!query) return true;
                        return subscriber.includes(query) || emailDeliveries.some((delivery) => delivery.recipient === subscriber && delivery.subject.toLowerCase().includes(query));
                      })
                      .map((subscriber) => {
                        const subscriberDeliveries = emailDeliveries.filter((delivery) => delivery.recipient === subscriber);
                        const lastDelivery = subscriberDeliveries[0];
                        return (
                          <details key={subscriber} className="group rounded-2xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4 open:border-[var(--color-gold)]/50">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[var(--color-gold-light)]">{subscriber}</p>
                                <p className="mt-1 text-xs text-[var(--color-gold-light)] opacity-55">
                                  {subscriberDeliveries.length === 0 ? "Nenhum envio registrado" : `${subscriberDeliveries.length} envio${subscriberDeliveries.length === 1 ? "" : "s"} · último em ${new Date(lastDelivery.sentAt || "").toLocaleString("pt-BR")}`}
                                </p>
                              </div>
                              <span className="shrink-0 text-[var(--color-gold)] transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
                            </summary>

                            <div className="mt-4 space-y-3 border-t border-[var(--color-wine-light)] pt-4">
                              {subscriberDeliveries.length === 0 ? (
                                <p className="text-sm text-[var(--color-gold-light)] opacity-65">Esta pessoa ainda não recebeu campanhas registradas.</p>
                              ) : subscriberDeliveries.map((delivery, index) => (
                                <details key={delivery.id || `${subscriber}-${index}`} className="rounded-xl bg-[#1a0f12] p-4">
                                  <summary className="cursor-pointer list-none">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                      <div>
                                        <span className="mr-2 rounded-full border border-[var(--color-gold)]/30 px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--color-gold)]">{delivery.type === "marketing" ? "Marketing" : "Resposta"}</span>
                                        <span className="text-sm font-semibold text-[var(--color-gold-light)]">{delivery.subject}</span>
                                      </div>
                                      <time className="shrink-0 text-xs text-[var(--color-gold-light)] opacity-50">{new Date(delivery.sentAt || "").toLocaleString("pt-BR")}</time>
                                    </div>
                                  </summary>
                                  <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-[var(--color-wine-light)] bg-white p-3 text-sm text-[#2b151b]" dangerouslySetInnerHTML={{ __html: delivery.body }} />
                                </details>
                              ))}
                            </div>
                          </details>
                        );
                      })}
                    {emailSubscribers.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-[var(--color-wine-light)] p-8 text-center text-sm text-[var(--color-gold-light)] opacity-65">Nenhum email cadastrado para administrar.</div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "memory" && (
              <div className="space-y-8">
                <section className="rounded-2xl border border-[var(--color-gold)] bg-[var(--color-wine-dark)] p-6">
                  <p className="eyebrow mb-2">Personalidade com verdade</p>
                  <h2 className="font-display text-3xl text-[var(--color-gold-light)]">Memória da Luana</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-gold-light)] opacity-75">Guarde opiniões, experiências e jeitos de falar. A IA recupera apenas o que combina com cada assunto, economizando tokens. Memórias privadas ficam no painel e nunca entram nos prompts.</p>
                  {aiUsage.costBrl >= 8 && <div className={`mt-4 rounded-xl border p-4 text-sm font-bold ${aiUsage.costBrl >= 10 ? "border-red-400 bg-red-950/40 text-red-200" : "border-amber-400 bg-amber-950/30 text-amber-100"}`}>{aiUsage.costBrl >= 10 ? "⚠️ A meta mensal de R$ 10 foi alcançada. Confirme o custo antes de novas gerações." : "💛 O gasto estimado passou de R$ 8 neste mês e está perto da meta."}</div>}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs md:grid-cols-4">
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">R$ {aiUsage.costBrl.toFixed(2).replace(".", ",")}</strong>custo estimado no mês</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">R$ {aiUsage.last24h.costBrl.toFixed(2).replace(".", ",")}</strong>últimas 24 horas</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{aiUsage.thoughtTokens.toLocaleString("pt-BR")}</strong>tokens de raciocínio</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{(aiUsage.latency.p95 / 1000).toFixed(1).replace(".", ",")}s</strong>tempo p95</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{aiUsage.inputTokens.toLocaleString("pt-BR")}</strong>tokens de entrada</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{aiUsage.outputTokens.toLocaleString("pt-BR")}</strong>tokens de texto</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{aiUsage.cacheHits}</strong>gerações em cache</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{aiUsage.searches}</strong>buscas web</div>
                  </div>
                  {aiUsage.byType.length > 0 && <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-wine-light)]"><div className="grid grid-cols-3 bg-[var(--color-wine)] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold)]"><span>Conteúdo</span><span className="text-right">Tokens</span><span className="text-right">Custo</span></div>{aiUsage.byType.map((item) => <div key={item.type} className="grid grid-cols-3 border-t border-[var(--color-wine-light)] px-4 py-2 text-xs text-[var(--color-gold-light)]"><span>{item.type}</span><span className="text-right">{item.totalTokens.toLocaleString("pt-BR")}</span><span className="text-right">R$ {item.costBrl.toFixed(3).replace(".", ",")}</span></div>)}</div>}

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">O que a IA deve aprender sobre você?</label>
                      <textarea value={memoryContent} onChange={(e) => setMemoryContent(e.target.value)} rows={4} placeholder="Ex.: Eu prefiro uma rotina de pele curta e realista. Dez passos me cansam antes do sérum." className="w-full rounded-xl border border-[var(--color-wine-light)] bg-[var(--color-wine)] p-4 text-[var(--color-gold-light)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-widest text-[var(--color-gold-light)]">Categoria</label>
                      <select value={memoryCategory} onChange={(e) => setMemoryCategory(e.target.value as LuanaMemory["category"])} className="w-full rounded-lg border border-[var(--color-wine-light)] bg-[var(--color-wine)] p-3 text-[var(--color-gold-light)]">
                        <option value="identidade">Identidade</option><option value="rotina">Rotina</option><option value="experiencia">Experiência real</option><option value="opiniao">Opinião</option><option value="linguagem">Jeito de falar</option><option value="limite">Limite editorial</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-widest text-[var(--color-gold-light)]">Privacidade</label>
                      <select value={memoryPrivacy} onChange={(e) => { const value = e.target.value as LuanaMemory["privacy"]; setMemoryPrivacy(value); if (value !== "publica") setMemoryAllowInContent(false); }} className="w-full rounded-lg border border-[var(--color-wine-light)] bg-[var(--color-wine)] p-3 text-[var(--color-gold-light)]">
                        <option value="editorial">Editorial — orienta, mas não cita</option><option value="publica">Pública — pode aparecer no texto</option><option value="privada">Privada — nunca vai ao prompt</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs uppercase tracking-widest text-[var(--color-gold-light)]">Assuntos relacionados, separados por vírgula</label>
                      <input value={memoryTags} onChange={(e) => setMemoryTags(e.target.value)} placeholder="protetor solar, pele sensível, rotina" className="w-full rounded-lg border border-[var(--color-wine-light)] bg-[var(--color-wine)] p-3 text-[var(--color-gold-light)]" />
                    </div>
                    {memoryPrivacy === "publica" && <label className="md:col-span-2 flex items-center gap-3 text-sm text-[var(--color-gold-light)]"><input type="checkbox" checked={memoryAllowInContent} onChange={(e) => setMemoryAllowInContent(e.target.checked)} /> Autorizo citar esta informação nos textos quando for pertinente.</label>}
                  </div>
                  <button onClick={handleSaveMemory} disabled={loading} className="mt-5 w-full rounded-lg bg-gradient-to-r from-[#b5952f] to-[var(--color-gold)] py-3 font-bold uppercase tracking-widest text-[var(--color-wine-dark)] disabled:opacity-50">Guardar memória</button>
                  {message && <p className="mt-4 text-center text-sm font-bold italic text-[#f3e5ab]">{message}</p>}
                </section>

                <section>
                  <div className="mb-4 flex items-end justify-between gap-4"><div><h3 className="font-serif text-2xl text-[var(--color-gold)]">O que a IA sabe</h3><p className="text-sm text-[var(--color-gold-light)] opacity-60">{memories.filter((item) => item.status === "aprovada").length} memórias aprovadas</p></div></div>
                  <div className="space-y-3">
                    {memories.map((memory) => <article key={memory.id} className={`rounded-xl border p-4 ${memory.status === "sugerida" ? "border-[var(--color-gold)] bg-[#3a1820]" : "border-[var(--color-wine-light)] bg-[var(--color-wine-dark)]"}`}>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><span className="rounded-full bg-[var(--color-wine-light)] px-3 py-1 text-[var(--color-gold-light)]">{memory.category}</span><select value={memory.privacy} onChange={(e) => handleMemoryPrivacy(memory, e.target.value as LuanaMemory["privacy"])} className="rounded-full border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] px-3 py-1 text-[var(--color-gold)]"><option value="editorial">editorial</option><option value="publica">pública</option><option value="privada">privada</option></select><span className="opacity-60">{memory.status}</span></div>
                      <p className="my-3 leading-6 text-[var(--color-gold-light)]">{memory.content}</p>
                      {memory.tags?.length > 0 && <p className="mb-3 text-xs text-[var(--color-gold-light)] opacity-55">Assuntos: {memory.tags.join(", ")}</p>}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleEditMemory(memory)} className="rounded border border-[var(--color-wine-light)] px-3 py-1 text-xs text-[var(--color-gold-light)]">Corrigir</button>
                        {memory.status === "sugerida" && <button onClick={() => handleMemoryStatus(memory, "aprovada")} className="rounded border border-[var(--color-gold)] px-3 py-1 text-xs text-[var(--color-gold)]">Aprovar aprendizado</button>}
                        {memory.status !== "arquivada" && <button onClick={() => handleMemoryStatus(memory, "arquivada")} className="rounded border border-[var(--color-wine-light)] px-3 py-1 text-xs text-[var(--color-gold-light)]">Arquivar</button>}
                        {memory.status === "arquivada" && <button onClick={() => handleMemoryStatus(memory, "aprovada")} className="rounded border border-[var(--color-gold)] px-3 py-1 text-xs text-[var(--color-gold)]">Restaurar</button>}
                        <button onClick={() => handleDeleteMemory(memory.id)} className="rounded border border-red-900 px-3 py-1 text-xs text-red-300">Excluir</button>
                      </div>
                    </article>)}
                    {memories.length === 0 && <div className="rounded-xl border border-dashed border-[var(--color-wine-light)] p-8 text-center text-sm text-[var(--color-gold-light)] opacity-60">Nenhuma memória guardada ainda.</div>}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "quotes" && (
              <div className="space-y-8">
                <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                  <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif text-center">Gerador de Pílulas Diárias</h3>
                  <p className="text-center text-[var(--color-gold-light)] opacity-70 mb-6 text-sm">Gere 15 frases bem-humoradas e positivas para revisar antes de publicar na rotação diária.</p>
                  
                  <div className="flex justify-center mb-6">
                    <button onClick={handleGenerateQuote} disabled={loading} className="bg-[var(--color-gold)] text-[var(--color-wine-dark)] px-8 py-3 rounded-full uppercase tracking-widest font-bold hover:scale-105 transition-transform flex items-center gap-2">
                      ✨ {loading ? "Criando o lote..." : "Gerar 15 novas pílulas"} ✨
                    </button>
                  </div>

                  {quoteText && (
                    <div className="mt-8 border-t border-[var(--color-wine-light)] pt-6">
                      <p className="mb-3 text-center text-xs uppercase tracking-widest text-[var(--color-gold)]">Rascunho — uma pílula por linha</p>
                      <textarea value={quoteText} onChange={(e) => setQuoteText(e.target.value)} rows={15} className="w-full bg-[var(--color-wine)] border border-[var(--color-wine-light)] rounded p-6 text-[var(--color-gold-light)] font-serif text-base focus:outline-none resize-y leading-relaxed" placeholder="As 15 frases aparecerão aqui para sua revisão."></textarea>
                      <button onClick={handlePublishQuote} disabled={loading} className="w-full mt-4 bg-gradient-to-r from-[#b5952f] to-[var(--color-gold)] text-[var(--color-wine-dark)] py-3 rounded font-bold uppercase hover:scale-105 transition-transform">
                        {loading ? "Publicando..." : "Publicar lote revisado"}
                      </button>
                    </div>
                  )}
                  {message && <p className="text-sm text-[#f3e5ab] mt-4 italic text-center font-bold">{message}</p>}
                </div>
                <div>
                  <h3 className="mb-6 border-b border-[var(--color-wine-light)] pb-2 font-serif text-2xl text-[var(--color-gold)]">Pílulas publicadas</h3>
                  {quotes.length === 0 ? <p className="text-[var(--color-gold-light)] opacity-70">Nenhuma pílula publicada.</p> : quotes.map(quote => (
                    <div key={quote.id} className="mb-4 flex items-center justify-between gap-4 rounded border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4">
                      <div>
                        <span className="block italic text-[var(--color-gold-light)]">“{quote.quote}”</span>
                        <span className="mt-1 block text-xs text-[var(--color-gold-light)] opacity-50">{formatPostDate(quote.created_at)}</span>
                      </div>
                      <button onClick={() => handleDeleteQuote(quote.id)} className="shrink-0 rounded bg-red-900 px-3 py-1 text-xs text-white">Deletar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "drops" && (
              <div className="space-y-8">
                <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                  <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif text-center">Drops do Instagram</h3>
                  <p className="text-center text-[var(--color-gold-light)] opacity-70 mb-6 text-sm">Cole aqui o link do Reels ou Post do seu Instagram para ele aparecer na galeria exclusiva de Drops.</p>
                  
                  <div className="space-y-4 max-w-2xl mx-auto">
                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-2 uppercase tracking-widest">Link do Instagram</label>
                      <input type="text" value={dropUrl} onChange={(e) => setDropUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." className="w-full bg-[var(--color-wine)] border border-[var(--color-wine-light)] rounded p-4 text-[var(--color-gold-light)] focus:outline-none" />
                    </div>
                    
                    <button onClick={handlePublishDrop} disabled={loading || !dropUrl} className="w-full mt-4 bg-gradient-to-r from-[#b5952f] to-[var(--color-gold)] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase hover:scale-105 transition-transform disabled:opacity-50">
                      {loading ? "Publicando..." : "Publicar Drop"}
                    </button>
                    {message && <p className="text-sm text-[#f3e5ab] mt-4 italic text-center font-bold">{message}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="mb-6 border-b border-[var(--color-wine-light)] pb-2 font-serif text-2xl text-[var(--color-gold)]">Drops publicados</h3>
                  {drops.length === 0 ? <p className="text-[var(--color-gold-light)] opacity-70">Nenhum drop publicado.</p> : drops.map(drop => (
                    <div key={drop.id} className="mb-4 flex items-center justify-between gap-4 rounded border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4">
                      <div className="min-w-0">
                        <span className="block font-bold text-[var(--color-gold-light)]">{drop.title || "Drop do Instagram"}</span>
                        <span className="block break-all text-xs text-[var(--color-gold-light)] opacity-50">{drop.instagram_url}</span>
                      </div>
                      <button onClick={() => handleDeleteDrop(drop.id)} className="shrink-0 rounded bg-red-900 px-3 py-1 text-xs text-white">Deletar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "inbox" && (
              <div className="space-y-8">
                <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                  <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif">Nova Mensagem</h3>
                  <div className="space-y-4">
                    <input type="email" placeholder="Para quem?" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className="w-full bg-transparent border-b border-[var(--color-wine-light)] py-2 text-[var(--color-gold-light)] focus:outline-none" />
                    <input type="text" placeholder="Assunto" value={replySubject} onChange={(e) => setReplySubject(e.target.value)} className="w-full bg-transparent border-b border-[var(--color-wine-light)] py-2 text-[var(--color-gold-light)] focus:outline-none" />
                    <textarea placeholder="Resposta..." value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={4} className="w-full bg-transparent border border-[var(--color-wine-light)] rounded p-4 text-[var(--color-gold-light)] focus:outline-none resize-none mt-4"></textarea>
                    <button onClick={handleSendReply} disabled={loading} className="w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-3 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform">
                      Enviar
                    </button>
                  </div>
                </div>

                <div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif">Caixa de Entrada</h3>
                      {emails.filter(e => !e.sender.includes("luana@entreluar.com.br") && !e.sender.includes("Enviado para")).length === 0 ? (
                        <p className="text-[var(--color-gold-light)] opacity-70">Nenhuma mensagem recebida ainda.</p>
                      ) : (
                        <div className="space-y-4">
                          {emails.filter(e => !e.sender.includes("luana@entreluar.com.br") && !e.sender.includes("Enviado para")).map((email) => (
                            <div key={email.id} className="bg-[var(--color-wine-dark)] p-4 rounded-xl border border-[var(--color-wine-light)]">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-[var(--color-gold)] font-bold text-sm">De: {email.sender}</p>
                                  <p className="text-[var(--color-gold-light)] font-serif">{email.subject}</p>
                                </div>
                                <button onClick={() => { setReplyTo(email.sender.match(/<([^>]+)>/)?.[1] || email.sender); setReplySubject(`Re: ${email.subject}`); window.scrollTo(0, 0); }} className="text-xs border border-[var(--color-gold)] text-[var(--color-gold)] px-3 py-1 rounded hover:bg-[var(--color-gold)] hover:text-[var(--color-wine-dark)] transition-colors">
                                  Responder
                                </button>
                              </div>
                              <p className="text-sm text-[var(--color-gold-light)] opacity-80 mt-2 line-clamp-3 whitespace-pre-wrap">{email.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif">Itens Enviados</h3>
                      {emails.filter(e => e.sender.includes("luana@entreluar.com.br") || e.sender.includes("Enviado para")).length === 0 ? (
                        <p className="text-[var(--color-gold-light)] opacity-70">Nenhum envio registrado.</p>
                      ) : (
                        <div className="space-y-4">
                          {emails.filter(e => e.sender.includes("luana@entreluar.com.br") || e.sender.includes("Enviado para")).map((email) => (
                            <div key={email.id} className="bg-[var(--color-wine-dark)] p-4 rounded-xl border border-[var(--color-gold)] opacity-80">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-[var(--color-gold)] font-bold text-sm">{email.sender}</p>
                                  <p className="text-[var(--color-gold-light)] font-serif">{email.subject}</p>
                                  <p className="text-xs text-[var(--color-gold-light)] opacity-50">{new Date(email.created_at).toLocaleString('pt-BR')}</p>
                                </div>
                              </div>
                              <div className="text-sm text-[var(--color-gold-light)] mt-2 line-clamp-3 bg-[#1a0f12] p-2 rounded" dangerouslySetInnerHTML={{ __html: email.body }}></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div></div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
