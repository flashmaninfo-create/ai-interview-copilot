import Icon from '../../../components/ui/AppIcon';

const InteractiveDemoSection = () => {
  const useCases = [
    {
      icon: 'CodeBracketIcon',
      title: 'Technical Interviews',
      description: 'Get help with coding challenges, algorithms, and system design questions'
    },
    {
      icon: 'CubeIcon',
      title: 'System Design Interviews',
      description: 'Receive guidance on architecture patterns, scalability, and trade-offs'
    },
    {
      icon: 'UserGroupIcon',
      title: 'Managerial & Behavioral',
      description: 'Navigate leadership scenarios and behavioral questions with confidence'
    },
    {
      icon: 'VideoCameraIcon',
      title: 'Remote Interviews',
      description: 'Works seamlessly with Zoom, Teams, Google Meet, and other platforms'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-success/10 px-4 py-2 rounded-full mb-6">
            <Icon name="UserGroupIcon" size={20} className="text-success" />
            <span className="text-sm font-medium text-success">Who This Is For</span>
          </div>
          <h2 className="font-headline text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Built for Every Interview Type
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Whether you're interviewing for a technical role or a leadership position, Interview Copilot adapts to your needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {useCases.map((useCase, index) => (
            <div key={index} className="bg-card rounded-xl p-6 shadow-card border border-border text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name={useCase.icon as any} size={32} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{useCase.title}</h3>
              <p className="text-sm text-muted-foreground">{useCase.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-accent/5 to-secondary/5 rounded-2xl p-8 border border-accent/20">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-headline text-2xl font-semibold text-foreground mb-4">
                Stealth Console — Second Screen Mode
              </h3>
              <p className="text-muted-foreground mb-6">
                When screen sharing is required, close the overlay and continue receiving live interview assistance securely on another device (tablet / iPad / mobile) using the same account.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Icon name="CheckCircleIcon" size={20} className="text-success flex-shrink-0 mt-0.5" variant="solid" />
                  <span className="text-foreground">Seamless device switching during screen share</span>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="CheckCircleIcon" size={20} className="text-success flex-shrink-0 mt-0.5" variant="solid" />
                  <span className="text-foreground">Same account, synchronized transcription</span>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="CheckCircleIcon" size={20} className="text-success flex-shrink-0 mt-0.5" variant="solid" />
                  <span className="text-foreground">Works on tablet, iPad, or mobile device</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-lg p-4 border border-border">
                  <Icon name="ComputerDesktopIcon" size={32} className="text-primary mb-2" />
                  <div className="text-sm font-semibold text-foreground">Laptop</div>
                  <div className="text-xs text-muted-foreground">Meeting + Screen Share</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 border border-accent">
                  <Icon name="DeviceTabletIcon" size={32} className="text-accent mb-2" />
                  <div className="text-sm font-semibold text-foreground">Tablet/iPad</div>
                  <div className="text-xs text-accent">Live Assistance</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-card rounded-2xl p-8 shadow-card border border-border">
          <div className="flex items-start gap-4">
            <Icon name="InformationCircleIcon" size={24} className="text-primary flex-shrink-0 mt-1" variant="solid" />
            <div>
              <h4 className="font-semibold text-foreground mb-2">Designed for Professional Preparation</h4>
              <p className="text-muted-foreground">
                Interview Copilot is a preparation tool that helps you perform at your best. Users maintain full control over when and how assistance is used. We believe in empowering candidates with the right tools while respecting professional ethics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveDemoSection;
