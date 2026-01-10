import Icon from '../../../components/ui/AppIcon';

const ProblemSection = () => {
  const steps = [
    { number: '1', title: 'Sign in with Google', icon: 'UserCircleIcon' },
    { number: '2', title: 'Create interview (Resume, JD, Tech stack)', icon: 'DocumentTextIcon' },
    { number: '3', title: 'Install Chrome Extension', icon: 'PuzzlePieceIcon' },
    { number: '4', title: 'Join interview → paste meeting URL', icon: 'LinkIcon' },
    { number: '5', title: 'Interviewer speaks → live transcription', icon: 'MicrophoneIcon' },
    { number: '6', title: 'Use overlay OR Stealth Console', icon: 'DeviceTabletIcon' }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
            <Icon name="LightBulbIcon" size={20} className="text-primary" variant="solid" />
            <span className="text-sm font-medium text-primary">How It Works</span>
          </div>
          <h2 className="font-headline text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Simple Setup, Powerful Results
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get started in minutes with our streamlined 6-step process
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="bg-card rounded-xl p-6 shadow-card border border-border relative">
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-bold shadow-lg">
                {step.number}
              </div>
              <div className="flex items-start gap-4 mt-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name={step.icon as any} size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-br from-accent/5 to-secondary/5 rounded-2xl p-8 border border-accent/20">
          <div className="grid md:grid-cols-5 gap-6 text-center">
            <div>
              <Icon name="ShieldCheckIcon" size={32} className="text-accent mx-auto mb-3" variant="solid" />
              <div className="text-sm font-medium text-foreground mb-1">Audio-only transcription</div>
              <div className="text-xs text-muted-foreground">No screen recording</div>
            </div>
            <div>
              <Icon name="EyeSlashIcon" size={32} className="text-accent mx-auto mb-3" />
              <div className="text-sm font-medium text-foreground mb-1">No screen recording</div>
              <div className="text-xs text-muted-foreground">Privacy-first design</div>
            </div>
            <div>
              <Icon name="HandRaisedIcon" size={32} className="text-accent mx-auto mb-3" />
              <div className="text-sm font-medium text-foreground mb-1">Manual activation</div>
              <div className="text-xs text-muted-foreground">Press space/enter</div>
            </div>
            <div>
              <Icon name="AdjustmentsHorizontalIcon" size={32} className="text-accent mx-auto mb-3" />
              <div className="text-sm font-medium text-foreground mb-1">User-controlled overlay</div>
              <div className="text-xs text-muted-foreground">Toggle on/off anytime</div>
            </div>
            <div>
              <Icon name="GlobeAltIcon" size={32} className="text-accent mx-auto mb-3" />
              <div className="text-sm font-medium text-foreground mb-1">Platform independent</div>
              <div className="text-xs text-muted-foreground">Works with any meeting</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
