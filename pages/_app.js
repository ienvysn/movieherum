import '../styles/globals.css';
import Layout from '../components/Layout';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Cinemax - Find Movie Showtimes</title>
        <meta name="description" content="Aggregate movie showtimes across different cinemas." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}
