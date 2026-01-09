import Icon from '../../../components/ui/AppIcon';
import { useNavigate } from 'react-router-dom';

const PricingSection = () => {
  const navigate = useNavigate();

  const pricingTiers = [
    {
      id: 'trial',
      name: 'Free Trial',
      credits: '20 credits',
      price: 0,
      description: 'Perfect for testing the platform',
      features: [
        '20 credits to start',
        'Basic AI assistance',
        'Chrome Extension access',
        'Single device mode',
        'Email support'
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      id: 'professional',
      name: 'Professional Pack',
      credits: '180 credits',
      price: '₹1299',
      description: 'Most popular choice for serious job seekers',
      features: [
        '180 minutes of interview time',
        '3 hours of practice time',
        'Advanced analytics',
        'Priority email support',
        '10% savings vs starter',
        'All features included'
      ],
      cta: 'Buy Professional Pack',
      popular: true
    },
    {
      id: 'premium',
      name: 'Premium Pack',
      credits: '360 credits',
      price: '₹2399',
      description: 'Best value for comprehensive interview preparation',
      features: [
        '360 minutes of interview time',
        '6 hours of practice time',
        'Premium analytics dashboard',
        '24/7 chat support',
        '20% savings vs starter',
        'Career coaching session',
        'Priority AI processing'
      ],
      cta: 'Buy Premium Pack',
      popular: false
    }
  ];

  const handleCTAClick = () => {
    // Navigate to payment page for all tiers
    navigate('/payment');
  };

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full mb-6">
            <Icon name="CurrencyRupeeIcon" size={20} className="text-accent" />
            <span className="text-sm font-medium text-accent">Simple & Honest Pricing</span>
          </div>
          <h2 className="font-headline text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Credits-Based Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Pay only for what you use. No inflated promises, no fake ROI claims. Just honest, transparent pricing.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {pricingTiers?.map((tier) => (
            <div
              key={tier?.id}
              className={`bg-card rounded-2xl shadow-xl border overflow-hidden transition-all duration-250 hover:shadow-2xl ${
                tier?.popular ? 'border-accent ring-2 ring-accent/20 scale-105' : 'border-border'
              }`}
            >
              {tier?.popular && (
                <div className="bg-accent text-accent-foreground text-center py-2 font-semibold text-sm">
                  Most Popular
                </div>
              )}

              <div className="p-8">
                <h3 className="font-headline text-2xl font-semibold text-foreground mb-2">
                  {tier?.name}
                </h3>
                <div className="text-sm text-accent font-medium mb-4">{tier?.credits}</div>
                <p className="text-muted-foreground mb-6">{tier?.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">{typeof tier?.price === 'number' ? `₹${tier?.price}` : tier?.price}</span>
                    {typeof tier?.price === 'number' && tier?.price > 0 && (
                      <span className="text-muted-foreground">/ month</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleCTAClick()}
                  className={`w-full py-4 rounded-lg font-semibold transition-all duration-250 mb-8 ${
                    tier?.popular
                      ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-cta'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  {tier?.cta}
                </button>

                <div className="space-y-3">
                  {tier?.features?.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Icon name="CheckCircleIcon" size={20} className="text-success flex-shrink-0 mt-0.5" variant="solid" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-card border border-border">
          <h3 className="font-headline text-xl font-semibold text-foreground mb-4 text-center">
            How Credits Work
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="MicrophoneIcon" size={24} className="text-primary" />
              </div>
              <div className="font-semibold text-foreground mb-1">1 credit per minute</div>
              <div className="text-sm text-muted-foreground">of live transcription</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="SparklesIcon" size={24} className="text-accent" variant="solid" />
              </div>
              <div className="font-semibold text-foreground mb-1">2 credits per AI answer</div>
              <div className="text-sm text-muted-foreground">context-aware response</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="ClockIcon" size={24} className="text-success" />
              </div>
              <div className="font-semibold text-foreground mb-1">Credits never expire</div>
              <div className="text-sm text-muted-foreground">use them anytime</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
