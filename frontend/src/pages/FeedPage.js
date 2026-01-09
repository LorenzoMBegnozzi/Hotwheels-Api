import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../css/FeedPage.css';
import { toastError, toastSuccess } from '../utils/alerts';
import { createFeedPost, fetchFeedPosts, likeFeedPost, addFeedComment, deleteFeedPost } from '../utils/api';
import { isAuthenticated } from '../utils/auth';
import { resolveApiAssetUrl } from '../utils/constants';

const initialsFromName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return initials || 'U';
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

const FeedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [creating, setCreating] = useState(false);

  const [commentDrafts, setCommentDrafts] = useState({});
  const [openMenuPostId, setOpenMenuPostId] = useState(null);

  const currentUserId = localStorage.getItem('userId');
  const authorIdFilter = searchParams.get('userId') || '';

  const meName = useMemo(() => {
    // HomePage salva perfil no state, mas aqui o mínimo é puxar do localStorage se existir
    return localStorage.getItem('userName') || '';
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const data = await fetchFeedPosts(authorIdFilter ? { authorId: authorIdFilter } : undefined);
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      toastError('Erro', `${e?.message || 'Erro ao carregar feed'}${e?.status ? ` (${e.status})` : ''}`);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      toastError('Erro', 'Você precisa estar logado para acessar o Feed.');
      navigate('/login');
      return;
    }
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorIdFilter]);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPostText('');
    setPostImage(null);
  };

  const onPickImage = (e) => {
    const file = e?.target?.files?.[0];
    if (file) setPostImage(file);
  };

  const handleCreatePost = async (e) => {
    e?.preventDefault?.();
    if (!postImage) {
      toastError('Erro', 'Selecione uma foto para publicar.');
      return;
    }
    const caption = (postText || '').trim();

    try {
      setCreating(true);
      const created = await createFeedPost({ text: caption, imageFile: postImage });
      setPosts((prev) => [created, ...(prev || [])]);
      toastSuccess('Sucesso', 'Publicado!');
      closeModal();
    } catch (err) {
      toastError('Erro', `${err?.message || 'Erro ao publicar'}${err?.status ? ` (${err.status})` : ''}`);
    } finally {
      setCreating(false);
    }
  };

  const toggleLike = async (postId) => {
    try {
      const res = await likeFeedPost(postId);
      setPosts((prev) =>
        (prev || []).map((p) => {
          if (String(p._id) !== String(postId)) return p;
          const likedByMe = !!res?.liked;
          const likesCount = typeof res?.likesCount === 'number' ? res.likesCount : (p.likesCount || 0);
          return { ...p, likedByMe, likesCount };
        })
      );
    } catch (e) {
      toastError('Erro', `${e?.message || 'Erro ao curtir'}${e?.status ? ` (${e.status})` : ''}`);
    }
  };

  const setDraft = (postId, value) => {
    setCommentDrafts((prev) => ({ ...(prev || {}), [postId]: value }));
  };

  const submitComment = async (postId) => {
    const text = (commentDrafts?.[postId] || '').trim();
    if (!text) return;

    try {
      const updated = await addFeedComment(postId, text);
      setPosts((prev) => (prev || []).map((p) => (String(p._id) === String(postId) ? updated : p)));
      setDraft(postId, '');
    } catch (e) {
      toastError('Erro', `${e?.message || 'Erro ao comentar'}${e?.status ? ` (${e.status})` : ''}`);
    }
  };

  const toggleMenu = (postId) => {
    setOpenMenuPostId((prev) => (String(prev) === String(postId) ? null : postId));
  };

  const handleDeletePost = async (postId) => {
    try {
      await deleteFeedPost(postId);
      setPosts((prev) => (prev || []).filter((p) => String(p._id) !== String(postId)));
      setOpenMenuPostId(null);
      toastSuccess('Sucesso', 'Publicação excluída.');
    } catch (e) {
      toastError('Erro', `${e?.message || 'Erro ao excluir'}${e?.status ? ` (${e.status})` : ''}`);
    }
  };

  return (
    <div className="feed-page">
      <header className="feed-header">
        <div className="feed-logo">Diecast <span className="feed-logo-accent">Social Feed</span></div>
        <div className="feed-actions">
          <button className="feed-btn" onClick={() => navigate('/home')}>Home</button>
        </div>
      </header>

      <div className="feed-container">
        {!authorIdFilter ? (
          <div className="create-post">
            <div className="create-post-header">
              <div className="user-avatar">{initialsFromName(meName)}</div>
              <div className="post-input" onClick={openModal} role="button" tabIndex={0}>
                No que você está pensando?
              </div>
            </div>
            <div className="post-actions">
              <button className="post-action-btn" onClick={openModal} type="button">Foto</button>
              <button className="post-action-btn" onClick={openModal} type="button">Carrinho</button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="feed-loading">Carregando...</div>
        ) : posts.length === 0 ? (
          <div className="feed-empty">Nenhuma publicação ainda.</div>
        ) : (
          posts.map((post) => (
            <div key={post._id} className="post-card">
              <div className="post-header">
                <div className="post-author">
                  <div className="user-avatar">{initialsFromName(post?.author?.name)}</div>
                  <div className="author-info">
                    <div className="author-name">{post?.author?.name || 'Usuário'}</div>
                    <div className="post-time">{timeAgo(post?.createdAt)}</div>
                  </div>
                </div>

                {currentUserId && String(post?.author?._id || post?.author) === String(currentUserId) ? (
                  <div className="post-menu-wrap">
                    <button className="post-menu" type="button" onClick={() => toggleMenu(post._id)} aria-label="Menu">
                      ⋮
                    </button>
                    {String(openMenuPostId) === String(post._id) ? (
                      <div className="post-menu-dropdown">
                        <button
                          className="post-menu-item"
                          type="button"
                          onClick={() => handleDeletePost(post._id)}
                        >
                          Excluir publicação
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="post-content">
                <div className="post-text">{post.text}</div>
                {post.image ? (
                  <img
                    src={resolveApiAssetUrl(post.image)}
                    alt="Post"
                    className="post-image"
                    onClick={() => window.open(resolveApiAssetUrl(post.image), '_blank')}
                  />
                ) : null}
              </div>

              <div className="post-stats">
                <span>❤️ {post.likesCount || 0} curtidas</span>
                <span>{post.commentsCount || (post.comments ? post.comments.length : 0)} comentários</span>
              </div>

              <div className="post-actions-bar">
                <button
                  className={`action-btn ${post.likedByMe ? 'liked' : ''}`}
                  onClick={() => toggleLike(post._id)}
                  type="button"
                >
                  Curtir
                </button>
              </div>

              <div className="comments-section">
                <div className="comment-input-wrapper">
                  <div className="comment-avatar">{initialsFromName(meName)}</div>
                  <input
                    type="text"
                    className="comment-input"
                    placeholder="Escreva um comentário..."
                    value={commentDrafts?.[post._id] || ''}
                    onChange={(e) => setDraft(post._id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitComment(post._id);
                      }
                    }}
                  />
                  <button className="comment-btn" onClick={() => submitComment(post._id)} type="button">Enviar</button>
                </div>

                <div className="comments-list">
                  {(post.comments || []).map((c) => (
                    <div key={c._id} className="comment">
                      <div className="comment-avatar">{initialsFromName(c?.author?.name)}</div>
                      <div className="comment-content">
                        <div className="comment-author">{c?.author?.name || 'Usuário'}</div>
                        <div className="comment-text">{c.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={`feed-modal ${isModalOpen ? 'active' : ''}`} onClick={(e) => {
        if (e.target?.classList?.contains('feed-modal')) closeModal();
      }}>
        <div className="feed-modal-content">
          <div className="feed-modal-header">
            <h2 className="feed-modal-title">Criar Publicação</h2>
            <button className="feed-close" onClick={closeModal} type="button">✕</button>
          </div>

          <form onSubmit={handleCreatePost}>
            <div className="feed-form-group">
              <label className="feed-label">O que você quer compartilhar?</label>
              <textarea
                className="feed-textarea"
                placeholder="Descreva sua novidade, aquisição ou pensamento..."
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
              />
            </div>

            <div className="feed-form-group">
              <label className="feed-label">Adicionar Foto</label>
              <label className="feed-upload">
                <input type="file" accept="image/*" onChange={onPickImage} />
                <div className="feed-upload-title">Clique para adicionar uma imagem</div>
                {postImage ? <div className="feed-upload-sub">{postImage.name}</div> : null}
              </label>
            </div>

            <button className="feed-submit" type="submit" disabled={creating}>
              {creating ? 'Publicando...' : 'Publicar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
