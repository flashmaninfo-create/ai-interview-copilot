import { Section } from '../../components/ui/Section';
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/ui/motion';
import { Headphones, Grid, MessageSquare } from 'lucide-react';

const steps = [
  {
    id: '01',
    icon: Headphones,
    title: 'Start Before Interview',
    description: 'Launch Copilot on your device. It runs quietly in the background, ready to assist.'
  },
  {
    id: '02',
    icon: Grid,
    title: 'Copilot Listens & Analyzes',
    description: 'AI understands the question context, identifies key themes, and prepares structured guidance instantly.'
  },
  {
    id: '03',
    icon: MessageSquare,
    title: 'You Speak Naturally',
    description: 'Get real-time prompts on structure, key points, and what to emphasize—while you deliver in your own voice.'
  }
];

export function HowItWorksSection() {
  return (
    <Section className="bg-white py-24 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
            <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 blur-[100px] rounded-full"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 blur-[100px] rounded-full"></div>
        </div>

      <div className="text-center max-w-3xl mx-auto mb-20 relative z-10">
        <FadeIn>
          <div className="text-primary font-bold tracking-wider text-sm mb-4 uppercase">Simple. Powerful. Instant.</div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            How Interview Copilot Works
          </h2>
        </FadeIn>
      </div>

      <StaggerContainer className="grid md:grid-cols-3 gap-8 relative z-10">
         {/* Connecting Line (Desktop) */}
         <div className="hidden md:block absolute top-[60px] left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-primary/10 via-primary/40 to-primary/10 -z-10"></div>

        {steps.map((step, index) => (
          <StaggerItem key={index} className="flex flex-col items-center text-center group">
            <div className="relative mb-8">
                <div className="text-6xl font-bold text-slate-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none scale-150 transform group-hover:scale-125 transition-transform duration-500">
                    {step.id}
                </div>
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg group-hover:border-primary/50 group-hover:shadow-primary/20 transition-all duration-300 relative z-10">
                     <step.icon className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-4">{step.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed max-w-xs mx-auto font-medium">{step.description}</p>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </Section>
  );
}

