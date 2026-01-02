import { Hero } from '../components/landing/Hero';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Features } from '../components/landing/Features';
import { UseCases } from '../components/landing/UseCases';
import { SocialProof } from '../components/landing/SocialProof';
import { PricingPreview } from '../components/landing/PricingPreview';
import { Footer } from '../components/landing/Footer';

export function HomePage() {
    return (
        <div className="min-h-screen bg-white">
            <Hero />
            <HowItWorks />
            <Features />
            <UseCases />
            <SocialProof />
            <PricingPreview />
            <Footer />
        </div>
    );
}
