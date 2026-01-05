import { Check } from 'lucide-react';
import { Section } from '../../components/ui/Section';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FadeIn, SlideUp } from '../../components/ui/motion';

const plans = [
  {
    name: 'Free Starter',
    price: '$0',
    frequency: '/mo',
    description: 'Perfect for trying out the platform.',
    features: ['50 monthly credits', 'Basic transcription', 'Community support', 'Google Meet only'],
    cta: 'Get Started',
    popular: false
  },
  {
    name: 'Pro Interviewer',
    price: '$29',
    frequency: '/mo',
    description: 'For candidates serious about landing the job.',
    features: ['Unlimited transcriptions', 'AI Code Assists', 'Advanced LLM Hints (GPT-4)', 'All platforms supported', 'Priority support'],
    cta: 'Start Free Trial',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    frequency: '',
    description: 'For coaching agencies and bootcamps.',
    features: ['Bulk license management', 'Custom LLM fine-tuning', 'Analytics dashboard', 'Dedicated account manager'],
    cta: 'Contact Sales',
    popular: false
  }
];

export function PricingTeaser() {
  return (
    <Section>
      <div className="text-center max-w-3xl mx-auto mb-16">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-slate-400">
            Choose the plan that fits your interview needs. No hidden fees. Cancel anytime.
          </p>
        </FadeIn>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <SlideUp key={index} delay={index * 0.1} className={index === 1 ? "-mt-4" : ""}>
            <Card className={`h-full flex flex-col relative overflow-hidden ${plan.popular ? 'border-primary shadow-2xl shadow-primary/10 bg-surface/80' : 'bg-surface/30'}`}>
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-500">{plan.frequency}</span>
                </div>
                <p className="text-slate-400 text-sm mt-4">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success shrink-0" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                variant={plan.popular ? 'primary' : 'outline'} 
                fullWidth
                className={plan.popular ? 'bg-primary hover:bg-primary/90' : ''}
              >
                {plan.cta}
              </Button>
            </Card>
          </SlideUp>
        ))}
      </div>
    </Section>
  );
}
