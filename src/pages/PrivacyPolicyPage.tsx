/**
 * Privacy Policy Page
 * Comprehensive privacy policy with data collection details
 */

import { useState } from 'react';
import Header from '../components/common/Header';
import Footer from './LandingPage/sections/Footer';
import Icon from '../components/ui/AppIcon';

interface DataCategory {
  title: string;
  description: string;
  items: string[];
  icon: string;
}

interface UserRight {
  title: string;
  description: string;
  action: string;
  icon: string;
}

const PrivacyPolicyPage = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const lastUpdated = 'January 4, 2026';
  const effectiveDate = 'January 1, 2026';

  const keyCommitments = [
    { icon: 'ShieldCheckIcon', text: "Minimal data collection - only what's necessary" },
    { icon: 'LockClosedIcon', text: 'End-to-end encryption for all interview data' },
    { icon: 'UserIcon', text: 'Full user control over personal information' },
    { icon: 'DocumentCheckIcon', text: 'GDPR & CCPA compliant operations' }
  ];

  const dataCategories: DataCategory[] = [
    {
      title: 'Account Information',
      description: 'Basic data required for account creation and authentication',
      items: [
        'Email address and name (via Google Sign-In)',
        'Account preferences and settings',
        'Subscription and payment information',
        'Login timestamps and session data'
      ],
      icon: 'UserCircleIcon'
    },
    {
      title: 'Interview Session Data',
      description: 'Information collected during active coaching sessions',
      items: [
        'Audio transcriptions (interviewer voice only)',
        'Resume content and job descriptions you upload',
        'Technical keywords and experience level',
        'Interview scheduling information',
        'AI-generated response suggestions'
      ],
      icon: 'MicrophoneIcon'
    },
    {
      title: 'Usage Analytics',
      description: 'Aggregated data to improve service quality',
      items: [
        'Feature usage patterns and session duration',
        'Chrome Extension activation frequency',
        'Device type and browser information',
        'Error logs and performance metrics'
      ],
      icon: 'ChartBarIcon'
    },
    {
      title: "What We DON'T Collect",
      description: 'Data explicitly excluded from our collection',
      items: [
        'Screen recordings or video captures',
        'Your voice or audio from your microphone',
        'Meeting platform credentials or passwords',
        'Content from other browser tabs or applications'
      ],
      icon: 'XCircleIcon'
    }
  ];

  const userRights: UserRight[] = [
    {
      title: 'Access Your Data',
      description: 'Download a complete copy of all personal information we store',
      action: 'Request Data Export',
      icon: 'ArrowDownTrayIcon'
    },
    {
      title: 'Delete Your Data',
      description: 'Permanently remove all personal data and interview recordings',
      action: 'Schedule Deletion',
      icon: 'TrashIcon'
    },
    {
      title: 'Manage Consent',
      description: "Control what data we collect and how it's used",
      action: 'Update Preferences',
      icon: 'AdjustmentsHorizontalIcon'
    },
    {
      title: 'Data Portability',
      description: 'Transfer your data to another service provider',
      action: 'Export & Transfer',
      icon: 'ArrowsRightLeftIcon'
    }
  ];

  const thirdPartyServices = [
    {
      name: 'Deepgram',
      purpose: 'Real-time audio transcription',
      dataShared: 'Audio streams (interviewer voice only)',
      policy: 'https://deepgram.com/privacy'
    },
    {
      name: 'OpenAI',
      purpose: 'AI response generation',
      dataShared: 'Transcribed text, resume context, job descriptions',
      policy: 'https://openai.com/privacy'
    },
    {
      name: 'Stripe',
      purpose: 'Payment processing',
      dataShared: 'Payment information, billing address',
      policy: 'https://stripe.com/privacy'
    }
  ];

  const securityMeasures = [
    'AES-256 encryption for data at rest',
    'TLS 1.3 for data in transit',
    'Regular security audits and penetration testing',
    'SOC 2 Type II compliance (in progress)',
    'Multi-factor authentication support',
    'Automated threat detection and response'
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <Icon name="ShieldCheckIcon" size={48} className="text-accent" variant="solid" />
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-bold mb-6">
            Privacy Policy
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-4">
            Your privacy is our priority. We're transparent about what data we collect, how we use it, and your rights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm text-primary-foreground/80">
            <span>Last Updated: {lastUpdated}</span>
            <span className="hidden sm:inline">•</span>
            <span>Effective Date: {effectiveDate}</span>
          </div>
        </div>
      </section>

      {/* Key Commitments */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
            Our Privacy Commitments
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {keyCommitments.map((commitment, index) => (
              <div key={index} className="bg-card rounded-lg p-6 shadow-card text-center">
                <Icon name={commitment.icon as any} size={32} className="text-accent mx-auto mb-4" variant="solid" />
                <p className="font-body text-foreground">{commitment.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Executive Summary */}
      <section className="py-16 px-6 bg-muted">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold mb-8 text-primary">
            Executive Summary
          </h2>
          <div className="bg-card rounded-lg p-8 shadow-card">
            <p className="font-body text-lg text-foreground mb-6 leading-relaxed">
              Interview Copilot is designed with privacy at its core. We collect only the minimum data necessary to provide real-time AI interview assistance. You maintain full control over your information, with the ability to view, download, or delete your data at any time.
            </p>
            <p className="font-body text-lg text-foreground mb-6 leading-relaxed">
              <strong>What makes us different:</strong> We do NOT record your screen, capture your video, or listen to your microphone. Our Chrome Extension only processes interviewer audio for transcription, and all data is encrypted end-to-end.
            </p>
            <p className="font-body text-lg text-foreground leading-relaxed">
              We comply with GDPR, CCPA, and international data protection regulations. Our operations are regularly audited, and we're committed to transparency in all data practices.
            </p>
          </div>
        </div>
      </section>

      {/* Data Collection Details */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold mb-12 text-center text-primary">
            What Data We Collect
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {dataCategories.map((category, index) => (
              <div key={index} className="bg-card rounded-lg shadow-card overflow-hidden">
                <button
                  onClick={() => toggleSection(`data-${index}`)}
                  className="w-full p-6 flex items-start gap-4 text-left hover:bg-muted/50 transition-colors duration-250"
                >
                  <Icon name={category.icon as any} size={32} className="text-accent flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-headline text-xl font-semibold text-primary mb-2">
                      {category.title}
                    </h3>
                    <p className="font-body text-muted-foreground">{category.description}</p>
                  </div>
                  <Icon
                    name={expandedSection === `data-${index}` ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                    size={24}
                    className="text-primary flex-shrink-0"
                  />
                </button>
                {expandedSection === `data-${index}` && (
                  <div className="px-6 pb-6">
                    <ul className="space-y-3">
                      {category.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-3">
                          <Icon name="CheckCircleIcon" size={20} className="text-success flex-shrink-0 mt-0.5" variant="solid" />
                          <span className="font-body text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Rights */}
      <section className="py-16 px-6 bg-muted">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold mb-12 text-center text-primary">
            Your Privacy Rights
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {userRights.map((right, index) => (
              <div key={index} className="bg-card rounded-lg p-6 shadow-card">
                <Icon name={right.icon as any} size={40} className="text-accent mb-4" />
                <h3 className="font-headline text-xl font-semibold text-primary mb-3">
                  {right.title}
                </h3>
                <p className="font-body text-foreground mb-4">{right.description}</p>
                <button className="font-cta text-accent hover:text-accent/80 font-semibold transition-colors duration-250">
                  {right.action} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Third-Party Services */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold mb-8 text-center text-primary">
            Third-Party Service Providers
          </h2>
          <p className="font-body text-lg text-center text-foreground mb-12 max-w-3xl mx-auto">
            We work with trusted partners to deliver our service. Here's exactly what data we share with each:
          </p>
          <div className="space-y-4">
            {thirdPartyServices.map((service, index) => (
              <div key={index} className="bg-card rounded-lg p-6 shadow-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-headline text-xl font-semibold text-primary mb-2">
                      {service.name}
                    </h3>
                    <p className="font-body text-foreground mb-2">
                      <strong>Purpose:</strong> {service.purpose}
                    </p>
                    <p className="font-body text-muted-foreground">
                      <strong>Data Shared:</strong> {service.dataShared}
                    </p>
                  </div>
                  <a
                    href={service.policy}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-cta text-accent hover:text-accent/80 font-semibold transition-colors duration-250 flex items-center gap-2"
                  >
                    View Privacy Policy
                    <Icon name="ArrowTopRightOnSquareIcon" size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Measures */}
      <section className="py-16 px-6 bg-muted">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold mb-8 text-center text-primary">
            Security Measures
          </h2>
          <div className="bg-card rounded-lg p-8 shadow-card">
            <p className="font-body text-lg text-foreground mb-6">
              We implement industry-leading security practices to protect your data:
            </p>
            <ul className="space-y-4">
              {securityMeasures.map((measure, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Icon name="ShieldCheckIcon" size={24} className="text-success flex-shrink-0 mt-0.5" variant="solid" />
                  <span className="font-body text-foreground text-lg">{measure}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Compliance Certifications */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold mb-8 text-primary">
            Compliance & Certifications
          </h2>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-3">
              <Icon name="ShieldCheckIcon" size={32} className="text-success" variant="solid" />
              <span className="font-cta text-lg font-semibold text-foreground">GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-3">
              <Icon name="ShieldCheckIcon" size={32} className="text-success" variant="solid" />
              <span className="font-cta text-lg font-semibold text-foreground">CCPA Compliant</span>
            </div>
            <div className="flex items-center gap-3">
              <Icon name="ShieldCheckIcon" size={32} className="text-success" variant="solid" />
              <span className="font-cta text-lg font-semibold text-foreground">SOC 2 Type II (In Progress)</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
