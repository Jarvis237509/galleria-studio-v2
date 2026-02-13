import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Studio from './pages/Studio';
import Gallery from './pages/Gallery';
import Layout from './components/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#2d2a25',
            color: '#f0eeea',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="/studio" element={<Studio />} />
          <Route path="/gallery" element={<Gallery />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}