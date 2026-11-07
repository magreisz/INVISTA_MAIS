import { signOut } from 'firebase/auth';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { auth } from '../firebase';
import BotaoTema from './BotaoTema';

export default function Layout() {
  const { usuario } = useAuth();

  return (
    <>
      <header className="topo">
        <NavLink to="/" className="marca">
          <span className="marca-icone">+</span> Cofrinho Invista+
        </NavLink>
        <nav className="menu">
          <NavLink to="/" end>Cofrinhos</NavLink>
          <NavLink to="/scanner">Scanner</NavLink>
          <NavLink to="/favoritos">Favoritos</NavLink>
        </nav>
        <div className="conta">
          <BotaoTema />
          <span className="conta-email">{usuario?.email}</span>
          <button className="botao secundario" onClick={() => signOut(auth)}>Sair</button>
        </div>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
      <footer className="rodape">Conteúdo educativo. Não é recomendação de investimento.</footer>
    </>
  );
}
