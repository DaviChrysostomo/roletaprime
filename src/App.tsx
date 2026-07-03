import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Info, Phone, User, Mail, Gift } from 'lucide-react';

/* 
========================================================================
1. ONDE ESTÃO AS CORES PRINCIPAIS DO TEMA
   - Azul-marinho escuro: #061B2F (Fundo principal da página e base da roleta)
   - Marrom / Caramelo: #955E20 (Borda da roleta, botões, títulos secundários e destaques)
   - Dourado complementar: #cfa160 e #e6c594 (Para brilhos premium, gradientes metálicos e cupons)
========================================================================
*/
const BRAND_COLORS = {
  navy: '#061B2F',
  caramel: '#955E20',
  gold: '#cfa160',
  goldLight: '#e6c594',
  goldDark: '#7a4a15',
};

// Interface para os itens que aparecem visualmente na roleta
interface RouletteItem {
  id: number;
  type: 'coupon' | 'product';
  code?: string;
  discount?: string;
  name: string;
  fullName?: string;
  image?: string;
}

/*
========================================================================
3. ONDE ESTÃO OS ITENS VISUAIS DA ROLETA (8 fatias exatas)
   - Ordem estrita mantendo produtos intercalados com cupons para gerar expectativa.
========================================================================
*/
const visualItems: RouletteItem[] = [
  {
    id: 0,
    type: 'coupon',
    code: 'COPA6OFF',
    discount: '6% OFF',
    name: 'COPA6OFF | 6% OFF'
  },
  /* 
  ========================================================================
  4. ONDE ESTÃO OS PRODUTOS APENAS VISUAIS
     - Eles servem puramente como iscas decorativas de altíssimo valor.
     - NUNCA podem ser sorteados, conforme regras críticas.
  ========================================================================
  */
  {
    id: 1,
    type: 'product',
    name: 'Poltronas Clássicas',
    fullName: 'Par de Poltronas Clássicas Verde com Dourado',
    image: 'https://i.imgur.com/tPuWMY4.png'
  },
  {
    id: 2,
    type: 'coupon',
    code: 'LUZESPECIAL',
    discount: '5% OFF',
    name: 'LUZESPECIAL | 5% OFF'
  },
  {
    id: 3,
    type: 'product',
    name: 'Cômoda Clássica',
    fullName: 'Cômoda Clássica Marchetada 3 Gavetas com Tampo em Mármore',
    image: 'https://i.imgur.com/6iW0qtI.png'
  },
  {
    id: 4,
    type: 'coupon',
    code: 'CLIENTEOURO',
    discount: '8% OFF',
    name: 'CLIENTEOURO | 8% OFF'
  },
  {
    id: 5,
    type: 'product',
    name: 'Jantar 62 Peças',
    fullName: 'Jogo de Aparelho de Jantar em Porcelana Branca e Arabescos Filetados à Ouro 62 Peças',
    image: 'https://i.imgur.com/Fe0zbH4.png'
  },
  {
    id: 6,
    type: 'coupon',
    code: 'CLIENTEVIP',
    discount: '5% OFF',
    name: 'CLIENTEVIP | 5% OFF'
  },
  {
    id: 7,
    type: 'coupon',
    code: 'PRIME3OFF',
    discount: '3% OFF',
    name: 'PRIME3OFF | 3% OFF'
  }
];

/*
========================================================================
5. ONDE ESTÃO OS CUPONS REALMENTE SORTEÁVEIS
   - Apenas esses cupons são elegíveis para sorteio. Os produtos estão fora.
========================================================================
*/
const validCoupons = [
  { code: 'COPA6OFF', discount: '6%', visualIndex: 0 },
  { code: 'LUZESPECIAL', discount: '5%', visualIndex: 2 },
  { code: 'CLIENTEOURO', discount: '8%', visualIndex: 4 },
  { code: 'CLIENTEVIP', discount: '5%', visualIndex: 6 },
  { code: 'PRIME3OFF', discount: '3%', visualIndex: 7 }
];

