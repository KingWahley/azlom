import "../styles/globals.css";
import Layout from "../components/Layout";
import { useEffect } from "react";
export default function App({ Component, pageProps }) {
  useEffect(() => {
    import("leaflet/dist/leaflet.css");
  }, []);
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
