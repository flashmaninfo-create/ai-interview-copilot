import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Section } from '../../components/ui/Section';
import { FadeIn } from '../../components/ui/motion';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <Section className="py-24 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white overflow-hidden relative">
        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <FadeIn>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            Ready to Nail Your Next Interview?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto font-medium">
            Join thousands of candidates who transformed their interview performance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              onClick={() => navigate('/signup')}
              className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg font-bold rounded-lg shadow-xl"
            >
              Get Started for Free
            </Button>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-white/80">
              <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span>7-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span>Cancel anytime</span>
              </div>
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}
