import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import MovieCard from '../components/MovieCard';
import { Search } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';


export async function getStaticProps() {

  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching movies:', error);
    return { props: { initialMovies: [] }, revalidate: 60 };
  }

  const today = new Date().toISOString().split('T')[0];
  const { data: showtimes } = await supabase
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
        const uniqueCinemas = new Set(movieShowtimes.map(st => st.cinema_id));
        cinemaCount = uniqueCinemas.size;

        const prices = movieShowtimes.filter(st => st.price !== null).map(st => st.price);
        if (prices.length > 0) {
          minPrice = Math.min(...prices);
        }

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
    props: {
      initialMovies: enrichedMovies,
    },

    revalidate: 60,
  };
}

export default function Home({ initialMovies }) {
  const [movies, setMovies] = useState(initialMovies);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Hydrate movie metadata on the client to avoid stale SSG data
  useEffect(() => {
    async function hydrateMovies() {
      const { data: freshMovies, error } = await supabase
        .from('movies')
        .select('id, duration, genre, poster_url, synopsis, director, cast, rating');

      if (!error && freshMovies) {
        setMovies(prevMovies => {
          return prevMovies.map(prev => {
            const fresh = freshMovies.find(f => f.id === prev.id);
            if (fresh) {
              return { ...prev, ...fresh };
            }
            return prev;
          });
        });
      }
    }
    hydrateMovies();
  }, []);

  const filterDates = useMemo(() => {
    const today = startOfDay(new Date());
    return [0, 1, 2, 3].map(offset => addDays(today, offset));
  }, []);

  const [selectedDate, setSelectedDate] = useState(filterDates[0]);

  const filteredMovies = useMemo(() => {
    const results = movies.filter(movie => {
      const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Ensure movie is available on selected date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      return movie.availableDates && movie.availableDates.includes(dateStr);
    });

    return results;
  }, [movies, searchQuery, selectedDate]);

  return (
    <div className="container animate-fade-in">

      <section className="hero-section">
        <h1 className="hero-title">Now Showing</h1>
        <p className="hero-subtitle text-muted">Find the perfect showtime across all leading cinemas.</p>

        <div className="filters-container mt-6">
          <div className="search-wrapper">
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
        {loading ? (
          <div className="movie-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className="skeleton-card" />
            ))}
          </div>
        ) : filteredMovies.length > 0 ? (
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

    </div>
  );
}
