import { SEO } from '../components/SEO';
import { Section } from '../components/ui/Section';
import { FadeIn, SlideUp } from '../components/ui/motion';

export function AboutPage() {
  return (
    <div className="bg-background min-h-screen text-slate-200">
      <SEO 
        title="About Us" 
        description="Learn about our mission to democratize technical interview success and our privacy-first approach."
      />
      <main className="pt-24 pb-16">
        <Section className="text-center">
          <FadeIn>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Our Mission
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              We believe every talented engineer deserves a fair shot at their dream job, rarely hindered by interview anxiety or language barriers.
            </p>
          </FadeIn>
        </Section>

        <Section className="bg-surface/30">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <SlideUp>
              <h3 className="text-2xl font-bold text-white mb-4">Why we built this</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Technical interviews have become increasingly disconnected from day-to-day engineering reality. 
                We built Xtroone to bridge that gap, providing an intelligent safety net that helps 
                you recall knowledge you already have, exactly when you need it.
              </p>
            </SlideUp>
             <SlideUp delay={0.2}>
              <h3 className="text-2xl font-bold text-white mb-4">Privacy Standards</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Your interview conversations are private. That's why we engineered our system to process 
                audio in real-time without permanent storage. Our business model relies on fair 
                subscription pricing, not selling your data.
              </p>
            </SlideUp>
          </div>
        </Section>
      </main>
    </div>
  );
}
