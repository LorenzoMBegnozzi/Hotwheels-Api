import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toastSuccess, toastError } from '../utils/alerts';
import { useNavigate } from "react-router-dom";
import { logout } from '../utils/auth';
import "../css/ProfilePage.css";
import { DEFAULT_PROFILE_IMAGE, resolveApiAssetUrl } from "../utils/constants";
import { api, addFeedComment, deleteFeedPost, fetchFeedPosts, likeFeedPost } from '../utils/api';

const DEFAULT_USER_IMG = DEFAULT_PROFILE_IMAGE;

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // publicações (feed)
  const [myPosts, setMyPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  const [activePost, setActivePost] = useState(null);
  const [activePostComment, setActivePostComment] = useState('');

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      try {
        let token = localStorage.getItem("token");
        if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;

        const response = await api.get(`/api/auth/profile`, {
          headers: token ? { Authorization: token } : {},
        });

        const profile = response.data;
        setUser(profile);

        // buscar contagens: coleção e wishlist (endpoints exigem auth)
        let collectionCount = 0;
        try {
          const colRes = await api.get(`/api/collection/${profile._id}`, {
            headers: token ? { Authorization: token } : {},
          });
          collectionCount = Array.isArray(colRes.data?.collection) ? colRes.data.collection.length : 0;
        } catch (e) {
          collectionCount = 0;
        }

        let wishlistCount = 0;
        try {
          const wishRes = await api.get(`/api/wishlist`, {
            headers: token ? { Authorization: token } : {},
          });
          wishlistCount = Array.isArray(wishRes.data?.favorites) ? wishRes.data.favorites.length : 0;
        } catch (e) {
          wishlistCount = 0;
        }

        // calcular monthsActive a partir do ObjectId timestamp (primeiros 8 chars)
        let monthsActive = 0;
        try {
          const ts = parseInt(String(profile._id).substring(0, 8), 16) * 1000;
          const created = new Date(ts);
          const now = new Date();
          monthsActive = Math.max(0, (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth()));
        } catch (e) {
          monthsActive = 0;
        }

        // atualizar user com estatísticas
        setUser((prev) => ({ ...(prev || {}), collectionCount, wishlistCount, monthsActive }));

        // carregar minhas publicações (modo "perfil estilo instagram")
        try {
          setIsLoadingPosts(true);
          const posts = await fetchFeedPosts({ authorId: profile._id });
          setMyPosts(Array.isArray(posts) ? posts : []);
        } catch (e) {
          setMyPosts([]);
        } finally {
          setIsLoadingPosts(false);
        }

      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    };

    fetchProfileAndStats();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const timeAgo = (dt) => {
    try {
      const d = new Date(dt);
      const diffMs = Date.now() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Agora';
      if (mins < 60) return `Há ${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
      const days = Math.floor(hours / 24);
      return `Há ${days} dia${days > 1 ? 's' : ''}`;
    } catch (e) {
      return '';
    }
  };

  const openPostModal = (post) => {
    setActivePost(post || null);
    setActivePostComment('');
  };

  const closePostModal = () => {
    setActivePost(null);
    setActivePostComment('');
  };

  const syncPostInGrid = (updatedPost) => {
    if (!updatedPost?._id) return;
    setMyPosts((prev) => (prev || []).map((p) => (String(p._id) === String(updatedPost._id) ? updatedPost : p)));
  };

  const toggleLikeActivePost = async () => {
    if (!activePost?._id) return;
    try {
      const res = await likeFeedPost(activePost._id);
      const likedByMe = !!res?.liked;
      const likesCount = typeof res?.likesCount === 'number' ? res.likesCount : (activePost.likesCount || 0);
      const next = { ...activePost, likedByMe, likesCount };
      setActivePost(next);
      syncPostInGrid(next);
    } catch (e) {
      toastError('Erro', e?.message || 'Erro ao curtir');
    }
  };

  const submitActivePostComment = async (e) => {
    e?.preventDefault?.();
    if (!activePost?._id) return;
    const text = (activePostComment || '').trim();
    if (!text) return;

    try {
      const updated = await addFeedComment(activePost._id, text);
      setActivePost(updated);
      syncPostInGrid(updated);
      setActivePostComment('');
    } catch (err) {
      toastError('Erro', err?.message || 'Erro ao comentar');
    }
  };

  const deleteActivePost = async () => {
    if (!activePost?._id) return;

    const res = await Swal.fire({
      title: 'Excluir publicação?',
      text: 'Essa ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });

    if (!res.isConfirmed) return;

    try {
      await deleteFeedPost(activePost._id);
      setMyPosts((prev) => (prev || []).filter((p) => String(p._id) !== String(activePost._id)));
      closePostModal();
      toastSuccess('Sucesso', 'Publicação excluída.');
    } catch (e) {
      toastError('Erro', e?.message || 'Erro ao excluir publicação');
    }
  };

  if (!user) return <p className="profile-loading">Carregando...</p>;

  const initials =
    (user?.name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="hw-header">
        <div className="hw-logo">
          <div className="hw-logo-text">
            Diecast <span className="hw-logo-accent">Social</span>
          </div>
        </div>

        <div className="hw-header-actions">
          <button className="hw-btn hw-btn-ghost" onClick={() => navigate("/home")}>
            Home
          </button>

          <button
            className="hw-btn hw-btn-ghost hw-btn-icon"
            type="button"
            onClick={() => navigate("/profile/settings")}
            aria-label="Configurações"
            title="Configurações"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.23 7.23 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 12.9 1h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L1.71 7.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.39.32.64.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.25.1.51.01.64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM11 15.5A3.5 3.5 0 1 1 11 8.5a3.5 3.5 0 0 1 0 7z" />
            </svg>
          </button>

          <button className="hw-btn hw-btn-danger" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="hw-container">
        {/* Profile Header */}
        <section className="hw-profile-header">
          <div className="hw-avatar-wrap">
            <img
              src={user?.profilePicture || DEFAULT_USER_IMG}
              alt={user.name}
              className="hw-avatar-img"
              width="160"
              height="160"
              decoding="async"
              fetchpriority="high"
              onError={(e) => (e.currentTarget.src = DEFAULT_USER_IMG)}
            />
            <div className="hw-avatar-fallback" aria-hidden="true">
              {initials}
            </div>
          </div>

          <div className="hw-profile-info">
            <h1 className="hw-profile-name">{user.name}</h1>
            <p className="hw-profile-email">{user.email}</p>

            <div className="hw-stats">
              <div className="hw-stat">
                <div className="hw-stat-value">{user.collectionCount ?? (user.collection ? user.collection.length : 0)}</div>
                <div className="hw-stat-label">Coleção</div>
              </div>
              <div className="hw-stat">
                <div className="hw-stat-value">{user.wishlistCount ?? (user.favorites ? user.favorites.length : 0)}</div>
                <div className="hw-stat-label">Desejos</div>
              </div>
              <div className="hw-stat">
                <div className="hw-stat-value">{user.monthsActive ?? 0}</div>
                <div className="hw-stat-label">Meses Ativo</div>
              </div>

              <div className="hw-stat">
                <div className="hw-stat-value">{user.followersCount ?? 0}</div>
                <div className="hw-stat-label">Seguidores</div>
              </div>
              <div className="hw-stat">
                <div className="hw-stat-value">{user.followingCount ?? 0}</div>
                <div className="hw-stat-label">Seguindo</div>
              </div>
              <div className="hw-stat">
                <div className="hw-stat-value">{user.friendsCount ?? 0}</div>
                <div className="hw-stat-label">Amigos</div>
              </div>
            </div>

          </div>
        </section>

        {/* Publicações (minhas) */}
        <section className="hw-profile-posts">
          <div className="hw-section-title-row">
            <h2 className="hw-section-title">Publicações</h2>
            <div className="hw-section-subtitle">{Array.isArray(myPosts) ? myPosts.length : 0}</div>
          </div>

          {isLoadingPosts ? (
            <div className="hw-muted">Carregando publicações...</div>
          ) : !myPosts || myPosts.length === 0 ? (
            <div className="hw-empty">Você ainda não publicou nada.</div>
          ) : (
            <div className="hw-posts-grid">
              {myPosts.map((post) => {
                const commentsCount = post?.commentsCount || (Array.isArray(post?.comments) ? post.comments.length : 0);
                const likesCount = post?.likesCount || 0;
                return (
                  <button
                    key={post._id}
                    type="button"
                    className="hw-post-tile"
                    onClick={() => openPostModal(post)}
                    aria-label="Abrir publicação"
                  >
                    {post?.image ? (
                      <img
                        src={resolveApiAssetUrl(post.image)}
                        alt="Publicação"
                        className="hw-post-thumb"
                        loading="lazy"
                        decoding="async"
                        fetchpriority="low"
                      />
                    ) : (
                      <div className="hw-post-text">
                        <div className="hw-post-text-inner">{post?.text || ''}</div>
                      </div>
                    )}

                    <div className="hw-post-overlay" aria-hidden="true">
                      <span>{likesCount} curtidas</span>
                      <span>{commentsCount} comentários</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {activePost ? (
          <div className="hw-modal-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePostModal();
          }}>
            <div className="hw-modal">
              <div className="hw-modal-media">
                {activePost?.image ? (
                  <img
                    src={resolveApiAssetUrl(activePost.image)}
                    alt="Publicação"
                    className="hw-modal-image"
                    decoding="async"
                    fetchpriority="high"
                    onClick={() => window.open(resolveApiAssetUrl(activePost.image), '_blank')}
                  />
                ) : null}
              </div>

              <div className="hw-modal-side">
                <div className="hw-modal-head">
                  <div className="hw-modal-title">{activePost?.author?.name || user?.name || 'Você'}</div>
                  <div className="hw-modal-head-right">
                    <div className="hw-modal-subtitle">{timeAgo(activePost?.createdAt)}</div>
                    <button className="hw-modal-close" type="button" onClick={closePostModal} aria-label="Fechar">
                      ×
                    </button>
                  </div>
                </div>

                {String(activePost?.text || '').trim() ? (
                  <div className="hw-modal-caption">{activePost.text}</div>
                ) : null}

                <div className="hw-modal-stats">
                  <div className="hw-modal-stats-left">
                    <button
                      type="button"
                      className={`hw-like-btn ${activePost?.likedByMe ? 'liked' : ''}`}
                      onClick={toggleLikeActivePost}
                    >
                      Curtir
                    </button>

                    <button
                      type="button"
                      className="hw-danger-btn"
                      onClick={deleteActivePost}
                    >
                      Excluir
                    </button>
                  </div>
                  <div className="hw-modal-stats-right">
                    <span>{activePost?.likesCount || 0} curtidas</span>
                    <span>{activePost?.commentsCount || (Array.isArray(activePost?.comments) ? activePost.comments.length : 0)} comentários</span>
                  </div>
                </div>

                <div className="hw-modal-comments">
                  {(activePost?.comments || []).length === 0 ? (
                    <div className="hw-muted">Nenhum comentário ainda.</div>
                  ) : (
                    (activePost.comments || []).map((c) => (
                      <div key={c._id} className="hw-comment">
                        <div className="hw-comment-name">{c?.author?.name || 'Usuário'}</div>
                        <div className="hw-comment-text">{c?.text || ''}</div>
                      </div>
                    ))
                  )}
                </div>

                <form className="hw-modal-commentbox" onSubmit={submitActivePostComment}>
                  <input
                    className="hw-input"
                    type="text"
                    placeholder="Escreva um comentário..."
                    value={activePostComment}
                    onChange={(e) => setActivePostComment(e.target.value)}
                  />
                  <button className="hw-btn hw-btn-primary" type="submit">
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}

      </main>
    </div>
  );
};

export default ProfilePage;
