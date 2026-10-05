import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { auth } from '../firebase';

const MENSAGENS = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Não foi possível criar a conta com este e-mail.',
  'auth/weak-password': 'A senha deve ter pelo menos 8 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
};

export default function Entrar() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [modo, setModo] = useState('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  if (usuario) return <Navigate to="/" replace />;

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (modo === 'entrar') await signInWithEmailAndPassword(auth, email.trim(), senha);
      else await createUserWithEmailAndPassword(auth, email.trim(), senha);
      navegar('/');
    } catch (falha) {
      setErro(MENSAGENS[falha.code] || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-entrada">
      <form className="painel entrada" onSubmit={enviar}>
        <h1 className="marca grande"><span className="marca-icone">+</span> Cofrinho Invista+</h1>
        <p className="subtitulo">Educação financeira com um cofrinho conectado</p>
        <div className="abas">
          <button type="button" className={modo === 'entrar' ? 'ativa' : ''} onClick={() => setModo('entrar')}>Entrar</button>
          <button type="button" className={modo === 'criar' ? 'ativa' : ''} onClick={() => setModo('criar')}>Criar conta</button>
        </div>
        <label>
          E-mail
          <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input
            type="password"
            required
            minLength={modo === 'criar' ? 8 : undefined}
            autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
            value={senha}
            onChange={e => setSenha(e.target.value)}
          />
        </label>
        {modo === 'criar' && <small className="dica">Mínimo de 8 caracteres. A conta deve ser do responsável pelo cofrinho.</small>}
        {erro && <div className="erro" role="alert">{erro}</div>}
        <button className="botao" disabled={enviando}>
          {enviando ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
        <Link className="link-cofre3d" to="/cofre-3d">Conheça o cofrinho por dentro em 3D</Link>
      </form>
    </div>
  );
}
