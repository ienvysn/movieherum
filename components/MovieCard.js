import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { useState } from 'react';

export default function MovieCard({ id, title, poster_url, genre, cinemaCount, minPrice, duration }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const displayGenre = genre ? genre.split(',')[0].trim() : 'Movie';


  const displayDuration = duration || "Runtime N/A";



  return (
    <Link href={`/movie/${id}`} className="movie-card group">
      <div className="card-image-wrapper">
        {!imageLoaded && <div className="image-skeleton" />}

        <img
          src={poster_url || '/placeholder-poster.jpg'}
          alt={`${title} Poster`}
          className={`card-image ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />


        <div className="card-gradient"></div>

        <div className="hover-arrow">
          <ArrowUpRight size={20} strokeWidth={2.5} />
        </div>
      </div>

      <div className="card-content">
        <h3 className="card-title line-clamp-1" title={title}>{title}</h3>

        <div className="card-meta flex items-center gap-3 text-muted text-small mt-2">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {displayDuration}
          </span>
          <span className="meta-dot">•</span>
          <span className="card-genre">{displayGenre}</span>
        </div>


      </div>

      <style jsx>{`
        .movie-card {
          display: flex;
          flex-direction: column;
          background-color: transparent;
          border-radius: var(--radius-xl);
          overflow: hidden;
          position: relative;
          transition: transform 0.3s ease;
          cursor: pointer;
        }

        .movie-card:hover {
          transform: translateY(-4px);
        }

        .card-image-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 2 / 3.2; /* Taller poster aspect ratio */
          overflow: hidden;
          background-color: var(--color-neutral-200);
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-neutral-400);
        }

        .image-skeleton {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, var(--color-neutral-200) 25%, var(--color-neutral-300) 50%, var(--color-neutral-200) 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.5s ease;
        }

        .card-image.loaded {
          opacity: 1;
        }

        .card-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(to top, rgba(10, 10, 11, 0.95) 0%, rgba(10, 10, 11, 0.4) 60%, transparent 100%);
          z-index: 10;
          transition: height 0.3s ease, background 0.3s ease;
        }

        .hover-arrow {
          position: absolute;
          top: var(--sp-4);
          right: var(--sp-4);
          background-color: rgba(10, 10, 11, 0.6);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          color: var(--color-neutral-1000);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.8) translate(-4px, 4px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 20;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .movie-card:hover .hover-arrow {
          opacity: 1;
          transform: scale(1) translate(0, 0);
          background-color: var(--color-accent-400);
          color: var(--color-neutral-0);
          border-color: transparent;
        }

        .card-content {
          padding: var(--sp-4) var(--sp-2) 0 var(--sp-2);
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-neutral-1000);
          letter-spacing: -0.2px;
        }

        .meta-dot {
          opacity: 0.5;
        }

        .card-genre {
          color: var(--color-neutral-700);
        }

        .text-neutral-900 {
          color: var(--color-neutral-900);
        }

        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </Link>
  );
}
