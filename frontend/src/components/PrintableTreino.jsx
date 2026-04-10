import React from 'react';

const PrintableTreino = ({ studentName, date, duration, description, professorName }) => {
  // Função para transformar o texto da IA (Markdown simples) em HTML básico
  const formatDescription = (text) => {
    if (!text) return null;
    
    return text.split('\n').map((line, index) => {
      let lineContent = line.trim();
      if (!lineContent) return <br key={index} />;

      // Títulos (Ex: **Título**)
      if (lineContent.startsWith('**') && lineContent.endsWith('**')) {
        return <h3 key={index} style={styles.sectionTitle}>{lineContent.replace(/\*\*/g, '')}</h3>;
      }
      
      // Negrito no meio da linha
      const formattedLine = line.split('**').map((part, i) => 
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      );

      // Listas (Ex: * item ou - item)
      if (lineContent.startsWith('* ') || lineContent.startsWith('- ')) {
        return <li key={index} style={styles.listItem}>{formattedLine}</li>;
      }

      return <p key={index} style={styles.paragraph}>{formattedLine}</p>;
    });
  };

  return (
    <div className="printable-training-container">
      <div id="printable-treino" style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <img 
            src="/logo.png" 
            alt="Logo Magli" 
            style={styles.logo} 
          />
          <div style={styles.titleContainer}>
            <h1 style={styles.mainTitle}>CRONOGRAMA DE TREINO</h1>
            <p style={styles.subtitle}>ESPAÇO MAGLI - PERFORMANCE & SAÚDE</p>
          </div>
        </div>

        <div style={styles.divider}></div>

        {/* Info Aluna */}
        <div style={styles.infoGrid}>
          <div style={styles.infoBox}>
            <span style={styles.label}>ALUNA:</span>
            <span style={styles.value}>{studentName}</span>
          </div>
          <div style={styles.infoBox}>
            <span style={styles.label}>DATA:</span>
            <span style={styles.value}>{date}</span>
          </div>
          <div style={styles.infoBox}>
            <span style={styles.label}>DURAÇÃO:</span>
            <span style={styles.value}>{duration}</span>
          </div>
          <div style={styles.infoBox}>
            <span style={styles.label}>PROFESSORA:</span>
            <span style={styles.value}>{professorName || 'Equipe Magli'}</span>
          </div>
        </div>

        {/* Descrição do Treino */}
        <div style={styles.content}>
          {formatDescription(description)}
        </div>

        {/* Rodapé */}
        <div style={styles.footer}>
          <div style={styles.divider}></div>
          <p style={styles.footerText}>
              "Onde sua saúde e bem-estar são nossa prioridade máxima."
          </p>
        </div>
      </div>

      <style>
        {`
          @media print {
            /* 1. Esconder elementos indesejados da tela principal e do popup */
            .header, 
            .sidebar, 
            .page-header, 
            .card, 
            .treino-alert,
            .mobile-menu-btn,
            .modal-header,
            .no-print,
            .floating-button {
              display: none !important;
            }

            /* 2. Resetar fundos escuros e restrições de todos os containers acima do cronograma */
            html, body, #root, .app, .dashboard, .main-content, .app-content, .page {
              background-color: transparent !important;
              background: transparent !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
              height: auto !important;
              min-height: auto !important;
              width: 100% !important;
              max-width: 100% !important;
              overflow: visible !important;
              position: static !important;
              box-shadow: none !important;
              border: none !important;
            }

            /* 3. NEUTRALIZAR o modal (Remover o "corte" de maxHeight e fundo preto) */
            /* A classe print-reset-wrapper foi colocada direto no TrocaTreinos.jsx */
            .print-reset-wrapper {
              background: transparent !important;
              background-color: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
              height: auto !important;
              min-height: auto !important;
              max-height: none !important;  /* ISSO RESOLVE A IMPRESSÃO CORTADA PELA METADE */
              overflow: visible !important; /* ISSO PERMITE MULTIPLAS PÁGINAS */
              overflow-y: visible !important;
              position: static !important;
              box-shadow: none !important;
              border: none !important;
              backdrop-filter: none !important; /* Remove o vidro embaçado escuro */
              width: auto !important;
              max-width: none !important;
            }

            /* 4. Garantir que a área de impressão ocupe o papel e tenha fundo limpo */
            .print-area, .printable-training-container, #printable-treino {
              display: block !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important; /* Fundo branco garantido apenas aqui */
            }

            @page {
              margin: 1.2cm;
              size: auto;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}
      </style>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff',
    color: '#333',
    padding: '30px',
    fontFamily: "'Poppins', sans-serif",
    maxWidth: '800px',
    margin: '0 auto',
    minHeight: '290mm',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '15px',
  },
  logo: {
    width: '70px',
    height: '70px',
    objectFit: 'contain',
  },
  titleContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#E2007A',
    margin: 0,
    letterSpacing: '1px',
  },
  subtitle: {
    fontSize: '11px',
    color: '#666',
    margin: 0,
    letterSpacing: '2px',
    fontWeight: '500',
  },
  divider: {
    height: '2px',
    background: '#E2007A',
    width: '100%',
    margin: '12px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
    backgroundColor: '#fdf3f8',
    padding: '12px',
    borderRadius: '8px',
  },
  infoBox: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '9px',
    color: '#E2007A',
    fontWeight: '700',
    marginBottom: '2px',
  },
  value: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: '5px 0',
  },
  sectionTitle: {
    fontSize: '15px',
    color: '#E2007A',
    borderLeft: '4px solid #E2007A',
    paddingLeft: '10px',
    margin: '15px 0 8px 0',
    fontWeight: '700',
    backgroundColor: '#fff0f7',
    padding: '4px 10px',
  },
  paragraph: {
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '4px 0',
  },
  listItem: {
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '3px 0 3px 20px',
  },
  footer: {
    marginTop: 'auto',
    textAlign: 'center',
    paddingTop: '15px',
  },
  footerText: {
    fontSize: '11px',
    color: '#888',
    fontStyle: 'italic',
  }
};

export default PrintableTreino;
