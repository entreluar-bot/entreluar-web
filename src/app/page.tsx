import { createClient } from "@/utils/supabase/server"; import ProductCard from "./ProductCard"; export default async function Home() { const supabase = await createClient(); const { data: products } = await supabase.from("products").select("*").order("created_at", { ascending: false }); return ( <> <div className="stars"></div> <div className="min-h-screen flex flex-col items-center p-8 relative"> <nav className="w-full max-w-5xl flex justify-between items-center py-6 border-b border-[var(--color-wine-light)] mb-16"> <div className="flex items-center gap-2"> <span className="text-3xl text-[var(--color-gold)]">☾</span> <span className="text-2xl font-serif text-[var(--color-gold)] tracking-widest uppercase">Entreluar</span> </div> <div className="hidden md:flex gap-8 text-[var(--color-gold-light)] text-sm uppercase tracking-widest"> <a href="#" className="hover:text-[var(--color-gold)] transition-colors">Coleção Lunar</a> <a href="#" className="hover:text-[var(--color-gold)] transition-colors">Rituais</a> <a href="/admin/login" className="hover:text-[var(--color-gold)] transition-colors">Acesso Secreto</a> </div> </nav>      <main className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mt-4 mb-24 px-4">
        <div className="flex flex-col md:flex-row items-center gap-12 bg-[#2a0812]/80 p-8 rounded-3xl border border-[var(--color-wine-light)] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <div className="w-48 h-48 md:w-64 md:h-64 flex-shrink-0">
            <img 
              src="/luana.jpg" 
              alt="Luana - Fundadora da Entreluar" 
              className="w-full h-full object-cover rounded-full border-2 border-[var(--color-gold)] shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            />
          </div>
          <div className="text-left flex-1">
            <h1 className="text-3xl md:text-5xl font-serif text-[var(--color-gold)] mb-4">
              Bem-vinda, estrela.
            </h1>
            <p className="text-lg text-[var(--color-gold-light)] mb-4 font-light leading-relaxed">
              Eu sou a Luana. Criei a Entreluar porque acredito que a maturidade é a fase mais luminosa da mulher. Aqui, não escondemos as nossas marcas; nós cuidamos delas.
            </p>
            <p className="text-md text-[var(--color-gold-light)] mb-8 font-light opacity-80 leading-relaxed">
              Neste espaço, compartilho os meus segredos reais de autocuidado. Testo produtos do mundo inteiro e trago para a nossa Coleção apenas aquilo que realmente nutre, respeita e ilumina a nossa pele sob as estrelas. Sinta-se em casa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#vitrine" className="bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] px-8 py-3 rounded-full font-bold tracking-widest uppercase hover:scale-105 transition-transform text-sm text-center shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                Ver Meus Segredos
              </a>
              <a href="#blog" className="border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-3 rounded-full font-bold tracking-widest uppercase hover:bg-[var(--color-wine-light)] transition-colors text-sm text-center">
                Ler o Diário
              </a>
            </div>
          </div>
        </div>
      </main> <section id="vitrine" className="w-full max-w-5xl pt-16 border-t border-[var(--color-wine-light)]"> <h2 className="text-3xl font-serif text-[var(--color-gold)] text-center mb-12 uppercase tracking-widest">A Coleção Lunar</h2> {(!products || products.length === 0) ? ( <p className="text-center text-[var(--color-gold-light)] opacity-70">A vitrine está sendo preparada pelas estrelas...</p> ) : ( <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"> {products.map((produto: any) => ( <ProductCard key={produto.id} produto={produto} /> ))} </div> )} </section> <footer className="mt-24 pt-8 border-t border-[var(--color-wine-light)] w-full max-w-5xl flex justify-between items-center text-sm text-[var(--color-gold-light)] opacity-60"> <p>Entreluar Beauty © 2024</p> <p>O segredo das estrelas.</p> </footer> </div> </> ); }
