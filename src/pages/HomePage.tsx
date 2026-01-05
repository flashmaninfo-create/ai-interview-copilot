import { HeroSection } from './landing/HeroSection';
import { PainPointsSection } from './landing/PainPointsSection';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { ComparisonSection } from './landing/ComparisonSection';
import { FeaturesGrid } from './landing/FeaturesGrid';
import { CareerStageSection } from './landing/CareerStageSection';
import { EthicalSection } from './landing/EthicalSection';
import { StatsSection } from './landing/StatsSection';
import { FAQSection } from './landing/FAQSection';
import { CTASection } from './landing/CTASection';
import { RealTimeGuidanceSection } from './landing/RealTimeGuidanceSection';

import { SEO } from '../components/SEO';

export function HomePage() {
  return (
    <div className="bg-background min-h-screen text-slate-200 selection:bg-primary/30">
      <SEO 
        title="AI Interview Copilot - Ace Technical Interviews" 
        description="Your invisible AI assistant for technical interviews. Get real-time transcription, smart hints, and coding assistance directly in your browser."
      />
      
      {/* 2.1 Hero section (top) */}
      <HeroSection />

      {/* 2.2 “Interview gap” strip */}
      <PainPointsSection />

      {/* 2.3 “Real-time guidance” media section */}
      <RealTimeGuidanceSection />

      {/* 2.4 “What it is / What it’s not” section */}
      <ComparisonSection />

      {/* 2.5 “How it works” three-step section */}
      <HowItWorksSection />
      
      {/* 2.6 “Everything you need” feature grid */}
      <FeaturesGrid />
      
      {/* 2.7 Dark “Built for every stage” slider section */}
      <CareerStageSection />

      {/* 2.8 Yellow “Ethical. Transparent. Legal.” section */}
      <EthicalSection />
      
      {/* 2.9 Metrics and testimonial section */}
      <StatsSection />
      {/* Note: PRD mentions testimonial below metrics, which is now handled inside StatsSection */}

      {/* 2.10 FAQ section */}
      <FAQSection />

      {/* 2.11 Final CTA + footer */}
      {/* CTA Section includes the gradient band */}
      <CTASection />
      {/* Footer is likely in Layout or App component, but if here, it should be separate. 
          Assuming Layout wraps this, or Footer is in global Layout. 
          If not, we might need <Footer /> here. Checking import... 
          No Footer imported in original file, likely handled by Layout. */}
    </div>
  );
}
