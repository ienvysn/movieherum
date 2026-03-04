import { supabase } from "../../../lib/supabase";
import { normalizeTitle } from "../../../lib/utils/normalize";

export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  try {
    console.log("🚀 Starting One Cinemas Scrape...");

    const showDate = new Date().toISOString().split("T")[0];

g
    const payload = {
      ShowDate: showDate,
      locationID: 0,
      screens: ""
    };

    const fetchRes = await fetch("https://onecinemas.com.np/nowshowing/GetNowShowingDate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!fetchRes.ok) {
        throw new Error(`Failed to fetch from One Cinemas API: ${fetchRes.status}`);
    }

    const data = await fetchRes.json();
    console.log(`🎬 Picked up ${data.length} items from One Cinemas.`);


    const { data: allCinemas, error: cineError } = await supabase
      .from("cinemas")
      .select("id, mall_name, chain_name, location_url");

    if (cineError || !allCinemas) {
      throw new Error(`Could not load cinemas from DB: ${cineError?.message}`);
    }

    for (const movie of data) {
      const cleanTitle = normalizeTitle(movie.Movie);


      const { data: movieRecord, error: mError } = await supabase
        .from("movies")
        .upsert(
          {
            title: cleanTitle,
            poster_url: movie.PostImage || null,
          },
          { onConflict: "title" },
        )
        .select()
        .single();

      if (mError || !movieRecord) {
        console.log(`⏩ Skipping movie ${cleanTitle}: ${mError?.message}`);
        continue;
      }


      try {
        const detailPayload = new URLSearchParams();
        detailPayload.append('ShowDate', showDate);
        detailPayload.append('MovieID', movie.MovieID);

        const showtimesRes = await fetch("https://onecinemas.com.np/moviedetail/GetMovieDetailList", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
          },
          body: detailPayload.toString()
        });

        if (showtimesRes.ok) {
           const showtimesData = await showtimesRes.json();
           const screenList = showtimesData.ScreenList || [];

           for (const screen of screenList) {
            console.log(screen)
              const locationName = screen.LocationName;


              const cleanApiName = locationName.toLowerCase().trim();

              let cinemaMatch = allCinemas.find((dbCine) => {
                const dbNameClean = dbCine.mall_name?.toLowerCase().trim() || "";
                return cleanApiName.includes(dbNameClean) || dbNameClean.includes(cleanApiName);
              });

              if (!cinemaMatch) {
                 console.log(`✨ Creating missing One Cinema in DB: "${locationName}"`);
                 const { data: newCinema, error: createErr } = await supabase
                   .from("cinemas")
                   .insert({
                     mall_name: locationName,
                     chain_name: "One Cinemas",
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


              for(const show of screen.Shows) {


                 const timeStr = show.StartTime;
                 const [time, modifier] = timeStr.split(' ');
                 let [hours, minutes] = time.split(':');
                 if (hours === '12') { hours = '00'; }
                 if (modifier === 'PM') { hours = parseInt(hours, 10) + 12; }

                 const formattedStartTime = `${showDate}T${hours.toString().padStart(2, '0')}:${minutes}:00`;

                 const showDateObj = new Date(showDate);
                 const dayOfWeek = showDateObj.getDay();
                 const hourInt = parseInt(hours, 10);

                 let ticketPrice = null;
                 const isMorning = hourInt < 11;

                 const locNameLower = locationName.toLowerCase();
                 const isPremiumScreen = show.ScreenName && show.ScreenName.toLowerCase().includes("premium");

                 if (locNameLower.includes("kalimati")) {

                    const kalimatiMorning = [300, 250, 250, 250, 300, 300, 300];
                    const kalimatiAfternoon = [500, 250, 350, 350, 350, 500, 500];

                    ticketPrice = isMorning ? kalimatiMorning[dayOfWeek] : kalimatiAfternoon[dayOfWeek];
                 } else if (locNameLower.includes("eyeplex")) {

                    if (isPremiumScreen) {

                        const epPremiumMorning = [400, 400, 400, 400, 400, 400, 400];
                        const epPremiumAfternoon = [750, 700, 400, 400, 700, 750, 750];
                        ticketPrice = isMorning ? epPremiumMorning[dayOfWeek] : epPremiumAfternoon[dayOfWeek];
                    } else {

                        const epAudiMorning = [250, 250, 250, 250, 250, 250, 250];
                        const epAudiAfternoon = [450, 400, 250, 250, 400, 450, 450];
                        ticketPrice = isMorning ? epAudiMorning[dayOfWeek] : epAudiAfternoon[dayOfWeek];
                    }
                 }

                 const { error: sError } = await supabase.from("showtimes").upsert(
                    {
                      movie_id: movieRecord.id,
                      cinema_id: cinemaMatch.id,
                      start_time: formattedStartTime,
                      price: ticketPrice,
                      booking_url: `https://onecinemas.com.np/showdetail/${show.ShowID}`,
                    },
                    { onConflict: "movie_id, cinema_id, start_time" },
                 );
                 console.log(`✅ Saved showtime ${show.StartTime} - Price: Rs. ${ticketPrice}`);

                 if (sError) {
                    console.error(`❌ DB Error for ${cleanTitle} at ${locationName}:`, sError.message);
                 }
              }
           }
        }
      } catch (err) {
         console.error(`Failed to fetch showtimes for ${cleanTitle}: ${err.message}`);
      }

    }

    return res.status(200).json({
        success: true,
        message: "Sync Completed",
    });

  } catch (error) {
    console.error("💥 Critical Scraper Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
