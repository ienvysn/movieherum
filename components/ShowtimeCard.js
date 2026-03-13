import { format, parseISO } from 'date-fns';
import { Clock, Calendar, Users } from 'lucide-react';

export default function ShowtimeCard({ showtime, index, movieTitle }) {
  const stDate = parseISO(showtime.start_time);

  // Determine fixed fake occupancy based on time and movie to be stable and a real number
  const movieHash = movieTitle ? movieTitle.length : 10;
  const timeHash = new Date(showtime.start_time).getHours();
  const stableRandOcc = ((movieHash + timeHash + index) % 50) + 10;

  return (
    <a
      href={showtime.booking_url}
      target="_blank"
      rel="noopener noreferrer"
      className="time-pill group"
    >
      <div className="pill-left flex flex-col gap-1-5">
        <span className="time-text flex items-center gap-2">
          <Clock size={14} className="text-muted" />
          <span>{format(stDate, 'hh:mm a')}</span>
        </span>
        <span className="date-text flex items-center gap-1-5">
          <Calendar size={12} />
          {format(stDate, 'EEE, d MMM')}
        </span>

      </div>

      <div className="pill-right flex flex-col items-end gap-1-5 justify-center">
        <span className="price-text">
          {showtime.price ? `Rs. ${showtime.price}` : "Price N/A"}
        </span>

      </div>

      <style jsx>{`
        .time-pill {
          display: flex;
          justify-content: space-between;
          background-color: var(--color-neutral-200);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: var(--radius-lg);
          padding: var(--sp-4) var(--sp-5); /* 16px vertical, 20px horizontal */
          transition: all 0.2s ease;
        }

        .time-pill:hover {
          background-color: var(--color-neutral-300);
          border-color: rgba(255,255,255,0.1);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px rgba(0,0,0,0.5);
        }

        .time-text {
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--color-neutral-1000);
        }

        .date-text {
          font-size: 0.875rem;
          color: var(--color-neutral-600);
        }

        .price-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-neutral-1000);
        }

        .occupancy-text {
          font-size: 0.875rem;
          color: var(--color-neutral-600);
        }

        .format-chip {
          font-size: 0.65rem;
          font-weight: 600;
        }

        .format-text {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-neutral-600);
        }

        .format-chip.bg-accent {
          background-color: var(--color-accent-600);
          color: var(--color-neutral-1000);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .format-chip.border-outline {
          border: 1px solid var(--color-neutral-500);
          color: var(--color-neutral-700);
          padding: 1px 5px;
          border-radius: 4px;
        }
      `}</style>
    </a>
  );
}
