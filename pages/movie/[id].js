import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, parseISO, isSameDay, addDays, startOfDay } from 'date-fns';
import { ArrowLeft, MapPin, Clock, Calendar, Users, ChevronDown, ChevronUp, Star } from 'lucide-react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ShowtimeCard from '../../components/ShowtimeCard';

export default function MovieDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      // Fetch Movie
      const { data: movieData, error: movieError } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .single();

      if (movieError || !movieData) {
        router.push('/404');
        return;
      }
      setMovie(movieData);

      // Fetch Showtimes
      const { data: showtimesData } = await supabase
        .from('showtimes')
        .select('*')
        .eq('movie_id', id);

      let cinemasData = [];
      if (showtimesData && showtimesData.length > 0) {
        const cinemaIds = [...new Set(showtimesData.map(s => s.cinema_id))];
        const { data: cinemaFetchedData } = await supabase
          .from('cinemas')
          .select('*')
          .in('id', cinemaIds);
        cinemasData = cinemaFetchedData || [];
      }

      setShowtimes(showtimesData || []);
      setCinemas(cinemasData);
      setLoading(false);
    }
    fetchData();
  }, [id, router]);
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

  if (loading) {
    return (
      <div className="movie-detail-page skeleton-page">
        <section className="hero-banner skeleton-hero">
          <div className="container relative z-10 hero-content-wrapper p-8">
            <Link href="/" className="back-link flex items-center gap-2 text-small mb-6">
              <ArrowLeft size={16} />
              Back to movies
            </Link>
            <div className="hero-content gap-8">
              <div className="poster-container skeleton-poster pulse-anim"></div>
              <div className="detail-info">
                <div className="skeleton-line pulse-anim" style={{ width: '60%', height: '40px', marginBottom: '20px' }}></div>
                <div className="skeleton-line pulse-anim" style={{ width: '40%', height: '20px', marginBottom: '20px' }}></div>
                <div className="skeleton-line pulse-anim" style={{ width: '80%', height: '15px', marginBottom: '10px' }}></div>
                <div className="skeleton-line pulse-anim" style={{ width: '80%', height: '15px', marginBottom: '10px' }}></div>
                <div className="skeleton-line pulse-anim" style={{ width: '70%', height: '15px', marginBottom: '20px' }}></div>
              </div>
            </div>
          </div>
        </section>
        <style jsx>{`
          .skeleton-page { min-height: 100vh; background: var(--color-neutral-100); }
          .skeleton-hero { height: 60vh; min-height: 480px; background: var(--color-neutral-200); position: relative; }
          .skeleton-poster { width: 300px; height: 450px; background: var(--color-neutral-300); border-radius: var(--radius-lg); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          .skeleton-line { background: var(--color-neutral-300); border-radius: var(--radius-sm); }
          .pulse-anim { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          .hero-content { display: flex; align-items: center; max-width: 1000px; margin: auto; }
          .detail-info { flex: 1; }
          @media (max-width: 768px) {
            .hero-content { flex-direction: column; text-align: center; }
            .skeleton-poster { width: 220px; height: 330px; }
            .skeleton-line { margin-left: auto; margin-right: auto; }
          }
        `}</style>
      </div>
    );
  }

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
        <title>{movie.title} - Find Movie Showtimes</title>
      </Head>

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

    </div>
  );
}
