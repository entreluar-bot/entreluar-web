"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

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
  const [activeTab, setActiveTab] = useState<"product" | "blog" | "manage" | "inbox" | "quotes" | "drops">("product");
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

  const [emails, setEmails] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");

  const [products, setProducts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [blogCategory, setBlogCategory] = useState("Confissões de Madrugada");

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = "/admin/login";
      else setUser(data.user);
    });
  }, []);

  useEffect(() => {
    if (activeTab === "inbox") fetchEmails();
    if (activeTab === "manage") fetchManageData();
  }, [activeTab]);

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
    if (!imageFile) return setMessage("Você precisa colar uma imagem do produto primeiro!");
    if (!link) return setMessage("O link da loja é obrigatório!");

    setLoading(true);
    setMessage("Iniciando mágica (pode demorar uns 15 segundos)...");
    
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
        body: JSON.stringify({ title, link, impressions, imageUrl: tempAiImageUrl })
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

      if (data.error) throw new Error(data.error);

      setGeneratedProductName(data.productName);
      setGeneratedReview(data.productReview);
      setGeneratedBlogTitle(data.blogTitle);
      setGeneratedBlogPost(data.blogPost);
      setBlogCategory("Estudei para te explicar");
      setMessage("Textos gerados! Revise e publique.");
    } catch (error: any) {
      setMessage("Erro: " + error.message);
    }
    setLoading(false);
  };

  const handleBrainstorm = async () => {
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

  const handleGenerateQuote = async () => {
    setLoading(true);
    setMessage("Buscando inspiração nas estrelas...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setQuoteText(data.text);
      setMessage("Pílula gerada! Revise e publique.");
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
      if (generatedBlogPost) {
        const { data: journalData, error: blogError } = await supabase.from("journal").insert([{
          title: generatedBlogTitle,
          content: generatedBlogPost,
          image_url: finalPublicUrl,
          category: blogCategory,
          ...insertPayload
        }]).select("id").single();
        
        if (blogError) throw blogError;
        journalId = journalData?.id;
      }

      if (activeTab === "product" && generatedReview) {
        const finalTitle = generatedProductName || title;
        
        // Se gerou um post de diário, atualizar o link genérico para o link exato da resenha
        let finalReview = generatedReview;
        if (journalId) {
          finalReview = finalReview.replace(/href="\/blog"/g, `href="/resenhas/${journalId}"`);
        }

        const { error: prodError } = await supabase.from("products").insert([{
          title: finalTitle,
          description: finalReview,
          shopee_link: link,
          image_url: finalPublicUrl,
          price,
          category: productCategory,
          ...insertPayload
        }]);
        if (prodError) throw prodError;
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
        body: JSON.stringify({ to: replyTo, subject: replySubject || "Resposta - Entreluar", text: replyBody })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage("E-mail enviado com sucesso!");
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
    setLoading(true);
    try {
      if (editingItem.type === "product") {
        await supabase.from("products").update({ title: editingItem.title, description: editingItem.content, category: editingItem.category }).eq("id", editingItem.id);
      } else {
        await supabase.from("journal").update({ title: editingItem.title, content: editingItem.content, category: editingItem.category }).eq("id", editingItem.id);
      }
      setEditingItem(null);
      fetchManageData();
    } catch (error: any) {
      alert(error.message);
    }
    setLoading(false);
  };

  if (!user) return <div className="min-h-screen bg-[var(--color-wine-dark)] flex items-center justify-center text-[var(--color-gold)]">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[var(--color-wine-dark)] p-8" onPaste={handlePaste}>
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-[var(--color-wine-light)] pb-6">
          <div>
            <h1 className="text-3xl font-serif text-[var(--color-gold)]">Painel da Luana</h1>
            <p className="text-[var(--color-gold-light)] opacity-70">Aperte Ctrl+V para colar fotos.</p>
          </div>
          <div className="flex flex-col items-end gap-3">
              <div className="text-right text-[var(--color-gold-light)] opacity-70 text-xs">
                <p className="font-bold tracking-widest uppercase">Versão 1.25</p>
                <p>Atualizado em 20/09/2026 às 14:34</p>
            </div>
            <button onClick={() => { supabase.auth.signOut(); window.location.href = "/admin/login"; }} className="border border-[var(--color-gold)] text-[var(--color-gold)] px-4 py-2 rounded text-xs uppercase hover:bg-[var(--color-wine-light)] transition-colors">
              Sair do Painel
            </button>
          </div>
        </header>

        <div className="flex gap-2 mb-8 flex-wrap">
          <button onClick={() => { setActiveTab("product"); setGeneratedReview(""); }} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "product" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Vitrine (Mágica)
          </button>
          <button onClick={() => { setActiveTab("blog"); setGeneratedBlogPost(""); }} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "blog" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Crônicas (Diário)
          </button>
          <button onClick={() => setActiveTab("manage")} className={`flex-1 py-4 px-2 uppercase font-bold tracking-widest rounded-t-xl transition-colors text-xs md:text-sm ${activeTab === "manage" ? "bg-[var(--color-wine)] text-[var(--color-gold)] border-t border-x border-[var(--color-wine-light)]" : "bg-transparent text-[var(--color-gold-light)] opacity-50"}`}>
            Gerenciar
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
        </div>

        <div className="grid grid-cols-1 gap-8 -mt-8">
          <div className="bg-[var(--color-wine)] p-8 rounded-b-xl border-b border-x border-[var(--color-wine-light)] shadow-lg max-w-3xl mx-auto w-full">
            
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
                          <option value="SkinCare">SkinCare</option>
                          <option value="Maquiagem">Maquiagem</option>
                          <option value="Cabelos">Cabelos</option>
                          <option value="Suplementos">Suplementos</option>
                        </select>
                      </div>
                    </div>

                      <div>
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1">Data Retroativa (Opcional)</label>
                        <input type="date" value={postDate} onChange={(e) => setPostDate(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)] mb-4" />
                      </div>

                      <div className="opacity-60 hover:opacity-100 transition-opacity">
                        <label className="block text-[var(--color-gold-light)] text-sm mb-1">Suas Notas Pessoais (Opcional)</label>
                      <textarea placeholder="Se você não digitar nada, a IA foca nos benefícios científicos." value={impressions} onChange={(e) => setImpressions(e.target.value)} rows={2} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)]"></textarea>
                    </div>

                    {message && <p className="text-sm text-[#f3e5ab] mt-2 italic text-center font-bold">{message}</p>}
                    
                    <button onClick={handleGenerateText} disabled={loading} className="w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-4 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform mt-4">
                      {loading ? "A IA ESTÁ LENDO A FOTO..." : "GERAR MÁGICA TOTAL"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-6">
                      <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                        <h3 className="text-[var(--color-gold)] font-serif text-xl mb-4 text-center">1. Vitrine: {generatedProductName}</h3>
                        <textarea value={generatedReview} onChange={(e) => setGeneratedReview(e.target.value)} rows={8} className="w-full bg-transparent text-[var(--color-gold-light)] focus:outline-none resize-none leading-relaxed" ></textarea>
                      </div>
                      <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                        <h3 className="text-[var(--color-gold)] font-serif text-xl mb-4 text-center">2. Artigo do Ativo (Blog)</h3>
                        <input type="text" value={generatedBlogTitle} onChange={(e) => setGeneratedBlogTitle(e.target.value)} className="w-full bg-transparent border-b border-[var(--color-wine-light)] mb-4 text-[var(--color-gold)] font-bold focus:outline-none" />
                        <textarea value={generatedBlogPost} onChange={(e) => setGeneratedBlogPost(e.target.value)} rows={12} className="w-full bg-transparent text-[var(--color-gold-light)] focus:outline-none resize-none leading-relaxed" ></textarea>
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
                       <button onClick={() => { setGeneratedReview(""); setGeneratedProductName(""); setGeneratedBlogTitle(""); setGeneratedBlogPost(""); }} className="flex-1 border border-[var(--color-wine-light)] text-[var(--color-gold-light)] py-4 rounded font-bold uppercase hover:bg-[var(--color-wine-dark)] transition-colors">
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
                        <option value="Confissões de Madrugada">🍷 Confissões de Madrugada</option>
                        <option value="Sobrevivendo com Humor">😂 Sobrevivendo com Humor</option>
                        <option value="Estudei para te explicar">🧠 Estudei para te explicar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[var(--color-gold-light)] text-sm mb-1">Data Retroativa (Opcional)</label>
                      <input type="date" value={postDate} onChange={(e) => setPostDate(e.target.value)} className="w-full bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-4 py-3 text-[var(--color-gold-light)] mb-4" />
                    </div>

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
                {editingItem ? (
                  <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                    <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif">
                      Editando {editingItem.type === "product" ? "Produto da Vitrine" : "Artigo do Diário"}
                    </h3>
                    <div className="flex gap-4 mb-4">
                      <input type="text" value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} className="flex-1 bg-transparent border-b border-[var(--color-wine-light)] py-2 text-[var(--color-gold)] font-bold focus:outline-none" />
                      <select value={editingItem.category || ""} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })} className="w-48 bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded px-2 py-2 text-[var(--color-gold-light)] text-sm">
                        {editingItem.type === "product" ? (
                          <>
                            <option value="SkinCare">SkinCare</option>
                            <option value="Maquiagem">Maquiagem</option>
                            <option value="Cabelos">Cabelos</option>
                            <option value="Suplementos">Suplementos</option>
                          </>
                        ) : (
                          <>
                            <option value="Confissões de Madrugada">Confissões de Madrugada</option>
                            <option value="Sobrevivendo com Humor">Sobrevivendo com Humor</option>
                            <option value="Estudei para te explicar">Estudei para te explicar</option>
                          </>
                        )}
                      </select>
                    </div>
                    <textarea value={editingItem.content} onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })} rows={15} className="w-full bg-transparent text-[var(--color-gold-light)] focus:outline-none resize-none leading-relaxed border border-[var(--color-wine-light)] p-4 rounded" ></textarea>
                    <div className="flex gap-4 mt-4">
                      <button onClick={() => setEditingItem(null)} className="flex-1 border border-[var(--color-wine-light)] text-[var(--color-gold-light)] py-3 rounded font-bold uppercase">
                        Cancelar
                      </button>
                      <button onClick={handleUpdateItem} disabled={loading} className="flex-2 w-full bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] py-3 rounded font-bold uppercase">
                        {loading ? "Salvando..." : "Salvar Alterações"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-2xl text-[var(--color-gold)] mb-6 font-serif border-b border-[var(--color-wine-light)] pb-2">Vitrine (Produtos)</h3>
                      {products.length === 0 ? <p className="text-[var(--color-gold-light)] opacity-70">Nenhum produto publicado.</p> : products.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-[var(--color-wine-dark)] p-4 rounded mb-4 border border-[var(--color-wine-light)]">
                          <span className="text-[var(--color-gold-light)] font-bold">{p.title}</span>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingItem({ type: "product", id: p.id, title: p.title, content: p.description, category: p.category || "SkinCare" })} className="text-xs bg-[var(--color-wine-light)] text-[var(--color-gold)] px-3 py-1 rounded">Editar</button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="text-xs bg-red-900 text-white px-3 py-1 rounded">Deletar</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-12">
                      <h3 className="text-2xl text-[var(--color-gold)] mb-6 font-serif border-b border-[var(--color-wine-light)] pb-2">Diário (Artigos)</h3>
                      {journals.length === 0 ? <p className="text-[var(--color-gold-light)] opacity-70">Nenhum artigo publicado.</p> : journals.map(j => (
                        <div key={j.id} className="flex justify-between items-center bg-[var(--color-wine-dark)] p-4 rounded mb-4 border border-[var(--color-wine-light)]">
                          <div>
                            <span className="text-[var(--color-gold-light)] font-bold block">{j.title}</span>
                            <span className="text-[var(--color-gold-light)] opacity-50 text-xs uppercase">{j.category || "Sem categoria"}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingItem({ type: "journal", id: j.id, title: j.title, content: j.content, category: j.category || "Geral" })} className="text-xs bg-[var(--color-wine-light)] text-[var(--color-gold)] px-3 py-1 rounded">Editar</button>
                            <button onClick={() => handleDeleteJournal(j.id)} className="text-xs bg-red-900 text-white px-3 py-1 rounded">Deletar</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-12">
                      <h3 className="text-2xl text-[var(--color-gold)] mb-6 font-serif border-b border-[var(--color-wine-light)] pb-2">Pílulas Diárias (Motivação)</h3>
                      {quotes.length === 0 ? <p className="text-[var(--color-gold-light)] opacity-70">Nenhuma pílula publicada.</p> : quotes.map(q => (
                        <div key={q.id} className="flex justify-between items-center bg-[var(--color-wine-dark)] p-4 rounded mb-4 border border-[var(--color-wine-light)]">
                          <div>
                            <span className="text-[var(--color-gold-light)] block italic">"{q.quote}"</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleDeleteQuote(q.id)} className="text-xs bg-red-900 text-white px-3 py-1 rounded">Deletar</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-12">
                      <h3 className="text-2xl text-[var(--color-gold)] mb-6 font-serif border-b border-[var(--color-wine-light)] pb-2">Drops do Instagram</h3>
                      {drops.length === 0 ? <p className="text-[var(--color-gold-light)] opacity-70">Nenhum drop publicado.</p> : drops.map(d => (
                        <div key={d.id} className="flex justify-between items-center bg-[var(--color-wine-dark)] p-4 rounded mb-4 border border-[var(--color-wine-light)]">
                          <div>
                            <span className="text-[var(--color-gold-light)] font-bold block">{d.title}</span>
                            <span className="text-[var(--color-gold-light)] opacity-50 text-xs break-all">{d.instagram_url}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleDeleteDrop(d.id)} className="text-xs bg-red-900 text-white px-3 py-1 rounded">Deletar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "quotes" && (
              <div className="space-y-8">
                <div className="bg-[var(--color-wine-dark)] p-6 rounded-xl border border-[var(--color-gold)]">
                  <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif text-center">Gerador de Pílulas Diárias</h3>
                  <p className="text-center text-[var(--color-gold-light)] opacity-70 mb-6 text-sm">Crie frases curtas e acolhedoras para aparecerem todos os dias na página principal.</p>
                  
                  <div className="flex justify-center mb-6">
                    <button onClick={handleGenerateQuote} disabled={loading} className="bg-[var(--color-gold)] text-[var(--color-wine-dark)] px-8 py-3 rounded-full uppercase tracking-widest font-bold hover:scale-105 transition-transform flex items-center gap-2">
                      ✨ {loading ? "Buscando..." : "Gerar Nova Pílula Mágica"} ✨
                    </button>
                  </div>

                  {quoteText && (
                    <div className="mt-8 border-t border-[var(--color-wine-light)] pt-6">
                      <textarea value={quoteText} onChange={(e) => setQuoteText(e.target.value)} rows={4} className="w-full bg-[var(--color-wine)] border border-[var(--color-wine-light)] rounded p-6 text-[var(--color-gold-light)] font-serif text-lg text-center focus:outline-none resize-none leading-relaxed italic" placeholder="Sua frase aqui..."></textarea>
                      <button onClick={handlePublishQuote} disabled={loading} className="w-full mt-4 bg-gradient-to-r from-[#b5952f] to-[var(--color-gold)] text-[var(--color-wine-dark)] py-3 rounded font-bold uppercase hover:scale-105 transition-transform">
                        {loading ? "Publicando..." : "Publicar Pílula"}
                      </button>
                    </div>
                  )}
                  {message && <p className="text-sm text-[#f3e5ab] mt-4 italic text-center font-bold">{message}</p>}
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
                  <h3 className="text-xl text-[var(--color-gold)] mb-4 font-serif">Mensagens Recebidas</h3>
                  {emails.length === 0 ? (
                    <p className="text-[var(--color-gold-light)] opacity-70">Nenhuma mensagem recebida ainda.</p>
                  ) : (
                    <div className="space-y-4">
                      {emails.map((email) => (
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
                          <p className="text-sm text-[var(--color-gold-light)] opacity-80 mt-2 line-clamp-3">{email.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
