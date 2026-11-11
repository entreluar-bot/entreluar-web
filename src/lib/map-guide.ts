import { renderPremiumEmail } from "./email-template";

export type SkinGuide = {
  kind: "skin";
  skinType: "seca" | "mista" | "oleosa" | "normal";
  sensitive: boolean;
  change: "conforto" | "textura" | "linhas" | "nenhuma";
  priority: "simples" | "entender" | "cuidado";
  time: "dois" | "poucos" | "ritual";
};

export type MenopauseGuide = {
  kind: "menopause";
  cycleChange: boolean;
  symptoms: Array<"calor" | "sono" | "humor" | "energia" | "intimo">;
};

export type MapGuide = SkinGuide | MenopauseGuide;

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] || char);
const list = (items: string[]) => `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;

export function parseMapGuide(value: unknown): MapGuide | null {
  if (!value || typeof value !== "object") return null;
  const guide = value as Record<string, unknown>;
  if (guide.kind === "skin" && ["seca", "mista", "oleosa", "normal"].includes(String(guide.skinType)) && ["conforto", "textura", "linhas", "nenhuma"].includes(String(guide.change)) && ["simples", "entender", "cuidado"].includes(String(guide.priority)) && ["dois", "poucos", "ritual"].includes(String(guide.time))) {
    return { kind: "skin", skinType: guide.skinType as SkinGuide["skinType"], sensitive: Boolean(guide.sensitive), change: guide.change as SkinGuide["change"], priority: guide.priority as SkinGuide["priority"], time: guide.time as SkinGuide["time"] };
  }
  if (guide.kind === "menopause" && Array.isArray(guide.symptoms) && guide.symptoms.every((symptom) => ["calor", "sono", "humor", "energia", "intimo"].includes(String(symptom)))) {
    return { kind: "menopause", cycleChange: Boolean(guide.cycleChange), symptoms: guide.symptoms as MenopauseGuide["symptoms"] };
  }
  return null;
}

function skinGuideBody(guide: SkinGuide) {
  const skinFocus: Record<SkinGuide["skinType"], string> = {
    seca: "Como sua pele tende ao ressecamento, eu começaria protegendo a barreira: limpeza suave, hidratante com glicerina, ceramidas ou esqualano e protetor solar todos os dias.",
    mista: "Pele mista não precisa ser tratada como duas inimigas no mesmo rosto. Eu buscaria limpeza suave, hidratação leve e ajustaria a textura do hidratante às áreas que repuxam mais.",
    oleosa: "Mesmo quando há mais oleosidade, pele madura pode sentir falta de água e conforto. Eu procuraria fórmulas leves, não comedogênicas, sem entrar na guerra de ressecar tudo.",
    normal: "Sem uma queixa de oleosidade ou ressecamento dominante, eu usaria uma base simples e consistente: limpeza gentil, hidratação e proteção solar.",
  };
  const focus: Record<SkinGuide["change"], { title: string; active: string; procedure: string }> = {
    conforto: { title: "Conforto e barreira", active: "Glicerina, ceramidas, ácido hialurônico e esqualano são ingredientes que eu procuraria para ajudar a pele a segurar água e ficar menos reativa.", procedure: "Se o ressecamento vier com ardor persistente, descamação ou vermelhidão, eu levaria isso para a dermatologista antes de somar ativos." },
    textura: { title: "Textura, viço e manchas", active: "Vitamina C, niacinamida e retinoides ou retinol podem entrar na conversa, um por vez. Retinoides costumam ser usados à noite; de dia, protetor solar é parte do combinado.", procedure: "Para manchas e textura, a dermatologista pode avaliar opções como peelings, microagulhamento ou lasers. O melhor procedimento depende do tom de pele, da mancha e do seu histórico." },
    linhas: { title: "Linhas e firmeza", active: "Eu olharia para retinoides ou retinol, vitamina C e uma rotina que não dispense hidratação e protetor solar. São princípios ativos com papel mais realista na textura e nas linhas finas do que promessas de efeito imediato.", procedure: "Quando a queixa é firmeza, uma dermatologista pode conversar sobre recursos como bioestimuladores de colágeno, radiofrequência, ultrassom microfocado, lasers ou injetáveis. Eles não são obrigação e a indicação muda de rosto para rosto." },
    nenhuma: { title: "Uma base para observar", active: "Eu não sairia comprando cinco ativos. Começaria com limpeza suave, hidratante e protetor solar, e observaria a pele por algumas semanas antes de acrescentar alguma coisa.", procedure: "Procedimento só faz sentido quando existe uma queixa que você quer tratar e uma profissional avaliando o contexto inteiro." },
  };
  const start = guide.sensitive ? "Como você contou que a pele reclama fácil, minha regra seria: um produto novo por vez, devagar, e parar se arder ou irritar. Aqui, menos empolgação de nécessaire e mais observação." : "Eu faria mudanças graduais: um ativo novo por vez, para entender o que a pele gostou de verdade.";
  const rhythm = guide.time === "dois" ? "Com dois minutos, eu priorizaria manhã: hidratante ou sérum simples e protetor solar; noite: limpeza e hidratante. O ativo entra depois, quando essa base estiver confortável." : guide.time === "poucos" ? "Com poucos passos, eu manteria uma base de três: limpar, hidratar e proteger. À noite, um ativo de cada vez pode ocupar o lugar entre limpeza e hidratante." : "Se você gosta de ritual, eu ainda seguraria a ansiedade: rotina boa é a que tem sequência, não a que parece uma prateleira inteira em horário nobre.";
  const current = focus[guide.change];
  return `<p>Eu montei este guia a partir das suas respostas. Ele é uma direção de autocuidado, não uma receita fechada. Pele tem humor próprio, eu sei.</p><p><strong>Meu ponto de partida para você: ${escapeHtml(current.title)}.</strong> ${skinFocus[guide.skinType]}</p><p>${start}</p><p><strong>Ativos para procurar com critério</strong></p><p>${current.active}</p><p><strong>Rotina possível</strong></p><p>${rhythm}</p><p><strong>Quando vale conversar sobre procedimento</strong></p><p>${current.procedure}</p><p>O que eu estudei para montar este norte: proteção solar e hidratação são a base mais consistente; um ativo deve responder a uma queixa principal, e resultado de cosmético é gradual. <a href="https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/selecting-anti-aging-products">Veja a orientação da Academia Americana de Dermatologia</a>.</p>`;
}

function menopauseGuideBody(guide: MenopauseGuide) {
  const symptomCopy: Record<MenopauseGuide["symptoms"][number], string> = {
    calor: "Calorões e suores noturnos podem acompanhar a oscilação e queda do estrogênio. Em português de vida real: o termostato do corpo pode ficar mais sensível e disparar calor de repente.",
    sono: "Sono mexido pode andar junto com suor noturno, calorões e mudanças de humor. Vale observar se ele acorda você, se a cabeça não desacelera ou se o cansaço está virando rotina.",
    humor: "Irritação, ansiedade e oscilações de humor merecem conversa sem culpa. Nem tudo é menopausa, mas essa fase pode mexer bastante com o bem-estar emocional.",
    energia: "Cansaço e concentração mais instável têm muitas possíveis explicações. Eu anotaria quando acontece, como está o sono e o ciclo, para levar uma história mais útil à consulta.",
    intimo: "Libido, secura vaginal e desconforto na relação são assuntos de saúde e prazer, não um detalhe que você precisa engolir calada. Existem opções locais e sistêmicas que a ginecologista pode avaliar.",
  };
  const selected = guide.symptoms.map((item) => symptomCopy[item]).filter(Boolean);
  const cycle = guide.cycleChange ? "Como você percebeu mudança de ciclo, eu marcaria uma consulta com ginecologista para conversar sobre a linha do tempo dos sintomas, seu histórico pessoal e familiar e os exames que realmente fazem sentido no seu caso. Nem toda mulher precisa do mesmo painel de exames, e um número isolado não conta a história toda." : "Mesmo sem uma mudança de ciclo clara, eu anotaria os sintomas e a frequência. Isso ajuda a separar uma fase passageira de algo que merece investigação mais ampla.";
  const treatment = guide.symptoms.includes("calor") ? "Para fogachos e suores noturnos, terapia hormonal sistêmica é uma das opções mais eficazes para mulheres elegíveis, mas a decisão depende de idade, útero, histórico de trombose, câncer hormônio-sensível, fígado, coração e outros pontos que só uma consulta individual organiza. Em linhas gerais, pode haver estrogênio isolado para quem não tem útero ou estrogênio com progestagênio para proteger o endométrio quando o útero está presente. Há também opções não hormonais que a médica pode discutir." : "Tratamento de menopausa não é uma prateleira única. Pode incluir ajustes de rotina, cuidado local para sintomas íntimos, opções hormonais ou não hormonais, sempre escolhidas pelo sintoma que mais pesa e pelo seu histórico.";
  const intimate = guide.symptoms.includes("intimo") ? "Para secura e desconforto íntimo, hidratantes e lubrificantes vaginais podem ajudar no dia a dia; tratamentos locais com estrogênio podem ser uma possibilidade médica para algumas mulheres. Não é para começar sozinha: é para saber que existe conversa e opção." : "";
  return `<p>Eu fiz este guia como quem organiza perguntas para uma boa consulta, não como quem entrega uma receita. Cada corpo chega a essa fase por uma estrada diferente.</p><p><strong>O que suas respostas podem estar dizendo</strong></p>${selected.length ? list(selected) : "<p>Você não marcou um sintoma específico. Ainda assim, sentir que o corpo mudou já é motivo suficiente para observar e se escutar com mais cuidado.</p>"}<p><strong>Seu próximo passo mais útil</strong></p><p>${cycle}</p><p><strong>Tratamentos que podem entrar na conversa</strong></p><p>${treatment}</p>${intimate ? `<p>${intimate}</p>` : ""}<p><strong>Sobre vitaminas e suplementos</strong></p><p>Eu não trataria vitamina como reposição hormonal disfarçada. Deficiências de vitamina D, ferro, B12 ou outras podem precisar de correção quando confirmadas, mas suplemento não é tratamento universal para fogacho. Eu levaria essa pergunta para a médica junto com seus exames e sua alimentação.</p><p><strong>Enquanto você organiza essa conversa</strong></p>${list(["Anote horário, duração e possíveis gatilhos dos calorões, como álcool, ambiente quente, estresse ou roupa pesada.", "Prefira camadas leves, quarto mais fresco e uma rotina de sono possível, sem transformar descanso em mais uma meta impossível.", "Procure avaliação sem adiar se houver sangramento depois de 12 meses sem menstruar, sangramento muito intenso ou qualquer sintoma novo que preocupe você."])}<p>Eu estudei este norte em fontes como a <a href="https://www.who.int/news-room/fact-sheets/detail/menopause">OMS</a> e o <a href="https://www.acog.org/womens-health/faqs/hormone-therapy-for-menopause">ACOG</a>. A consulta com ginecologista é onde esse mapa vira decisão segura para você.</p>`;
}

export function buildMapGuideEmail(guide: MapGuide) {
  const skin = guide.kind === "skin";
  return renderPremiumEmail("site", {
    subject: skin ? "Seu guia de pele, do seu jeito ✨" : "Seu guia para conversar sobre menopausa ✨",
    preheader: skin ? "Ativos, rotina possível e perguntas para levar à dermatologista." : "Sintomas, possibilidades de cuidado e perguntas para sua ginecologista.",
    headline: skin ? "Seu guia de pele chegou." : "Sua travessia merece conversa boa.",
    bodyHtml: skin ? skinGuideBody(guide) : menopauseGuideBody(guide),
    ctaText: skin ? "Ver meus conteúdos de pele" : "Ler sobre menopausa e corpo",
    ctaUrl: skin ? "https://entreluar.com.br/temas/pele-cabelo" : "https://entreluar.com.br/temas/menopausa-bem-estar",
  });
}
