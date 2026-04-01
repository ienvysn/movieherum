const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Searches TMDB for a movie by title and fetches detailed info including credits
 * @param {string} title - The normalized movie title to search
 * @returns {Object|null} - Formatted movie details or null if not found
 */
export async function fetchTMDBDetails(title) {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    console.warn('⚠️ Missing TMDB_API_KEY environment variable. Cannot fetch details.');
    return null;
  }

  try {
    // 1. Search for the movie by title
    const searchUrl = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(title)}&language=en-US&page=1`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`,
        accept: 'application/json'
      }
    });

    if (!searchRes.ok) throw new Error(`TMDB Search failed: ${searchRes.status}`);

    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      console.log(`ℹ️ TMDB: No results found for "${title}"`);
      return null;
    }

    // Take the most relevant match
    const movieId = searchData.results[0].id;

    // 2. Fetch full details using the TMDB ID, appending credits
    const detailsUrl = `${TMDB_BASE_URL}/movie/${movieId}?append_to_response=credits`;
    const detailsRes = await fetch(detailsUrl, {
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`,
        accept: 'application/json'
      }
    });

    if (!detailsRes.ok) throw new Error(`TMDB Details failed: ${detailsRes.status}`);

    const movieData = await detailsRes.json();

    // Extract desired fields exactly as needed for the UI
    const duration = movieData.runtime ? formatRuntime(movieData.runtime) : null;
    const release_date = movieData.release_date || null;
    const synopsis = movieData.overview || null;

    // Extract Director
    let director = null;
    if (movieData.credits && movieData.credits.crew) {
      const directorObj = movieData.credits.crew.find(member => member.job === 'Director');
      if (directorObj) director = directorObj.name;
    }

    // Extract Top 3 Cast Members
    let cast = null;
    if (movieData.credits && movieData.credits.cast) {
      const topCast = movieData.credits.cast.slice(0, 3).map(actor => actor.name);
      if (topCast.length > 0) cast = topCast.join(', ');
    }

    // Extract genres
    let genre = null;
    if (movieData.genres && movieData.genres.length > 0) {
      genre = movieData.genres.map(g => g.name).join(', ');
    }

    const rating = movieData.vote_average ? Number(movieData.vote_average.toFixed(1)) : null;

    return {
      tmdb_id: movieId,
      duration,
      release_date,
      synopsis,
      genre,
      director,
      cast,
      rating,
      details_source: 'TMDB'
    };

  } catch (error) {
    console.error(`❌ Error fetching TMDB details for "${title}":`, error.message);
    return null;
  }
}

/**
 * Helper to convert integer minutes into "Xh YYmin" format
 */
function formatRuntime(minutes) {
  if (!minutes || isNaN(minutes)) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}min`;
  }
}
