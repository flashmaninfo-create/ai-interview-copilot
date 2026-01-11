import Icon from '../../../components/ui/AppIcon';
import { Link } from 'react-router-dom';

interface HeroSectionProps {
  onTrialClick?: () => void;
  onDemoClick: () => void;
}

const HeroSection = ({ onDemoClick }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[calc(100vh-5rem)] bg-gradient-to-br from-primary via-primary/95 to-secondary overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-accent/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <Icon name="SparklesIcon" size={20} className="text-accent" variant="solid" />
              <span className="text-sm font-medium text-primary-foreground">Real-Time AI Interview Assistant</span>
            </div>

            <h1 className="font-headline text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight">
              Get Real-Time AI Help During Live Interviews
            </h1>

            <p className="text-xl text-primary-foreground/90 leading-relaxed">
              Xtroone listens to the interviewer, transcribes questions instantly, and gives you accurate, role-specific answers — discreetly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className="font-cta px-8 py-4 bg-accent text-accent-foreground rounded-lg text-lg font-semibold shadow-cta hover:bg-accent/90 transition-all duration-250 flex items-center justify-center gap-2">
                Start Free Trial
                <Icon name="ArrowRightIcon" size={20} />
              </Link>
              <button
                onClick={onDemoClick}
                className="font-cta px-8 py-4 bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground rounded-lg text-lg font-semibold hover:bg-primary-foreground/20 transition-all duration-250 flex items-center justify-center gap-2">
                <Icon name="PlayIcon" size={20} variant="solid" />
                See How It Works
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 pt-8 border-t border-primary-foreground/20">
              <div className="flex items-center gap-2">
                <Icon name="MicrophoneIcon" size={20} className="text-accent" />
                <span className="text-xs text-primary-foreground/80">Audio-only</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="ShieldCheckIcon" size={20} className="text-accent" variant="solid" />
                <span className="text-xs text-primary-foreground/80">No recording</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="HandRaisedIcon" size={20} className="text-accent" />
                <span className="text-xs text-primary-foreground/80">Manual control</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="DevicePhoneMobileIcon" size={20} className="text-accent" />
                <span className="text-xs text-primary-foreground/80">Multi-device</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-card">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive"></div>
                <div className="w-3 h-3 rounded-full bg-warning"></div>
                <div className="w-3 h-3 rounded-full bg-success"></div>
                <span className="text-xs text-muted-foreground ml-2">Chrome Extension</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-start gap-3 mb-2">
                    <Icon name="MicrophoneIcon" size={16} className="text-primary mt-1" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Live Transcription</div>
                      <div className="text-sm text-foreground">"Can you explain your approach to system design?"</div>
                    </div>
                  </div>
                </div>
                <div className="bg-accent/5 rounded-lg p-4 border border-accent/20">
                  <div className="flex items-start gap-3">
                    <Icon name="SparklesIcon" size={16} className="text-accent mt-1" variant="solid" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">AI Answer</div>
                      <div className="text-sm text-foreground">Start with requirements gathering, then discuss scalability patterns...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-6 bg-card rounded-xl shadow-xl p-4 max-w-xs border border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="DeviceTabletIcon" size={20} className="text-success" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Stealth Console</div>
                  <div className="text-xs text-muted-foreground">Second Device Mode</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
