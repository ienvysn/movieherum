import '../styles/globals.css';
import '../styles/home.css';
import '../styles/movie.css';
import Layout from '../components/Layout';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Movie Herum - Find Movie Showtimes</title>
        <meta name="description" content="Aggregate movie showtimes across different cinemas in Nepal." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" type="image/png" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
