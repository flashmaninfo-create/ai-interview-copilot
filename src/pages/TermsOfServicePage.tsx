/**
 * Terms of Service Page
 * Comprehensive terms with sections, navigation, and plain language summary
 */

import { useState } from 'react';
import Header from '../components/common/Header';
import Footer from './LandingPage/sections/Footer';
import Icon from '../components/ui/AppIcon';

interface Section {
  id: string;
  title: string;
  icon: string;
  content: string[];
}

const TermsOfServicePage = () => {
  const [activeSection, setActiveSection] = useState<string>('acceptance');

  const lastUpdated = 'January 4, 2026';
  const effectiveDate = 'January 1, 2026';

  const quickNav = [
    { id: 'acceptance', label: 'Acceptance of Terms', icon: 'DocumentCheckIcon' },
    { id: 'service', label: 'Service Description', icon: 'SparklesIcon' },
    { id: 'account', label: 'Account Management', icon: 'UserCircleIcon' },
    { id: 'usage', label: 'Acceptable Use', icon: 'ShieldCheckIcon' },
    { id: 'intellectual', label: 'Intellectual Property', icon: 'LockClosedIcon' },
    { id: 'subscription', label: 'Subscription & Payment', icon: 'CreditCardIcon' },
    { id: 'liability', label: 'Liability & Warranties', icon: 'ExclamationTriangleIcon' },
    { id: 'dispute', label: 'Dispute Resolution', icon: 'ScaleIcon' }
  ];

  const sections: Section[] = [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      icon: 'DocumentCheckIcon',
      content: [
        'By accessing or using Xtroone ("the Service"), you agree to be bound by these Terms of Service and all applicable laws and regulations.',
        'If you do not agree with any part of these terms, you may not access or use the Service.',
        'These terms constitute a legally binding agreement between you ("User" or "you") and Xtroone Inc. ("Company", "we", "us", or "our").',
        "We reserve the right to modify these terms at any time. Material changes will be communicated via email with 30 days' notice."
      ]
    },
    {
      id: 'service',
      title: '2. Service Description',
      icon: 'SparklesIcon',
      content: [
        'Xtroone provides real-time AI-powered interview assistance through audio transcription and contextual response generation.',
        'The Service includes: (a) Chrome Extension for overlay interface, (b) Stealth Console for multi-device access, (c) Resume and job description analysis, (d) Real-time transcription, (e) AI response suggestions.',
        'The Service is designed as a supplementary preparation tool. It does NOT guarantee interview success, job offers, or specific outcomes.',
        'AI-generated responses are suggestions only. Users are responsible for evaluating and adapting all suggestions.'
      ]
    },
    {
      id: 'account',
      title: '3. Account Registration & Management',
      icon: 'UserCircleIcon',
      content: [
        'You must create an account to use the Service. Registration requires a valid email address.',
        'You are responsible for maintaining the confidentiality of your account credentials.',
        'You must be at least 18 years old to create an account.',
        'One account per person. Multiple accounts by the same individual are prohibited.'
      ]
    },
    {
      id: 'usage',
      title: '4. Acceptable Use Policy',
      icon: 'ShieldCheckIcon',
      content: [
        'You agree to use the Service only for lawful purposes and in accordance with these terms.',
        'PROHIBITED USES: Violating laws, infringing IP rights, transmitting malicious code, unauthorized access, harassment.',
        'Interview Ethics: While the Service provides assistance, users should comply with interview guidelines set by prospective employers.',
        'Misuse of the Service may result in immediate account suspension.'
      ]
    },
    {
      id: 'intellectual',
      title: '5. Intellectual Property Rights',
      icon: 'LockClosedIcon',
      content: [
        'The Service is owned by Xtroone Inc. and protected by copyright, trademark, and other IP laws.',
        'We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service.',
        'You retain ownership of all content you upload (resumes, job descriptions, personal information).',
        'AI-generated responses are created using your input and our proprietary algorithms. You may use these responses.'
      ]
    },
    {
      id: 'subscription',
      title: '6. Subscription, Payment & Refunds',
      icon: 'CreditCardIcon',
      content: [
        'The Service operates on a credit-based system. Credits are consumed based on usage.',
        'All payments are processed through Stripe. We do not store your payment information.',
        'Subscription renewals are automatic. You will be charged at the beginning of each billing cycle.',
        'REFUND POLICY: Pay-As-You-Go Credits are refundable within 7 days if unused. Monthly Subscriptions refundable within 7 days of initial purchase only.'
      ]
    },
    {
      id: 'liability',
      title: '7. Disclaimers, Limitations of Liability',
      icon: 'ExclamationTriangleIcon',
      content: [
        'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.',
        'AI-generated responses may contain errors. You are solely responsible for evaluating and using AI outputs.',
        'We do NOT guarantee: Interview success, specific outcomes, uninterrupted service, or compatibility with all platforms.',
        'Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim, or ₹10,000.'
      ]
    },
    {
      id: 'dispute',
      title: '8. Dispute Resolution',
      icon: 'ScaleIcon',
      content: [
        'These terms are governed by the laws of the State of California, United States.',
        'DISPUTE RESOLUTION: (1) Contact customer support first, (2) If unresolved, proceed to mediation, (3) If mediation fails, binding arbitration.',
        'CLASS ACTION WAIVER: You agree to resolve disputes individually.',
        'If any provision is found unenforceable, the remaining provisions remain in full effect.'
      ]
    }
  ];

  const keyHighlights = [
    { icon: 'CheckCircleIcon', text: 'AI assistance is supplementary - not a guarantee of success' },
    { icon: 'CheckCircleIcon', text: 'Credit-based pricing with 7-day refund on unused credits' },
    { icon: 'CheckCircleIcon', text: 'You own your content; we own the AI technology' },
    { icon: 'CheckCircleIcon', text: 'Disputes resolved through mediation then arbitration' }
  ];

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <Icon name="DocumentTextIcon" size={48} className="text-accent" variant="solid" />
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-bold mb-6">
            Terms of Service
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-4">
            Clear, fair terms that protect both your rights and ours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm text-primary-foreground/80">
            <span>Last Updated: {lastUpdated}</span>
            <span className="hidden sm:inline">•</span>
            <span>Effective Date: {effectiveDate}</span>
          </div>
        </div>
      </section>

      {/* Key Highlights */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
            Key Points at a Glance
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {keyHighlights.map((highlight, index) => (
              <div key={index} className="bg-card rounded-lg p-6 shadow-card">
                <Icon name={highlight.icon as any} size={32} className="text-success mx-auto mb-4" variant="solid" />
                <p className="font-body text-foreground text-center">{highlight.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="py-8 px-6 sticky top-20 bg-background z-50 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex overflow-x-auto gap-4 pb-2">
            {quickNav.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-250 ${
                  activeSection === item.id
                    ? 'bg-accent text-accent-foreground shadow-cta'
                    : 'bg-card text-foreground hover:bg-muted'
                }`}
              >
                <Icon name={item.icon as any} size={20} />
                <span className="font-cta text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          {sections.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-32">
              <div className="bg-card rounded-lg p-8 shadow-card">
                <div className="flex items-start gap-4 mb-6">
                  <Icon name={section.icon as any} size={40} className="text-accent flex-shrink-0" />
                  <h2 className="font-headline text-2xl md:text-3xl font-bold text-primary">
                    {section.title}
                  </h2>
                </div>
                <div className="space-y-4">
                  {section.content.map((paragraph, index) => (
                    <p key={index} className="font-body text-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plain Language Summary */}
      <section className="py-16 px-6 bg-muted">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold mb-8 text-center text-primary">
            Plain Language Summary
          </h2>
          <div className="bg-card rounded-lg p-8 shadow-card">
            <div className="space-y-6">
              <div>
                <h3 className="font-headline text-xl font-semibold text-primary mb-3">What You're Agreeing To:</h3>
                <p className="font-body text-foreground leading-relaxed">
                  You're agreeing to use Xtroone responsibly as a preparation tool. We provide AI assistance, but you're responsible for how you use it and for your interview outcomes.
                </p>
              </div>
              <div>
                <h3 className="font-headline text-xl font-semibold text-primary mb-3">What We Promise:</h3>
                <p className="font-body text-foreground leading-relaxed">
                  We'll provide the Service as described, protect your privacy, and treat you fairly. We'll give you notice before making major changes.
                </p>
              </div>
              <div>
                <h3 className="font-headline text-xl font-semibold text-primary mb-3">What We Don't Promise:</h3>
                <p className="font-body text-foreground leading-relaxed">
                  We can't guarantee interview success, perfect AI responses, or 100% uptime. The Service is a tool to help you prepare, not a guarantee of outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Acceptance Confirmation */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-accent/10 border-2 border-accent rounded-lg p-8">
            <Icon name="DocumentCheckIcon" size={48} className="text-accent mx-auto mb-4" variant="solid" />
            <h3 className="font-headline text-2xl font-bold text-primary mb-4">
              By Using Xtroone, You Agree to These Terms
            </h3>
            <p className="font-body text-foreground mb-6">
              If you have questions or concerns about any section, please contact us before using the Service.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="font-cta px-8 py-3 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 shadow-cta transition-all duration-250">
                Contact Support
              </button>
              <button className="font-cta px-8 py-3 rounded-lg bg-card text-foreground hover:bg-muted border border-border transition-all duration-250">
                Download PDF Version
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsOfServicePage;
