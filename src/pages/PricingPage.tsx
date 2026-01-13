import { useState, useEffect } from 'react';
import { Check, HelpCircle } from 'lucide-react';
import { SEO } from '../components/SEO';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FadeIn, SlideUp } from '../components/ui/motion';
import { PaymentModal } from '../components/payment/PaymentModal';
import Header from '../components/common/Header';
import Footer from './LandingPage/sections/Footer';

import { planService } from '../lib/services/planService';



interface PricingPlan {
  id: string;
  name: string;
  price: { monthly: string | number; annual: string | number };
  desc: string;
  features: string[];
  cta: string;
  popular: boolean;
  credits: number;
}

const faqs = [
  { q: "How do credits work?", a: "Credits are used for AI hints. One credit equals one AI suggestion. Transcription itself is unlimited on Pro plans." },
  { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription instantly from the dashboard. You'll keep access until the end of your billing period." },
  { q: "Is there a refund policy?", a: "We offer a 14-day money-back guarantee if you're not satisfied with the Pro plan." },
  { q: "Does it work on Mac?", a: "Yes! Our Chrome Extension works on any desktop OS (Windows, macOS, Linux) that runs Google Chrome." }
];

export function PricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    planName: '',
    amount: '',
    credits: 0,
    planId: ''
  });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data } = await planService.getActivePlans();
        const transformedPlans: PricingPlan[] = data.map(plan => {
          let features: string[] = [];
          if (Array.isArray(plan.features)) {
            features = plan.features.map(f => String(f));
          }

          // Calculate annual price with ~20% discount if not 0
          const monthly = plan.price_monthly;
          const annualRaw = monthly * 12 * 0.8; 
          const annualPerMonth = Math.round(annualRaw / 12); // Price per month when billed annually

          return {
            id: plan.id,
            name: plan.name,
            price: { 
                monthly: monthly === 0 ? "0" : monthly, 
                annual: monthly === 0 ? "0" : annualPerMonth 
            },
            desc: plan.summary || '',
            features: features,
            cta: monthly === 0 ? "Get Started Free" : `Start ${plan.name}`,
            popular: plan.slug === 'professional',
            credits: plan.credits_monthly || 0
          };
        });
        
        // Add Enterprise plan statically as it's custom
        if (!transformedPlans.find(p => p.name === 'Enterprise')) {
             transformedPlans.push({
                id: 'enterprise',
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
                popular: false,
                credits: 0
              });
        }

        setPlans(transformedPlans);
      } catch (error) {
        console.error("Error fetching plans", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = (plan: PricingPlan) => {
    // Use monthly price
    const price = plan.price.monthly;

    // Set credit amount based on plan
    const credits = plan.credits;
    let planId = plan.id; // Use DB ID

    // Fallback logic for credits if not in DB (fetched plan might need credit info in UI object if needed)
    // But for now, we pass planId which backend uses to lookup credits.
    // For specific logic like "Free" checks:
    if (String(plan.price.monthly) === "0") {
       window.location.href = '/dashboard';
       return;
    } else if (String(plan.price.monthly) === "Custom") {
       window.location.href = 'mailto:sales@interview-copilot.com';
       return;
    }

    setPaymentModal({
      isOpen: true,
      planName: plan.name,
      amount: String(price),
      credits: credits, // This might be unused if backend handles it, or we need to pass it. 
      // The modal likely uses it for display. 
      // We don't have credits in PricingPlan interface above, let's add it if needed or ignore.
      // Looking at original code: credits = 1000 for Pro.
      // We can assume plans from DB have credits. 
      // Let's rely on planId largely.
      planId: planId
    });
  };

  return (
    <>
      <SEO
        title="Pricing"
        description="Simple, transparent pricing for every stage of your career. Start for free and upgrade as you need."
      />

      <Header />

      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
        planName={paymentModal.planName}
        amount={paymentModal.amount}
        credits={paymentModal.credits}
        planId={paymentModal.planId}
      />

      <main className="pt-24 pb-16 min-h-screen bg-white text-slate-900">
        <Section className="text-center">
          <FadeIn>
            <h1 className="font-headline text-4xl md:text-6xl font-bold text-foreground mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Invest in your career for less than the cost of a networking coffee.
            </p>

            {loading && (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            )}
          </FadeIn>
        </Section>

        <Section>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, idx) => (
              <SlideUp key={idx} delay={idx * 0.1} className={plan.popular ? '-mt-4' : ''}>
                <Card className={`h-full flex flex-col relative ${plan.popular ? 'border-accent ring-2 ring-accent/20 bg-card shadow-2xl' : 'bg-card border-border'}`}>
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      BEST VALUE
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="font-headline text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground h-10">{plan.desc}</p>
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="text-4xl font-bold text-foreground">
                        {plan.price.monthly === "Custom" ? "Custom" : `₹${plan.price.monthly}`}
                      </span>
                      {plan.price.monthly !== "Custom" && plan.price.monthly !== 0 && (
                        <span className="text-muted-foreground">/pack</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-success shrink-0" />
                        <span className="text-sm text-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="primary"
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

        <Section className="bg-gradient-to-br from-primary/5 to-secondary/5 mt-12 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-headline text-3xl font-bold text-foreground text-center mb-12">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {faqs.map((faq, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="bg-card border border-border p-6 rounded-xl hover:border-primary/30 transition-colors shadow-card">
                    <h4 className="font-semibold text-foreground mb-2 flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      {faq.q}
                    </h4>
                    <p className="text-muted-foreground text-sm leading-relaxed ml-8">{faq.a}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </Section>
      </main>

      <Footer />
    </>
  );
}
