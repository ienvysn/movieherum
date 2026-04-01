import { supabase } from "../../../lib/supabase";
import { fetchTMDBDetails } from "../../../lib/tmdb";

export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    console.log("🧹 Starting Maintenance: Cleanup & TMDB Sync at", new Date().toISOString());

    const nowIsoString = new Date().toISOString();

    console.log(`Deleting showtimes where start_time <= ${nowIsoString}`);
    const { data: deletedShowtimes, error: deleteSTError } = await supabase
      .from("showtimes")
      .delete()
      .lte("start_time", nowIsoString)
      .select("id");

    if (deleteSTError) throw new Error(`Failed to delete old showtimes: ${deleteSTError.message}`);
    const stDeleteCount = deletedShowtimes?.length || 0;
    console.log(`✅ Deleted ${stDeleteCount} expired showtimes.`);

    const { data: allMovies, error: fetchAllError } = await supabase.from("movies").select("id, title, tmdb_id");
    if (fetchAllError) throw new Error(`Failed to fetch movies: ${fetchAllError.message}`);

    const { data: activeShowtimes, error: fetchActiveError } = await supabase.from("showtimes").select("movie_id");
    if (fetchActiveError) throw new Error(`Failed to fetch active showtimes: ${fetchActiveError.message}`);

    const activeMovieIds = new Set(activeShowtimes.map(st => st.movie_id));
    const orphanedMovieIds = allMovies.filter(m => !activeMovieIds.has(m.id)).map(m => m.id);

    let orphanedDeleteCount = 0;
    if (orphanedMovieIds.length > 0) {
      console.log(`Found ${orphanedMovieIds.length} orphaned movies with no showtimes. Deleting...`);
      const { data: deletedMovies, error: deleteMoviesError } = await supabase
        .from("movies")
        .delete()
        .in("id", orphanedMovieIds)
        .select("id");

      if (deleteMoviesError) throw new Error(`Failed to delete orphaned movies: ${deleteMoviesError.message}`);
      orphanedDeleteCount = deletedMovies?.length || 0;
    }
    console.log(`✅ Deleted ${orphanedDeleteCount} isolated movies.`);

    const activeMoviesToSync = allMovies.filter(m => activeMovieIds.has(m.id));
    const pendingTMDB = activeMoviesToSync.filter(m => !m.tmdb_id);
    let tmdbSuccessCount = 0;

    if (pendingTMDB.length > 0) {
      console.log(`🔄 Syncing TMDB details for ${pendingTMDB.length} movies...`);

      for (const movie of pendingTMDB) {

        await new Promise(resolve => setTimeout(resolve, 300));

        const details = await fetchTMDBDetails(movie.title);

        if (details) {
          const { error: updateError } = await supabase
            .from("movies")
            .update({
              tmdb_id: details.tmdb_id,
              duration: details.duration,
              release_date: details.release_date,
              synopsis: details.synopsis,
              director: details.director,
              cast: details.cast,
              rating: details.rating,
              details_source: details.details_source || 'TMDB'
            })
            .eq("id", movie.id);

          if (updateError) {
            console.error(`❌ Failed to update DB for "${movie.title}":`, updateError.message);
          } else {
            console.log(`✅ Synced TMDB for: ${movie.title}`);
            tmdbSuccessCount++;
          }
        } else {

          await supabase.from("movies").update({ tmdb_id: -1 }).eq("id", movie.id);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Maintenance complete. Deleted ${stDeleteCount} showtimes, ${orphanedDeleteCount} movies. Synced ${tmdbSuccessCount} movies from TMDB.`,
    });
  } catch (error) {
    console.error("💥 Critical Maintenance Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
