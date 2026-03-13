import { supabase } from "../../../lib/supabase";
import { normalizeTitle } from "../../../lib/utils/normalize";

export const dynamic = "force-dynamic";

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
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    console.log("🚀 Starting Infinity Movies Scrape...");


    const targetDates = [];
    const dateObjs = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = (d.getMonth() + 1).toString().padStart(2, "0");
      const dd = d.getDate().toString().padStart(2, "0");

      targetDates.push(`${mm}-${dd}-${yyyy}`);
      dateObjs.push(`${yyyy}-${mm}-${dd}`);
    }

    const { data: allCinemas, error: cineError } = await supabase
      .from("cinemas")
      .select("id, mall_name, chain_name, location_url");

    if (cineError || !allCinemas) {
      throw new Error(`Could not load cinemas from DB: ${cineError?.message}`);
    }

    let totalMoviesProcessed = 0;

    for (let i = 0; i < targetDates.length; i++) {
      const showDate = targetDates[i];
      const isoDate = dateObjs[i];
      console.log(`\n📅 Scraping Infinity Movies for date: ${showDate}`);

      const payload = new URLSearchParams();

      payload.append("ShowDate", showDate);
      payload.append("locationID", "0");
      payload.append("screens", "1,2");

      const fetchRes = await fetch(
        "https://infinitymovies.com.np/nowshowingandupcoming/GetNowShowingDate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
            Referer: "https://infinitymovies.com.np/",
            Origin: "https://infinitymovies.com.np",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",

          },
          body: payload.toString(),
        }
      );

      if (!fetchRes.ok) {
        console.error(`❌ Failed to fetch from Infinity Movies API: ${fetchRes.status}`);
        return res.status(200).json({
            success: false,
            message: `Infinity Movies API down (Status: ${fetchRes.status})`,
            error: await fetchRes.text()
        });
      }

      let movies = [];
      try {
        movies = await fetchRes.json();
      } catch (e) {
        console.error(`❌ Failed to parse JSON for date ${showDate}`);
        continue;
      }

      if (!Array.isArray(movies) || movies.length === 0) {
        console.log(`No movies found for ${showDate}. Skipping.`);
        continue;
      }

      console.log(`🎬 Picked up ${movies.length} movies from Infinity Movies.`);
      totalMoviesProcessed += movies.length;

      for (const movie of movies) {
        const cleanTitle = normalizeTitle(movie.Movie);

        const { data: movieRecord, error: mError } = await supabase
          .from("movies")
          .upsert(
            {
              title: cleanTitle,
              poster_url: movie.PostImage
                ? `https://infinitymovies.com.np/images/movie/${movie.PostImage}`
                : null,
              genre: movie.MovieGenre || null,
            },
            { onConflict: "title" }
          )
          .select()
          .single();

        if (mError || !movieRecord) {
          console.log(`⏩ Skipping movie ${cleanTitle}: ${mError?.message}`);
          continue;
        }

        const locationName = "Infinity Movies";

        let cinemaMatch = allCinemas.find((dbCine) => {
          const dbNameClean = dbCine.mall_name?.toLowerCase().trim() || "";
          return (
            dbNameClean.includes("infinity") ||
            dbCine.chain_name === "Infinity Movies"
          );
        });

        if (!cinemaMatch) {
          console.log(`✨ Creating missing cinema in DB: "${locationName}"`);
          const { data: newCinema, error: createErr } = await supabase
            .from("cinemas")
            .insert({
              mall_name: locationName,
              chain_name: "Infinity Movies",
            })
            .select()
            .single();

          if (createErr || !newCinema) {
            console.error(`❌ Failed to auto-create cinema "${locationName}":`, createErr?.message);
            continue;
          } else {
            console.log(`✅ Successfully created cinema: "${newCinema.mall_name}"`);
            cinemaMatch = newCinema;
            allCinemas.push(newCinema);
          }
        }

        const showList = movie.ShowList || [];

        for (const show of showList) {
          const time24 = convertTime12to24(show.StartTime);
          const startTimeIso = `${isoDate}T${time24}`;
          const hourInt = parseInt(time24.split(":")[0], 10);

          // Booking URL
          const bookingUrl = `https://infinitymovies.com.np/showdetail/${show.ShowID}`;

          // Ticket pricing (same for Screen 1 & 2)
          const showDateObj = new Date(isoDate);
          const dayOfWeek = showDateObj.getDay(); // 0=Sun,...6=Sat
          const isMorning = hourInt < 10;

          //               Sun  Mon  Tue  Wed  Thu  Fri  Sat
          const morning = [150, 150, 150, 150, 150, 150, 150];
          const afternoon = [300, 250, 150, 150, 250, 300, 300];

          const ticketPrice = isMorning ? morning[dayOfWeek] : afternoon[dayOfWeek];

          const { error: sError } = await supabase.from("showtimes").upsert(
            {
              movie_id: movieRecord.id,
              cinema_id: cinemaMatch.id,
              start_time: startTimeIso,
              price: ticketPrice,
              booking_url: bookingUrl,
            },
            { onConflict: "movie_id, cinema_id, start_time" }
          );

          if (sError) {
            console.error(`❌ DB Error for ${cleanTitle}:`, sError.message);
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
    return res.status(200).json({ success: false, error: error.message });
  }
}
