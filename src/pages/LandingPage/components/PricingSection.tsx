import { useState, useEffect } from 'react';
import Icon from '../../../components/ui/AppIcon';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../../lib/services/adminService';

interface PricingTier {
  id: string;
  name: string;
  credits: string;
  price: number | string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}

const PricingSection = () => {
  const navigate = useNavigate();
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const plans = await adminService.getCreditPlans();
        
        // Filter to only active plans and transform to UI format
        const activePlans = plans.filter(plan => plan.active);
        
        const transformedTiers: PricingTier[] = activePlans.map((plan) => {
          // Format price with INR currency (always use ₹)
          const formattedPrice = plan.price === 0 
            ? 0 
            : `₹${plan.price}`;
          
          // Generate description based on plan details
          let description = '';
          if (plan.price === 0) {
            description = 'Perfect for testing the platform';
          } else if (plan.popular) {
            description = 'Most popular choice for serious job seekers';
          } else if (plan.credits >= 300) {
            description = 'Best value for comprehensive interview preparation';
          } else {
            description = 'Great for getting started with interviews';
          }

          // Generate CTA text
          const cta = plan.price === 0 
            ? 'Start Free Trial' 
            : `Buy ${plan.name}`;

          return {
            id: plan.id,
            name: plan.name,
            credits: `${plan.credits} credits`,
            price: formattedPrice,
            description,
            features: plan.features,
            cta,
            popular: plan.popular || false
          };
        });

        setPricingTiers(transformedTiers);
      } catch (err) {
        console.error('Failed to fetch pricing plans:', err);
        setError('Failed to load pricing. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleCTAClick = () => {
    // Navigate to payment page for all tiers
    navigate('/payment');
  };

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full mb-6">
            <Icon name="CurrencyDollarIcon" size={20} className="text-accent" />
            <span className="text-sm font-medium text-accent">Simple & Honest Pricing</span>
          </div>
          <h2 className="font-headline text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Credits-Based Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Pay only for what you use. No inflated promises, no fake ROI claims. Just honest, transparent pricing.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl shadow-xl border border-border p-8 animate-pulse">
                <div className="h-8 bg-muted rounded mb-4 w-3/4"></div>
                <div className="h-4 bg-muted rounded mb-6 w-1/2"></div>
                <div className="h-12 bg-muted rounded mb-6 w-1/3"></div>
                <div className="h-12 bg-muted rounded mb-8"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-4 bg-muted rounded w-full"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12 mb-12 bg-card rounded-2xl border border-border">
            <Icon name="ExclamationCircleIcon" size={48} className="text-error mx-auto mb-4" />
            <p className="text-lg text-foreground mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-accent hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Pricing Tiers Grid */}
        {!loading && !error && <div className="grid lg:grid-cols-3 gap-8 mb-12">
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
                    <span className="text-4xl font-bold text-foreground">{typeof tier?.price === 'number' ? (tier?.price === 0 ? 'Free' : `$${tier?.price}`) : tier?.price}</span>
                    {tier?.price !== 0 && typeof tier?.price !== 'number' && (
                      <span className="text-muted-foreground">/ pack</span>
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
        </div>}

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
