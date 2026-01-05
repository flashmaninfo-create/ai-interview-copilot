import { SEO } from '../components/SEO';
import { Section } from '../components/ui/Section';
import { FadeIn, SlideUp } from '../components/ui/motion';
import { Button } from '../components/ui/Button';
import { Chrome, LayoutDashboard, Play, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: Chrome,
    title: "1. Install & Pin Extension",
    desc: "Get the extension from the Chrome Web Store. Pin it to your toolbar for instant access.",
    detail: "Takes less than 30 seconds."
  },
  {
    icon: LayoutDashboard,
    title: "2. Create Your Account",
    desc: "Sign up on our dashboard to get your starter credits and configure your preferences.",
    detail: "No credit card needed for trial."
  },
  {
    icon: Play,
    title: "3. Start an Interview",
    desc: "Open Google Meet or Zoom. Our extension detects the call and overlay appears automatically.",
    detail: "Compatible with all major platforms."
  },
  {
    icon: CheckCircle,
    title: "4. Get Live Assistance",
    desc: "As the interviewer speaks, see real-time transcripts and AI-suggested answers instantly.",
    detail: "Stay focused on the conversation."
  }
];

export function HowItWorksPage() {
  return (
    <div className="bg-background min-h-screen text-slate-200">
      <SEO 
        title="How It Works" 
        description="See how Interview Copilot helps you ace interviews in 4 simple steps. Install, setup, interview, and succeed."
      />
      <main className="pt-24 pb-16">
        <Section className="text-center">
          <FadeIn>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              How it works
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              From installation to your first aced interview in minutes.
            </p>
          </FadeIn>
        </Section>

        <Section>
          <div className="max-w-4xl mx-auto space-y-24 relative">
             <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent hidden md:block"></div>

             {steps.map((step, idx) => (
                <SlideUp key={idx} className="relative flex flex-col md:flex-row gap-8 items-start">
                   <div className="w-14 h-14 rounded-full bg-surface border border-white/10 flex items-center justify-center shrink-0 z-10 shadow-xl shadow-primary/5 relative">
                      <step.icon className="w-6 h-6 text-primary" />
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse"></div>
                   </div>
                   <div className="flex-1 pt-2">
                      <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                      <p className="text-lg text-slate-400 mb-2">{step.desc}</p>
                      <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full inline-block">
                         {step.detail}
                      </span>
                   </div>
                   <div className="w-full md:w-1/3 aspect-video bg-surface/50 rounded-xl border border-white/5 flex items-center justify-center">
                        <span className="text-xs text-slate-600">Step {idx + 1} Visualization</span>
                   </div>
                </SlideUp>
             ))}
          </div>
        </Section>

        <Section className="text-center mt-12">
           <Button variant="gradient" size="lg">Start Your Setup Now</Button>
        </Section>
      </main>
    </div>
  );
}
