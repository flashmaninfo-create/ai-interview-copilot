import { MessageCircle, Grid, Clock, Layers, ArrowRightLeft } from 'lucide-react';
import { Section } from '../../components/ui/Section';
import { Card } from '../../components/ui/Card';
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/ui/motion';

const painPoints = [
  {
    icon: MessageCircle,
    title: 'Rambling Answers',
    description: 'Starting strong but losing structure halfway through.'
  },
  {
    icon: Grid,
    title: 'Forgetting Key Points',
    description: 'Blanking on critical details when nervous.'
  },
  {
    icon: Clock,
    title: 'Poor Time Management',
    description: 'Spending too long on wrong aspects of the answer.'
  },
  {
    icon: Layers,
    title: 'Weak Technical Depth',
    description: 'Unable to recall frameworks and methodologies on spot.'
  },
  {
    icon: ArrowRightLeft,
    title: 'Lost Interviewer Interest',
    description: 'Missing cues when answer doesn\'t land well.'
  }
];

export function PainPointsSection() {
  return (
    <Section className="bg-slate-50 py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <FadeIn>
          <div className="text-[#6366F1] font-bold tracking-[0.2em] text-sm mb-4 uppercase">The Interview Gap</div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            You Know the Answer. <br className="hidden md:block" /> But Can You Deliver It Perfectly?
          </h2>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Under pressure, even experienced professionals struggle to articulate their expertise clearly and confidently.
          </p>
        </FadeIn>
      </div>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {painPoints.map((point, index) => (
          <StaggerItem key={index}>
            <Card className="h-full p-6 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl text-left">
              <div className="mb-6">
                <point.icon className="w-8 h-8 text-[#6366F1]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {point.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                {point.description}
              </p>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

    </Section>
  );
}


