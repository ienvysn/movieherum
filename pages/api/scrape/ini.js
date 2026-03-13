import { supabase } from "../../../lib/supabase";
import { normalizeTitle } from "../../../lib/utils/normalize";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    console.log("🚀 Starting Ini Cinemas Scrape...");

    const targetDates = [];
    const dateObjs = [];
    for (let i = 0; i < 4; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = (d.getMonth() + 1).toString().padStart(2, "0");
        const dd = d.getDate().toString().padStart(2, "0");

        targetDates.push(`${mm}/${dd}/${yyyy}`);
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
        console.log(`\n📅 Scraping Ini Cinemas for date: ${showDate}`);

        const payload = {
            PortalId: 1,
            ShowDate: showDate,
            AppPath: "/",
            CurrentMovieID: 0,
            username: "",
            locationID: 0
        };

        const fetchRes = await fetch("https://inicinemas.com/Modules/CineSite/Movies/NowShowingWebService.asmx/GetNowShowing", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!fetchRes.ok) {
            console.error(`❌ Failed to fetch from Ini Cinemas API: ${fetchRes.status}`);
            return res.status(200).json({
                success: false,
                message: `Ini Cinemas API down (Status: ${fetchRes.status})`,
                error: await fetchRes.text()
            });
        }

        const jsonResponse = await fetchRes.json();
        const data = jsonResponse.d;

        if (!data || !Array.isArray(data) || data.length === 0) {
            console.log(`No movies found for ${showDate}. Skipping.`);
            continue;
        }

        console.log(`🎬 Picked up ${data.length} movies from Ini Cinemas.`);
        totalMoviesProcessed += data.length;

        for (const movie of data) {
            const cleanTitle = normalizeTitle(movie.Movie);

            const { data: movieRecord, error: mError } = await supabase
                .from("movies")
                .upsert(
                    {
                        title: cleanTitle,
                        poster_url: movie.MediaPath_src
                            ? `https://inicinemas.com${movie.MediaPath_src}`
                            : null,
                        genre: movie.Genre || null,
                    },
                    { onConflict: "title" },
                )
                .select()
                .single();

            if (mError || !movieRecord) {
                console.log(`⏩ Skipping movie ${cleanTitle}: ${mError?.message}`);
                continue;
            }

            for (const locID of [2, 4, 6]) {
                try {
                    const locRes = await fetch("https://inicinemas.com/Modules/CineSite/ShowDetail/ShowDetail.asmx/GetShowDetail", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({
                            ShowDate: showDate,
                            AppPath: "",
                            CurrentMovieID: movie.MovieID.toString(),
                            screenID: 0,
                            locationID: locID.toString()
                        })
                    });

                    if (!locRes.ok) continue;

                    const locData = await locRes.json();
                    const html = locData.d;
                    if (!html || html.trim() === "") continue;

                    const $ = cheerio.load(html);
                    const mallNameRaw = $(".audi-info-desc p span").first().text().trim();
                    if (!mallNameRaw) continue;

                    // Only process the three known Ini Cinemas halls
                    const mallLowerCheck = mallNameRaw.toLowerCase();
                    if (!mallLowerCheck.includes("lotse") && !mallLowerCheck.includes("bishwojyoti") && !mallLowerCheck.includes("nb")) {
                        console.log(`⏩ Skipping unknown Ini location: "${mallNameRaw}"`);
                        continue;
                    }

                    const locationName = `Ini Cinemas - ${mallNameRaw}`;

                    let cinemaMatch = allCinemas.find((dbCine) => {
                        const dbNameClean = dbCine.mall_name?.toLowerCase().trim() || "";
                        const locNameClean = locationName.toLowerCase().trim();
                        return dbNameClean === locNameClean || dbNameClean.includes(locNameClean) || locNameClean.includes(dbNameClean);
                    });

                    if (!cinemaMatch) {
                        console.log(`✨ Creating missing Ini Cinema in DB: "${locationName}"`);
                        const { data: newCinema, error: createErr } = await supabase
                            .from("cinemas")
                            .insert({
                                mall_name: locationName,
                                chain_name: "Ini Cinemas",
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

                    const showElements = $(".show-time-info li a").toArray();
                    for (const el of showElements) {
                        const timeText = $(el).text().trim(); // e.g. "05:30 PM"
                        const href = $(el).attr("href"); // e.g. "/booking.aspx/movieid/30705/showid/62567"

                        let [time, modifier] = timeText.split(" ");
                        let [hours, minutes] = time.split(":");
                        hours = parseInt(hours, 10);
                        if (hours === 12) hours = 0;
                        if (modifier === "PM") hours += 12;

                        const formattedStartTime = `${isoDate}T${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;

                        let bookingUrl = href;
                        if (href && href !== "#") {
                            if (href.startsWith("//")) {
                                bookingUrl = `https:${href}`;
                            } else if (href.startsWith("/")) {
                                bookingUrl = `https://inicinemas.com${href}`;
                            } else if (!href.startsWith("http")) {
                                bookingUrl = `https://inicinemas.com/${href}`;
                            }
                        }

                        // Ticket pricing logic
                        const showDateObj = new Date(isoDate);
                        const dayOfWeek = showDateObj.getDay(); // 0=Sun,1=Mon,...6=Sat
                        const isMorning = hours < 12;
                        const mallLower = mallNameRaw.toLowerCase();

                        let ticketPrice = null;

                        // Deal Days: Tue(2), Wed(3) — all day same price
                        // Weekends: Fri(5), Sat(6), Sun(0)
                        // Weekdays: Mon(1), Thu(4)
                        const isDealDay = dayOfWeek === 2 || dayOfWeek === 3;
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

                        if (mallLower.includes("lotse")) {
                            // Lotse Mall, Gongabu
                            if (isDealDay) ticketPrice = 200;
                            else if (isWeekend) ticketPrice = isMorning ? 200 : 400;
                            else ticketPrice = isMorning ? 165 : 330;
                        } else if (mallLower.includes("bishwojyoti")) {
                            // Bishwojyoti Mall, Jamal
                            if (isDealDay) ticketPrice = 200;
                            else if (isWeekend) ticketPrice = isMorning ? 175 : 350;
                            else ticketPrice = isMorning ? 150 : 300;
                        } else if (mallLower.includes("nb") || mallLower.includes("baneshwor")) {
                            // NB Center, New Baneshwor
                            if (isDealDay) ticketPrice = 200;
                            else if (isWeekend) ticketPrice = isMorning ? 225 : 450;
                            else ticketPrice = isMorning ? 175 : 350;
                        }

                        const { error: sError } = await supabase.from("showtimes").upsert(
                            {
                                movie_id: movieRecord.id,
                                cinema_id: cinemaMatch.id,
                                start_time: formattedStartTime,
                                price: ticketPrice,
                                booking_url: bookingUrl,
                            },
                            { onConflict: "movie_id, cinema_id, start_time" },
                        );

                        if (sError) {
                            console.error(`❌ DB Error for ${cleanTitle} at ${locationName}:`, sError.message);
                        }
                    }
                } catch (e) {
                    console.error(`Error processing location ID ${locID} for movie ${cleanTitle}: ${e.message}`);
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
