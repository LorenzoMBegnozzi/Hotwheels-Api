import React from 'react';
import '../css/LandingPage.css';
import sobreMim from '../css/sobre-mim.jpeg';
import painelImg from '../css/painel.png';
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
          <div className="hero-badge">
            A Rede Social dos Colecionadores
          </div>
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
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M21 8V7l-9-4-9 4v1l9 4 9-4zM3 10.2v6.8l8 3.6 8-3.6v-6.8l-8 3.6-8-3.6z" />
              </svg>
            </div>
            <h3 className="feature-title">Catálogo Completo</h3>
            <p className="feature-description">Organize sua coleção com filtros por ano, categoria e fabricante. Adicione fotos e informações detalhadas de cada modelo.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 .587l3.668 7.431L24 9.748l-6 5.847L19.335 24 12 20.201 4.665 24 6 15.595 0 9.748l8.332-1.73L12 .587z" />
              </svg>
            </div>
            <h3 className="feature-title">Lista de Desejos</h3>
            <p className="feature-description">Mantenha uma lista dos modelos que deseja adquirir com prioridades e estimativas de preço.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm-8 0c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3zm0 2c-2.667 0-8 1.333-8 4v3h14v-3c0-2.667-5.333-4-6-4zm8 0c-.29 0-.63.02-1 .06 1.16.84 2 2 2 3.94v3h6v-3c0-2.667-5.333-4-7-4z" />
              </svg>
            </div>
            <h3 className="feature-title">Rede Social</h3>
            <p className="feature-description">Conecte-se com outros colecionadores, compartilhe sua coleção e descubra novos modelos.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 3v18h18v-2H5V3H3zm6 8h2v7H9v-7zm4-4h2v11h-2V7zm4 6h2v5h-2v-5z" />
              </svg>
            </div>
            <h3 className="feature-title">Estatísticas</h3>
            <p className="feature-description">Acompanhe o crescimento da sua coleção com gráficos e relatórios detalhados.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M11 4a7 7 0 105.292 11.708l4.5 4.5 1.414-1.414-4.5-4.5A7 7 0 0011 4zm0 2a5 5 0 110 10A5 5 0 0111 6z" fill="currentColor" />
              </svg>
            </div>
            <h3 className="feature-title">Busca Avançada</h3>
            <p className="feature-description">Encontre modelos específicos rapidamente com filtros poderosos e busca inteligente.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </div>
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
          <img src={painelImg} alt="Painel" className="screenshot-placeholder" />
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
            <p><strong>Lorenzo Marzola Begnozzi</strong> - Desenvolvedor Full Stack e Colecionador<br />lorenzobegnozzi@hotmail.com</p>
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
          <a href="https://github.com/LorenzoMBegnozzi" className="social-link" title="GitHub" aria-label="GitHub" target="_blank" rel="noopener noreferrer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0.5C5.37 0.5 0 5.87 0 12.5C0 17.86 3.438 22.36 8.205 23.98C8.805 24.09 9.025 23.73 9.025 23.42C9.025 23.14 9.015 22.39 9.01 21.39C5.672 22.09 4.968 19.78 4.968 19.78C4.422 18.36 3.633 17.97 3.633 17.97C2.545 17.21 3.715 17.23 3.715 17.23C4.922 17.31 5.56 18.46 5.56 18.46C6.64 20.3 8.375 19.8 9.05 19.5C9.16 18.72 9.47 18.18 9.82 17.86C7.145 17.55 4.344 16.48 4.344 11.72C4.344 10.37 4.824 9.27 5.605 8.41C5.48 8.09 5.06 6.84 5.72 5.14C5.72 5.14 6.72 4.8 9.01 6.36C9.95 6.07 10.96 5.93 11.98 5.93C13 5.93 14.01 6.07 14.95 6.36C17.23 4.8 18.23 5.14 18.23 5.14C18.9 6.84 18.48 8.09 18.36 8.41C19.145 9.27 19.62 10.37 19.62 11.72C19.62 16.49 16.815 17.54 14.135 17.85C14.58 18.25 15 19.03 15 20.19C15 21.78 14.985 22.98 14.985 23.42C14.985 23.73 15.2 24.1 15.81 23.98C20.58 22.36 24 17.86 24 12.5C24 5.87 18.63 0.5 12 0.5Z" />
            </svg>
          </a>
          <a href="https://www.linkedin.com/in/lorenzo-marzola-begnozzi-764732227/" className="social-link" title="LinkedIn" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.98 3.5C4.98 4.88 3.86 6 2.48 6C1.1 6 0 4.88 0 3.5C0 2.12 1.12 1 2.5 1C3.88 1 4.98 2.12 4.98 3.5ZM0.5 8.5H4.5V23.5H0.5V8.5ZM8.5 8.5H12.26V10.32H12.33C12.98 9.24 14.45 8.1 16.66 8.1C21.02 8.1 22 10.86 22 15.06V23.5H18V15.98C18 13.88 17.96 11.26 15.06 11.26C12.12 11.26 11.66 13.44 11.66 15.82V23.5H7.66V8.5H8.5Z" />
            </svg>
          </a>
          <a href="https://www.instagram.com/lorenzo_berg_/" className="social-link" title="Instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
            </svg>
          </a>
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
            <button type="button" className="footer-link" onClick={() => navigate('/about')}>Sobre</button>
            <a href="#features" className="footer-link">Recursos</a>
            <button type="button" className="footer-link" onClick={() => navigate('/contact')}>Contato</button>
            <button type="button" className="footer-link" onClick={() => navigate('/privacy')}>Privacidade</button>
            <button type="button" className="footer-link" onClick={() => navigate('/terms')}>Termos</button>
          </div>
          <div className="footer-bottom">© 2024 Diecast Social. Desenvolvido por Lorenzo Marzola Begnozzi</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
