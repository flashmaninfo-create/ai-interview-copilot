import { useState } from 'react';
import { Check, HelpCircle } from 'lucide-react';
import { SEO } from '../components/SEO';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FadeIn, SlideUp } from '../components/ui/motion';
import { PaymentModal } from '../components/payment/PaymentModal';

const plans = [
  {
    name: "Free Starter",
    price: { monthly: "0", annual: "0" },
    desc: "Essential tools for casual interviewing.",
    features: [
      "50 monthly credits",
      "Basic transcription (Deepgram Nova)",
      "Google Meet support",
      "Community support access"
    ],
    cta: "Get Started Free",
    popular: false
  },
  {
    name: "Pro Interviewer",
    price: { monthly: "29", annual: "24" },
    desc: "Power features for serious job seekers.",
    features: [
      "Unlimited transcriptions",
      "1,000 AI Hint credits / month",
      "GPT-4 & Claude 3.5 Support",
      "Live Coding Assistance",
      "Screenshot Analysis",
      "Priority email support"
    ],
    cta: "Start 7-Day Trial",
    popular: true
  },
  {
    name: "Enterprise",
    price: { monthly: "Custom", annual: "Custom" },
    desc: "For bootcamps and coaching agencies.",
    features: [
      "Bulk license management",
      "Custom LLM fine-tuning",
      "Analytics dashboard",
      "Dedicated account manager",
      "SLA & Uptime guarantees"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

const faqs = [
  { q: "How do credits work?", a: "Credits are used for AI hints. One credit equals one AI suggestion. Transcription itself is unlimited on Pro plans." },
  { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription instantly from the dashboard. You'll keep access until the end of your billing period." },
  { q: "Is there a refund policy?", a: "We offer a 14-day money-back guarantee if you're not satisfied with the Pro plan." },
  { q: "Does it work on Mac?", a: "Yes! Our Chrome Extension works on any desktop OS (Windows, macOS, Linux) that runs Google Chrome." }
];

export function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    planName: '',
    amount: '',
    credits: 0,
    planId: ''
  });

  const handleSubscribe = (plan: typeof plans[0]) => {
    // Determine amount based on annual/monthly toggle
    const price = isAnnual ? plan.price.annual : plan.price.monthly;

    // Simple logic to set credit amount based on plan
    // In a real app, this should be data-driven
    let credits = 0;
    let planId = '';

    if (plan.name.includes("Free")) {
      // Free plan logic (maybe redirect to signup or dashboard)
      window.location.href = '/dashboard';
      return;
    } else if (plan.name.includes("Pro")) {
      credits = 1000; // Plan features say 1,000 AI Hint credits
      planId = isAnnual ? 'pro_annual' : 'pro_monthly';
    } else if (plan.name.includes("Enterprise")) {
      // Enterprise contact us
      window.location.href = 'mailto:sales@interview-copilot.com';
      return;
    }

    setPaymentModal({
      isOpen: true,
      planName: plan.name,
      amount: price,
      credits: credits,
      planId: planId
    });
  };

  return (
    <div className="bg-background min-h-screen text-slate-200">
      <SEO
        title="Pricing"
        description="Simple, transparent pricing for every stage of your career. Start for free and upgrade as you need."
      />

      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
        planName={paymentModal.planName}
        amount={paymentModal.amount}
        credits={paymentModal.credits}
        planId={paymentModal.planId}
      />

      <main className="pt-24 pb-16">
        <Section className="text-center">
          <FadeIn>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Invest in your career for less than the cost of a networking coffee.
            </p>

            <div className="flex items-center justify-center gap-4 mb-16">
              <span className={`text-sm font-medium ${!isAnnual ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="w-14 h-8 rounded-full bg-surface border border-white/10 relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-primary transition-all duration-300 ${isAnnual ? 'left-7' : 'left-1'}`}></div>
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isAnnual ? 'text-white' : 'text-slate-500'}`}>Annual</span>
                <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Save 20%</span>
              </div>
            </div>
          </FadeIn>
        </Section>

        <Section>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, idx) => (
              <SlideUp key={idx} delay={idx * 0.1} className={plan.popular ? '-mt-4' : ''}>
                <Card className={`h-full flex flex-col relative ${plan.popular ? 'border-primary shadow-2xl shadow-primary/10 bg-surface/80' : 'bg-surface/30'}`}>
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      BEST VALUE
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-sm text-slate-400 h-10">{plan.desc}</p>
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="text-4xl font-bold text-white">
                        {plan.price.monthly === "Custom" ? "Custom" : `$${isAnnual ? plan.price.annual : plan.price.monthly}`}
                      </span>
                      {plan.price.monthly !== "Custom" && (
                        <span className="text-slate-500">/mo</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-success shrink-0" />
                        <span className="text-sm text-slate-300">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant={plan.popular ? 'gradient' : 'outline'}
                    fullWidth
                    onClick={() => handleSubscribe(plan)}
                  >
                    {plan.cta}
                  </Button>
                </Card>
              </SlideUp>
            ))}
          </div>
        </Section>

        <Section className="bg-surface/20 mt-12 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {faqs.map((faq, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="bg-surface/50 border border-white/5 p-6 rounded-xl hover:border-primary/30 transition-colors">
                    <h4 className="font-bold text-white mb-2 flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      {faq.q}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed ml-8">{faq.a}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
