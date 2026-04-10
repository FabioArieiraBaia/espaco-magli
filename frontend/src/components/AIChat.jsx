import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AIChat() {
    const { api, isAdmin, user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [aiName, setAiName] = useState('Magli AI');
    const [configLoaded, setConfigLoaded] = useState(false);

    useEffect(() => {
        const loadAiConfig = async () => {
             try {
                 const res = await api.get('/configuracoes');
                 if (res.data.gemini_api_name) {
                     setAiName(res.data.gemini_api_name);
                 }
                 setConfigLoaded(true);
             } catch (err) {
                 console.error('Erro ao carregar nome da IA:', err);
                 setConfigLoaded(true);
             }
        };
        loadAiConfig();
    }, [api]);

    useEffect(() => {
        if (user && configLoaded && messages.length === 0) {
            setMessages([
                { role: 'ai', text: `Olá, ${user.nome}! Sou sua assistente ${aiName}. Como posso ajudar com a gestão do estúdio hoje?` }
            ]);
        }
    }, [user, messages.length, aiName, configLoaded]);

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!isAdmin) return null;

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading || cooldown) return;

        const userMsg = input;
        const newMessages = [...messages, { role: 'user', text: userMsg }];
        setInput('');
        setMessages(newMessages);
        setLoading(true);

        try {
            // Enviar histórico (últimas 10 mensagens) para manter contexto sem estourar limites
            const res = await api.post('/ia/chat', { 
                pergunta: userMsg,
                historico: messages.slice(-10) 
            });
            setMessages(prev => [...prev, { role: 'ai', text: res.data.resposta }]);

            // Iniciar cooldown após resposta
            setCooldown(true);
            setTimeout(() => setCooldown(false), 2000);
        } catch (err) {
            console.error('Erro no chat IA:', err);
            setMessages(prev => [...prev, { role: 'ai', text: 'Desculpe, ocorreu um erro ao processar sua pergunta. Verifique sua conexão ou a chave de API.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`ai-chat-container ${isOpen ? 'open' : ''}`}>
            {/* Chat Window */}
            {isOpen && (
                <div className="ai-chat-window fade-in">
                    <div className="ai-chat-header">
                        <div className="flex ai-center gap-2">
                            <div className="ai-chat-icon">
                                <img src="/logo.png" alt={aiName} />
                            </div>
                            <div>
                                <strong>{aiName}</strong>
                                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Assistente Administrativo</div>
                            </div>
                        </div>
                        <button className="ai-chat-close" onClick={() => setIsOpen(false)}>×</button>
                    </div>

                    <div className="ai-chat-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`ai-chat-bubble ${msg.role}`}>
                                {typeof msg.text === 'object' ? JSON.stringify(msg.text) : msg.text}
                            </div>
                        ))}
                        {loading && (
                            <div className="ai-chat-bubble ai loading">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="ai-chat-input" onSubmit={sendMessage}>
                        <input
                            type="text"
                            placeholder={cooldown ? "Aguarde um momento..." : "Pergunte sobre alunas, financeiro..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading || cooldown}
                        />
                        <button type="submit" disabled={loading || cooldown}>
                            {loading ? '...' : (cooldown ? '⏳' : '✈️')}
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button className="ai-chat-toggle" onClick={() => setIsOpen(!isOpen)}>
                <div className="ai-chat-icon">
                    <img src="/logo.png" alt={aiName} />
                </div>
            </button>
        </div>
    );
}

export default AIChat;
