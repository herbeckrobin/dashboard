import '../styles/globals.css'
import PasswordGate from '../components/PasswordGate'
import { BreadcrumbProvider } from '../hooks/useBreadcrumbs'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <BreadcrumbProvider>
      <PasswordGate>
        <Head>
          <title>Admin Dashboard</title>
          <meta name="description" content="Verwaltungsoberfläche für Server" />
          <meta name="robots" content="noindex, nofollow" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/png" href="/favicon.png" />
        </Head>
        <Component {...pageProps} />
      </PasswordGate>
    </BreadcrumbProvider>
  )
}
