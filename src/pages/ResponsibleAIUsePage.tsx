/**
 * Responsible AI Use Page
 * Ethics, transparency, and bias testing
 */

import Header from '../components/common/Header';
import Footer from './LandingPage/sections/Footer';
import Icon from '../components/ui/AppIcon';

interface EthicalPrinciple {
  icon: string;
  title: string;
  description: string;
  commitment: string;
}

interface BiasTestResult {
  category: string;
  score: number;
  status: 'excellent' | 'good' | 'improving';
  details: string;
}

interface AILimitation {
  icon: string;
  title: string;
  description: string;
  guidance: string;
}

const ResponsibleAIUsePage = () => {
  const ethicalPrinciples: EthicalPrinciple[] = [
    {
      icon: 'ScaleIcon',
      title: 'Fairness Across Demographics',
      description: 'Our AI coaching algorithms are designed to provide equitable feedback regardless of age, gender, ethnicity, accent, or background.',
      commitment: 'Regular audits ensure no demographic group receives systematically different coaching quality or success rates.'
    },
    {
      icon: 'EyeIcon',
      title: 'Transparency in Feedback Generation',
      description: 'We provide clear explanations of how AI analyzes interview responses and generates coaching recommendations.',
      commitment: 'Users can understand the reasoning behind every AI suggestion, with no "black box" decision-making.'
    },
    {
      icon: 'UserGroupIcon',
      title: 'Human Oversight in Coaching',
      description: 'AI recommendations are designed to augment, not replace, human judgment in career decisions.',
      commitment: 'Critical career decisions should always involve human reflection and professional guidance beyond AI assistance.'
    },
    {
      icon: 'ShieldCheckIcon',
      title: 'Privacy-Preserving Analysis',
      description: 'Interview transcription and analysis occur with strict data minimization and user control principles.',
      commitment: 'No audio recordings stored; transcriptions processed in real-time with immediate deletion after session ends.'
    }
  ];

  const biasTestResults: BiasTestResult[] = [
    {
      category: 'Gender Equity',
      score: 96,
      status: 'excellent',
      details: 'Coaching quality shows no statistically significant variance across gender identities (p > 0.05)'
    },
    {
      category: 'Accent Neutrality',
      score: 94,
      status: 'excellent',
      details: 'Transcription accuracy maintained across 50+ English accent variations with 94%+ consistency'
    },
    {
      category: 'Age Fairness',
      score: 92,
      status: 'excellent',
      details: 'Feedback relevance and success rates consistent across age groups 22-65 years'
    },
    {
      category: 'Cultural Context',
      score: 88,
      status: 'good',
      details: 'Ongoing improvements to recognize diverse communication styles and cultural interview norms'
    },
    {
      category: 'Disability Accommodation',
      score: 85,
      status: 'improving',
      details: 'Active development of enhanced support for neurodiverse candidates and accessibility features'
    }
  ];

  const aiLimitations: AILimitation[] = [
    {
      icon: 'ExclamationTriangleIcon',
      title: 'Context Understanding Boundaries',
      description: 'AI may not fully grasp nuanced industry-specific terminology, company culture fit, or complex interpersonal dynamics.',
      guidance: 'Use AI coaching as one input among many; seek human mentors for strategic career guidance.'
    },
    {
      icon: 'ChatBubbleLeftRightIcon',
      title: 'Non-Verbal Communication Gaps',
      description: 'Our audio-only transcription cannot analyze body language, facial expressions, or visual presentation elements.',
      guidance: 'Supplement AI feedback with video practice sessions and human coaching for comprehensive preparation.'
    },
    {
      icon: 'ClockIcon',
      title: 'Real-Time Processing Constraints',
      description: 'AI suggestions are generated within seconds but may occasionally lag during complex technical discussions.',
      guidance: 'Treat AI as a supportive tool, not a real-time script; develop your own authentic communication style.'
    },
    {
      icon: 'DocumentTextIcon',
      title: 'Resume-Job Description Matching',
      description: 'AI alignment is based on keyword matching and semantic similarity, not deep industry expertise.',
      guidance: "Verify AI-suggested talking points align with your actual experience and the role's true requirements."
    }
  ];

  const diversityCommitments = [
    'Training data includes diverse interview scenarios across 20+ industries and 50+ countries',
    'Regular bias audits conducted by third-party AI ethics researchers every quarter',
    'Diverse team of AI developers, career coaches, and ethics advisors from underrepresented backgrounds',
    'Open feedback channels for users to report potential bias or unfair coaching patterns',
    'Continuous model retraining with fairness constraints and demographic parity objectives'
  ];

  const researchPartnerships = [
    { institution: 'MIT Media Lab', focus: 'AI Ethics & Algorithmic Fairness' },
    { institution: 'Stanford HAI', focus: 'Human-Centered AI Design' },
    { institution: 'Oxford Internet Institute', focus: 'AI Governance & Policy' },
    { institution: 'Carnegie Mellon HCII', focus: 'Human-Computer Interaction in Career Tech' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-success';
      case 'good': return 'text-secondary';
      case 'improving': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-success/10';
      case 'good': return 'bg-secondary/10';
      case 'improving': return 'bg-warning/10';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/5 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full mb-6">
            <Icon name="ShieldCheckIcon" size={20} variant="solid" />
            <span className="font-semibold text-sm">Ethical AI Development</span>
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-primary mb-6">
            Responsible AI Use & Transparency
          </h1>
          <p className="text-xl text-foreground/80 mb-8 max-w-3xl mx-auto">
            Our commitment to ethical AI development, algorithmic fairness, and transparent decision-making in career coaching technology.
          </p>
        </div>
      </section>

      {/* Ethical AI Framework */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline text-4xl font-bold text-primary mb-4">
              Our Ethical AI Framework
            </h2>
            <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
              Core principles guiding every aspect of our AI coaching technology development and deployment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {ethicalPrinciples.map((principle, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-8 hover:shadow-card transition-shadow duration-250">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name={principle.icon as any} size={24} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-headline text-xl font-semibold text-primary mb-3">
                      {principle.title}
                    </h3>
                    <p className="text-foreground/80 mb-4">
                      {principle.description}
                    </p>
                    <div className="bg-accent/5 border-l-4 border-accent p-4 rounded">
                      <p className="text-sm text-foreground/70">
                        <strong className="text-accent">Our Commitment:</strong> {principle.commitment}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Bias Testing Results */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline text-4xl font-bold text-primary mb-4">
              Ongoing Algorithmic Audits
            </h2>
            <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
              Transparent bias testing results from our quarterly AI fairness assessments (Last updated: January 2026).
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8">
            <div className="space-y-6">
              {biasTestResults.map((result, index) => (
                <div key={index} className="border-b border-border last:border-0 pb-6 last:pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-primary">{result.category}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBg(result.status)} ${getStatusColor(result.status)}`}>
                        {result.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-primary">{result.score}%</div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 mb-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        result.status === 'excellent' ? 'bg-success' :
                        result.status === 'good' ? 'bg-secondary' : 'bg-warning'
                      }`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                  <p className="text-sm text-foreground/70">{result.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Limitations Disclosure */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline text-4xl font-bold text-primary mb-4">
              Understanding AI Limitations
            </h2>
            <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
              Transparent disclosure of coaching boundaries and the importance of human judgment in career decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {aiLimitations.map((limitation, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                    <Icon name={limitation.icon as any} size={20} className="text-warning" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-primary mb-2">
                      {limitation.title}
                    </h3>
                    <p className="text-sm text-foreground/70 mb-3">
                      {limitation.description}
                    </p>
                    <div className="bg-primary/5 p-3 rounded">
                      <p className="text-xs text-foreground/70">
                        <strong className="text-primary">Guidance:</strong> {limitation.guidance}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-accent/5 border-l-4 border-accent p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <Icon name="LightBulbIcon" size={24} className="text-accent mt-1" />
              <div>
                <h3 className="font-semibold text-lg text-primary mb-2">Human Judgment Remains Essential</h3>
                <p className="text-foreground/70">
                  Xtroone is designed to augment your preparation, not replace critical thinking. Career decisions should always involve personal reflection, professional mentorship, and consideration of factors AI cannot fully understand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diversity & Inclusion Commitments */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline text-4xl font-bold text-primary mb-4">
              Diversity & Inclusion in AI Development
            </h2>
            <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
              Our ongoing efforts to eliminate bias and promote fairness in coaching algorithms.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diversityCommitments.map((commitment, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Icon name="CheckCircleIcon" size={20} className="text-success mt-1" variant="solid" />
                  <p className="text-foreground/80">{commitment}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research Partnerships */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline text-4xl font-bold text-primary mb-4">
              Academic Research Partnerships
            </h2>
            <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
              Collaborating with leading institutions to advance responsible AI in career technology.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {researchPartnerships.map((partner, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="AcademicCapIcon" size={24} className="text-secondary" />
                </div>
                <h3 className="font-semibold text-primary mb-2">{partner.institution}</h3>
                <p className="text-sm text-foreground/70">{partner.focus}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Feedback Integration */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-xl p-8">
            <div className="text-center mb-8">
              <Icon name="ChatBubbleLeftEllipsisIcon" size={40} className="text-accent mx-auto mb-4" />
              <h2 className="font-headline text-3xl font-bold text-primary mb-4">
                Your Feedback Shapes Our AI
              </h2>
              <p className="text-lg text-foreground/70">
                We actively integrate user feedback into AI improvement initiatives. Report concerns, suggest improvements, or share your experience.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <button className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors duration-250 text-center">
                <Icon name="FlagIcon" size={24} className="text-warning mx-auto mb-2" />
                <div className="font-semibold text-primary">Report Bias</div>
              </button>
              <button className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors duration-250 text-center">
                <Icon name="LightBulbIcon" size={24} className="text-secondary mx-auto mb-2" />
                <div className="font-semibold text-primary">Suggest Improvement</div>
              </button>
              <button className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors duration-250 text-center">
                <Icon name="ChatBubbleBottomCenterTextIcon" size={24} className="text-success mx-auto mb-2" />
                <div className="font-semibold text-primary">Share Experience</div>
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ResponsibleAIUsePage;
