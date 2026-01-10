import { useState } from 'react';
import Header from '../../components/common/Header';
import ScrollProgress from '../../components/common/ScrollProgress';
import HeroSection from './sections/HeroSection';
import ProblemSection from './sections/ProblemSection';
import SolutionSection from './sections/SolutionSection';
import InteractiveDemoSection from './sections/InteractiveDemoSection';
import BenefitsSection from './sections/BenefitsSection';
import TestimonialsSection from './sections/TestimonialsSection';
import PricingSection from './sections/PricingSection';
import FAQSection from './sections/FAQSection';
import CTASection from './sections/CTASection';
import Footer from './sections/Footer';


const LandingPage = () => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const handleDemoClick = () => {
    setIsDemoModalOpen(true);
  };

  return (
    <>
      <Header />
      <ScrollProgress />
      
      <main>
        <HeroSection onDemoClick={handleDemoClick} />
        <ProblemSection />
        <SolutionSection />
        <InteractiveDemoSection />
        <BenefitsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>

      <Footer />



      {isDemoModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl max-w-4xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-headline text-2xl font-semibold text-foreground">AI Coaching Demo</h3>
              <button
                onClick={() => setIsDemoModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-muted transition-colors duration-250 flex items-center justify-center"
              >
                <span className="text-2xl text-muted-foreground">&times;</span>
              </button>
            </div>
            <div className="aspect-video bg-muted">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="AI Interview Coaching Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-b-2xl"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LandingPage;
