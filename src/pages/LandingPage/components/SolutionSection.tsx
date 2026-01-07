import Icon from '../../../components/ui/AppIcon';

const SolutionSection = () => {
  const features = [
    {
      icon: 'MicrophoneIcon',
      title: 'Real-time Voice Transcription',
      description: 'Powered by Deepgram for accurate, instant transcription of interviewer questions',
      tech: 'Deepgram API'
    },
    {
      icon: 'SparklesIcon',
      title: 'Context-Aware AI Answers',
      description: 'Answers tailored to your resume, job description, and technical keywords',
      tech: 'AI-Powered'
    },
    {
      icon: 'WindowIcon',
      title: 'Chrome Extension Overlay',
      description: 'Toggle on/off overlay for discreet assistance during your interview',
      tech: 'Chrome Extension'
    },
    {
      icon: 'CalendarIcon',
      title: 'Interview Scheduling',
      description: 'Manage and organize all your upcoming interviews in one place',
      tech: 'Built-in'
    },
    {
      icon: 'CreditCardIcon',
      title: 'Credit-Based System',
      description: 'Pay only for what you use with our flexible credit system',
      tech: 'Flexible Pricing'
    },
    {
      icon: 'DeviceTabletIcon',
      title: 'Multi-Device Stealth Console',
      description: 'Continue on tablet/iPad when screen sharing is required',
      tech: 'Cross-Platform'
    },
    {
      icon: 'CogIcon',
      title: 'Admin-Managed Providers',
      description: 'Switch between AI and transcription providers for optimal performance',
      tech: 'Configurable'
    },
    {
      icon: 'LockClosedIcon',
      title: 'Privacy-First Design',
      description: 'No video recording, no data storage, complete user control',
      tech: 'Secure'
    }
  ];

  return (
    <section id="features" className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full mb-6">
            <Icon name="SparklesIcon" size={20} className="text-accent" variant="solid" />
            <span className="text-sm font-medium text-accent">Key Features</span>
          </div>
          <h2 className="font-headline text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Real Features, Not Fluff
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Built with cutting-edge technology to give you a genuine advantage in live interviews
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="bg-card rounded-xl p-6 shadow-card border border-border hover:shadow-xl transition-shadow duration-250">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Icon name={feature.icon as any} size={24} className="text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
              <div className="inline-flex items-center gap-1 text-xs text-accent font-medium">
                <Icon name="CheckCircleIcon" size={14} className="text-accent" variant="solid" />
                {feature.tech}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