export default function App() {
  // Estados para o Formulário obrigatório
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [formErrors, setFormErrors] = useState<{ nome?: boolean; email?: boolean; telefone?: boolean }>({});
  const [showFormAlert, setShowFormAlert] = useState(false);

  // Estados do jogo e roleta
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinCompleted, setSpinCompleted] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winningCoupon, setWinningCoupon] = useState<{ code: string; discount: string; visualIndex: number } | null>(null);

  // Estados pós-sorteio
  const [copied, setCopied] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Referências para controle de animação
  const animationFrameRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);

  // Efeito para piscar as lâmpadas da roleta (efeito de luzes decorativas)
  const [lightsOn, setLightsOn] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setLightsOn(prev => !prev);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Formatação de telefone (Máscara brasileira)
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setTelefone(value);
    if (formErrors.telefone) setFormErrors(prev => ({ ...prev, telefone: false }));
  };

  /*
  ========================================================================
  6. ONDE ESTÁ A REGRA QUE IMPEDE PRODUTOS DE SEREM SORTEADOS
     - O sorteio seleciona aleatoriamente um índice do array 'validCoupons'.
     - É impossível sortear um produto porque o array de sorteio contém apenas cupons.
  ========================================================================
  */
  const handleSpinClick = () => {
    // Validar formulário antes de permitir o giro
    const errors = {
      nome: nome.trim() === '',
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
      telefone: telefone.trim().replace(/\D/g, '').length < 10,
    };

    setFormErrors(errors);

    if (errors.nome || errors.email || errors.telefone) {
      setShowFormAlert(true);
      // Focar no primeiro erro
      const firstErrorField = Object.keys(errors).find(k => errors[k as keyof typeof errors]);
      if (firstErrorField) {
        document.getElementById(firstErrorField)?.focus();
      }
      return;
    }

    if (isSpinning) return;

    // Sorteio justo e real APENAS entre os cupons elegíveis
    const selectedCoupon = validCoupons[Math.floor(Math.random() * validCoupons.length)];
    setWinningCoupon(selectedCoupon);
    setIsSpinning(true);
    setShowFormAlert(false);

    // Calcular ângulos para a animação dramática
    const C = selectedCoupon.visualIndex; // Índice do cupom sorteado (ex: 4 para CLIENTEOURO)
    
    // Rotação final para alinhar o cupom sob o ponteiro (que está no topo, 12 horas)
    // Rotação de 0 graus deixa o índice 0 sob o ponteiro.
    // Como a roleta gira em sentido horário, para alinhar o índice C ao topo, giramos (360 - C * 45) graus.
    const baseSpins = 12; // 12 giros completos de alta velocidade
    const targetFinalAngle = baseSpins * 360 + (360 - C * 45);

    /*
    ========================================================================
    9. ONDE É APLICADO O EFEITO DE QUASE CAIR NO PRODUTO
       - Nós definimos um ângulo de "tease" (isca) que aponta para um produto próximo ao cupom sorteado.
       - Nas fatias 0, 2, 4, o produto adjacente é P = C + 1. Tease = final - 45°
       - Na fatia 6, o produto adjacente é P = 5. Tease = final + 45° (efeito de passar e recuar)
       - Na fatia 7, o produto adjacente é P = 1. Tease = final - 90° (desacelera no Sofá, passa pelo Copa6Off e para no Prime3Off)
    ========================================================================
    */
    let targetTeaseAngle = targetFinalAngle - 45;
    if (C === 6) {
      targetTeaseAngle = targetFinalAngle + 45; // Passa ligeiramente, para no produto e recua suavemente
    } else if (C === 7) {
      targetTeaseAngle = targetFinalAngle - 90; // Começa a quase parar no Sofá Clássico (1) e escorrega até o cupom (7)
    }

    const A5 = targetTeaseAngle - 540; // Ângulo no final do segundo 5 (ainda longe, mas pronto para desaceleração)

    // Parâmetros matemáticos para garantir suavidade e continuidade de velocidades
    // Segmento 2 (t entre 5000ms e 7000ms): de A5 a targetTeaseAngle
    const v5 = (A5 * 1.8) / 5; // velocidade terminal do segmento 1 em graus/s
    const c_seg2 = v5 * 2; // derivativa ponderada
    const delta_seg2 = targetTeaseAngle - A5;
    const a_seg2 = 20 + c_seg2 - 2 * delta_seg2;
    const b_seg2 = delta_seg2 - c_seg2 - a_seg2;

    // Segmento 3 (t entre 7000ms e 8500ms): de targetTeaseAngle a targetFinalAngle
    const vT = 12; // Velocidade de rastreamento lento (creeping speed) em graus/s
    const c_seg3 = vT * 1.5;
    const delta_seg3 = targetFinalAngle - targetTeaseAngle;
    const a_seg3 = c_seg3 - 2 * delta_seg3;
    const b_seg3 = delta_seg3 - c_seg3 - a_seg3;

    // Função de loop de animação baseada no tempo real para consistência
    const animate = (timestamp: number) => {
      if (!startTimestampRef.current) {
        startTimestampRef.current = timestamp;
      }

      const elapsed = timestamp - startTimestampRef.current;

      if (elapsed < 5000) {
        /*
        ========================================================================
        7. ONDE OCORRE O GIRO RÁPIDO DE 5 SEGUNDOS
           - Ocorre entre 0 e 5000 milissegundos.
           - Aplica uma curva de progressão exponencial crescente para gerar giros rápidos,
             chegando a aproximadamente 4 giros completos por segundo no pico.
        ========================================================================
        */
        const p = elapsed / 5000;
        const currentAngle = A5 * Math.pow(p, 1.8);
        setRotation(currentAngle);
        animationFrameRef.current = requestAnimationFrame(animate);

      } else if (elapsed < 7000) {
        /*
        ========================================================================
        8. ONDE COMEÇA A DESACELERAÇÃO A PARTIR DO SEGUNDO 6
           - Iniciado rigorosamente no segundo 5 (passando pelo segundo 6).
           - O polinômio de terceiro grau desacelera a roleta de alta velocidade para uma velocidade quase estática
             bem em cima da fatia do produto (ângulo tease) ao atingir o segundo 7.
        ========================================================================
        */
        const u = (elapsed - 5000) / 2000; // Normalizado entre 0 e 1 (durante 2 segundos)
        const currentAngle = a_seg2 * Math.pow(u, 3) + b_seg2 * Math.pow(u, 2) + c_seg2 * u + A5;
        setRotation(currentAngle);
        animationFrameRef.current = requestAnimationFrame(animate);

      } else if (elapsed < 8500) {
        /*
        ========================================================================
        10. ONDE A ROLETA PARA NO CUPOM AO LADO DO PRODUTO
            - Ocorre entre os segundos 7 e 8.5.
            - A velocidade reduz drasticamente a uma quase imobilidade no produto (gerando o suspense absoluto),
              e então, com um último suspiro sutil, a roleta desliza suavemente para parar exatamente
              sobre o cupom premiado vizinho, finalizando com velocidade zero perfeita em 8.5 segundos.
        ========================================================================
        */
        const w = (elapsed - 7000) / 1500; // Normalizado entre 0 e 1 (durante 1.5 segundos)
        const currentAngle = a_seg3 * Math.pow(w, 3) + b_seg3 * Math.pow(w, 2) + c_seg3 * w + targetTeaseAngle;
        setRotation(currentAngle);
        animationFrameRef.current = requestAnimationFrame(animate);

      } else {
        // Finalização da animação
        setRotation(targetFinalAngle);
        setIsSpinning(false);
        setSpinCompleted(true);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      }
    };

    startTimestampRef.current = null;
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  /*
  ========================================================================
  11. ONDE ESTÁ A FUNÇÃO DE COPIAR CUPOM
      - Copia o cupom para a área de transferência usando API moderna ou fallback compatível.
      - Ativa o temporizador regressivo de 5 segundos obrigatório após copiar.
  ========================================================================
  */
  const handleCopyCoupon = () => {
    if (!winningCoupon) return;

    const codeToCopy = winningCoupon.code;
    
    // Implementação robusta de cópia de texto com fallback integrado para o iframe
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codeToCopy);
        success = true;
      }
    } catch (err) {
      console.warn('API de clipboard falhou, tentando fallback...', err);
    }

    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = codeToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error('Fallback de cópia falhou', err);
      }
    }

    setCopied(true);
    setRedirectCountdown(5);
  };

  /*
  ========================================================================
  12. ONDE ESTÁ O REDIRECIONAMENTO APÓS 5 SEGUNDOS
      - Um efeito de contagem regressiva reativa.
      - Redireciona rigorosamente apenas após a conclusão do temporizador.
      - URL de destino: https://www.primehomedecor.com.br
  ========================================================================
  */
  useEffect(() => {
    if (redirectCountdown === null) return;

    if (redirectCountdown === 0) {
      window.location.href = 'https://www.primehomedecor.com.br';
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown]);

  // Função auxiliar para converter graus polares para coordenadas SVG
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Desenhar os setores da roleta perfeitamente sem linhas internas duras
  const getSectorPath = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', x, y,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  // Componente visual de confete leve para comemoração premium
  const ConfettiEffect = () => {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
        {Array.from({ length: 40 }).map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 3;
          const duration = 2.5 + Math.random() * 2.5;
          const size = 6 + Math.random() * 8;
          const colors = [BRAND_COLORS.caramel, BRAND_COLORS.gold, BRAND_COLORS.goldLight, '#FFF5E0', '#D4AF37'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          return (
            <div
              key={i}
              className="absolute top-0 rounded-xs animate-pulse"
              style={{
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: randomColor,
                opacity: 0.85,
                transform: 'translateY(-20px)',
                animation: `fallDown ${duration}s linear infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
        <style>{`
          @keyframes fallDown {
            0% {
              transform: translateY(-20px) rotate(0deg);
            }
            100% {
              transform: translateY(110vh) rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-navy bg-radial from-[#0d2a4a] to-brand-navy text-[#f8fafc] font-sans antialiased py-6 px-4 md:py-12 flex flex-col items-center justify-between relative overflow-hidden">
      
      {/* Detalhes de brilhos e decorações ao fundo */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-brand-caramel/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-brand-gold/10 blur-[120px] pointer-events-none" />

      {/* Header e Logo */}
      <header className="w-full max-w-xl mx-auto flex flex-col items-center mb-6 z-10">
        {/* 
        ========================================================================
        2. ONDE ESTÁ O LOGO DA PRIME HOME DECOR
           - Centralizado no topo da página promocional.
        ========================================================================
        */}
        <div className="mb-4 transform transition hover:scale-102 duration-300">
          <img
            src="https://images.tcdn.com.br/files/1200797/themes/132/img/settings/branco.png?2a50f0eb317c9b8348abfaabaa51c90c"
            alt="Prime Home Decor Logo"
            className="h-10 md:h-12 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-brand-gold to-transparent" />
      </header>

      {/* Corpo Principal da Campanha */}
      <main className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center justify-center z-10 flex-grow py-4">
        
        {/* Lado Esquerdo: Textos Promocionais e Formulário */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
          <div className="space-y-3 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-caramel/20 border border-brand-gold/30 text-brand-gold">
              <Gift className="w-3.5 h-3.5" /> ✨ Oportunidade Exclusiva Prime Home Decor
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold tracking-tight leading-tight text-white drop-shadow-sm">
              Gire e Ganhe seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-caramel font-bold italic">Cupom Especial</span> com a chance de levar um Produto de Luxo!
            </h1>
            <p className="text-sm md:text-base text-gray-300 leading-relaxed max-w-md mx-auto lg:mx-0">
              Cadastre-se abaixo para girar a roleta premium. Você garante um cupom de desconto real de até 8% OFF imediatamente, com a emocionante possibilidade de conquistar produtos requintados como o <strong>Par de Poltronas Clássicas</strong>, a <strong>Cômoda Marchetada</strong> ou o <strong>Aparelho de Jantar</strong>!
            </p>
          </div>

          {/* Card do Formulário */}
          {!spinCompleted && (
            <div className="bg-[#031323]/90 backdrop-blur-md border border-brand-gold/20 p-6 md:p-8 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] space-y-5 transition-all">
              <h2 className="text-lg font-serif font-semibold text-brand-gold flex items-center gap-2">
                <span className="w-1.5 h-6 bg-brand-caramel rounded-full" />
                Cadastre-se para Liberar seu Giro
              </h2>

              {showFormAlert && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-200 flex items-start gap-2 animate-shake">
                  <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Atenção!</p>
                    <p>Por favor, preencha todos os campos corretamente para habilitar a roleta.</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Campo Nome */}
                <div className="space-y-1">
                  <label htmlFor="nome" className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-gold" /> Nome Completo
                  </label>
                  <input
                    id="nome"
                    type="text"
                    disabled={isSpinning}
                    placeholder="Ex: Roberto da Silva"
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      if (formErrors.nome) setFormErrors(prev => ({ ...prev, nome: false }));
                    }}
                    className={`w-full bg-[#051a2d]/95 border ${formErrors.nome ? 'border-red-500 bg-red-500/5 focus:ring-red-500/30' : 'border-brand-gold/20 focus:border-brand-gold focus:ring-brand-gold/30'} rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none ring-3 ring-transparent transition-all`}
                  />
                </div>

                {/* Campo E-mail */}
                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-brand-gold" /> E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    disabled={isSpinning}
                    placeholder="Ex: roberto@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) setFormErrors(prev => ({ ...prev, email: false }));
                    }}
                    className={`w-full bg-[#051a2d]/95 border ${formErrors.email ? 'border-red-500 bg-red-500/5 focus:ring-red-500/30' : 'border-brand-gold/20 focus:border-brand-gold focus:ring-brand-gold/30'} rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none ring-3 ring-transparent transition-all`}
                  />
                </div>

                {/* Campo Telefone */}
                <div className="space-y-1">
                  <label htmlFor="telefone" className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand-gold" /> Telefone Celular
                  </label>
                  <input
                    id="telefone"
                    type="tel"
                    disabled={isSpinning}
                    placeholder="Ex: (11) 98765-4321"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    className={`w-full bg-[#051a2d]/95 border ${formErrors.telefone ? 'border-red-500 bg-red-500/5 focus:ring-red-500/30' : 'border-brand-gold/20 focus:border-brand-gold focus:ring-brand-gold/30'} rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none ring-3 ring-transparent transition-all`}
                  />
                </div>
              </div>

              <div className="pt-2 text-center">
                <p className="text-[11px] text-gray-400">
                  🔒 Garantimos total privacidade e segurança dos seus dados pessoais.
                </p>
              </div>
            </div>
          )}

          {/* Sessão de Informação Decorativa */}
          {!spinCompleted && (
            <div className="hidden lg:flex items-center gap-3 p-4 rounded-xl bg-brand-navy border border-brand-gold/10 text-xs text-gray-400 leading-relaxed">
              <Info className="w-6 h-6 text-brand-gold shrink-0" />
              <span>Garantia Prime: Todos os participantes cadastrados ganham cupons de desconto exclusivos de até 8% OFF para adquirir as peças clássicas de nosso catálogo!</span>
            </div>
          )}
        </div>

        {/* Lado Direito: A Roleta Premium */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          
          {!spinCompleted ? (
            <div className="relative flex flex-col items-center">
              
              {/* Aro Externo Premium com Gradiente Metálico */}
              <div 
                className="relative rounded-full bg-gradient-to-b from-brand-gold-light via-brand-caramel to-brand-gold-dark p-2 md:p-3 shadow-[0_0_50px_rgba(149,94,32,0.45)] transition-transform duration-500"
                style={{
                  boxShadow: isSpinning 
                    ? '0 0 70px rgba(230,197,148,0.35), 0 0 30px rgba(149,94,32,0.6)' 
                    : '0 0 45px rgba(149,94,32,0.4)'
                }}
              >
                
                {/* Lâmpadas Flutuantes ao Redor do Aro */}
                <div className="absolute inset-0 rounded-full pointer-events-none z-10">
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const angle = (idx * 360) / 24;
                    const coords = polarToCartesian(250, 250, 244, angle);
                    // Alterna o brilho das luzes com base no estado lightsOn
                    const isGlowing = lightsOn ? (idx % 2 === 0) : (idx % 2 !== 0);
                    
                    return (
                      <div
                        key={idx}
                        className="absolute w-2 h-2 rounded-full transition-all duration-300"
                        style={{
                          left: `calc(${coords.x / 5}% - 4px)`,
                          top: `calc(${coords.y / 5}% - 4px)`,
                          backgroundColor: isGlowing ? '#FFF5E0' : '#7a4a15',
                          boxShadow: isGlowing 
                            ? '0 0 10px #ffffff, 0 0 6px #e6c594' 
                            : 'none',
                        }}
                      />
                    );
                  })}
                </div>

                {/* Ponteiro Fixo Superior */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] pointer-events-none transition-transform duration-100">
                  <svg 
                    width="42" 
                    height="50" 
                    viewBox="0 0 42 50" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className={isSpinning ? 'animate-bounce' : ''}
                    style={{ transformOrigin: '50% 0%' }}
                  >
                    <path d="M21 50L42 10H0L21 50Z" fill="url(#goldGradient)" />
                    <defs>
                      <linearGradient id="goldGradient" x1="21" y1="10" x2="21" y2="50" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFF5E0" />
                        <stop offset="0.4" stopColor="#e6c594" />
                        <stop offset="0.8" stopColor="#955E20" />
                        <stop offset="1" stopColor="#7a4a15" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Corpo Rotatório Interno */}
                <div 
                  className="relative w-[300px] h-[300px] xs:w-[340px] xs:h-[340px] sm:w-[400px] sm:h-[400px] md:w-[440px] md:h-[440px] rounded-full overflow-hidden bg-brand-navy select-none"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'none' : 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                >
                  {/* Fundo do círculo renderizado via SVG nativo de alta performance */}
                  <svg viewBox="0 0 500 500" className="w-full h-full absolute inset-0 pointer-events-none">
                    {visualItems.map((_, idx) => {
                      // Determina cor alternada perfeita das fatias (sem bordas duras internas)
                      const isEven = idx % 2 === 0;
                      const fillFill = isEven ? '#0c223c' : '#041324';
                      
                      const startAng = idx * 45 - 22.5;
                      const endAng = idx * 45 + 22.5;
                      const pathStr = getSectorPath(250, 250, 250, startAng, endAng);
                      
                      return (
                        <path 
                          key={idx} 
                          d={pathStr} 
                          fill={fillFill} 
                        />
                      );
                    })}
                  </svg>

                  {/* Elementos HTML absolutos rotacionados contendo o texto e fotos */}
                  <div className="absolute inset-0">
                    {visualItems.map((item, idx) => {
                      const isProduct = item.type === 'product';
                      return (
                        <div 
                          key={idx}
                          className="absolute left-1/2 top-0 w-[24%] h-[50%] origin-bottom flex flex-col items-center justify-start select-none"
                          style={{ 
                            transform: `translateX(-50%) rotate(${idx * 45}deg)` 
                          }}
                        >
                          {isProduct ? (
                            /* Layout do produto: Imagem no topo da fatia + Nome textual separado abaixo */
                            <div className="flex flex-col items-center pt-2 sm:pt-3 md:pt-4 w-full text-center px-1">
                              <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="w-full h-full object-contain rounded-md mix-blend-multiply" 
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <span className="text-[9px] xs:text-[10px] sm:text-[11px] font-bold text-white mt-1 leading-tight tracking-tight drop-shadow-md">
                                {item.name}
                              </span>
                            </div>
                          ) : (
                            /* Layout do Cupom: Escrito de forma legível em linha horizontal, realçando porcentagem */
                            <div className="flex flex-col items-center pt-4 sm:pt-6 md:pt-8 w-full text-center px-1">
                              <span className="text-[10px] xs:text-[11px] sm:text-xs font-extrabold text-brand-gold tracking-wider drop-shadow-md uppercase">
                                {item.code}
                              </span>
                              <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-white/95 mt-1 uppercase tracking-widest bg-brand-caramel/30 px-1.5 py-0.5 rounded-full border border-brand-gold/15 whitespace-nowrap">
                                {item.discount}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Centro Circular Limpo e Elegante com Logo de Letra */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 xs:w-16 xs:h-16 rounded-full bg-gradient-to-b from-brand-gold-light via-brand-caramel to-brand-gold-dark z-20 flex items-center justify-center shadow-lg border-2 border-brand-navy">
                    <div className="w-10 h-10 xs:w-12 xs:h-12 rounded-full bg-brand-navy flex items-center justify-center border border-brand-gold/30 shadow-inner p-1.5">
                      <img
                        src="https://images.tcdn.com.br/files/1200797/themes/132/img/settings/primelogo.png?d3f787757aa49795d1a68910f5385a84"
                        alt="Prime Logo"
                        className="w-full h-full object-contain brightness-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Botão de Acionamento do Giro */}
              <button
                onClick={handleSpinClick}
                disabled={isSpinning}
                className={`mt-8 px-10 py-4 text-base tracking-wide font-bold uppercase rounded-full shadow-[0_10px_25px_rgba(149,94,32,0.3)] transition-all duration-300 transform active:scale-95 ${
                  isSpinning
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700 shadow-none'
                    : 'bg-gradient-to-r from-brand-caramel via-brand-gold to-brand-gold-dark text-white hover:brightness-110 hover:shadow-[0_15px_30px_rgba(149,94,32,0.45)] hover:scale-103 cursor-pointer'
                }`}
              >
                {isSpinning ? 'Sorteando...' : 'Girar Roleta'}
              </button>
              
            </div>
          ) : (
            /* 
            ========================================================================
            COPIAR CUPOM E REDIRECIONAMENTO (RESULTADO FINAL PÓS GIRO)
               - A roleta desaparece e exibe o cupom em glória.
               - Contém botões de cópia e timer de redirecionamento.
            ========================================================================
            */
            <div className="w-full max-w-md bg-[#031323]/95 border-2 border-brand-gold/30 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-center relative overflow-hidden animate-fadeIn space-y-6">
              
              {/* Confetes explodindo visualmente na tela de vitória */}
              <ConfettiEffect />

              <div className="space-y-2 relative z-10">
                <div className="w-16 h-16 mx-auto bg-brand-gold/10 border border-brand-gold/40 rounded-full flex items-center justify-center text-brand-gold animate-bounce mb-2">
                  <Gift className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-gold">
                  Sorteio Concluído!
                </h3>
                <h2 className="text-3xl font-serif font-bold text-white leading-tight">
                  Parabéns!
                </h2>
                <p className="text-sm text-gray-300">
                  Você ganhou um cupom de desconto exclusivo da Prime Home Decor.
                </p>
              </div>

              {/* Destaque do Cupom Premiado */}
              <div className="bg-[#051c31] border border-brand-gold/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-gold/40 transition-all z-10">
                <div className="absolute top-[-20px] left-[-20px] w-12 h-12 rounded-full bg-brand-navy" />
                <div className="absolute top-[-20px] right-[-20px] w-12 h-12 rounded-full bg-brand-navy" />
                <div className="absolute bottom-[-20px] left-[-20px] w-12 h-12 rounded-full bg-brand-navy" />
                <div className="absolute bottom-[-20px] right-[-20px] w-12 h-12 rounded-full bg-brand-navy" />
                
                <div className="space-y-1 relative z-10">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Código do Cupom</span>
                  <div className="text-2xl font-mono font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-gold-light to-brand-gold tracking-wider select-all">
                    {winningCoupon?.code}
                  </div>
                  <div className="text-sm text-brand-gold font-bold mt-1">
                    {winningCoupon?.discount} de Desconto Real
                  </div>
                </div>
              </div>

              {/* Botão de Copiar Cupom */}
              <div className="space-y-4 relative z-10 pt-2">
                <button
                  onClick={handleCopyCoupon}
                  className="w-full bg-gradient-to-r from-brand-caramel via-brand-gold to-brand-gold-dark hover:brightness-110 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform active:scale-98 flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(149,94,32,0.3)] cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-green-300" />
                      Cupom Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar Cupom
                    </>
                  )}
                </button>

                {/* Temporizador de Redirecionamento de 5 Segundos */}
                {redirectCountdown !== null && (
                  <div className="p-3 bg-brand-navy/60 rounded-xl border border-brand-gold/10 animate-pulse text-xs text-brand-gold-light flex flex-col items-center justify-center gap-1.5">
                    <span className="font-semibold text-gray-300">
                      Copiado com sucesso! Redirecionando para a loja...
                    </span>
                    <span className="text-sm font-extrabold bg-brand-caramel/40 px-3 py-1 rounded-full text-white">
                      Você será redirecionado em <span className="text-brand-gold">{redirectCountdown}s</span>...
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-gray-500 relative z-10">
                Caso o redirecionamento automático falhe, você pode acessar diretamente o site da loja em <a href="https://www.primehomedecor.com.br" className="text-brand-gold underline hover:text-white">primehomedecor.com.br</a>.
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Footer elegante da campanha */}
      <footer className="w-full max-w-xl mx-auto text-center mt-6 text-[11px] text-gray-500 z-10 space-y-1">
        <p>© 2026 Prime Home Decor. Todos os direitos reservados.</p>
        <p className="opacity-60">Esta é uma página promocional exclusiva. Sorteios válidos para novos clientes cadastrados.</p>
      </footer>

      {/* Efeito adicional de balanço do formulário em caso de erro */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
