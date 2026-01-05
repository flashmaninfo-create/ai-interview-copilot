import { Section } from '../../components/ui/Section';

import { Card } from '../../components/ui/Card';
import { FadeIn } from '../../components/ui/motion';
import { User, ArrowRightLeft, Trophy, Code } from 'lucide-react';

const stages = [
  {
    icon: User,
    title: 'First Job Seekers',
    description: 'Structure your thoughts when you have limited experience. Turn academic projects into professional stories.'
  },
  {
    icon: ArrowRightLeft,
    title: 'Career Switchers',
    description: 'Bridge the gap between your past experience and your new role. Highlight transferable skills effectively.'
  },
  {
    icon: Trophy,
    title: 'Senior Professionals',
    description: 'Demonstrate leadership without dominating the conversation. Keep answers concise, strategic, and impactful.'
  },
  {
    icon: Code,
    title: 'Behavioral & Technical',
    description: 'Whether it\'s "Tell me about a time" or System Design, get framework-specific guidance in real-time.'
  }
];

export function CareerStageSection() {
  return (
    <Section className="bg-[#0F172A] py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Built for Every Career Stage
          </h2>
          <p className="text-lg text-slate-400 font-medium">
            Whether you're just starting out or leading a department, Interview Copilot adapts to your level.
          </p>
        </FadeIn>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {stages.map((stage, index) => (
          <FadeIn key={index} delay={index * 0.1}>
            <Card className="h-full p-6 bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-all">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
                <stage.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {stage.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                {stage.description}
              </p>
            </Card>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
