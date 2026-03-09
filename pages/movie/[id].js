import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { format, parseISO, isSameDay, addDays, startOfDay } from 'date-fns';
import { ArrowLeft, MapPin, Clock, Calendar, Users, ChevronDown, ChevronUp, Star } from 'lucide-react';
import Link from 'next/link';
import Head from 'next/head';
import ShowtimeCard from '../../components/ShowtimeCard';

export async function getServerSideProps({ params }) {
  const { id } = params;

  // Fetch Movie
  const { data: movie, error: movieError } = await supabase
    .from('movies')
    .select('*')
    .eq('id', id)
    .single();

  if (movieError || !movie) {
    return { notFound: true };
  }

  // Fetch Showtimes
  const { data: showtimes, error: showtimeError } = await supabase
    .from('showtimes')
    .select('*')
    .eq('movie_id', id);

  let cinemas = [];
  if (showtimes && showtimes.length > 0) {
    const cinemaIds = [...new Set(showtimes.map(s => s.cinema_id))];
    const { data: cinemaData } = await supabase
      .from('cinemas')
      .select('*')
      .in('id', cinemaIds);
    cinemas = cinemaData || [];
  }

  return {
    props: {
      movie,
      showtimes: showtimes || [],
      cinemas,
    },
  };
}

export default function MovieDetail({ movie, showtimes, cinemas }) {
  // Generate the next 4 days for filtering
  const filterDates = useMemo(() => {
    const today = startOfDay(new Date());
    return [0, 1, 2, 3].map(offset => addDays(today, offset));
  }, []);

  const [selectedDate, setSelectedDate] = useState(filterDates[0]);

  // Group showtimes by chain, then by mall for the selected date
  const groupedByChain = useMemo(() => {
    const filteredShowtimes = showtimes.filter(s => {
      const stDate = parseISO(s.start_time);
      return isSameDay(stDate, selectedDate);
    });

    const chains = {};

    filteredShowtimes.forEach(st => {
      const cinema = cinemas.find(c => c.id === st.cinema_id);
      if (!cinema) return;

      const chainName = cinema.chain_name || cinema.mall_name?.split('-')[0]?.trim() || "Independent Cinemas";
      const mallName = cinema.mall_name || "Unknown Location";

      if (!chains[chainName]) {
        chains[chainName] = { name: chainName, malls: {} };
      }

      if (!chains[chainName].malls[mallName]) {
        chains[chainName].malls[mallName] = { name: mallName, showtimes: [] };
      }

      chains[chainName].malls[mallName].showtimes.push(st);
    });

    // Sort times within each mall, and convert malls to array
    Object.values(chains).forEach(chain => {
      const mallsArray = Object.values(chain.malls);
      mallsArray.forEach(mall => {
        mall.showtimes.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      });
      // Sort malls alphabetically
      chain.mallsList = mallsArray.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Sort chains alphabetically
    return Object.values(chains).sort((a, b) => a.name.localeCompare(b.name));
  }, [showtimes, selectedDate, cinemas]);

  // Keep track of which chains are expanded (default all expanded)
  const [expandedChains, setExpandedChains] = useState({});

  // Initialize expanded state when groupedByChain changes
  useMemo(() => {
    const initialExpanded = {};
    groupedByChain.forEach(chain => {
      initialExpanded[chain.name] = true;
    });
    setExpandedChains(initialExpanded);
  }, [groupedByChain]);

  const toggleChain = (chainName) => {
    setExpandedChains(prev => ({ ...prev, [chainName]: !prev[chainName] }));
  };

  // --- Dynamic Data from TMDB ---
  const duration = movie.duration || "Runtime N/A";
  const releaseDate = movie.release_date || "Release Date N/A";
  const synopsis = movie.synopsis || "No synopsis available for this movie yet.";
  const director = movie.director || "Not Specified";
  const cast = movie.cast || "Not Specified";
  // -------------------------------------

  const rating = movie.rating ? movie.rating.toFixed(1) : "N/A";

  const displayGenres = movie.genre ? movie.genre.split(',').map(g => g.trim()) : [];

  return (
    <div className="movie-detail-page">
      <Head>
        <title>{movie.title} - Cinemax Showtimes</title>
      </Head>

      {/* Hero Section with Blur Background aligned with Image 3 */}
      <section className="hero-banner">
        <div
          className="hero-blur-bg"
          style={{ backgroundImage: `url(${movie.poster_url || '/placeholder-poster.jpg'})` }}
        />
        <div className="hero-gradient-overlay" />

        <div className="container relative z-10 hero-content-wrapper">
          <Link href="/" className="back-link flex items-center gap-2 text-small mb-6">
            <ArrowLeft size={16} />
            Back to movies
          </Link>

          <div className="hero-content gap-8">
            <div className="poster-container">
              <img
                src={movie.poster_url || '/placeholder-poster.jpg'}
                alt={movie.title}
                className="detail-poster"
              />
            </div>

            <div className="detail-info">
              <h1 className="detail-title">{movie.title}</h1>

              <div className="detail-meta flex flex-wrap items-center gap-4 mt-2 mb-4 text-small font-medium text-neutral-500">
                <span className="flex items-center gap-1 text-accent-500">
                  <Star size={16} fill="currentColor" /> <span className="text-neutral-300">{rating}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={16} /> {duration}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={16} /> {releaseDate}
                </span>
                <span className="meta-badge">PG-13</span>
              </div>

              {displayGenres.length > 0 && (
                <div className="flex gap-2 mb-6">
                  {displayGenres.map(g => (
                    <span key={g} className="genre-pill">{g}</span>
                  ))}
                </div>
              )}

              <p className="detail-synopsis mb-6 text-neutral-400">{synopsis}</p>

              <div className="detail-credits text-small text-neutral-500">
                <p className="mb-1"><strong className="text-neutral-1000 font-semibold">Director:</strong> {director}</p>
                <p><strong className="text-neutral-1000 font-semibold">Cast:</strong> {cast}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showtimes & Dates Content aligned with Image 2 */}
      <section className="container mt-12 mb-16">
        <div className="date-filter-section mb-10">
          <div className="date-chips flex gap-3 overflow-x-auto pb-4">
            {filterDates.map(date => {
              const isActive = isSameDay(date, selectedDate);
              return (
                <button
                  key={date.toISOString()}
                  className={`date-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span className="day-name">{format(date, 'EEE')}</span>
                  <span className="day-number">{format(date, 'dd MMM')}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="showtimes-section">
          {groupedByChain.length > 0 ? (
            <div className="cinemas-list flex flex-col gap-6 pt-4">
              {groupedByChain.map((chain) => {
                const isExpanded = expandedChains[chain.name];

                return (
                  <div key={chain.name} className="chain-block" style={{ paddingTop: 'var(--sp-12)' }}>
                    <button
                      className="chain-header flex items-center gap-2 text-left mb-2 p-2 hover:bg-neutral-200/50 rounded-lg transition-colors w-auto"
                      onClick={() => toggleChain(chain.name)}
                    >
                      <h2 className="cinema-chain-title m-0 tracking-tight">{chain.name}</h2>
                      {isExpanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                    </button>

                    {isExpanded && (
                      <div className="chain-malls flex flex-col gap-6 mt-4 pl-2">
                        {chain.mallsList.map(mall => (
                          <div key={mall.name} className="mall-block">
                            <p className="cinema-location text-muted flex items-center gap-1 text-small mb-3 font-medium">
                              <MapPin size={14} />
                              {mall.name}
                            </p>

                            <div className="times-grid" style={{ paddingTop: '8px' }}>
                              {mall.showtimes.map((st, idx) => {
                                return (
                                  <ShowtimeCard
                                    key={st.id}
                                    showtime={st}
                                    index={idx}
                                    movieTitle={movie.title}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state mt-4 flex flex-col items-center justify-center">
              <p className="text-muted text-center mb-4">No showtimes available for {format(selectedDate, 'MMMM d')}.</p>
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        /* Hero Section */
        .hero-banner {
          position: relative;
          min-height: 480px;
          display: flex;
          align-items: flex-end;
          padding-top: var(--sp-20);
          padding-bottom: var(--sp-12);
          overflow: hidden;
          background-color: var(--color-neutral-0);
          margin-top: -32px; /* Pull up under header if needed */
        }

        .hero-blur-bg {
          position: absolute;
          inset: -20px;
          background-size: cover;
          background-position: top center;
          filter: blur(20px) brightness(0.5);
          transform: scale(1.1);
          z-index: 1;
        }

        .hero-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, var(--color-neutral-100) 0%, rgba(10,10,11,0.8) 50%, rgba(10,10,11,0.4) 100%);
          z-index: 2;
        }

        .hero-content-wrapper {
          position: relative;
          z-index: 10;
          padding-top: var(--sp-12);
        }

        .back-link {
          display: inline-flex;
          color: var(--color-neutral-600);
          transition: color 0.2s;
        }

        .back-link:hover {
          color: var(--color-neutral-900);
        }

        .hero-content {
          display: flex;
          align-items: center; /* Vertically center the text with the poster */
        }

        .poster-container {
          flex-shrink: 0;
          width: 100%;
          max-width: 240px;
          border-radius: var(--radius-xl);
          overflow: hidden;
          background-color: var(--color-neutral-200);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);
        }

        @media (max-width: 768px) {
          .poster-container {
            max-width: 180px;
            margin-bottom: var(--sp-6);
          }
          .hero-content {
            flex-direction: column;
          }
        }

        .detail-poster {
          width: 100%;
          display: block;
          object-fit: cover;
          aspect-ratio: 2 / 3;
        }

        .detail-info {
          flex: 1;
        }

        .detail-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          color: var(--color-neutral-1000);
          letter-spacing: -1px;
        }

        .meta-badge {
          background-color: rgba(255,255,255,0.08);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--color-neutral-600);
        }

        .text-neutral-300 { color: #d4d4d8; }
        .text-neutral-400 { color: #a1a1aa; border-color: #3f3f46;}
        .text-neutral-500 { color: #71717a; }

        .genre-pill {
          background-color: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: var(--sp-1) var(--sp-3);
          border-radius: var(--radius-2xl);
          font-size: 0.75rem;
          color: var(--color-neutral-800);
        }

        .detail-synopsis {
          max-width: 600px;
          line-height: 1.6;
        }

        /* Dates & Showtimes matching Image 2 */
        .date-chips {
          scrollbar-width: none; /* Firefox */
        }
        .date-chips::-webkit-scrollbar {
          display: none; /* Safari and Chrome */
        }

        .date-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: transparent;
          border: 1px solid var(--color-neutral-500);
          border-radius: var(--radius-lg);
          padding: var(--sp-3) var(--sp-5);
          min-width: 90px;
          transition: all 0.2s;
          color: var(--color-neutral-700);
        }

        .date-chip:hover:not(.active) {
          background-color: var(--color-neutral-300);
          color: var(--color-neutral-900);
        }

        .date-chip.active {
          background-color: var(--color-neutral-900);
          border-color: var(--color-neutral-1000);
          color: var(--color-neutral-100);
        }

        .date-chip .day-name {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          opacity: 0.7;
          margin-bottom: 2px;
        }

        .date-chip .day-number {
          font-size: 1rem;
          font-weight: 700;
        }

        .chain-block {
          background-color: transparent;
          border-top: 1px solid var(--color-neutral-400);
          padding-top: var(--sp-6);
          padding-bottom: var(--sp-2);
        }
        .chain-block:first-child {
          border-top: none;
        }

        .mall-block {
          margin-bottom: var(--sp-6);
        }

        .cinema-chain-title {
          font-size: 1.5rem;
          color: var(--color-neutral-1000);
          font-weight: 700;
        }

        .times-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--sp-4);
        }

        @media (min-width: 640px) {
          .times-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .times-grid { grid-template-columns: repeat(3, 1fr); gap: var(--sp-6); }
        }

        .empty-state {
          padding: var(--sp-12) 0;
          background-color: var(--color-neutral-200);
          border-radius: var(--radius-lg);
          border: 1px dashed var(--color-neutral-500);
        }
      `}</style>
    </div>
  );
}
