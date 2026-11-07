import { useState } from 'react';

function temaAtual() {
  return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro';
}

export default function BotaoTema({ className = '' }) {
  const [tema, setTema] = useState(temaAtual);

  function alternar() {
    const novo = tema === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.dataset.tema = novo;
    try {
      localStorage.setItem('invista-tema', novo);
    } catch {
      document.documentElement.dataset.tema = novo;
    }
    setTema(novo);
  }

  const escuro = tema === 'escuro';
  return (
    <button
      type="button"
      className={`botao-tema ${className}`}
      onClick={alternar}
      role="switch"
      aria-checked={escuro}
      aria-label="Visão noturna"
      title={escuro ? 'Voltar ao modo claro' : 'Ativar visão noturna'}
    >
      {escuro ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
        </svg>
      )}
    </button>
  );
}
