/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileText, Calendar, Clock, ArrowRight, Search, Tag,
  X, Heart, Share2, User, RefreshCw
} from 'lucide-react';
import { BLOG_POSTS } from '../data';
import { BlogPost } from '../types';
import BlogCard from './BlogCard';

const CATEGORIES = ['Todos', 'Legislación', 'Comunidad', 'Medio Ambiente'];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Blog() {
  const [posts, setPosts] = React.useState<BlogPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeCategory, setActiveCategory] = React.useState<string>('Todos');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedPost, setSelectedPost] = React.useState<BlogPost | null>(null);
  const [newsletterEmail, setNewsletterEmail] = React.useState('');
  const [newsletterStatus, setNewsletterStatus] = React.useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [newsletterMsg, setNewsletterMsg] = React.useState('');

  React.useEffect(() => {
    const normalize = (raw: unknown): BlogPost[] => {
      const list = Array.isArray(raw) ? raw : [];
      return list.map((p) => {
        let tags: string[] = [];
        if (Array.isArray(p?.tags)) tags = p.tags.filter((t: unknown) => typeof t === 'string');
        else if (typeof p?.tags === 'string') {
          try {
            const parsed = JSON.parse(p.tags);
            if (Array.isArray(parsed)) tags = parsed.filter((t: unknown) => typeof t === 'string');
          } catch { tags = []; }
        }
        return { ...p, tags };
      });
    };
    fetch('/api/posts')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const posts = normalize(data);
        setPosts(posts.length ? posts : BLOG_POSTS);
      })
      .catch(() => setPosts(BLOG_POSTS))
      .finally(() => setLoading(false));
  }, []);

  const featuredPost = posts.find((p) => p.id === posts[0]?.id);
  const regularPosts = posts.filter((p) => p.id !== featuredPost?.id);

  const filteredPosts = regularPosts.filter((post) => {
    const matchesCategory = activeCategory === 'Todos' || post.category === activeCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { Todos: posts.length };
    posts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [posts]);

  const recentPosts = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section — paleta manual de marca (prueba) */}
      <section className="bg-[#1C5060] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl space-y-6">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold tracking-[0.2em] uppercase px-3 py-1 rounded-full backdrop-blur-sm">
              Blog Informativo
            </span>
            <h1 className="text-4xl font-bold font-serif leading-tight sm:text-5xl">
              Blog Informativo
            </h1>
            <p className="text-lg text-white/85 leading-relaxed">
              Mantente informado sobre nuestra labor legislativa, los avances en proyectos de ley y las iniciativas que impulsan el desarrollo de Antioquia y Colombia. Cada publicación refleja nuestro compromiso con la evidencia, el rigor técnico y la cercanía con la comunidad.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Search and Filter Bar */}
        <div className="mb-10 space-y-4">
          {/* Search Input */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar artículos por título, contenido o etiqueta..."
              className="w-full bg-white border border-neutral-200 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-xl pl-12 pr-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary/30 hover:text-primary hover:bg-primary-light/30'
                }`}
              >
                {cat}
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  activeCategory === cat ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {categoryCounts[cat] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">

          {/* Main Column */}
          <div className="lg:col-span-8 space-y-8">

            {/* Featured Post */}
            {featuredPost && (
              <article className="group bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="grid md:grid-cols-2">
                  {/* Featured Image */}
                  <div className="relative h-64 md:h-auto overflow-hidden">
                    <img
                      src={featuredPost.image || '/blog-placeholder.jpg'}
                      alt={featuredPost.title}
                      width={1200}
                      height={630}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center gap-1 bg-primary/90 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-sm">
                        <Tag className="h-3 w-3" />
                        {featuredPost.category}
                      </span>
                    </div>
                  </div>

                  {/* Featured Content */}
                  <div className="p-8 md:p-10 flex flex-col justify-between">
                    <div className="space-y-5">
                      <div className="flex items-center gap-4 text-xs text-neutral-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(featuredPost.date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          5 min lectura
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {featuredPost.author}
                        </span>
                      </div>

                      <h2 className="text-2xl font-bold font-serif text-neutral-900 group-hover:text-primary transition-colors leading-tight">
                        {featuredPost.title}
                      </h2>

                      <p className="text-neutral-600 text-sm leading-relaxed">
                        {featuredPost.excerpt}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {featuredPost.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center justify-between">
                      <button
                        onClick={() => setSelectedPost(featuredPost)}
                        className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark transition-colors group/icon"
                      >
                        Leer artículo completo
                        <ArrowRight className="h-4 w-4 transform group-hover/icon:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* Posts Grid */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold font-serif text-neutral-900">
                  Artículos Recientes
                </h3>
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setActiveCategory('Todos'); }}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Restablecer filtros
                  </button>
                )}
              </div>

              {filteredPosts.length === 0 ? (
                <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl">
                  <Search className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                  <h4 className="text-lg font-bold text-neutral-700 mb-2">No se encontraron artículos</h4>
                  <p className="text-sm text-neutral-500">
                    Intenta con otros términos de búsqueda o selecciona otra categoría.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {filteredPosts.map((post) => (
                    <BlogCard
                      key={post.id}
                      post={post}
                      onClick={() => setSelectedPost(post)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">

            {/* Recent Posts */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-neutral-900 font-serif mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Publicaciones Recientes
              </h4>
              <div className="space-y-0">
                {recentPosts.map((post, index) => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                      index < recentPosts.length - 1 ? 'border-b border-neutral-100' : ''
                    } hover:bg-neutral-50`}
                  >
                    <img
                      src={post.image || '/blog-placeholder.jpg'}
                      alt={post.title}
                      width={56}
                      height={56}
                      loading="lazy"
                      className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-neutral-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDateShort(post.date)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Cloud */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-neutral-900 font-serif mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Etiquetas Populares
              </h4>
              <div className="flex flex-wrap gap-2">
                {['Legislación', 'Medio Ambiente', 'Comunidad', 'Agua', 'Antioquia', 'PSA', 'Comisión Quinta', 'Energía', 'Bosques', 'Participación'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="inline-flex items-center gap-1 bg-neutral-50 text-neutral-600 text-xs font-medium px-3 py-1.5 rounded-full border border-neutral-200 hover:border-primary hover:text-primary hover:bg-primary-light/20 transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-[#1C5060] text-white rounded-xl p-6 shadow-sm">
              <h4 className="text-sm font-bold font-serif mb-2">Boletín Informativo</h4>
              <p className="text-xs text-white/85 mb-4 leading-relaxed">
                Recibe actualizaciones sobre nuestra labor legislativa y los avances en proyectos clave.
              </p>
              <form
                className="space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (newsletterStatus === 'loading') return;
                  setNewsletterStatus('loading');
                  setNewsletterMsg('');
                  try {
                    const r = await fetch('/api/newsletter/subscribe', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: newsletterEmail, source: 'blog-sidebar' }),
                    });
                    const data = await r.json().catch(() => ({}));
                    if (r.status === 201 || r.status === 200) {
                      setNewsletterStatus('ok');
                      setNewsletterMsg('¡Gracias por suscribirte!');
                      setNewsletterEmail('');
                    } else if (r.status === 409 || data.already) {
                      setNewsletterStatus('ok');
                      setNewsletterMsg('Este correo ya está suscrito. ¡Gracias!');
                    } else {
                      setNewsletterStatus('error');
                      setNewsletterMsg(data.error || 'No fue posible registrar la suscripción.');
                    }
                  } catch {
                    setNewsletterStatus('error');
                    setNewsletterMsg('Error de conexión. Intente más tarde.');
                  }
                }}
              >
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Tu correo electrónico"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={newsletterStatus === 'loading'}
                  className="w-full bg-white text-[#1C5060] text-sm font-bold rounded-lg px-4 py-2.5 hover:bg-white/90 transition-colors disabled:opacity-60"
                >
                  {newsletterStatus === 'loading' ? 'Enviando…' : 'Suscribirse'}
                </button>
                {newsletterMsg && (
                  <p
                    role="status"
                    className={`text-xs leading-relaxed ${newsletterStatus === 'ok' ? 'text-white' : 'text-amber-200'}`}
                  >
                    {newsletterMsg}
                  </p>
                )}
              </form>
            </div>
          </aside>
        </div>
      </main>

      {/* Modal: Post Detail */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/70 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header Image */}
            <div className="relative h-64 overflow-hidden rounded-t-2xl">
              <img
                src={selectedPost.image || '/blog-placeholder.jpg'}
                alt={selectedPost.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="inline-flex items-center gap-1 bg-primary/90 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-sm mb-3">
                  <Tag className="h-3 w-3" />
                  {selectedPost.category}
                </span>
                <h3 className="text-2xl font-bold font-serif text-white leading-tight">
                  {selectedPost.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 space-y-6">

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(selectedPost.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  5 min lectura
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {selectedPost.author}
                </span>
              </div>

              {/* Excerpt / Content */}
              <div className="prose max-w-none">
                <p className="text-lg text-neutral-700 leading-relaxed">
                  {selectedPost.excerpt}
                </p>
                <p className="text-neutral-600 leading-relaxed mt-4">
                  {selectedPost.content || selectedPost.excerpt}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {selectedPost.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-700 text-xs font-semibold px-3 py-1 rounded-full">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
                <button className="inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors">
                  <FileText className="h-4 w-4" />
                  Descargar PDF
                </button>
                <button className="inline-flex items-center gap-2 bg-neutral-100 text-neutral-700 text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-neutral-200 transition-colors">
                  <Share2 className="h-4 w-4" />
                  Compartir
                </button>
                <button className="inline-flex items-center gap-2 text-neutral-500 hover:text-red-500 transition-colors ml-auto">
                  <Heart className="h-4 w-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
