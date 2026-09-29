"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import { TAG_TYPE_LABELS, slugify, type Tag, type TagType } from "@/lib/tags";
import { EMPTY_RESUMO_RAPIDO, resumoRapidoFields, resumoRapidoHasContent, resumoRapidoToRow, rowToResumoRapido, type ResumoRapido } from "@/lib/summary";
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
  journal_id?: string | null;
  product_id?: string | null;
  email: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  source_path?: string | null;
  created_at: string;
  approved_at?: string | null;
  moderated_at?: string | null;
  journal?: { title?: string | null; category?: string | null } | { title?: string | null; category?: string | null }[] | null;
  product?: { title?: string | null } | { title?: string | null }[] | null;
};

type AiUsageSummary = {
  inputTokens: number; outputTokens: number; thoughtTokens: number; totalTokens: number; searches: number;
  costBrl: number; retries: number; cacheHits: number; latency: { p50: number; p95: number };
  last24h: { costBrl: number; totalTokens: number }; last7d: { costBrl: number; totalTokens: number };
  byType: Array<{ type: string; costBrl: number; totalTokens: number }>;
};

type ManageType = "papo" | "estudei" | "vitrine";

type EditingPoll = {
  id: string | null;
  question: string;
  options: string[];
  active: boolean;
  voteCount: number;
  optionResults: Array<{ id: string; label: string; count: number }>;
};

const EMPTY_POLL: EditingPoll = { id: null, question: "", options: ["", ""], active: true, voteCount: 0, optionResults: [] };

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

