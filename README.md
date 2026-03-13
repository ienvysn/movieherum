# 🎬 FlimHerum (https://flimherum.vercel.app/)

FlimHerum is a premium, real-time movie showtime aggregator designed to simplify the cinema-going experience in Nepal. It brings together data from all major cinema chains into a single, beautiful interface.

## ✨ Features

- **Real-time Updates**: Instant showtime information across all major Nepali cinema chains.
- **Premium UI/UX**: Modern, dark-themed interface with smooth animations and responsive design.
- **Smart Filtering**: Search by movie title and filter by date to find exactly what you're looking for.
- **Centralized Database**: Efficient storage and retrieval of movie metadata and showtimes.
- **Enriched Metadata**: Integrated with high-quality posters, genres, and movie details.
- **Automated Updates**: Scheduled background tasks to keep showtimes up-to-date.

## 🏛️ Supported Cinemas

FilmHerum currently aggregates showtimes from:
- [x] QFX Cinemas
- [x] Big Movies
- [x] One Cinemas
- [x] Ranjana Cineplex
- [x] FCube Cinemas
- [x] CK Cinemas
- [x] Infinity Digital Cinema
- [x] Ini Cinemas

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Frontend**: React 19, Vanilla CSS (Glassmorphism), Lucide Icons
- **Backend**: Next.js API Routes
- **Database**: [Supabase](https://supabase.com/)
- **External APIs**: TMDB (The Movie Database)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm
- Supabase Account
- TMDB API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/filmherum.git
   cd filmherum
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   TMDB_API_KEY=your_tmdb_api_key
   CRON_SECRET=your_secret_for_updates
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the result.

## 📡 Automated Updates

System tasks are implemented to keep the movie database fresh.

> [!TIP]
> Use the `Authorization: Bearer YOUR_CRON_SECRET` header for secure update requests.

## 🗺️ Project Structure

```text
├── components/         # Reusable UI components
├── lib/               # Utility functions & API clients
├── pages/
│   ├── api/           # Backend automated update routes
│   └── ...            # Frontend pages
├── public/            # Static assets
├── styles/            # Vanilla CSS styling
└── scripts/           # Maintenance and helper scripts
```

## 📄 License

This project is licensed under the ISC License.

---
Built with ❤️ for movie lovers in Nepal.
