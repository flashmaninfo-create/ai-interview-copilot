import { Zap, Shield, Grid, Brain, MessageCircle } from 'lucide-react';

import { Section } from '../../components/ui/Section';
import { Card } from '../../components/ui/Card';
import { FadeIn } from '../../components/ui/motion';

const features = [
  {
    icon: Grid,
    title: 'Context-Aware Intelligence',
    description: 'Understands technical vs. behavioral vs. HR questions automatically.'
  },
  {
    icon: Brain,
    title: 'STAR Framework Prompts',
    description: 'Get situation-task-action-result structure hints instantly.'
  },
  {
    icon: MessageCircle,
    title: 'Role-Specific Knowledge',
    description: 'Tailored guidance for developers, managers, analysts, and more.'
  },
  {
    icon: Shield,
    title: 'Privacy-First Design',
    description: 'Zero interview recordings stored. Your data stays yours.'
  },
  {
    icon: Zap,
    title: 'Confidence Cues',
    description: 'Real-time signals on what to say next and what to avoid.'
  },
  {
    icon: Grid,
    title: 'Works Across Interview Types',
    description: 'Technical, behavioral, managerial, HR—all covered.'
  }
];

export function FeaturesGrid() {
  return (
    <Section className="bg-white py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <FadeIn>
          <div className="text-primary font-bold tracking-wider text-sm mb-4 uppercase">Powerful Features</div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            Everything You Need to <br/> Ace Any Interview
          </h2>
        </FadeIn>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <FadeIn key={index} delay={index * 0.1}>
            <Card hoverEffect className="h-full p-8 group hover:bg-slate-50 bg-white border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                {feature.description}
              </p>
            </Card>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

