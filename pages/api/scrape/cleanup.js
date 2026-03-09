import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  try {
    console.log("🧹 Starting Database Cleanup for Expired Showtimes at", new Date().toISOString());

    const now = new Date();

    const nowIsoString = now.toISOString();

    console.log(`Deleting all showtimes where start_time <= ${nowIsoString}`);


    const { data: deletedShowtimes, error: deleteError } = await supabase
      .from("showtimes")
      .delete()
      .lte("start_time", nowIsoString)
      .select("id");

    if (deleteError) {
      throw new Error(`Failed to delete old showtimes: ${deleteError.message}`);
    }

    const deleteCount = deletedShowtimes?.length || 0;
    console.log(`✅ Cleanup successful. Deleted ${deleteCount} expired showtimes.`);

    return res.status(200).json({
      success: true,
      message: `Database cleaned up. Deleted ${deleteCount} expired showtimes.`,
    });
  } catch (error) {
    console.error("💥 Critical Cleanup Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
