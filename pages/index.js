import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import MovieCard from '../components/MovieCard';
import { Search } from 'lucide-react';
import { format, addDays, startOfDay, parseISO } from 'date-fns';

export async function getServerSideProps() {
  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching movies:', error);
    return { props: { initialMovies: [] } };
  }


  const today = new Date().toISOString().split('T')[0];
  const { data: showtimes, error: stError } = await supabase
    .from('showtimes')
    .select('movie_id, cinema_id, price, start_time')
    .gte('start_time', today);

  const enrichedMovies = movies.map(movie => {
    let cinemaCount = 0;
    let minPrice = null;
    let availableDates = [];

    if (showtimes) {
      const movieShowtimes = showtimes.filter(st => st.movie_id === movie.id);

      if (movieShowtimes.length > 0) {
        // Unique cinemas
        const uniqueCinemas = new Set(movieShowtimes.map(st => st.cinema_id));
        cinemaCount = uniqueCinemas.size;

        // Minimum price
        const prices = movieShowtimes.filter(st => st.price !== null).map(st => st.price);
        if (prices.length > 0) {
          minPrice = Math.min(...prices);
        }

        // Available dates
        const dateSet = new Set(movieShowtimes.map(st => st.start_time.split('T')[0]));
        availableDates = Array.from(dateSet);
      }
    }

    return {
      ...movie,
      cinemaCount,
      minPrice,
      availableDates
    };
  });

  return {
    props: { initialMovies: enrichedMovies || [] },
  };
}

export default function Home({ initialMovies }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Date filtering logic
  const filterDates = useMemo(() => {
    const today = startOfDay(new Date());
    return [0, 1, 2, 3].map(offset => addDays(today, offset));
  }, []);

  const [selectedDate, setSelectedDate] = useState(filterDates[0]);

  const filteredMovies = useMemo(() => {
    const results = initialMovies.filter(movie => {
      const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Ensure movie is available on selected date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      return movie.availableDates && movie.availableDates.includes(dateStr);
    });

    // Limit to 5 movies as requested
    return results.slice(0, 5);
  }, [initialMovies, searchQuery, selectedDate]);

  return (
    <div className="container animate-fade-in">

      <section className="hero-section">
        <h1 className="hero-title">Now Showing</h1>
        <p className="hero-subtitle text-muted">Find the perfect showtime across all leading cinemas.</p>

        <div className="filters-container mt-6">
          <div className="search-wrapper">
            <Search className="search-icon text-muted" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="Search for movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="date-filters mt-4 flex gap-3 overflow-x-auto pb-2">
            {filterDates.map(date => {
              const isActive = selectedDate.getTime() === date.getTime();
              return (
                <button
                  key={date.toISOString()}
                  className={`chip date-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  {format(date, 'MMM d, EEE')}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid-section mt-8">
        {filteredMovies.length > 0 ? (
          <div className="movie-grid">
            {filteredMovies.map(movie => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                poster_url={movie.poster_url}
                genre={movie.genre}
                duration={movie.duration}
                cinemaCount={movie.cinemaCount}
                minPrice={movie.minPrice}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state flex flex-col items-center justify-center">
            <p className="text-muted mb-4">No movies matched your search criteria for this date.</p>
            <button className="btn btn-ghost" onClick={() => setSearchQuery('')}>
              Clear Search
            </button>
          </div>
        )}
      </section>

      <style jsx>{`
        .hero-section {
          padding: var(--sp-6) 0;
          border-bottom: 1px solid var(--color-neutral-400);
        }

        .hero-title {
          font-weight: 700;
          color: var(--color-neutral-1000);
          margin-bottom: var(--sp-2);
        }

        .hero-subtitle {
          font-size: 1.125rem;
        }

        .filters-container {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
          max-width: 600px;
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: var(--sp-4);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: var(--sp-3) var(--sp-4) var(--sp-3) var(--sp-12);
          background-color: var(--color-neutral-200);
          border: 1px solid var(--color-neutral-400);
          border-radius: var(--radius-lg);
          color: var(--color-neutral-900);
          font-family: inherit;
          font-size: 1rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-neutral-600);
          box-shadow: 0 0 0 2px rgba(161, 161, 170, 0.2); /* Neutral glow */
        }

        .search-input::placeholder {
          color: var(--color-neutral-600);
        }

        .date-filters {
          display: flex;
          scrollbar-width: none;
        }

        .date-filters::-webkit-scrollbar {
          display: none;
        }

        .date-chip {
          padding: var(--sp-2) var(--sp-4);
          font-weight: 600;
        }

        .movie-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--sp-4);
        }

        .empty-state {
          padding: var(--sp-16) 0;
          text-align: center;
          background-color: var(--color-neutral-200);
          border-radius: var(--radius-lg);
          border: 1px dashed var(--color-neutral-500);
        }

        @media (min-width: 640px) {
          .movie-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: var(--sp-6);
          }
        }

        @media (min-width: 1024px) {
          .movie-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: var(--sp-6);
          }
        }
      `}</style>
    </div>
  );
}