const PAPO_FILTERS = [
  "Me escolhendo de novo",
  "Corpo em modo surpresa",
  "Pausa sem culpa",
  "Beleza sem tribunal",
  "Rindo para nÃ£o surtar",
  "ConfissÃµes da maturidade",
];

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
      img.onerror = () => reject(new Error("NÃ£o consegui abrir essa foto (formato nÃ£o suportado ou arquivo corrompido)."));
    };
    reader.onerror = () => reject(new Error("NÃ£o consegui ler o arquivo da foto."));
  });
};

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "product" | "blog" | "manage" | "traffic" | "comments" | "inbox" | "quotes" | "drops" | "newsletter" | "memory">("overview");
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
  const [contentPreview, setContentPreview] = useState(false);
  const [manageType, setManageType] = useState<ManageType>("papo");

  const [tags, setTags] = useState<Tag[]>([]);
  const [editingItemTagIds, setEditingItemTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState<TagType>("concern");
  const [creatingTag, setCreatingTag] = useState(false);
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [bulkTagStatus, setBulkTagStatus] = useState("");

  const [generatedResumoRapido, setGeneratedResumoRapido] = useState<ResumoRapido>(EMPTY_RESUMO_RAPIDO);
  const [generatedResumoRapidoArtigo, setGeneratedResumoRapidoArtigo] = useState<ResumoRapido>(EMPTY_RESUMO_RAPIDO);
  const [editingItemSummary, setEditingItemSummary] = useState<ResumoRapido>(EMPTY_RESUMO_RAPIDO);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [bulkSummaryStatus, setBulkSummaryStatus] = useState("");
  const [socialProofLoading, setSocialProofLoading] = useState<Record<string, boolean>>({});

  const [generatedTagIds, setGeneratedTagIds] = useState<string[]>([]);
  const [generatedPollQuestion, setGeneratedPollQuestion] = useState("");
  const [generatedPollOptions, setGeneratedPollOptions] = useState<string[]>([]);

  const [editingItemPoll, setEditingItemPoll] = useState<EditingPoll>(EMPTY_POLL);
  const [savingPoll, setSavingPoll] = useState(false);

  const [blogCategory, setBlogCategory] = useState("Papo de Mulher Madura");
  const [blogPapoFilter, setBlogPapoFilter] = useState("ConfissÃµes da maturidade");
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
  const [trafficAnalyticsStatus, setTrafficAnalyticsStatus] = useState("Carregando trÃ¡fego...");

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
    supabase.from("tags").select("id,name,slug,type").order("name", { ascending: true }).then(({ data }) => {
      if (data) setTags(data as Tag[]);
    });
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (activeTab === "inbox") fetchEmails();
    if (activeTab === "manage" || activeTab === "quotes" || activeTab === "drops") fetchManageData();
    if (activeTab === "newsletter") fetchSubscribers();
    if (activeTab === "traffic" || activeTab === "overview") fetchTrafficAnalytics();
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
    if (!response.ok) throw new Error(data.error || "NÃ£o foi possÃ­vel concluir a aÃ§Ã£o.");
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
      setMessage(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel carregar comentÃ¡rios.");
    }
  };

  const fetchMemories = async () => {
    try {
      const data = await memoryRequest();
      setMemories(data.memories || []);
      setAiUsage({ ...emptyAiUsage, ...(data.usage || {}) });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel carregar a memÃ³ria.");
    }
  };

  useEffect(() => {
    if (user) { fetchMemories(); fetchComments(); fetchTrafficAnalytics(); }
  }, [user]);

  const confirmAiSpend = () => aiUsage.costBrl < 10 || confirm("A meta mensal de R$ 10 jÃ¡ foi alcanÃ§ada. Deseja mesmo gerar outro conteÃºdo com custo de IA?");

  const handleSaveMemory = async () => {
    if (memoryContent.trim().length < 3) return setMessage("Escreva uma lembranÃ§a um pouco mais completa.");
    setLoading(true);
    try {
      await memoryRequest("", { method: "POST", body: JSON.stringify({ content: memoryContent, tags: memoryTags, category: memoryCategory, privacy: memoryPrivacy, allowInContent: memoryAllowInContent }) });
      setMemoryContent(""); setMemoryTags(""); setMemoryAllowInContent(false);
      setMessage("MemÃ³ria aprovada e guardada âœ¨");
      await fetchMemories();
    } catch (error) { setMessage(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel guardar a memÃ³ria."); }
    setLoading(false);
  };

  const handleMemoryStatus = async (memory: LuanaMemory, status: LuanaMemory["status"]) => {
    try {
      await memoryRequest("", { method: "PATCH", body: JSON.stringify({ id: memory.id, status }) });
      await fetchMemories();
    } catch (error) { setMessage(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel atualizar a memÃ³ria."); }
  };

  const handleCommentStatus = async (comment: SiteComment, status: SiteComment["status"]) => {
    try {
      setLoading(true);
      await adminRequest("/api/comments/admin", { method: "PATCH", body: JSON.stringify({ id: comment.id, status }) });
      await fetchComments();
      setMessage(status === "approved" ? "ComentÃ¡rio aprovado e publicado na roda. âœ¨" : status === "rejected" ? "ComentÃ¡rio rejeitado e escondido do site." : "ComentÃ¡rio voltou para pendente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel moderar comentÃ¡rio.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMemory = async (memory: LuanaMemory) => {
    const content = prompt("Corrija esta memÃ³ria:", memory.content)?.trim();
    if (!content || content === memory.content) return;
    try {
      await memoryRequest("", { method: "PATCH", body: JSON.stringify({ id: memory.id, content }) });
      await fetchMemories();
    } catch (error) { setMessage(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel corrigir a memÃ³ria."); }
  };

  const handleMemoryPrivacy = async (memory: LuanaMemory, privacy: LuanaMemory["privacy"]) => {
    try {
      await memoryRequest("", { method: "PATCH", body: JSON.stringify({ id: memory.id, privacy, allowInContent: privacy === "publica" ? memory.allow_in_content : false }) });
      await fetchMemories();
    } catch (error) { setMessage(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel mudar a privacidade."); }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm("Excluir esta memÃ³ria da Luana?")) return;
    try {
      await memoryRequest(`?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await fetchMemories();
    } catch (error) { setMessage(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel excluir a memÃ³ria."); }
  };

  const fetchSubscribers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/send-newsletter", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "NÃ£o foi possÃ­vel consultar a base.");
      setSubscribersCount(data.requested || 0);
      setEmailSubscribers(data.subscribers || []);
      setEmailDeliveries(data.deliveries || []);
      const ignored = (data.invalid || 0) + (data.duplicates || 0);
      setSubscriberNotes(ignored > 0 ? `${ignored} cadastro${ignored === 1 ? " foi ignorado" : "s foram ignorados"} por estar invÃ¡lido ou repetido.` : "Base validada e pronta para envio.");
    } catch (error) {
      setSubscribersCount(0);
      setEmailSubscribers([]);
      setEmailDeliveries([]);
      setSubscriberNotes(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel consultar a base.");
    }
  };

  const fetchTrafficAnalytics = async () => {
    try {
      setTrafficAnalyticsStatus("Carregando trÃ¡fego...");
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/traffic-analytics", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "NÃ£o foi possÃ­vel consultar o trÃ¡fego.");
      setTrafficAnalytics(data);
      setTrafficAnalyticsStatus("");
    } catch (error) {
      setTrafficAnalytics(null);
      setTrafficAnalyticsStatus(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel consultar o trÃ¡fego.");
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
    const { data: tData } = await supabase.from("tags").select("id,name,slug,type").order("name", { ascending: true });
    if (tData) setTags(tData as Tag[]);
  };

  const refreshEditingPoll = async (journalId: string) => {
    const { data: pollRow } = await supabase.from("polls").select("id,question,active").eq("journal_id", journalId).maybeSingle();
    if (!pollRow) {
      setEditingItemPoll(EMPTY_POLL);
      return;
    }
    const [{ data: optionRows }, { data: voteRows }] = await Promise.all([
      supabase.from("poll_options").select("id,label,position").eq("poll_id", pollRow.id).order("position", { ascending: true }),
      supabase.from("poll_votes").select("option_id").eq("poll_id", pollRow.id),
    ]);
    const counts: Record<string, number> = {};
    (voteRows || []).forEach((row: any) => { counts[row.option_id] = (counts[row.option_id] || 0) + 1; });
    const optionResults = (optionRows || []).map((option: any) => ({ id: option.id, label: option.label, count: counts[option.id] || 0 }));
    setEditingItemPoll({
      id: pollRow.id,
      question: pollRow.question,
      options: optionResults.map((option) => option.label),
      active: Boolean(pollRow.active),
      voteCount: (voteRows || []).length,
      optionResults,
    });
  };

  const startEditingItem = async (payload: any, contentType: "journal" | "product") => {
    setEditingItem(payload);
    setContentPreview(false);
    setEditingItemTagIds([]);
    setEditingItemSummary(EMPTY_RESUMO_RAPIDO);
    setEditingItemPoll(EMPTY_POLL);
    const [{ data }, { data: summaryData }] = await Promise.all([
      supabase.from("content_tags").select("tag_id").eq("content_type", contentType).eq("content_id", payload.id),
      supabase.from("content_summaries").select("*").eq("content_type", contentType).eq("content_id", payload.id).maybeSingle(),
    ]);
    setEditingItemTagIds((data || []).map((row: any) => row.tag_id));
    setEditingItemSummary(rowToResumoRapido(summaryData));
    if (contentType === "journal") await refreshEditingPoll(payload.id);
  };

  const updatePollOption = (index: number, value: string) => {
    setEditingItemPoll((prev) => ({ ...prev, options: prev.options.map((option, i) => (i === index ? value : option)) }));
  };

  const addPollOption = () => {
    setEditingItemPoll((prev) => (prev.options.length >= 5 ? prev : { ...prev, options: [...prev.options, ""] }));
  };

  const removePollOption = (index: number) => {
    setEditingItemPoll((prev) => (prev.options.length <= 2 ? prev : { ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleSavePoll = async () => {
    if (!editingItem) return;
    const question = editingItemPoll.question.trim();
    const options = editingItemPoll.options.map((option) => option.trim()).filter(Boolean);
    if (!question || options.length < 2) return setMessage("A enquete precisa de uma pergunta e pelo menos 2 opÃ§Ãµes.");
    setSavingPoll(true);
    try {
      const { data: pollRow, error: pollError } = await supabase
        .from("polls")
        .upsert({ journal_id: editingItem.id, question, active: true }, { onConflict: "journal_id" })
        .select("id")
        .single();
      if (pollError) throw pollError;
      await supabase.from("poll_options").delete().eq("poll_id", pollRow.id);
      await supabase.from("poll_options").insert(options.map((label, index) => ({ poll_id: pollRow.id, label, position: index })));
      await refreshEditingPoll(editingItem.id);
      setMessage("Enquete salva! JÃ¡ aparece no artigo.");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setSavingPoll(false);
  };

  const handleTogglePollActive = async () => {
    if (!editingItem || !editingItemPoll.id) return;
    setSavingPoll(true);
    try {
      await supabase.from("polls").update({ active: !editingItemPoll.active }).eq("id", editingItemPoll.id);
      await refreshEditingPoll(editingItem.id);
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setSavingPoll(false);
  };

  const handleDeletePoll = async () => {
    if (!editingItemPoll.id) return;
    if (!confirm("Excluir esta enquete apaga tambÃ©m todos os votos jÃ¡ registrados. Confirma?")) return;
    setSavingPoll(true);
    try {
      await supabase.from("polls").delete().eq("id", editingItemPoll.id);
      setEditingItemPoll(EMPTY_POLL);
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setSavingPoll(false);
  };

  const toggleEditingItemTag = (tagId: string) => {
    setEditingItemTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const toggleGeneratedTag = (tagId: string) => {
    setGeneratedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const updateGeneratedPollOption = (index: number, value: string) => {
    setGeneratedPollOptions((prev) => prev.map((option, i) => (i === index ? value : option)));
  };

  const addGeneratedPollOption = () => {
    setGeneratedPollOptions((prev) => (prev.length >= 5 ? prev : [...prev, ""]));
  };

  const removeGeneratedPollOption = (index: number) => {
    setGeneratedPollOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    const slug = slugify(name);
    if (!slug) return;
    setCreatingTag(true);
    try {
      const { data, error } = await supabase.from("tags").insert([{ name, type: newTagType, slug }]).select().single();
      if (error) throw error;
      setTags((prev) => [...prev, data as Tag].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setNewTagName("");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setCreatingTag(false);
  };

  const handleSuggestTagsForEditingItem = async () => {
    if (!editingItem) return;
    if (!confirmAiSpend()) return;
    setSuggestingTags(true);
    try {
      const data = await adminRequest("/api/generate-tags", {
        method: "POST",
        body: JSON.stringify({ contentType: editingItem.type === "product" ? "product" : "journal", title: editingItem.title, sourceHtml: editingItem.content }),
      });
      const slugs = new Set((data.suggestedTagSlugs || []) as string[]);
      const suggestedIds = tags.filter((tag) => slugs.has(tag.slug)).map((tag) => tag.id);
      setEditingItemTagIds((prev) => Array.from(new Set([...prev, ...suggestedIds])));
      setMessage(suggestedIds.length ? "Tags sugeridas! Revise e clique em Salvar AlteraÃ§Ãµes." : "A IA nÃ£o achou tags da lista que se encaixassem aqui.");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setSuggestingTags(false);
  };

  const handleBulkSuggestTags = async () => {
    if (!confirmAiSpend()) return;
    const candidates = [
      ...products.map((p) => ({ contentType: "product" as const, id: p.id, title: p.title, sourceHtml: p.description })),
      ...journals.map((j) => ({ contentType: "journal" as const, id: j.id, title: j.title, sourceHtml: j.content })),
    ];
    if (!candidates.length) return setMessage("Nada para etiquetar ainda.");

    const { data: existing } = await supabase.from("content_tags").select("content_type,content_id");
    const existingKeys = new Set((existing || []).map((row: any) => `${row.content_type}:${row.content_id}`));
    const pending = candidates.filter((item) => !existingKeys.has(`${item.contentType}:${item.id}`));
    if (!pending.length) return setMessage("Todo mundo jÃ¡ tem tags. âœ¨");
    if (!confirm(`Vou sugerir tags para ${pending.length} itens que ainda nÃ£o tÃªm nenhuma. Isso dispara ${pending.length} chamadas de IA (uma de cada vez) e jÃ¡ grava direto â€” vocÃª revisa depois em Gerenciar. Continuar?`)) return;

    let done = 0;
    let failed = 0;
    setBulkTagStatus(`Etiquetando 0 de ${pending.length}...`);
    for (const item of pending) {
      try {
        const data = await adminRequest("/api/generate-tags", { method: "POST", body: JSON.stringify({ contentType: item.contentType, title: item.title, sourceHtml: item.sourceHtml }) });
        const slugs = new Set((data.suggestedTagSlugs || []) as string[]);
        const tagIds = tags.filter((tag) => slugs.has(tag.slug)).map((tag) => tag.id);
        if (tagIds.length) {
          await supabase.from("content_tags").insert(tagIds.map((tagId) => ({ tag_id: tagId, content_type: item.contentType, content_id: item.id })));
        }
      } catch {
        failed += 1;
      }
      done += 1;
      setBulkTagStatus(`Etiquetando ${done} de ${pending.length}...`);
    }
    setBulkTagStatus("");
    setMessage(`Tags sugeridas: ${done - failed} de ${pending.length}.${failed ? ` ${failed} falharam â€” pode rodar de novo pra tentar sÃ³ o que faltou.` : ""}`);
  };

  const handleGenerateSummaryForEditingItem = async () => {
    if (!editingItem) return;
    if (!confirmAiSpend()) return;
    setGeneratingSummary(true);
    try {
      const data = await adminRequest("/api/generate-summary", {
        method: "POST",
        body: JSON.stringify({ contentType: editingItem.type === "product" ? "product" : "journal", title: editingItem.title, sourceHtml: editingItem.content }),
      });
      setEditingItemSummary(data.resumoRapido || EMPTY_RESUMO_RAPIDO);
      setMessage("Resumo gerado! Revise e clique em Salvar AlteraÃ§Ãµes para publicar.");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setGeneratingSummary(false);
  };

  const handleBulkGenerateSummaries = async () => {
    if (!confirmAiSpend()) return;
    const candidates = [
      ...products.map((p) => ({ contentType: "product" as const, id: p.id, title: p.title, sourceHtml: p.description })),
      ...journals.filter((j) => j.category === "Estudei para te explicar").map((j) => ({ contentType: "journal" as const, id: j.id, title: j.title, sourceHtml: j.content })),
    ];
    if (!candidates.length) return setMessage("Nada para resumir ainda.");

    const { data: existing } = await supabase.from("content_summaries").select("content_type,content_id");
    const existingKeys = new Set((existing || []).map((row: any) => `${row.content_type}:${row.content_id}`));
    const pending = candidates.filter((item) => !existingKeys.has(`${item.contentType}:${item.id}`));
    if (!pending.length) return setMessage("Todo mundo jÃ¡ tem resumo. âœ¨");
    if (!confirm(`Vou gerar resumo para ${pending.length} itens que ainda nÃ£o tÃªm "Em 30 segundos". Isso dispara ${pending.length} chamadas de IA (uma de cada vez). Continuar?`)) return;

    let done = 0;
    let failed = 0;
    setBulkSummaryStatus(`Gerando 0 de ${pending.length}...`);
    for (const item of pending) {
      try {
        const data = await adminRequest("/api/generate-summary", { method: "POST", body: JSON.stringify({ contentType: item.contentType, title: item.title, sourceHtml: item.sourceHtml }) });
        const resumo = data.resumoRapido as ResumoRapido;
        if (resumoRapidoHasContent(resumo)) {
          await supabase.from("content_summaries").insert([{ content_type: item.contentType, content_id: item.id, generated_by: "ai", ...resumoRapidoToRow(resumo) }]);
        }
      } catch {
        failed += 1;
      }
      done += 1;
      setBulkSummaryStatus(`Gerando ${done} de ${pending.length}...`);
    }
    setBulkSummaryStatus("");
    setMessage(`Resumos gerados: ${done - failed} de ${pending.length}.${failed ? ` ${failed} falharam â€” pode rodar de novo pra tentar sÃ³ o que faltou.` : ""}`);
  };

  const handleGenerateSocialProof = async (journalId: string, category: string, title: string, content: string) => {
    if (!confirmAiSpend()) return;
    setSocialProofLoading(prev => ({ ...prev, [journalId]: true }));
    try {
      const data = await adminRequest("/api/generate-social-proof", {
        method: "POST",
        body: JSON.stringify({ journalId, category, title, content }),
      });
      setMessage(`Sucesso! Foram gerados ${data.comments} comentários e ${data.votes} votos na enquete para essa postagem. 🎉`);
    } catch (err: any) {
      setMessage(`Ops, erro ao gerar prova social: ${err.message}`);
    } finally {
      setSocialProofLoading(prev => ({ ...prev, [journalId]: false }));
    }
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
    if (!imageFile) return setMessage("VocÃª precisa colar uma imagem do produto primeiro!");
    if (!link) return setMessage("O link da loja Ã© obrigatÃ³rio!");

    setLoading(true);
    setAccessoryDetailsUsed([]);
    setAccessoryHumorApplied(false);
    setMessage("Iniciando mÃ¡gica (pode demorar uns 15 segundos)...");
    const progressTimers = [
      window.setTimeout(() => setMessage(title ? "Consultando a pesquisa jÃ¡ guardada..." : "Identificando o produto na foto..."), 1200),
      window.setTimeout(() => setMessage("Conferindo fÃ³rmula e evidÃªncias..."), 4500),
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

      setMessage("A IA estÃ¡ lendo o nome na foto e pesquisando o ativo...");
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
        throw new Error("Erro na formataÃ§Ã£o da resposta: " + textRes.substring(0, 50));
      }

      if (!res.ok || data.error) throw new Error(data.error || "NÃ£o consegui gerar o texto agora.");

      setGeneratedProductName(data.productName);
      setGeneratedReview(data.productReview);
      setGeneratedBlogTitle(data.blogTitle);
      setGeneratedBlogPost(data.blogPost);
      setAccessoryDetailsUsed(Array.isArray(data.inputDetailsUsed) ? data.inputDetailsUsed : []);
      setAccessoryHumorApplied(Boolean(data.humorApplied));
      setGeneratedResumoRapido(data.resumoRapido || EMPTY_RESUMO_RAPIDO);
      setGeneratedResumoRapidoArtigo(data.resumoRapidoArtigo || EMPTY_RESUMO_RAPIDO);
      const suggestedSlugs = new Set((data.suggestedTagSlugs || []) as string[]);
      setGeneratedTagIds(tags.filter((tag) => suggestedSlugs.has(tag.slug)).map((tag) => tag.id));
      setGeneratedPollQuestion(data.suggestedPoll?.question || "");
      setGeneratedPollOptions(Array.isArray(data.suggestedPoll?.options) && data.suggestedPoll.options.length ? data.suggestedPoll.options : ["", ""]);
      setBlogCategory("Estudei para te explicar");
      const seconds = data.performance?.durationMs ? ` em ${(data.performance.durationMs / 1000).toFixed(1)}s` : "";
      const cacheNote = data.performance?.cached ? " usando o cache econÃ´mico" : "";
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
    setMessage("Pensando em ideias polÃªmicas e divertidas...");
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
      setMessage("Ideias geradas! Escolha uma e coloque no TÃ­tulo.");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setLoading(false);
  };

  const handleGenerateBlogOnly = async () => {
    if (!confirmAiSpend()) return;
    if (!title && !impressions) return setMessage("Digite um tema ou impressÃµes para gerar o artigo!");
    setLoading(true);
    setMessage("Escrevendo crÃ´nica do DiÃ¡rio...");
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

      setGeneratedBlogTitle(data.title || title || "CrÃ´nica da Luana");
      setGeneratedBlogPost(data.text);
      setGeneratedResumoRapido(data.resumoRapido || EMPTY_RESUMO_RAPIDO);

      if (data.suggestedTagSlugs) {
        const matchingTagIds = tags.filter((t) => data.suggestedTagSlugs.includes(t.slug)).map((t) => t.id);
        setGeneratedTagIds(matchingTagIds);
      }
      if (data.suggestedPoll) {
        setGeneratedPollQuestion(data.suggestedPoll.question || "");
        setGeneratedPollOptions(data.suggestedPoll.options || []);
      }

      if (data.imagePrompt) {
        setMessage("Buscando inspiraÃ§Ã£o de imagem fotogrÃ¡fica...");
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

      setMessage("CrÃ´nica gerada com sucesso! Revise e publique.");
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
      if (!res.ok || data.error) throw new Error(data.error || data.errors?.[0]?.message || "O disparo nÃ£o foi aceito.");
      if (data.success && data.requested === 0 && data.skipped > 0) {
        setNewsletterStatus("complete");
        setMessage(data.message || `Envio protegido: ${data.skipped} assinantes jÃ¡ tinham recebido este conteÃºdo.`);
      } else if (data.success) {
        setNewsletterStatus("complete");
        const historyWarning = data.errors?.find((item) => item.batch === 0)?.message;
        const skippedMessage = data.skipped > 0 ? ` ${data.skipped} destinatÃ¡ria${data.skipped === 1 ? " foi preservada" : "s foram preservadas"} porque jÃ¡ havia recebido este conteÃºdo.` : "";
        setMessage(`ConcluÃ­do! ${data.accepted} de ${data.requested} emails foram aceitos pelo provedor. ðŸŽ‰${skippedMessage}${historyWarning ? ` ${historyWarning}` : ""}`);
        setNlSubject("");
        setNlHtml("");
        setNewsletterDispatchId(null);
        await fetchSubscribers();
      } else {
        setNewsletterStatus("partial");
        setMessage(`Envio parcial: ${data.accepted} aceitos e ${data.failed} nÃ£o enviados. VocÃª pode tentar novamente com seguranÃ§a.`);
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
    setMessage("Buscando inspiraÃ§Ã£o nas estrelas...");
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
      if (!res.ok || data.error) throw new Error(data.error || "NÃ£o consegui gerar as pÃ­lulas agora.");

      const generatedQuotes = Array.isArray(data.quotes) ? data.quotes : String(data.text || "").split("\n").filter(Boolean);
      if (generatedQuotes.length !== 15) throw new Error("O lote nÃ£o trouxe as 15 pÃ­lulas esperadas. Tente novamente.");
      setQuoteText(generatedQuotes.join("\n"));
      setMessage("15 pÃ­lulas geradas! Revise, edite e sÃ³ publique quando estiver feliz com o lote.");
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
      setMessage(`${quotesArray.length} PÃ­lulas publicadas com sucesso!`);
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
        let compressedFile: File;
        try {
          compressedFile = await compressImage(fileToUpload);
        } catch {
          setMessage("NÃ£o consegui otimizar essa foto, vou publicar com a original...");
          compressedFile = fileToUpload;
        }
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

      let journalId: string | null = null;
      if (generatedBlogPost && !isAccessory) {
        const { data: journalData, error: blogError } = await supabase.from("journal").insert([{
          title: generatedBlogTitle,
          content: generatedBlogPost,
          image_url: finalPublicUrl,
          category: blogCategory,
          papo_filter: blogCategory === "Estudei para te explicar" ? null : blogPapoFilter,
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

        if (journalId && blogCategory === "Estudei para te explicar" && resumoRapidoHasContent(generatedResumoRapidoArtigo)) {
          await supabase.from("content_summaries").insert([{ content_type: "journal", content_id: journalId, generated_by: "ai", ...resumoRapidoToRow(generatedResumoRapidoArtigo) }]);
        }

        if (journalId && generatedTagIds.length) {
          await supabase.from("content_tags").insert(generatedTagIds.map((tagId) => ({ tag_id: tagId, content_type: "journal", content_id: journalId })));
        }

        const pollQuestion = generatedPollQuestion.trim();
        const pollOptions = generatedPollOptions.map((option) => option.trim()).filter(Boolean);
        if (journalId && pollQuestion && pollOptions.length >= 2) {
          const { data: pollRow, error: pollError } = await supabase.from("polls").insert([{ journal_id: journalId, question: pollQuestion, active: true }]).select("id").single();
          if (!pollError && pollRow?.id) {
            await supabase.from("poll_options").insert(pollOptions.map((label, index) => ({ poll_id: pollRow.id, label, position: index })));
          }
        }
      }

      if (activeTab === "product" && generatedReview) {
        const finalTitle = generatedProductName || title;
        
        // Se gerou um post de diÃ¡rio, atualizar o link genÃ©rico para o link exato da resenha
        let finalReview = generatedReview;
        if (journalId) {
          finalReview = finalReview.replace(/href="\/resenhas"/g, `href="/resenhas/${journalId}"`);
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
          companion_journal_id: journalId,
          ...insertPayload
        }]).select("id").single();
        if (prodError) throw prodError;

        if (isNew && prodData?.id) {
          await supabase.from("products").update({ is_new: false }).neq("id", prodData.id);
        }

        if (prodData?.id && resumoRapidoHasContent(generatedResumoRapido)) {
          await supabase.from("content_summaries").insert([{ content_type: "product", content_id: prodData.id, generated_by: "ai", ...resumoRapidoToRow(generatedResumoRapido) }]);
        }

        if (prodData?.id && generatedTagIds.length) {
          await supabase.from("content_tags").insert(generatedTagIds.map((tagId) => ({ tag_id: tagId, content_type: "product", content_id: prodData.id })));
        }
      }

      setMessage("Sucesso! Tudo publicado no ar!");
      setTitle(""); setLink(""); setImpressions("");
      setImageFile(null); setDisplayImageFile(null); setPrice("");
      setGeneratedReview(""); setGeneratedProductName("");
      setGeneratedBlogTitle(""); setGeneratedBlogPost("");
      setBlogPapoFilter("ConfissÃµes da maturidade");
      setPostDate(""); setGeneratedResumoRapido(EMPTY_RESUMO_RAPIDO);
      setGeneratedResumoRapidoArtigo(EMPTY_RESUMO_RAPIDO);
      setGeneratedTagIds([]); setGeneratedPollQuestion(""); setGeneratedPollOptions([]);

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
      if (!res.ok || data.error) throw new Error(data.error || "O email nÃ£o foi aceito.");
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
    } catch (e: any) { setMessage("Erro: " + e.message); }
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm("Deletar esta pÃ­lula?")) return;
    try {
      await supabase.from("quotes").delete().eq("id", id);
      fetchManageData();
    } catch (e: any) { setMessage("Erro: " + e.message); }
  };

  const handleDeleteDrop = async (id: string) => {
    if (!confirm("Deletar este Drop?")) return;
    try {
      await supabase.from("drops").delete().eq("id", id);
      fetchManageData();
    } catch (e: any) { setMessage("Erro: " + e.message); }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    if (!editingItem.created_at) return setMessage("Escolha a data da publicaÃ§Ã£o antes de salvar.");
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
          papo_filter: editingItem.category === "Estudei para te explicar" ? null : (editingItem.papo_filter || "ConfissÃµes da maturidade"),
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

      const contentType = editingItem.type === "product" ? "product" : "journal";
      await supabase.from("content_tags").delete().eq("content_type", contentType).eq("content_id", editingItem.id);
      if (editingItemTagIds.length) {
        await supabase.from("content_tags").insert(editingItemTagIds.map((tagId) => ({ tag_id: tagId, content_type: contentType, content_id: editingItem.id })));
      }

      // Produto e seu artigo "Estudei" companheiro tÃªm que compartilhar exatamente
      // as mesmas tags de queixa/ativo (fase/perÃ­odo/tipo de pele/origem ficam de
      // fora, sÃ³ existem em produto). "Vida 50+" nÃ£o entra aqui â€” essa tag sÃ³
      // existe no Papo de Mulher, nunca em Vitrine/Estudei.
      const SYNCED_TAG_TYPES = new Set(["concern", "ingredient"]);
      let companionContentType: "product" | "journal" | null = null;
      let companionId: string | null = null;
      if (editingItem.type === "product" && editingItem.companionJournalId) {
        companionContentType = "journal";
        companionId = editingItem.companionJournalId;
      } else if (editingItem.type === "journal") {
        const companionProduct = products.find((prod) => prod.companion_journal_id === editingItem.id);
        if (companionProduct) {
          companionContentType = "product";
          companionId = companionProduct.id;
        }
      }
      if (companionContentType && companionId) {
        const syncedTypeTagIds = tags.filter((tag) => SYNCED_TAG_TYPES.has(tag.type)).map((tag) => tag.id);
        const syncedTagIds = editingItemTagIds.filter((tagId) => syncedTypeTagIds.includes(tagId));
        await supabase.from("content_tags").delete().eq("content_type", companionContentType).eq("content_id", companionId).in("tag_id", syncedTypeTagIds);
        if (syncedTagIds.length) {
          await supabase.from("content_tags").insert(syncedTagIds.map((tagId) => ({ tag_id: tagId, content_type: companionContentType, content_id: companionId })));
        }
      }

      if (resumoRapidoHasContent(editingItemSummary)) {
        await supabase.from("content_summaries").upsert(
          { content_type: contentType, content_id: editingItem.id, generated_by: "manual", ...resumoRapidoToRow(editingItemSummary) },
          { onConflict: "content_type,content_id" },
        );
      } else {
        await supabase.from("content_summaries").delete().eq("content_type", contentType).eq("content_id", editingItem.id);
      }

      setEditingItem(null);
      setEditingItemTagIds([]);
      setEditingItemSummary(EMPTY_RESUMO_RAPIDO);
      fetchManageData();
      setMessage("Atualizado com sucesso! As classificaÃ§Ãµes jÃ¡ estÃ£o refletidas nos filtros.");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
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
  const pendingCommentsCount = comments.filter((comment) => comment.status === "pending").length;

  const tabButtonClass = (tab: typeof activeTab) => `flex-1 whitespace-nowrap py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === tab ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`;
  const subTabButtonClass = (tab: typeof activeTab) => `rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === tab ? "bg-[var(--color-wine)] text-[var(--color-gold)]" : "bg-transparent text-[var(--color-gold-light)] opacity-70 hover:opacity-100"}`;

  if (!user) return <div className="admin-shell grid min-h-screen place-items-center text-[var(--color-gold)]"><div className="glass-panel rounded-3xl px-8 py-6">Preparando o seu ateliÃªâ€¦ âœ¨</div></div>;

  return (
    <div className="admin-shell min-h-screen px-4 py-6 md:p-8" onPaste={handlePaste}>
      <div className="mx-auto max-w-5xl">
        <header className="glass-panel mb-8 flex flex-col gap-5 rounded-[28px] p-5 md:flex-row md:items-center md:justify-between md:p-7">
          <div>
            <p className="eyebrow mb-2">AteliÃª de conteÃºdo</p>
            <h1 className="font-display text-4xl text-[var(--color-gold-light)]">Painel da Luana</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Crie, revise e publique. Para colar fotos, use Ctrl+V.</p>
          </div>
          <div className="flex flex-col items-end gap-3">
              <div className="text-right text-[var(--color-gold-light)] opacity-70 text-xs">
                <p className="font-bold tracking-widest uppercase">VersÃ£o 1.93</p>
                <p>Atualizado em 29/09/2026 Ã s 20:25</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <InstallAppButton variant="admin" />
              <button onClick={() => { supabase.auth.signOut(); window.location.href = "/admin/login"; }} className="border border-[var(--color-gold)] text-[var(--color-gold)] px-4 py-2 rounded text-xs uppercase hover:bg-[var(--color-wine-light)] transition-colors">
                Sair do Painel
              </button>
            </div>
          </div>
        </header>

        <div className="admin-tabs mb-8 flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setActiveTab("overview")} className={tabButtonClass("overview")}>
              VisÃ£o Geral
            </button>
            <button onClick={() => { setActiveTab("product"); setGeneratedReview(""); }} className={tabButtonClass("product")}>
              Vitrine (MÃ¡gica)
            </button>
            <button onClick={() => { setActiveTab("blog"); setGeneratedBlogPost(""); }} className={tabButtonClass("blog")}>
              Papo de Mulher
            </button>
            <button onClick={() => setActiveTab("manage")} className={tabButtonClass("manage")}>
              Gerenciar
            </button>
            <button onClick={() => setActiveTab("traffic")} className={tabButtonClass("traffic")}>
              TrÃ¡fego
            </button>
          </div>

          <details className="group rounded-xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-widest text-[var(--color-gold-light)]">
              <span>Mais ferramentas {pendingCommentsCount > 0 && <span className="ml-1 rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-[10px] text-[var(--color-wine-dark)]">{pendingCommentsCount}</span>}</span>
              <span className="text-[var(--color-gold)] transition-transform group-open:rotate-180" aria-hidden="true">âŒ„</span>
            </summary>
            <div className="flex flex-wrap gap-2 border-t border-[var(--color-wine-light)] p-3">
              <button onClick={() => setActiveTab("comments")} className={subTabButtonClass("comments")}>
                ComentÃ¡rios {pendingCommentsCount > 0 && <span className="ml-1 rounded-full bg-[var(--color-gold)] px-1.5 py-0.5 text-[10px] text-[var(--color-wine-dark)]">{pendingCommentsCount}</span>}
              </button>
              <button onClick={() => { setActiveTab("quotes"); setQuoteText(""); }} className={subTabButtonClass("quotes")}>
                PÃ­lulas (Quotes)
              </button>
              <button onClick={() => setActiveTab("drops")} className={subTabButtonClass("drops")}>
                Drops (Insta)
              </button>
              <button onClick={() => setActiveTab("inbox")} className={subTabButtonClass("inbox")}>
                E-mails
              </button>
              <button onClick={() => setActiveTab("newsletter")} className={subTabButtonClass("newsletter")}>
                Marketing
              </button>
              <button onClick={() => setActiveTab("memory")} className={subTabButtonClass("memory")}>
                MemÃ³ria IA
              </button>
            </div>
          </details>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="glass-panel mx-auto w-full max-w-4xl rounded-[28px] p-4 shadow-lg md:p-8">

            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <p className="eyebrow mb-2">Hoje no ateliÃª</p>
                  <h2 className="font-display text-3xl text-[var(--color-gold-light)]">VisÃ£o Geral</h2>
                  <p className="mt-1 text-sm text-[var(--color-gold-light)] opacity-70">Um resumo rÃ¡pido antes de mergulhar no trabalho do dia.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4">
                    <p className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">Visitas hoje</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-gold)]">{trafficAnalytics ? trafficAnalytics.periods.today.visits.toLocaleString("pt-BR") : "â€”"}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4">
                    <p className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">Visitas em 7 dias</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-gold)]">{trafficAnalytics ? trafficAnalytics.periods.last7.visits.toLocaleString("pt-BR") : "â€”"}</p>
                  </div>
                  <div className={`rounded-xl border p-4 ${pendingCommentsCount > 0 ? "border-[var(--color-gold)] bg-[#3a1820]" : "border-[var(--color-wine-light)] bg-[var(--color-wine-dark)]"}`}>
                    <p className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">ComentÃ¡rios pendentes</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-gold)]">{pendingCommentsCount}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4">
                    <p className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">Custo de IA no mÃªs</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-gold)]">R$ {aiUsage.costBrl.toFixed(2).replace(".", ",")}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--color-gold-light)] opacity-70">Atalhos rÃ¡pidos</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <button onClick={() => { setActiveTab("product"); setGeneratedReview(""); }} className="rounded-xl border border-[var(--color-gold)] bg-[var(--color-wine-dark)] p-4 text-left text-sm font-bold uppercase tracking-widest text-[var(--color-gold)] transition-colors hover:bg-[var(--color-wine-light)]">âœ¨ Gerar Vitrine</button>
                    <button onClick={() => { setActiveTab("blog"); setGeneratedBlogPost(""); }} className="rounded-xl border border-[var(--color-gold)] bg-[var(--color-wine-dark)] p-4 text-left text-sm font-bold uppercase tracking-widest text-[var(--color-gold)] transition-colors hover:bg-[var(--color-wine-light)]">ðŸ’¬ Gerar Papo de Mulher</button>
                    <button onClick={() => setActiveTab("traffic")} className="rounded-xl border border-[var(--color-gold)] bg-[var(--color-wine-dark)] p-4 text-left text-sm font-bold uppercase tracking-widest text-[var(--color-gold)] transition-colors hover:bg-[var(--color-wine-light)]">ðŸ“ˆ Ver trÃ¡fego completo</button>
                  </div>
                </div>

                {pendingCommentsCount > 0 && (
                  <button onClick={() => setActiveTab("comments")} className="w-full rounded-xl border border-[var(--color-gold)] bg-[#3a1820] p-4 text-left text-sm text-[var(--color-gold-light)]">
                    VocÃª tem <strong className="text-[var(--color-gold)]">{pendingCommentsCount}</strong> comentÃ¡rio{pendingCommentsCount === 1 ? "" : "s"} esperando moderaÃ§Ã£o. Toque para revisar.
                  </button>
                )}

                {aiUsage.costBrl >= 8 && (
                  <div className={`rounded-xl border p-4 text-sm font-bold ${aiUsage.costBrl >= 10 ? "border-red-400 bg-red-950/40 text-red-200" : "border-amber-400 bg-amber-950/30 text-amber-100"}`}>
                    {aiUsage.costBrl >= 10 ? "âš ï¸ A meta mensal de R$ 10 de IA foi alcanÃ§ada. Confirme o custo antes de novas geraÃ§Ãµes." : "ðŸ’› O gasto de IA passou de R$ 8 neste mÃªs e estÃ¡ perto da meta."}
                  </div>
                )}
              </div>
            )}

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
                            âœ•
                          </button>
                        </div>
                      ) : (
                        <div className="text-[var(--color-gold-light)] mb-4">
                          <span className="text-3xl block mb-2">ðŸ“¸</span>
                          <p className="font-bold uppercase tracking-widest text-xs">Cole a Foto do Produto Aqui (Ctrl+V)</p>
                          <p className="text-xs opacity-70">A IA vai extrair o nome e os ingredientes</p>
                        </div>
                      )}
                      {!previewUrl && (
                        <button onClick={() => document.getElementById("aiFileInput")?.click()} className="border border-[var(--color-gold)] text-[var(--color-gold)] px-4 py-2 rounded text-xs uppercase hover:bg-[var(--color-wine)]">Ou clique para escolher</button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-1">Link de Compra (Shopee, etc) *ObrigatÃ³rio</label>
                      <input type="text" value={link} onChange={(e) => setLink(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-60 hover:opacity-100 transition-opacity">
                      <div>
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1">Dica de Nome (Opcional)</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deixe a IA descobrir" className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]" />
                      </div>
                      <div>
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1">PreÃ§o (Opcional)</label>
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
                          <label className="block text-[var(--color-gold-light)] text-sm mb-1">Minha relaÃ§Ã£o com este produto</label>
                          <select value={productExperience} onChange={(e) => setProductExperience(e.target.value as typeof productExperience)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]">
                            <option value="nao_informado">NÃ£o informada</option><option value="pesquisado">Ainda nÃ£o usei; estou pesquisando</option><option value="impressao_inicial">Primeiras impressÃµes</option><option value="testado">Usei e testei</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[var(--color-gold-light)] text-sm mb-1">Tempo de uso, se houver</label>
                          <input value={productTestDuration} onChange={(e) => setProductTestDuration(e.target.value)} placeholder="Ex.: trÃªs semanas" className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]" />
                        </div>
                      </div>

                      <div className="opacity-80 hover:opacity-100 transition-opacity">
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1">Suas Notas Pessoais (Opcional)</label>
                        <textarea placeholder="Se vocÃª nÃ£o digitar nada, a IA foca nos benefÃ­cios cientÃ­ficos." value={impressions} onChange={(e) => setImpressions(e.target.value)} rows={2} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]"></textarea>
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
                          ðŸ‘— Ã‰ um acessÃ³rio, roupa ou item de estilo (nÃ£o possui fÃ³rmula / nÃ£o gera resenha cientÃ­fica).
                        </label>
                      </div>

                    
                    <button onClick={handleGenerateText} disabled={loading} className="w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform mt-4">
                      {loading ? "A IA ESTÃ LENDO A FOTO..." : "GERAR MÃGICA TOTAL"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className={`bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)] ${isAccessory ? "md:col-span-2" : ""}`}>
                          <h3 className="text-[var(--color-gold)] font-serif text-xl mb-4 text-center">{isAccessory ? "Vitrine (AcessÃ³rio/Estilo)" : `1. Vitrine: ${generatedProductName}`}</h3>
                          <textarea value={generatedReview} onChange={(e) => setGeneratedReview(e.target.value)} rows={8} className="w-full bg-transparent text-[var(--color-gold-light)] focus:outline-none resize-none leading-relaxed" ></textarea>
                          {isAccessory && (
                            <div className="mt-4 rounded-xl border border-[var(--color-wine-light)] bg-black/15 p-4 text-sm text-[var(--color-gold-light)]">
                              <p className="font-bold text-[var(--color-gold)]">Como a IA construiu este texto</p>
                              <p className="mt-2"><span className="font-bold">Detalhes das suas notas:</span> {accessoryDetailsUsed.length ? accessoryDetailsUsed.join(" â€¢ ") : "nenhuma nota pessoal foi informada"}</p>
                              <p className="mt-1"><span className="font-bold">Humor elegante:</span> {accessoryHumorApplied ? "aplicado âœ“" : "nÃ£o confirmado"}</p>
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

                      <fieldset className="rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                        <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Temas e tags sugeridas</legend>
                        <p className="mb-4 text-xs text-[var(--color-gold-light)] opacity-65">A IA jÃ¡ marcou o que encaixou. Ajuste antes de publicar â€” vale pro produto e pro artigo.</p>
                        {(["concern", "ingredient", "life_topic", "category", "routine_phase", "routine_period", "skin_type", "origin", "body_part"] as TagType[]).map((type) => {
                          const optionsForType = tags.filter((tag) => tag.type === type);
                          if (!optionsForType.length) return null;
                          return (
                            <div key={type} className="mb-4 last:mb-0">
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-gold)] opacity-80">{TAG_TYPE_LABELS[type]}</p>
                              <div className="flex flex-wrap gap-2">
                                {optionsForType.map((tag) => {
                                  const active = generatedTagIds.includes(tag.id);
                                  return (
                                    <button
                                      key={tag.id}
                                      type="button"
                                      onClick={() => toggleGeneratedTag(tag.id)}
                                      aria-pressed={active}
                                      className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${active ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold)]" : "border-[var(--color-wine-light)] text-[var(--color-gold-light)] opacity-70"}`}
                                    >
                                      {tag.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-wine-light)] pt-4">
                          <input
                            type="text"
                            value={newTagName}
                            onChange={(event) => setNewTagName(event.target.value)}
                            placeholder="Nova tag (ex.: Firmeza)"
                            className="min-w-[180px] flex-1 rounded border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] px-3 py-2 text-sm text-[var(--color-gold-light)]"
                          />
                          <select value={newTagType} onChange={(event) => setNewTagType(event.target.value as TagType)} className="rounded border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] px-2 py-2 text-xs text-[var(--color-gold-light)]">
                            {(["concern", "ingredient", "life_topic", "category", "routine_phase", "routine_period", "skin_type", "origin", "body_part"] as TagType[]).map((type) => <option key={type} value={type}>{TAG_TYPE_LABELS[type]}</option>)}
                          </select>
                          <button type="button" onClick={handleCreateTag} disabled={creatingTag || !newTagName.trim()} className="rounded bg-[var(--color-gold)] px-3 py-2 text-xs font-bold uppercase text-[var(--color-wine-dark)] disabled:opacity-50">
                            {creatingTag ? "Criandoâ€¦" : "Criar tag"}
                          </button>
                        </div>
                      </fieldset>

                      <fieldset className="rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                        <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Resumo do produto (Em 30 segundos)</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {resumoRapidoFields("product").map(({ key, label }) => (
                            <label key={key} className="block text-xs font-bold uppercase tracking-wider text-[var(--color-gold-light)]">
                              {label}
                              <input
                                type="text"
                                value={generatedResumoRapido[key]}
                                onChange={(event) => setGeneratedResumoRapido({ ...generatedResumoRapido, [key]: event.target.value })}
                                className="mt-1 w-full px-3 py-2 text-sm normal-case tracking-normal"
                              />
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      {!isAccessory && (
                        <fieldset className="rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                          <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Resumo do artigo (Em 30 segundos)</legend>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {resumoRapidoFields("journal").map(({ key, label }) => (
                              <label key={key} className="block text-xs font-bold uppercase tracking-wider text-[var(--color-gold-light)]">
                                {label}
                                <input
                                  type="text"
                                  value={generatedResumoRapidoArtigo[key]}
                                  onChange={(event) => setGeneratedResumoRapidoArtigo({ ...generatedResumoRapidoArtigo, [key]: event.target.value })}
                                  className="mt-1 w-full px-3 py-2 text-sm normal-case tracking-normal"
                                />
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      )}

                      {!isAccessory && (
                        <fieldset className="rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                          <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Enquete sugerida</legend>
                          <p className="mb-4 text-xs text-[var(--color-gold-light)] opacity-65">Deixe a pergunta em branco para publicar sem enquete.</p>
                          <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-[var(--color-gold-light)]">
                            Pergunta
                            <input
                              type="text"
                              value={generatedPollQuestion}
                              onChange={(event) => setGeneratedPollQuestion(event.target.value)}
                              placeholder="Ex.: O que mais mudou na sua pele depois dos 50?"
                              className="mt-1 w-full px-3 py-2 text-sm normal-case tracking-normal"
                            />
                          </label>
                          <div className="grid gap-2">
                            {generatedPollOptions.map((option, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(event) => updateGeneratedPollOption(index, event.target.value)}
                                  placeholder={`OpÃ§Ã£o ${index + 1}`}
                                  className="w-full px-3 py-2 text-sm normal-case tracking-normal"
                                />
                                {generatedPollOptions.length > 2 && (
                                  <button type="button" onClick={() => removeGeneratedPollOption(index)} className="rounded border border-red-900 px-2 py-2 text-xs text-red-400">âœ•</button>
                                )}
                              </div>
                            ))}
                          </div>
                          {generatedPollOptions.length < 5 && (
                            <button type="button" onClick={addGeneratedPollOption} className="mt-3 rounded border border-[var(--color-wine-light)] px-3 py-2 text-xs font-bold uppercase text-[var(--color-gold-light)]">+ Adicionar opÃ§Ã£o</button>
                          )}
                        </fieldset>
                      )}
                    </div>

                    <div className="border-2 border-dashed border-[var(--color-wine-light)] rounded-xl p-6 text-center bg-[var(--color-wine-dark)] relative mt-6 flex flex-col items-center">
                      <input type="file" id="officialFileInput" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setDisplayImageFile(e.target.files[0]); }} />
                      {displayPreviewUrl ? (
                         <div className="relative inline-block mt-4 mb-4">
                          <img src={displayPreviewUrl} alt="Preview" className="mx-auto max-h-48 object-contain rounded" />
                          <button onClick={(e) => { e.stopPropagation(); setDisplayImageFile(null); }} className="absolute -top-3 -right-3 bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors shadow-lg border-2 border-[var(--color-wine-dark)]" title="Excluir Foto">
                            âœ•
                          </button>
                        </div>
                      ) : (
                        <div className="text-[var(--color-gold-light)] mb-4">
                          <p className="font-bold uppercase tracking-widest text-sm text-[var(--color-gold)]">A foto inicial serÃ¡ usada na vitrine.</p>
                          <p className="text-xs opacity-70 mt-2">Quer trocar por outra foto? (Cole com Ctrl+V)</p>
                        </div>
                      )}
                      {!displayPreviewUrl && (
                        <button onClick={() => document.getElementById("officialFileInput")?.click()} className="border border-[var(--color-wine-light)] text-[var(--color-gold)] px-6 py-2 rounded uppercase tracking-widest hover:bg-[var(--color-wine)] mt-2">Escolher Outra Foto</button>
                      )}
                    </div>


                    <div className="flex gap-4 mt-6">
                       <button onClick={() => { setGeneratedReview(""); setGeneratedProductName(""); setGeneratedBlogTitle(""); setGeneratedBlogPost(""); setAccessoryDetailsUsed([]); setAccessoryHumorApplied(false); setGeneratedResumoRapido(EMPTY_RESUMO_RAPIDO); setGeneratedResumoRapidoArtigo(EMPTY_RESUMO_RAPIDO); setGeneratedTagIds([]); setGeneratedPollQuestion(""); setGeneratedPollOptions([]); }} className="flex-1 border border-[var(--color-wine-light)] text-[var(--color-gold-light)] py-4 rounded font-bold uppercase hover:bg-[var(--color-wine-dark)] transition-colors">
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
                        <h2 className="text-xl font-serif text-[var(--color-gold)]">Gerador de CrÃ´nicas</h2>
                        <button onClick={handleBrainstorm} disabled={loading} className="border border-[#b5952f] text-[var(--color-gold)] px-4 py-2 rounded text-xs uppercase hover:bg-[var(--color-gold)] hover:text-[var(--color-wine-dark)] transition-colors">
                            ðŸ’¡ Me dÃª Ideias!
                        </button>
                    </div>

                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-1">TÃ­tulo / Tema da CrÃ´nica</label>
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: A libertaÃ§Ã£o que Ã© parar de tingir o cabelo" className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]" />
                    </div>

                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-1">Categoria no DiÃ¡rio</label>
                      <select value={blogCategory} onChange={(e) => setBlogCategory(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]">
                        <option value="Papo de Mulher Madura">ðŸ· Papo de Mulher Madura</option>
                        <option value="Estudei para te explicar">ðŸ§  Estudei para te explicar</option>
                      </select>
                    </div>

                    {blogCategory !== "Estudei para te explicar" && (
                      <div>
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1">Gancho do Papo</label>
                        <select value={blogPapoFilter} onChange={(e) => setBlogPapoFilter(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]">
                          {PAPO_FILTERS.map((filter) => <option value={filter} key={filter}>{filter}</option>)}
                        </select>
                        <p className="mt-2 text-xs leading-5 text-[var(--color-gold-light)] opacity-60">Esse Ã© o filtro emocional que aparece no Papo de Mulher Madura.</p>
                      </div>
                    )}

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
                      <label className="block text-[var(--color-gold-light)] text-sm mb-1">Suas ImpressÃµes / AnotaÃ§Ãµes (A IA vai transformar isso em texto!)</label>
                      <textarea placeholder="O que vocÃª quer falar sobre esse tema? Ex: Na menopausa ninguÃ©m te avisa que a paciÃªncia acaba mais rÃ¡pido que o colÃ¡geno..." value={impressions} onChange={(e) => setImpressions(e.target.value)} rows={5} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]"></textarea>
                    </div>

                     <div className="border-2 border-dashed border-[var(--color-wine-light)] rounded-xl p-6 text-center bg-[var(--color-wine-dark)] relative flex flex-col items-center justify-center">
                      <input type="file" id="blogFileInput" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]); }} />
                      {previewUrl ? (
                        <div className="relative inline-block mt-4 mb-4">
                          <img src={previewUrl} alt="Preview" className="mx-auto max-h-48 object-contain rounded" />
                          <button onClick={(e) => { e.stopPropagation(); setImageFile(null); }} className="absolute -top-3 -right-3 bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors shadow-lg border-2 border-[var(--color-wine-dark)]" title="Excluir Foto">
                            âœ•
                          </button>
                        </div>
                      ) : (
                        <div className="text-[var(--color-gold-light)] mb-4">
                          <span className="text-3xl block mb-2">ðŸ“¸</span>
                          <p className="font-bold uppercase tracking-widest text-xs">Foto para a Postagem (Opcional)</p>
                          <p className="text-xs opacity-70">Pode colar com Ctrl+V</p>
                        </div>
                      )}
                      {!previewUrl && (
                        <button onClick={() => document.getElementById("blogFileInput")?.click()} className="border border-[var(--color-gold)] text-[var(--color-gold)] px-4 py-2 rounded text-xs uppercase hover:bg-[var(--color-wine)]">Escolher Arquivo</button>
                      )}
                    </div>

                    
                    <button onClick={handleGenerateBlogOnly} disabled={loading} className="w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform mt-4">
                      {loading ? "A IA ESTÃ ESCREVENDO..." : "ESCREVER CRÃ”NICA"}
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
                            âœ•
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


                    <div className="flex gap-4 mt-6">
                       <button onClick={() => { setGeneratedBlogTitle(""); setGeneratedBlogPost(""); }} className="flex-1 border border-[var(--color-wine-light)] text-[var(--color-gold-light)] py-4 rounded font-bold uppercase hover:bg-[var(--color-wine-dark)] transition-colors">
                        Descartar
                      </button>
                      <button onClick={handlePublish} disabled={loading} className="flex-2 w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform">
                        {loading ? "PUBLICANDO..." : "PUBLICAR NO DIÃRIO"}
                      </button>
                    </div>
                  </>
                )}
               </div>
            )}

            {activeTab === "manage" && (
              <div className="space-y-8">
                {!editingItem && (
                  <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Tipo de conteÃºdo para gerenciar">
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
                {!editingItem && (manageType === "vitrine" || manageType === "estudei" || manageType === "papo") && (
                  <details className="group rounded-2xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)]">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-widest text-[var(--color-gold-light)] opacity-70">
                      <span>Ferramentas de manutenÃ§Ã£o (uso raro)</span>
                      <span className="text-[var(--color-gold)] transition-transform group-open:rotate-180" aria-hidden="true">âŒ„</span>
                    </summary>
                    <div className="space-y-3 border-t border-[var(--color-wine-light)] p-4">
                      {(manageType === "vitrine" || manageType === "estudei") && (
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] px-4 py-3">
                          <p className="flex-1 text-xs text-[var(--color-gold-light)] opacity-70">Faltam &quot;Em 30 segundos&quot; na Vitrine ou em Estudei? Gero de uma vez para tudo que ainda nÃ£o tem, a partir do texto jÃ¡ publicado.</p>
                          <button type="button" onClick={handleBulkGenerateSummaries} disabled={Boolean(bulkSummaryStatus)} className="whitespace-nowrap rounded bg-[var(--color-gold)] px-3 py-2 text-xs font-bold uppercase text-[var(--color-wine-dark)] disabled:opacity-50">
                            {bulkSummaryStatus || "âœ¨ Gerar resumos que faltam"}
                          </button>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] px-4 py-3">
                        <p className="flex-1 text-xs text-[var(--color-gold-light)] opacity-70">Falta etiquetar algo? Sugiro tags a partir do texto jÃ¡ publicado pra tudo que ainda nÃ£o tem nenhuma â€” grava direto, vocÃª revisa depois.</p>
                        <button type="button" onClick={handleBulkSuggestTags} disabled={Boolean(bulkTagStatus)} className="whitespace-nowrap rounded bg-[var(--color-gold)] px-3 py-2 text-xs font-bold uppercase text-[var(--color-wine-dark)] disabled:opacity-50">
                          {bulkTagStatus || "ðŸ·ï¸ Sugerir tags para tudo que falta"}
                        </button>
                      </div>
                    </div>
                  </details>
                )}
                {editingItem ? (
                  <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                    <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif">
                      Editando {editingItem.type === "product" ? "Produto da Vitrine" : "Artigo do DiÃ¡rio"}
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
                        Data da publicaÃ§Ã£o
                        <input type="date" required value={editingItem.created_at || ""} onChange={(event) => setEditingItem({ ...editingItem, created_at: event.target.value })} className="mt-1 w-full px-3 text-sm normal-case tracking-normal" />
                      </label>
                    </div>
                    {editingItem.type === "journal" && editingItem.category !== "Estudei para te explicar" && (
                      <div className="mb-5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-gold-light)]">Gancho do Papo</label>
                        <select value={editingItem.papo_filter || "ConfissÃµes da maturidade"} onChange={(event) => setEditingItem({ ...editingItem, papo_filter: event.target.value })} className="mt-1 w-full rounded border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] px-3 py-3 text-sm text-[var(--color-gold-light)]">
                          {PAPO_FILTERS.map((filter) => <option value={filter} key={filter}>{filter}</option>)}
                        </select>
                      </div>
                    )}
                    {editingItem.type === "product" ? (
                      <fieldset className="mb-5 rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                        <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Filtros especiais</legend>
                        <p className="mb-4 text-xs text-[var(--color-gold-light)] opacity-65">VocÃª pode marcar mais de uma opÃ§Ã£o. Os selos e filtros aparecem imediatamente em Achados.</p>
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
                    <fieldset className="mb-5 rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                      <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Temas e tags</legend>
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-[var(--color-gold-light)] opacity-65">Marque os temas ligados a este conteÃºdo. Elas alimentam a navegaÃ§Ã£o por tema, a busca e os filtros por ativo/queixa.</p>
                        <button type="button" onClick={handleSuggestTagsForEditingItem} disabled={suggestingTags} className="whitespace-nowrap rounded bg-[var(--color-gold)] px-3 py-2 text-xs font-bold uppercase text-[var(--color-wine-dark)] disabled:opacity-50">
                          {suggestingTags ? "Sugerindoâ€¦" : "âœ¨ Sugerir com IA"}
                        </button>
                      </div>
                      {(["concern", "ingredient", "life_topic", "category", "routine_phase", "routine_period", "skin_type", "origin", "body_part"] as TagType[]).map((type) => {
                        const optionsForType = tags.filter((tag) => tag.type === type);
                        if (!optionsForType.length) return null;
                        return (
                          <div key={type} className="mb-4 last:mb-0">
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-gold)] opacity-80">{TAG_TYPE_LABELS[type]}</p>
                            <div className="flex flex-wrap gap-2">
                              {optionsForType.map((tag) => {
                                const active = editingItemTagIds.includes(tag.id);
                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleEditingItemTag(tag.id)}
                                    aria-pressed={active}
                                    className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${active ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold)]" : "border-[var(--color-wine-light)] text-[var(--color-gold-light)] opacity-70"}`}
                                  >
                                    {tag.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-wine-light)] pt-4">
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(event) => setNewTagName(event.target.value)}
                          placeholder="Nova tag (ex.: Firmeza)"
                          className="min-w-[180px] flex-1 rounded border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] px-3 py-2 text-sm text-[var(--color-gold-light)]"
                        />
                        <select value={newTagType} onChange={(event) => setNewTagType(event.target.value as TagType)} className="rounded border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] px-2 py-2 text-xs text-[var(--color-gold-light)]">
                          {(["concern", "ingredient", "life_topic", "category", "routine_phase", "routine_period", "skin_type", "origin", "body_part"] as TagType[]).map((type) => <option key={type} value={type}>{TAG_TYPE_LABELS[type]}</option>)}
                        </select>
                        <button type="button" onClick={handleCreateTag} disabled={creatingTag || !newTagName.trim()} className="rounded bg-[var(--color-gold)] px-3 py-2 text-xs font-bold uppercase text-[var(--color-wine-dark)] disabled:opacity-50">
                          {creatingTag ? "Criandoâ€¦" : "Criar tag"}
                        </button>
                      </div>
                    </fieldset>
                    {(editingItem.type === "product" || editingItem.category === "Estudei para te explicar") && (
                      <fieldset className="mb-5 rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                        <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Em 30 segundos</legend>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-[var(--color-gold-light)] opacity-65">Aparece na ficha antes do texto completo. Deixe em branco o que nÃ£o fizer sentido aqui.</p>
                          <button type="button" onClick={handleGenerateSummaryForEditingItem} disabled={generatingSummary} className="whitespace-nowrap rounded bg-[var(--color-gold)] px-3 py-2 text-xs font-bold uppercase text-[var(--color-wine-dark)] disabled:opacity-50">
                            {generatingSummary ? "Gerandoâ€¦" : "âœ¨ Gerar com IA"}
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {resumoRapidoFields(editingItem.type === "product" ? "product" : "journal").map(({ key, label }) => (
                            <label key={key} className="block text-xs font-bold uppercase tracking-wider text-[var(--color-gold-light)]">
                              {label}
                              <input
                                type="text"
                                value={editingItemSummary[key]}
                                onChange={(event) => setEditingItemSummary({ ...editingItemSummary, [key]: event.target.value })}
                                className="mt-1 w-full px-3 py-2 text-sm normal-case tracking-normal"
                              />
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                    {editingItem.type === "journal" && (
                      <fieldset className="mb-5 rounded-2xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                        <legend className="px-2 text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Enquete</legend>
                        {editingItemPoll.voteCount > 0 ? (
                          <div>
                            <p className="mb-3 text-xs text-[var(--color-gold-light)] opacity-65">JÃ¡ tem voto registrado, entÃ£o a pergunta e as opÃ§Ãµes ficam travadas (mudar agora invalidaria os votos). VocÃª pode encerrar ou excluir.</p>
                            <p className="mb-3 font-bold text-[var(--color-gold-light)]">{editingItemPoll.question}</p>
                            <div className="mb-4 grid gap-2">
                              {editingItemPoll.optionResults.map((option) => {
                                const percent = editingItemPoll.voteCount ? Math.round((option.count / editingItemPoll.voteCount) * 100) : 0;
                                return (
                                  <div key={option.id} className="flex items-center justify-between rounded-lg border border-[var(--color-wine-light)] px-3 py-2 text-sm text-[var(--color-gold-light)]">
                                    <span>{option.label}</span>
                                    <span className="opacity-70">{option.count} voto{option.count === 1 ? "" : "s"} Â· {percent}%</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={handleTogglePollActive} disabled={savingPoll} className="rounded border border-[var(--color-wine-light)] px-3 py-2 text-xs font-bold uppercase text-[var(--color-gold-light)] disabled:opacity-50">
                                {editingItemPoll.active ? "Encerrar enquete" : "Reativar enquete"}
                              </button>
                              <button type="button" onClick={handleDeletePoll} disabled={savingPoll} className="rounded border border-red-900 px-3 py-2 text-xs font-bold uppercase text-red-400 disabled:opacity-50">
                                Excluir enquete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="mb-4 text-xs text-[var(--color-gold-light)] opacity-65">Pergunta curta + de 2 a 5 opÃ§Ãµes. Aparece no artigo entre o texto e {editingItem.category === "Estudei para te explicar" ? "os prÃ³ximos passos" : "a roda de conversa"}. Deixe a pergunta em branco para nÃ£o ter enquete.</p>
                            <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-[var(--color-gold-light)]">
                              Pergunta
                              <input
                                type="text"
                                value={editingItemPoll.question}
                                onChange={(event) => setEditingItemPoll({ ...editingItemPoll, question: event.target.value })}
                                placeholder="Ex.: O que mais mudou na sua pele depois dos 50?"
                                className="mt-1 w-full px-3 py-2 text-sm normal-case tracking-normal"
                              />
                            </label>
                            <div className="grid gap-2">
                              {editingItemPoll.options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(event) => updatePollOption(index, event.target.value)}
                                    placeholder={`OpÃ§Ã£o ${index + 1}`}
                                    className="w-full px-3 py-2 text-sm normal-case tracking-normal"
                                  />
                                  {editingItemPoll.options.length > 2 && (
                                    <button type="button" onClick={() => removePollOption(index)} className="text-xs text-red-400" aria-label="Remover opÃ§Ã£o">âœ•</button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {editingItemPoll.options.length < 5 && (
                                <button type="button" onClick={addPollOption} className="rounded border border-[var(--color-wine-light)] px-3 py-2 text-xs font-bold uppercase text-[var(--color-gold-light)]">
                                  + Adicionar opÃ§Ã£o
                                </button>
                              )}
                              <button type="button" onClick={handleSavePoll} disabled={savingPoll} className="rounded bg-[var(--color-gold)] px-3 py-2 text-xs font-bold uppercase text-[var(--color-wine-dark)] disabled:opacity-50">
                                {savingPoll ? "Salvandoâ€¦" : "Salvar enquete"}
                              </button>
                            </div>
                          </div>
                        )}
                      </fieldset>
                    )}
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm text-[var(--color-gold-light)]">Corpo do artigo</label>
                      <div className="flex gap-1 rounded-lg border border-[var(--color-wine-light)] p-1">
                        <button type="button" onClick={() => setContentPreview(false)} className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-widest ${!contentPreview ? "bg-[var(--color-wine)] text-[var(--color-gold)]" : "text-[var(--color-gold-light)] opacity-60"}`}>Editar</button>
                        <button type="button" onClick={() => setContentPreview(true)} className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-widest ${contentPreview ? "bg-[var(--color-wine)] text-[var(--color-gold)]" : "text-[var(--color-gold-light)] opacity-60"}`}>PrÃ©via</button>
                      </div>
                    </div>
                    {contentPreview ? (
                      <div className="max-h-[420px] min-h-[200px] overflow-auto rounded border border-[var(--color-wine-light)] bg-white p-4 text-sm leading-relaxed text-[#2b151b]" dangerouslySetInnerHTML={{ __html: editingItem.content }} />
                    ) : (
                      <textarea value={editingItem.content} onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })} rows={15} className="w-full bg-transparent text-[var(--color-gold-light)] focus:outline-none resize-none leading-relaxed border border-[var(--color-wine-light)] p-4 rounded" ></textarea>
                    )}
                    <div className="flex gap-4 mt-4">
                      <button onClick={() => { setEditingItem(null); setEditingItemTagIds([]); setEditingItemSummary(EMPTY_RESUMO_RAPIDO); setEditingItemPoll(EMPTY_POLL); }} className="flex-1 border border-[var(--color-wine-light)] text-[var(--color-gold-light)] py-3 rounded font-bold uppercase">
                        Cancelar
                      </button>
                      <button onClick={handleUpdateItem} disabled={loading || !editingItem.created_at} className="flex-2 w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-3 rounded font-bold uppercase disabled:opacity-50">
                        {loading ? "Salvando..." : "Salvar AlteraÃ§Ãµes"}
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
                            <button onClick={() => startEditingItem({ type: "product", id: p.id, title: p.title, content: p.description, category: p.category || "SkinCare", created_at: toDateInputValue(p.created_at), is_featured: Boolean(p.is_featured), is_most_purchased: Boolean(p.is_most_purchased), is_most_viewed: Boolean(p.is_most_viewed), is_new: Boolean(p.is_new), companionJournalId: p.companion_journal_id }, "product")} className="text-xs bg-[var(--color-wine-light)] text-[var(--color-gold)] px-3 py-1 rounded">Editar</button>
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
                            <span className="ml-2 text-[var(--color-gold-light)] opacity-50 text-xs">â€¢ {formatPostDate(j.created_at)}</span>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {j.papo_filter && <span className="rounded-full bg-[var(--color-gold)]/10 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">{j.papo_filter}</span>}
                              {j.is_featured && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Destaque</span>}
                              {j.is_most_viewed && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Mais lido</span>}
                              {j.is_new && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Novo</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => startEditingItem({ type: "journal", id: j.id, title: j.title, content: j.content, category: j.category || "Geral", papo_filter: j.papo_filter || "ConfissÃµes da maturidade", created_at: toDateInputValue(j.created_at), is_featured: Boolean(j.is_featured), is_most_viewed: Boolean(j.is_most_viewed), is_new: Boolean(j.is_new) }, "journal")} className="text-xs bg-[var(--color-wine-light)] text-[var(--color-gold)] px-3 py-1 rounded">Editar</button>
                            <button onClick={() => handleDeleteJournal(j.id)} className="text-xs bg-red-900 text-white px-3 py-1 rounded">Deletar</button>
                            <button onClick={() => handleGenerateSocialProof(j.id, j.category || 'Geral', j.title, j.content)} disabled={socialProofLoading[j.id]} className={	ext-xs px-3 py-1 rounded font-bold uppercase {socialProofLoading[j.id] ? 'bg-transparent text-[var(--color-gold-light)] opacity-50' : 'bg-[#e2c1c6] text-[#2b151b] hover:bg-white'}}>{socialProofLoading[j.id] ? 'Gerando...' : '✨ Gerar Prova Social'}</button>
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
                            <span className="ml-2 text-[var(--color-gold-light)] opacity-50 text-xs">â€¢ {formatPostDate(j.created_at)}</span>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {j.is_featured && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Destaque</span>}
                              {j.is_most_viewed && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Mais lido</span>}
                              {j.is_new && <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold)]">Novo</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => startEditingItem({ type: "journal", id: j.id, title: j.title, content: j.content, category: j.category || "Geral", papo_filter: j.papo_filter || "", created_at: toDateInputValue(j.created_at), is_featured: Boolean(j.is_featured), is_most_viewed: Boolean(j.is_most_viewed), is_new: Boolean(j.is_new) }, "journal")} className="text-xs bg-[var(--color-wine-light)] text-[var(--color-gold)] px-3 py-1 rounded">Editar</button>
                            <button onClick={() => handleDeleteJournal(j.id)} className="text-xs bg-red-900 text-white px-3 py-1 rounded">Deletar</button>
                            <button onClick={() => handleGenerateSocialProof(j.id, j.category || 'Geral', j.title, j.content)} disabled={socialProofLoading[j.id]} className={	ext-xs px-3 py-1 rounded font-bold uppercase {socialProofLoading[j.id] ? 'bg-transparent text-[var(--color-gold-light)] opacity-50' : 'bg-[#e2c1c6] text-[#2b151b] hover:bg-white'}}>{socialProofLoading[j.id] ? 'Gerando...' : '✨ Gerar Prova Social'}</button>
                          </div>
                        </div>
                      ))}
                    </div>}
                  </>
                )}
              </div>
            )}

            {activeTab === "comments" && (() => {
              const pending = comments.filter((comment) => comment.status === "pending");
              const moderated = comments.filter((comment) => comment.status !== "pending");
              const renderComment = (comment: SiteComment) => {
                const journal = Array.isArray(comment.journal) ? comment.journal[0] : comment.journal;
                const product = Array.isArray(comment.product) ? comment.product[0] : comment.product;
                const originLabel = product ? "Vitrine" : journal?.category === "Estudei para te explicar" ? "Estudei" : "Papo de Mulher";
                return (
                  <article key={comment.id} className={`rounded-2xl border p-5 ${comment.status === "pending" ? "border-[var(--color-gold)] bg-[#3a1820]" : "border-[var(--color-wine-light)] bg-[var(--color-wine-dark)]"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">{comment.status === "pending" ? "Pendente" : comment.status === "approved" ? "Aprovado" : "Rejeitado"}</p>
                          <span className="rounded-full border border-[var(--color-wine-light)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--color-gold-light)] opacity-70">{originLabel}</span>
                        </div>
                        <h3 className="mt-2 font-serif text-xl text-[var(--color-gold-light)]">{journal?.title || product?.title || "Papo de Mulher"}</h3>
                        <p className="mt-1 text-xs text-[var(--color-gold-light)] opacity-55">{comment.email} â€¢ {new Date(comment.created_at).toLocaleString("pt-BR")}</p>
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
              };
              return (
                <div className="space-y-8">
                  <div className="rounded-2xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-5">
                    <p className="eyebrow">O papo continuou por aqui</p>
                    <h2 className="font-display mt-2 text-3xl text-[var(--color-gold)]">ComentÃ¡rios</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-gold-light)] opacity-70">As leitoras enviam email e impressÃ£o. O email fica sÃ³ para vocÃª; no site aparece como Amiga Entreluar.</p>
                  </div>

                  {comments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--color-wine-light)] p-8 text-center text-sm text-[var(--color-gold-light)] opacity-70">Nenhum comentÃ¡rio chegou por enquanto.</div>
                  ) : (
                    <>
                      <section>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">Precisa da sua aÃ§Ã£o</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${pending.length > 0 ? "bg-[var(--color-gold)] text-[var(--color-wine-dark)]" : "bg-[var(--color-wine-light)] text-[var(--color-gold-light)] opacity-60"}`}>{pending.length}</span>
                        </div>
                        {pending.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[var(--color-wine-light)] p-6 text-center text-sm text-[var(--color-gold-light)] opacity-60">Tudo em dia! Nenhum comentÃ¡rio esperando moderaÃ§Ã£o. âœ¨</div>
                        ) : (
                          <div className="space-y-4">{pending.map(renderComment)}</div>
                        )}
                      </section>

                      {moderated.length > 0 && (
                        <details className="group rounded-2xl border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)]">
                          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold uppercase tracking-widest text-[var(--color-gold-light)]">
                            <span>JÃ¡ moderados <span className="opacity-60">({moderated.length})</span></span>
                            <span className="text-[var(--color-gold)] transition-transform group-open:rotate-180" aria-hidden="true">âŒ„</span>
                          </summary>
                          <div className="space-y-4 border-t border-[var(--color-wine-light)] p-5">{moderated.map(renderComment)}</div>
                        </details>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            {activeTab === "traffic" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="eyebrow mb-2">TrÃ¡fego do site</p>
                    <h2 className="font-display text-3xl text-[var(--color-gold-light)]">Como estÃ£o as visitas</h2>
                    <p className="mt-1 text-sm text-[var(--color-gold-light)] opacity-70">Mede todos os acessos gravados no site e separa por Instagram, Facebook, Direto e Internet.</p>
                  </div>
                  <button type="button" onClick={fetchTrafficAnalytics} className="self-start border border-[var(--color-gold)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] hover:bg-[var(--color-wine-light)]">Atualizar</button>
                </div>

                {trafficAnalytics ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-4">
                      {trafficPeriods.map((period) => (
                        <div key={period.label} className="rounded-xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                          <p className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">{period.label}</p>
                          <p className="mt-1 text-2xl font-bold text-[var(--color-gold)]">{period.visits.toLocaleString("pt-BR")}</p>
                          <p className="mt-2 text-xs text-[var(--color-gold-light)] opacity-60">{period.uniqueSessions.toLocaleString("pt-BR")} visitantes Â· {period.conversions.toLocaleString("pt-BR")} cadastros</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                      <p className="mb-3 text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">Origem nos Ãºltimos 30 dias</p>
                      {trafficSourceRows.map((source) => {
                        const maxVisits = Math.max(...trafficSourceRows.map((item) => item.visits), 1);
                        return (
                          <div key={source.source} className="border-t border-[var(--color-wine-light)] py-3 text-sm text-[var(--color-gold-light)] first:border-t-0">
                            <div className="flex justify-between gap-4">
                              <span>{source.label}</span>
                              <strong className="text-[var(--color-gold)]">{source.visits.toLocaleString("pt-BR")}</strong>
                            </div>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-wine)]">
                              <div className="h-full rounded-full bg-[var(--color-gold)]" style={{ width: `${(source.visits / maxVisits) * 100}%` }} />
                            </div>
                            <p className="mt-1 text-xs opacity-55">{source.uniqueSessions.toLocaleString("pt-BR")} visitantes Â· {source.conversions.toLocaleString("pt-BR")} cadastros Â· {source.conversionRate.toFixed(1).replace(".", ",")}%</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4">
                      <p className="mb-3 text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-60">PÃ¡ginas mais visitadas em 30 dias</p>
                      {trafficAnalytics.periods.last30.topPages.length ? trafficAnalytics.periods.last30.topPages.map((page) => (
                        <div key={page.path} className="flex justify-between gap-4 border-t border-[var(--color-wine-light)] py-2 text-sm text-[var(--color-gold-light)] first:border-t-0">
                          <span className="truncate">{page.path}</span>
                          <strong className="text-[var(--color-gold)]">{page.visits}</strong>
                        </div>
                      )) : <p className="text-sm text-[var(--color-gold-light)] opacity-60">Sem visitas registradas ainda.</p>}
                    </div>
                    <p className="text-xs leading-5 text-[var(--color-gold-light)] opacity-55">Direto inclui quem digitou o endereÃ§o, abriu favorito ou veio sem origem identificÃ¡vel. Internet agrupa Google, outros sites e navegadores externos.</p>
                  </>
                ) : (
                  <p className="rounded-xl border border-[var(--color-wine-light)] bg-[#1a0f12] p-4 text-sm text-[var(--color-gold-light)] opacity-70">{trafficAnalyticsStatus}</p>
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

                <div className="space-y-4">
                  <label className="block text-[var(--color-gold-light)] text-sm">Qual experiÃªncia vocÃª quer criar?</label>
                  <select value={nlType} onChange={(e) => setNlType(e.target.value as typeof nlType)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)] focus:outline-none">
                    <option value="site">Boas-vindas Ã  Entreluar</option>
                    <option value="blog">Nova conversa no DiÃ¡rio</option>
                    <option value="produto">Novo achado na Vitrine</option>
                    <option value="resenha">Nova resenha com ciÃªncia</option>
                    <option value="pilula">PÃ­lula de inspiraÃ§Ã£o e autocuidado</option>
                  </select>

                  <textarea 
                    placeholder="Conte o tema, o sentimento que quer transmitir e, se houver, cole o link exato da pÃ¡gina. Ex.: 'Apresentar minha resenha sobre vitamina C: https://entreluar.com.br/resenhas/...'" 
                    value={nlContext} 
                    onChange={(e) => setNlContext(e.target.value)} 
                    rows={3} 
                    className="w-full bg-transparent border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)] focus:outline-none resize-none"
                  ></textarea>

                  <button onClick={handleGenerateNewsletter} disabled={loading} className="w-full bg-transparent border border-[var(--color-gold)] text-[var(--color-gold)] py-3 rounded font-bold uppercase tracking-widest hover:bg-[var(--color-wine-light)] transition-colors mt-2">
                    {loading ? "Gerando..." : "Gerar Texto com IA âœ¨"}
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
                      <div className="mb-2 flex items-center justify-between"><label className="text-sm text-[var(--color-gold-light)]">PrÃ©via fiel do email</label><span className="eyebrow">Desktop e mobile</span></div>
                      <iframe title="PrÃ©via do email premium" srcDoc={nlHtml} className="h-[620px] w-full rounded-[22px] border border-[var(--line)] bg-[#12070a]" sandbox="allow-popups allow-popups-to-escape-sandbox" />
                    </div>

                    {newsletterStatus !== "idle" && (
                      <div className={`rounded-xl border px-4 py-3 text-sm ${newsletterStatus === "complete" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : newsletterStatus === "partial" ? "border-amber-300/40 bg-amber-300/10 text-amber-100" : newsletterStatus === "failed" ? "border-red-300/40 bg-red-300/10 text-red-100" : "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 text-[var(--color-gold-light)]"}`} role="status" aria-live="polite">
                        {newsletterStatus === "preparing" && "Preparando o conteÃºdo..."}
                        {newsletterStatus === "sending" && "Enviando os lotes com seguranÃ§a. NÃ£o feche esta pÃ¡gina..."}
                        {newsletterStatus === "complete" && "Disparo concluÃ­do e confirmado pelo provedor."}
                        {newsletterStatus === "partial" && "Parte da lista foi aceita. O conteÃºdo foi mantido para uma nova tentativa segura."}
                        {newsletterStatus === "failed" && "O envio nÃ£o foi concluÃ­do. O conteÃºdo foi preservado."}
                      </div>
                    )}

                    <button onClick={handleSendNewsletter} disabled={loading || subscribersCount === 0} className="w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform text-lg mt-4 shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100">
                      {newsletterStatus === "sending" ? "Enviando lotes..." : `ðŸš€ Disparar para ${subscribersCount} Assinantes`}
                    </button>
                  </div>
                )}

                <section className="mt-10 border-t border-[var(--color-wine-light)] pt-8" aria-labelledby="email-control-title">
                  <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="eyebrow mb-2">HistÃ³rico individual</p>
                      <h3 id="email-control-title" className="font-serif text-2xl text-[var(--color-gold)]">Controle de emails enviados</h3>
                      <p className="mt-1 text-sm text-[var(--color-gold-light)] opacity-70">Veja quem recebeu cada conteÃºdo. Mensagens idÃªnticas nÃ£o serÃ£o reenviadas para a mesma pessoa.</p>
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
                                  {subscriberDeliveries.length === 0 ? "Nenhum envio registrado" : `${subscriberDeliveries.length} envio${subscriberDeliveries.length === 1 ? "" : "s"} Â· Ãºltimo em ${new Date(lastDelivery.sentAt || "").toLocaleString("pt-BR")}`}
                                </p>
                              </div>
                              <span className="shrink-0 text-[var(--color-gold)] transition-transform group-open:rotate-180" aria-hidden="true">âŒ„</span>
                            </summary>

                            <div className="mt-4 space-y-3 border-t border-[var(--color-wine-light)] pt-4">
                              {subscriberDeliveries.length === 0 ? (
                                <p className="text-sm text-[var(--color-gold-light)] opacity-65">Esta pessoa ainda nÃ£o recebeu campanhas registradas.</p>
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
                  <h2 className="font-display text-3xl text-[var(--color-gold-light)]">MemÃ³ria da Luana</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-gold-light)] opacity-75">Guarde opiniÃµes, experiÃªncias e jeitos de falar. A IA recupera apenas o que combina com cada assunto, economizando tokens. MemÃ³rias privadas ficam no painel e nunca entram nos prompts.</p>
                  {aiUsage.costBrl >= 8 && <div className={`mt-4 rounded-xl border p-4 text-sm font-bold ${aiUsage.costBrl >= 10 ? "border-red-400 bg-red-950/40 text-red-200" : "border-amber-400 bg-amber-950/30 text-amber-100"}`}>{aiUsage.costBrl >= 10 ? "âš ï¸ A meta mensal de R$ 10 foi alcanÃ§ada. Confirme o custo antes de novas geraÃ§Ãµes." : "ðŸ’› O gasto estimado passou de R$ 8 neste mÃªs e estÃ¡ perto da meta."}</div>}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs md:grid-cols-4">
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">R$ {aiUsage.costBrl.toFixed(2).replace(".", ",")}</strong>custo estimado no mÃªs</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">R$ {aiUsage.last24h.costBrl.toFixed(2).replace(".", ",")}</strong>Ãºltimas 24 horas</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{aiUsage.thoughtTokens.toLocaleString("pt-BR")}</strong>tokens de raciocÃ­nio</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{(aiUsage.latency.p95 / 1000).toFixed(1).replace(".", ",")}s</strong>tempo p95</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{aiUsage.inputTokens.toLocaleString("pt-BR")}</strong>tokens de entrada</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{aiUsage.outputTokens.toLocaleString("pt-BR")}</strong>tokens de texto</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{aiUsage.cacheHits}</strong>geraÃ§Ãµes em cache</div>
                    <div className="rounded-lg bg-[var(--color-wine)] p-3"><strong className="block text-base text-[var(--color-gold)]">{aiUsage.searches}</strong>buscas web</div>
                  </div>
                  {aiUsage.byType.length > 0 && <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-wine-light)]"><div className="grid grid-cols-3 bg-[var(--color-wine)] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold)]"><span>ConteÃºdo</span><span className="text-right">Tokens</span><span className="text-right">Custo</span></div>{aiUsage.byType.map((item) => <div key={item.type} className="grid grid-cols-3 border-t border-[var(--color-wine-light)] px-4 py-2 text-xs text-[var(--color-gold-light)]"><span>{item.type}</span><span className="text-right">{item.totalTokens.toLocaleString("pt-BR")}</span><span className="text-right">R$ {item.costBrl.toFixed(3).replace(".", ",")}</span></div>)}</div>}

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">O que a IA deve aprender sobre vocÃª?</label>
                      <textarea value={memoryContent} onChange={(e) => setMemoryContent(e.target.value)} rows={4} placeholder="Ex.: Eu prefiro uma rotina de pele curta e realista. Dez passos me cansam antes do sÃ©rum." className="w-full rounded-xl border border-[var(--color-wine-light)] bg-[var(--color-wine)] p-4 text-[var(--color-gold-light)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-widest text-[var(--color-gold-light)]">Categoria</label>
                      <select value={memoryCategory} onChange={(e) => setMemoryCategory(e.target.value as LuanaMemory["category"])} className="w-full rounded-lg border border-[var(--color-wine-light)] bg-[var(--color-wine)] p-3 text-[var(--color-gold-light)]">
                        <option value="identidade">Identidade</option><option value="rotina">Rotina</option><option value="experiencia">ExperiÃªncia real</option><option value="opiniao">OpiniÃ£o</option><option value="linguagem">Jeito de falar</option><option value="limite">Limite editorial</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-widest text-[var(--color-gold-light)]">Privacidade</label>
                      <select value={memoryPrivacy} onChange={(e) => { const value = e.target.value as LuanaMemory["privacy"]; setMemoryPrivacy(value); if (value !== "publica") setMemoryAllowInContent(false); }} className="w-full rounded-lg border border-[var(--color-wine-light)] bg-[var(--color-wine)] p-3 text-[var(--color-gold-light)]">
                        <option value="editorial">Editorial â€” orienta, mas nÃ£o cita</option><option value="publica">PÃºblica â€” pode aparecer no texto</option><option value="privada">Privada â€” nunca vai ao prompt</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs uppercase tracking-widest text-[var(--color-gold-light)]">Assuntos relacionados, separados por vÃ­rgula</label>
                      <input value={memoryTags} onChange={(e) => setMemoryTags(e.target.value)} placeholder="protetor solar, pele sensÃ­vel, rotina" className="w-full rounded-lg border border-[var(--color-wine-light)] bg-[var(--color-wine)] p-3 text-[var(--color-gold-light)]" />
                    </div>
                    {memoryPrivacy === "publica" && <label className="md:col-span-2 flex items-center gap-3 text-sm text-[var(--color-gold-light)]"><input type="checkbox" checked={memoryAllowInContent} onChange={(e) => setMemoryAllowInContent(e.target.checked)} /> Autorizo citar esta informaÃ§Ã£o nos textos quando for pertinente.</label>}
                  </div>
                  <button onClick={handleSaveMemory} disabled={loading} className="mt-5 w-full rounded-lg bg-gradient-to-r from-[#b5952f] to-[var(--color-gold)] py-3 font-bold uppercase tracking-widest text-[var(--color-wine-dark)] disabled:opacity-50">Guardar memÃ³ria</button>
                </section>

                <section>
                  <div className="mb-4 flex items-end justify-between gap-4"><div><h3 className="font-serif text-2xl text-[var(--color-gold)]">O que a IA sabe</h3><p className="text-sm text-[var(--color-gold-light)] opacity-60">{memories.filter((item) => item.status === "aprovada").length} memÃ³rias aprovadas</p></div></div>
                  <div className="space-y-3">
                    {memories.map((memory) => <article key={memory.id} className={`rounded-xl border p-4 ${memory.status === "sugerida" ? "border-[var(--color-gold)] bg-[#3a1820]" : "border-[var(--color-wine-light)] bg-[var(--color-wine-dark)]"}`}>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><span className="rounded-full bg-[var(--color-wine-light)] px-3 py-1 text-[var(--color-gold-light)]">{memory.category}</span><select value={memory.privacy} onChange={(e) => handleMemoryPrivacy(memory, e.target.value as LuanaMemory["privacy"])} className="rounded-full border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] px-3 py-1 text-[var(--color-gold)]"><option value="editorial">editorial</option><option value="publica">pÃºblica</option><option value="privada">privada</option></select><span className="opacity-60">{memory.status}</span></div>
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
                    {memories.length === 0 && <div className="rounded-xl border border-dashed border-[var(--color-wine-light)] p-8 text-center text-sm text-[var(--color-gold-light)] opacity-60">Nenhuma memÃ³ria guardada ainda.</div>}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "quotes" && (
              <div className="space-y-8">
                <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                  <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif text-center">Gerador de PÃ­lulas DiÃ¡rias</h3>
                  <p className="text-center text-[var(--color-gold-light)] opacity-70 mb-6 text-sm">Gere 15 frases bem-humoradas e positivas para revisar antes de publicar na rotaÃ§Ã£o diÃ¡ria.</p>
                  
                  <div className="flex justify-center mb-6">
                    <button onClick={handleGenerateQuote} disabled={loading} className="bg-[var(--color-gold)] text-[var(--color-wine-dark)] px-8 py-3 rounded-full uppercase tracking-widest font-bold hover:scale-105 transition-transform flex items-center gap-2">
                      âœ¨ {loading ? "Criando o lote..." : "Gerar 15 novas pÃ­lulas"} âœ¨
                    </button>
                  </div>

                  {quoteText && (
                    <div className="mt-8 border-t border-[var(--color-wine-light)] pt-6">
                      <p className="mb-3 text-center text-xs uppercase tracking-widest text-[var(--color-gold)]">Rascunho â€” uma pÃ­lula por linha</p>
                      <textarea value={quoteText} onChange={(e) => setQuoteText(e.target.value)} rows={15} className="w-full bg-[var(--color-wine)] border border-[var(--color-wine-light)] rounded p-6 text-[var(--color-gold-light)] font-serif text-base focus:outline-none resize-y leading-relaxed" placeholder="As 15 frases aparecerÃ£o aqui para sua revisÃ£o."></textarea>
                      <button onClick={handlePublishQuote} disabled={loading} className="w-full mt-4 bg-gradient-to-r from-[#b5952f] to-[var(--color-gold)] text-[var(--color-wine-dark)] py-3 rounded font-bold uppercase hover:scale-105 transition-transform">
                        {loading ? "Publicando..." : "Publicar lote revisado"}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="mb-6 border-b border-[var(--color-wine-light)] pb-2 font-serif text-2xl text-[var(--color-gold)]">PÃ­lulas publicadas</h3>
                  {quotes.length === 0 ? <p className="text-[var(--color-gold-light)] opacity-70">Nenhuma pÃ­lula publicada.</p> : quotes.map(quote => (
                    <div key={quote.id} className="mb-4 flex items-center justify-between gap-4 rounded border border-[var(--color-wine-light)] bg-[var(--color-wine-dark)] p-4">
                      <div>
                        <span className="block italic text-[var(--color-gold-light)]">â€œ{quote.quote}â€</span>
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

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border px-4 py-3 text-center text-sm font-bold shadow-xl ${
            message.toLowerCase().startsWith("erro")
              ? "border-red-400 bg-red-950/95 text-red-100"
              : "border-[var(--color-gold)] bg-[var(--color-wine-dark)]/95 text-[#f3e5ab]"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}



