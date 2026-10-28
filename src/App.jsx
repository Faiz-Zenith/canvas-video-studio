import React from 'react';
import I18nProvider from './i18n/I18nProvider';
import SiteHeader from './components/SiteHeader';
import Hero from './components/Hero';
import About from './components/About';
import Studio from './components/Studio';
import VectorStudio from './components/VectorStudio';

export default function App() {
  return (
    <I18nProvider>
      <SiteHeader />
      <main>
        <Hero />
        <About />
        <Studio />
        <VectorStudio />
      </main>
    </I18nProvider>
  );
}