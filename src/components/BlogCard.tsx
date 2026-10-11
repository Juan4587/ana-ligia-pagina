/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card de publicación del blog — puramente presentacional.
 * Se usa en Blog (Artículos Recientes) y en Inicio (Últimas publicaciones).
 */

import { Calendar, Clock, ArrowRight, Tag, Heart, Share2 } from 'lucide-react';
import { BlogPost } from '../types';

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface BlogCardProps {
  key?: string | number;
  post: BlogPost;
  onClick?: () => void;
}

export default function BlogCard({ post, onClick }: BlogCardProps) {
  return (
    <article
      className="group bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={post.image || '/blog-placeholder.jpg'}
          alt={post.title}
          width={1200}
          height={630}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 bg-white/90 text-neutral-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm">
            <Tag className="h-2.5 w-2.5" />
            {post.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateShort(post.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            3 min
          </span>
        </div>

        <h4 className="text-base font-bold font-serif text-neutral-900 group-hover:text-primary transition-colors leading-snug line-clamp-2">
          {post.title}
        </h4>

        <p className="text-sm text-neutral-600 leading-relaxed line-clamp-3">
          {post.excerpt}
        </p>

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-medium">{post.author}</span>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-full text-neutral-400 hover:text-primary hover:bg-primary-light/20 transition-colors">
              <Heart className="h-3.5 w-3.5" />
            </button>
            <button className="p-1.5 rounded-full text-neutral-400 hover:text-primary hover:bg-primary-light/20 transition-colors">
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <button className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark transition-colors group/btn">
          Ver más
          <ArrowRight className="h-3 w-3 transform group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </article>
  );
}
