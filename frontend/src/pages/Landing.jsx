import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [precos, setPrecos] = useState({ preco_1x: '100', preco_2x: '150', preco_3x: '180', preco_4x: '220', preco_promocional: '' });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    // Efeito Glitter (Partículas seguindo o mouse)
    const handleMouseMove = (e) => {
      const glitter = document.createElement('div');
      glitter.className = 'glitter-particle';
      glitter.style.left = `${e.clientX}px`;
      glitter.style.top = `${e.clientY + window.scrollY}px`;

      // Cores aleatórias entre magenta, rosa suave, branco e dourado
      const colors = ['#E2007A', '#FF8ECA', '#fff', '#FFD700'];
      glitter.style.background = colors[Math.floor(Math.random() * colors.length)];

      document.body.appendChild(glitter);

      // Remover após a animação
      setTimeout(() => {
        if (glitter.parentNode) glitter.remove();
      }, 1000);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '192.168.56.1';
    const baseURL = isLocal
      ? `http://${window.location.hostname}/api`
      : `${window.location.origin}/api`;

    axios.get(`${baseURL}/configuracoes`)
      .then(res => {
        if (res.data && res.data.preco_1x) {
          setPrecos(res.data);
        }
      })
      .catch(() => { }); // Silently fail - use defaults
  }, []);

  const scrollToSection = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  return (
    <div className="landing">
      {/* Floating Particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 8}s`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
          }} />
        ))}
      </div>

      {/* Header */}
      <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
        <div className="container header-content">
          <Link to="/" className="logo">
            <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="Espaço Magli" className="logo-img" />
            <div className="logo-text">
              <span className="logo-name">Espaço <strong>Magli</strong></span>
              <span className="logo-tagline">Centro de Treinamento Feminino</span>
            </div>
          </Link>

          {/* Mobile menu toggle */}
          <button className="mobile-nav-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>

          <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
            <a href="#sobre" onClick={(e) => { e.preventDefault(); scrollToSection('sobre'); }}>Sobre</a>
            <a href="#metodo" onClick={(e) => { e.preventDefault(); scrollToSection('metodo'); }}>Método</a>
            <a href="#planos" onClick={(e) => { e.preventDefault(); scrollToSection('planos'); }}>Investimentos</a>
            <a href="#contato" onClick={(e) => { e.preventDefault(); scrollToSection('contato'); }}>Contato</a>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-bg">
          <img src={`${process.env.PUBLIC_URL}/hero-bg.png`} alt="" className="hero-bg-img" />
          <div className="hero-overlay" />
        </div>
        <div className="hero-content">
          <div className="hero-badge fade-in-up">EXCLUSIVO PARA MULHERES</div>
          <h1 className="fade-in-up delay-1">
            Sua melhor versão
            <span className="hero-gradient-text"> começa aqui</span>
          </h1>
          <p className="hero-subtitle fade-in-up delay-2">
            Treinamento personalizado – Toda equipe composta por mulheres<br />
            Responsável técnica: Daiane Magliano<br />
            Especialista em Treinamento Feminino
          </p>
          <div className="btn-group fade-in-up delay-3">
            <a href="https://www.contate.me/5524992940912" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-glow">
              <span>💬</span> Agendar Aula Experimental
            </a>
            <a href="#metodo" className="btn btn-glass" onClick={(e) => { e.preventDefault(); scrollToSection('metodo'); }}>
              Conheça o Método →
            </a>
          </div>

        </div>

        {/* Scroll indicator */}
        <div className="scroll-indicator">
          <div className="scroll-arrow" />
        </div>
      </section>

      {/* SOBRE SECTION */}
      <section id="sobre" className="section section-dark">
        <div className="container">
          <div className="section-title">
            <span className="section-label">CONHEÇA-NOS</span>
            <h2>Um espaço feito <span>para você</span></h2>
            <p>
              O Espaço Magli é um centro de treinamento exclusivo para mulheres,
              onde cada detalhe foi pensado para proporcionar conforto, segurança e resultados reais.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Ambiente Exclusivo e Climatizado</h3>
              <p>Espaço dedicado apenas para mulheres, com climatização para conforto total durante seus treinos.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3>Acompanhamento Individual</h3>
              <p>Cada aluna recebe atenção personalizada com treinos adaptados aos seus objetivos.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3>Evolução Constante</h3>
              <p>Treinos renovados periodicamente para garantir evolução contínua e motivação.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3>Equipe Feminina</h3>
              <p>Toda a equipe é formada por mulheres com capacitação em treinamento feminino.</p>
            </div>
          </div>
        </div>
      </section>

      {/* MÉTODO SECTION */}
      <section id="metodo" className="section">
        <div className="container">
          <div className="section-title">
            <span className="section-label">NOSSO MÉTODO</span>
            <h2>Treinamento que <span>transforma</span></h2>
            <p>Um método exclusivo desenvolvido para atender às necessidades do corpo feminino.</p>
          </div>

          <div className="method-timeline">
            <div className="method-step">
              <div className="method-number">01</div>
              <div className="method-content">
                <h3>Avaliação Inicial</h3>
                <p>Análise completa do seu perfil, objetivos, limitações e histórico. Montamos seu plano de treino ideal.</p>
              </div>
            </div>
            <div className="method-step">
              <div className="method-number">02</div>
              <div className="method-content">
                <h3>Treino Personalizado</h3>
                <p>Séries de exercícios elaboradas especificamente para você, com foco nos seus objetivos.</p>
              </div>
            </div>
            <div className="method-step">
              <div className="method-number">03</div>
              <div className="method-content">
                <h3>Acompanhamento Contínuo</h3>
                <p>Sua professora acompanha cada sessão, ajustando cargas e exercícios conforme sua evolução.</p>
              </div>
            </div>
            <div className="method-step">
              <div className="method-number">04</div>
              <div className="method-content">
                <h3>Renovação Periódica</h3>
                <p>Os treinos são renovados para que seu corpo nunca entre em estagnação. Evolução garantida.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS SECTION */}
      <section id="planos" className="section section-dark">
        <div className="container">
          <div className="section-title">
            <span className="section-label">INVESTIMENTO</span>
            <h2>Planos que se adequam <span>a sua rotina</span></h2>
          </div>

          <div className="card" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '2rem', lineHeight: '2' }}>
              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="check" style={{ color: 'var(--primary)' }}>✓</span> Sem taxa de matrícula
              </p>
              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="check" style={{ color: 'var(--primary)' }}>✓</span> Incluída avaliação antropométrica
              </p>
              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="check" style={{ color: 'var(--primary)' }}>✓</span> Anamnese
              </p>
              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="check" style={{ color: 'var(--primary)' }}>✓</span> Periodização individual
              </p>
            </div>

            <a href="https://wa.me/5524992940912?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20planos%20do%20Espa%C3%A7o%20Magli." target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-glow" style={{ fontSize: '1.1rem', padding: '1rem 2.5rem' }}>
              💬 Faça contato para atendimento personalizado
            </a>
            <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
              Encaminharemos a tabela de valores com atendimento humanizado
            </p>
          </div>
        </div>
      </section>

      {/* CONTATO SECTION */}
      <section id="contato" className="section">
        <div className="container">
          <div className="section-title">
            <span className="section-label">FALE CONOSCO</span>
            <h2>Vamos <span>conversar</span>?</h2>
            <p>Agende sua aula experimental ou tire suas dúvidas.</p>
          </div>

          <div className="contact-grid">
            <a href="https://www.contate.me/5524992940912" target="_blank" rel="noopener noreferrer" className="contact-card contact-whatsapp">
              <div className="contact-icon">📱</div>
              <h3>WhatsApp</h3>
              <p className="contact-value">(24) 99294-0912</p>
              <p className="text-muted">Resposta rápida para agendamentos</p>
            </a>
            <a href="https://instagram.com/espaco_magli" target="_blank" rel="noopener noreferrer" className="contact-card contact-instagram">
              <div className="contact-icon">📸</div>
              <h3>Instagram</h3>
              <p className="contact-value">@espaco_magli</p>
              <p className="text-muted">Acompanhe nossas novidades</p>
            </a>
            <div className="contact-card">
              <div className="contact-icon">📍</div>
              <h3>Localização</h3>
              <p className="contact-value">Valença - RJ</p>
              <p className="text-muted">Centro de Treinamento Exclusivo</p>
            </div>
            <div className="contact-card">
              <div className="contact-icon">🕐</div>
              <h3>Horários</h3>
              <p className="contact-value">Seg a Sex</p>
              <p className="text-muted">7h às 18h</p>
            </div>
          </div>
        </div>
      </section>

      {/* Consultoria Banner */}
      <section className="cta-banner">
        <div className="container text-center">
          <h2>💻 Consultoria <span>Online</span></h2>
          <p>Não mora em Valença? Treine de qualquer lugar com acompanhamento profissional.</p>
          <a href="https://www.contate.me/5524992940912" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-glow" style={{ marginTop: '1.5rem' }}>
            Saiba Mais
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="Espaço Magli" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '50%' }} />
              <div>
                <p className="logo-name" style={{ fontSize: '1.3rem' }}>Espaço <strong style={{ color: 'var(--primary)' }}>Magli</strong></p>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>Centro de Treinamento Exclusivo para Mulheres</p>
              </div>
            </div>
            <div className="footer-links">
              <a href="https://instagram.com/espaco_magli" target="_blank" rel="noopener noreferrer">
                📸 Instagram
              </a>
              <a href="https://www.contate.me/5524992940912" target="_blank" rel="noopener noreferrer">
                📱 WhatsApp
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Espaço Magli — Daiane Magliano. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;