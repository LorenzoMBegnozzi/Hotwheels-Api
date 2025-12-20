import React from 'react';
import '../css/LandingPage.css';
import sobreMim from '../css/sobre-mim.jpeg';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="lp-root">
      <header>
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">HW</div>
            <div className="logo-text">Diecast <span className="logo-accent">Social</span></div>
          </div>
          <div className="header-actions">
            <button className="btn-header btn-login" onClick={() => navigate('/login')}>Login</button>
            <button className="btn-header btn-signup" onClick={() => navigate('/register')}>Cadastrar</button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🚀 A Rede Social dos Colecionadores</div>
          <h1 className="hero-title">
            Organize sua coleção de<br />
            <span className="hero-gradient">Miniaturas</span>
          </h1>
          <p className="hero-subtitle">
            A plataforma completa para catalogar, gerenciar e compartilhar sua paixão por miniaturas. 
            Conecte-se com outros colecionadores e descubra novos modelos.
          </p>
          <div className="hero-cta">
            <button className="btn-cta btn-primary" onClick={() => navigate('/register')}>Começar Agora</button>
            <a href="#features" className="btn-cta btn-secondary">Saiba Mais</a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">1,200+</div>
              <div className="stat-label">Modelos Catalogados</div>
            </div>
            <div className="stat">
              <div className="stat-number">500+</div>
              <div className="stat-label">Colecionadores</div>
            </div>
            <div className="stat">
              <div className="stat-number">5,000+</div>
              <div className="stat-label">Itens na Plataforma</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="section-header">
          <div className="section-badge">Recursos</div>
          <h2 className="section-title">Tudo que você precisa em um só lugar</h2>
          <p className="section-subtitle">
            Ferramentas poderosas e intuitivas para gerenciar sua coleção de forma profissional
          </p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3 className="feature-title">Catálogo Completo</h3>
            <p className="feature-description">Organize sua coleção com filtros por ano, categoria e fabricante. Adicione fotos e informações detalhadas de cada modelo.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⭐</div>
            <h3 className="feature-title">Lista de Desejos</h3>
            <p className="feature-description">Mantenha uma lista dos modelos que deseja adquirir com prioridades e estimativas de preço.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3 className="feature-title">Rede Social</h3>
            <p className="feature-description">Conecte-se com outros colecionadores, compartilhe sua coleção e descubra novos modelos.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3 className="feature-title">Estatísticas</h3>
            <p className="feature-description">Acompanhe o crescimento da sua coleção com gráficos e relatórios detalhados.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3 className="feature-title">Busca Avançada</h3>
            <p className="feature-description">Encontre modelos específicos rapidamente com filtros poderosos e busca inteligente.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌙</div>
            <h3 className="feature-title">Interface Moderna</h3>
            <p className="feature-description">Design dark premium, responsivo e otimizado para todos os dispositivos.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="section-header">
          <div className="section-badge">Interface</div>
          <h2 className="section-title">Design pensado para colecionadores</h2>
          <p className="section-subtitle">Interface intuitiva e moderna que torna o gerenciamento da sua coleção uma experiência agradável</p>
        </div>
        <div className="screenshot-container">
          <div className="screenshot-placeholder">🖼️</div>
        </div>
      </section>

      <section id="about">
        <div className="section-header">
          <div className="section-badge">Sobre o Projeto</div>
          <h2 className="section-title">A História do Diecast Social</h2>
        </div>
        <div className="about-content">
          <img src={sobreMim} alt="Sobre mim" className="about-image" />
          <div className="about-text">
            <h3>Desenvolvido por um colecionador, para colecionadores</h3>
            <p>O Diecast Social nasceu como um projeto pessoal criado para facilitar o gerenciamento da minha própria coleção de miniaturas. Durante seu desenvolvimento, o projeto evoluiu e passou a ser o trabalho de conclusão de curso (TCC), recebendo melhorias e estrutura acadêmica.</p>
            <p>Após o TCC, o projeto continua sendo mantido e desenvolvido de forma pessoal — constantemente atualizado com novos recursos e ajustes com base no uso real e no feedback da comunidade de colecionadores e amigos.</p>
            <p>Esta iniciativa combina minha paixão por desenvolvimento de software e por Hot Wheels, criando uma ferramenta prática e em evolução que atende às necessidades dos colecionadores.</p>
            <ul className="about-list">
              <li>Interface moderna e intuitiva</li>
              <li>Ferramentas profissionais de catalogação</li>
              <li>Comunidade ativa de colecionadores</li>
              <li>Atualizações constantes com novos recursos</li>
            </ul>
            <p><strong>Lorenzo Berg</strong> - Desenvolvedor Full Stack e Colecionador<br />lorenzobegnozzi@hotmail.com</p>
          </div>
        </div>
      </section>

      <section>
        <div className="section-header">
          <div className="section-badge">Redes Sociais</div>
          <h2 className="section-title">Conecte-se Comigo</h2>
          <p className="section-subtitle">Acompanhe o desenvolvimento do projeto e fique por dentro das novidades</p>
        </div>
        <div className="social-links">
          <a href="#" className="social-link" title="GitHub">🐙</a>
          <a href="#" className="social-link" title="LinkedIn">💼</a>
          <a href="#" className="social-link" title="Instagram">📷</a>
          <a href="#" className="social-link" title="Twitter">🐦</a>
          <a href="#" className="social-link" title="Email">✉️</a>
        </div>
      </section>

      <section>
        <div className="cta-section">
          <h2>Pronto para organizar sua coleção?</h2>
          <p>Junte-se a centenas de colecionadores que já estão usando a plataforma</p>
          <button className="btn-cta-white" onClick={() => navigate('/register')}>Criar Conta Grátis</button>
        </div>
      </section>

      <footer>
        <div className="footer-content">
          <div className="footer-logo">Diecast <span style={{color:'#6366f1'}}>Social</span></div>
          <p className="footer-text">A plataforma completa para colecionadores de Hot Wheels</p>
          <div className="footer-links">
            <a href="#" className="footer-link">Sobre</a>
            <a href="#features" className="footer-link">Recursos</a>
            <a href="#" className="footer-link">Contato</a>
            <a href="#" className="footer-link">Privacidade</a>
            <a href="#" className="footer-link">Termos</a>
          </div>
          <div className="footer-bottom">© 2024 Diecast Social. Desenvolvido por Lorenzo Marzola Begnozzi</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
