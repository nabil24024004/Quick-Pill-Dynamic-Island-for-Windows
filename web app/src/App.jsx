import { useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Navbar      from './components/Navbar';
import Hero        from './components/Hero';
import Features    from './components/Features';
import HowItWorks  from './components/HowItWorks';
import Audiences   from './components/Audiences';
import TechStack   from './components/TechStack';
import Shortcuts   from './components/Shortcuts';
import Download    from './components/Download';
import Footer      from './components/Footer';
import ThankYou    from './components/ThankYou';

// Register GSAP plugins once at the app root
gsap.registerPlugin(ScrollTrigger);

function isThankYouPath() {
  const hash = window.location.hash.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    hash.includes('thank-you') ||
    path.endsWith('/thank-you') ||
    path.endsWith('/thank-you/') ||
    search.includes('thank-you') ||
    search.includes('download=true')
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState(() => isThankYouPath() ? 'thank-you' : 'home');

  useEffect(() => {
    const handleRouteChange = () => {
      if (isThankYouPath()) {
        setCurrentView('thank-you');
      } else {
        setCurrentView('home');
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  useEffect(() => {
    if (currentView === 'home') {
      // Refresh ScrollTrigger after homepage sections mount
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 150);
    }
  }, [currentView]);

  const handleNavigateToThankYou = useCallback(() => {
    window.history.pushState({}, '', '#/thank-you');
    setCurrentView('thank-you');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleNavigateToHome = useCallback(() => {
    window.history.pushState({}, '', window.location.pathname);
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  if (currentView === 'thank-you') {
    return <ThankYou onBackToHome={handleNavigateToHome} />;
  }

  return (
    <>
      <Navbar />

      <main>
        <Hero onDownloadClick={handleNavigateToThankYou} />

        {/* White section */}
        <Features />

        {/* Black section separator */}
        <div className="section-rule--white" />

        {/* Black section */}
        <HowItWorks />

        {/* White section separator */}
        <div className="section-rule" />

        {/* White section */}
        <Audiences />

        {/* Tech ticker — black strip */}
        <TechStack />

        {/* White section */}
        <Shortcuts />

        {/* Black CTA */}
        <div className="section-rule--white" />
        <Download onDownloadClick={handleNavigateToThankYou} />
      </main>

      <Footer />
    </>
  );
}
