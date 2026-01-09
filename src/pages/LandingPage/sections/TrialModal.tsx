import { useState } from 'react';
import Icon from '../../../components/ui/AppIcon';

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TrialModal = ({ isOpen, onClose }: TrialModalProps) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    careerLevel: '',
    industry: ''
  });
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      console.log('Trial signup:', formData);
      onClose();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="font-headline text-2xl font-semibold text-foreground">
              Start Your Free 7-Day Trial
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {step} of 2 - {step === 1 ? 'Basic Information' : 'Career Details'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-muted transition-colors duration-250 flex items-center justify-center"
            aria-label="Close modal"
          >
            <Icon name="XMarkIcon" size={24} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="bg-accent/5 rounded-lg p-4 border border-accent/20">
                <div className="flex items-start gap-3">
                  <Icon name="InformationCircleIcon" size={20} className="text-accent flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <strong>No credit card required.</strong> Your 7-day trial starts immediately with full access to all premium features.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Career Level *
                </label>
                <select
                  name="careerLevel"
                  value={formData.careerLevel}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select your career level</option>
                  <option value="entry">Entry Level (0-2 years)</option>
                  <option value="mid">Mid Level (3-5 years)</option>
                  <option value="senior">Senior Level (6-10 years)</option>
                  <option value="lead">Lead/Principal (10+ years)</option>
                  <option value="executive">Executive/C-Suite</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industry *
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select your industry</option>
                  <option value="technology">Technology</option>
                  <option value="finance">Finance & Banking</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="marketing">Marketing & Advertising</option>
                  <option value="sales">Sales</option>
                  <option value="consulting">Consulting</option>
                  <option value="education">Education</option>
                  <option value="retail">Retail</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="bg-success/5 rounded-lg p-4 border border-success/20">
                <div className="flex items-start gap-3">
                  <Icon name="CheckCircleIcon" size={20} className="text-success flex-shrink-0 mt-0.5" variant="solid" />
                  <div className="text-sm text-foreground">
                    <strong>Personalized coaching ready!</strong> We'll customize your practice sessions based on your career level and industry.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-8">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 transition-all duration-250"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-accent text-accent-foreground rounded-lg font-semibold shadow-cta hover:bg-accent/90 transition-all duration-250 flex items-center justify-center gap-2"
            >
              {step === 1 ? 'Continue' : 'Start Free Trial'}
              <Icon name="ArrowRightIcon" size={20} />
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              By signing up, you agree to our{' '}
              <a href="/terms" className="text-accent hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a>
            </p>
          </div>
        </form>

        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 px-8 py-6 border-t border-border">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-accent mb-1">10</div>
              <div className="text-xs text-muted-foreground">Practice Sessions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent mb-1">7</div>
              <div className="text-xs text-muted-foreground">Days Free Access</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent mb-1">₹0</div>
              <div className="text-xs text-muted-foreground">No Credit Card</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialModal;
