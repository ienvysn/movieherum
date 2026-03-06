import { supabase } from "../../../lib/supabase";
import { normalizeTitle } from "../../../lib/utils/normalize";

export const dynamic = "force-dynamic";

const HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "X-Requested-With": "XMLHttpRequest",
  Referer: "https://www.ckcinemas.com/showtimings",
  Origin: "https://www.ckcinemas.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

function convertTime12to24(time12h) {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") {
    hours = "00";
  }
  if (modifier === "PM") {
    hours = parseInt(hours, 10) + 12;
  }
  return `${hours.toString().padStart(2, "0")}:${minutes}:00`;
}

export default async function handler(req, res) {
  try {
    console.log("🚀 Starting CK Cinemas Scrape...");

    const { data: allCinemas, error: cineError } = await supabase
      .from("cinemas")
      .select("id, mall_name, chain_name, location_url");

    if (cineError || !allCinemas) {
      throw new Error(`Could not load cinemas from DB: ${cineError?.message}`);
    }

    const targetDates = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const mm = (d.getMonth() + 1).toString().padStart(2, "0");
      const dd = d.getDate().toString().padStart(2, "0");
      const yyyy = d.getFullYear();
      targetDates.push(`${mm}-${dd}-${yyyy}`);
    }

    let totalMoviesProcessed = 0;

    for (const targetDate of targetDates) {
      console.log(`📅 Fetching CK Cinemas data for date: ${targetDate}`);
      const body = `ShowDate=${targetDate}`;

      const listRes = await fetch(
        "https://www.ckcinemas.com/showtimings/GetMovieDetailList",
        {
          method: "POST",
          headers: HEADERS,
          body: body,
        }
      );

      let movies = [];
      try {
        movies = await listRes.json();
      } catch (e) {
        console.error(`❌ Failed to parse JSON for date ${targetDate}`);
        continue;
      }

      if (!Array.isArray(movies) || movies.length === 0) {
        console.log(`No movies found for ${targetDate}`);
        continue;
      }

      totalMoviesProcessed += movies.length;

      for (const movie of movies) {
        const cleanTitle = normalizeTitle(movie.MovieName);

        const { data: movieRecord, error: mError } = await supabase
          .from("movies")
          .upsert(
            {
              title: cleanTitle,
              poster_url: movie.PostImage
                ? `https://www.ckcinemas.com/images/movie/${movie.PostImage}`
                : null,
            },
            { onConflict: "title" }
          )
          .select()
          .single();

        if (mError || !movieRecord) {
          console.log(`⏩ Skipping movie ${cleanTitle}: ${mError?.message}`);
          continue;
        }

        if (movie.ShowScreens && Array.isArray(movie.ShowScreens)) {
          for (const screen of movie.ShowScreens) {
            let locationName = screen.LocationName || "CK Cinemas";

            let cinemaMatch = allCinemas.find((dbCine) => {
              if (dbCine.chain_name !== "CK Cinemas") return false;
              const dbNameClean = (dbCine.mall_name || "").toLowerCase().trim();
              const locClean = locationName.toLowerCase().trim();
              return (
                dbNameClean.includes(locClean) || locClean.includes(dbNameClean)
              );
            });

            if (!cinemaMatch) {
              console.log(
                `✨ Creating missing cinema in DB: CK Cinemas ${locationName}`
              );
              const { data: newCinema, error: createErr } = await supabase
                .from("cinemas")
                .insert({
                  mall_name: `CK Cinemas ${locationName}`,
                  chain_name: "CK Cinemas",
                })
                .select()
                .single();

              if (createErr || !newCinema) {
                console.error(
                  `❌ Failed to auto-create cinema "${locationName}":`,
                  createErr?.message
                );
                continue;
              } else {
                console.log(
                  `✅ Successfully created cinema: "${newCinema.mall_name}"`
                );
                cinemaMatch = newCinema;
                allCinemas.push(newCinema);
              }
            }

            if (screen.Shows && Array.isArray(screen.Shows)) {
              for (const show of screen.Shows) {
                const time24 = convertTime12to24(show.StartTime);
                const startTimeIso = `${movie.ShowDate}T${time24}`;

                const { error: sError } = await supabase.from("showtimes").upsert(
                  {
                    movie_id: movieRecord.id,
                    cinema_id: cinemaMatch.id,
                    start_time: startTimeIso,
                    price: null,
                    booking_url: `https://www.ckcinemas.com/showdetail/${show.ShowID}`,
                  },
                  { onConflict: "movie_id, cinema_id, start_time" }
                );

                if (sError) {
                  console.error(
                    `❌ DB Error for ${cleanTitle} at ${startTimeIso}:`,
                    sError.message
                  );
                }
              }
            }
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sync Completed. Processed ${totalMoviesProcessed} movies across ${targetDates.length} days.`,
    });
  } catch (error) {
    console.error("💥 Critical Scraper Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
