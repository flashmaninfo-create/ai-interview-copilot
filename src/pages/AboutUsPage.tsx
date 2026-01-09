/**
 * About Us Page
 * Company information, team, timeline, and values
 */

import { useState } from 'react';
import Header from '../components/common/Header';
import Footer from './LandingPage/sections/Footer';
import Icon from '../components/ui/AppIcon';

interface TimelineItem {
  year: string;
  title: string;
  description: string;
  metric?: string;
}

interface TeamMember {
  name: string;
  role: string;
  background: string;
  story: string;
  linkedin: string;
  image: string;
  alt: string;
}

interface Stat {
  value: string;
  label: string;
  icon: string;
}

const AboutUsPage = () => {
  const [activeTimeline, setActiveTimeline] = useState(0);

  const timeline: TimelineItem[] = [
    {
      year: '2023',
      title: 'Foundation & Research',
      description: 'Identified critical gaps in interview preparation through extensive career coaching research',
      metric: 'Research Phase'
    },
    {
      year: '2024',
      title: 'AI Development Launch',
      description: 'Built proprietary NLP engine for real-time interview transcription and contextual response generation',
      metric: 'Beta Testing'
    },
    {
      year: '2025',
      title: 'Platform Growth',
      description: 'Reached 50,000+ users with partnerships across major recruiting firms',
      metric: '50K+ Users'
    },
    {
      year: '2026',
      title: 'Industry Leadership',
      description: 'Established as trusted AI interview assistance platform with Fortune 500 partnerships',
      metric: 'Market Leader'
    }
  ];

  const team: TeamMember[] = [
    {
      name: 'Sarah Chen',
      role: 'Co-Founder & CEO',
      background: 'Former Google Engineering Manager, 10+ years in tech recruitment',
      story: 'After conducting 500+ technical interviews, Sarah identified the need for democratized interview preparation',
      linkedin: 'https://linkedin.com',
      image: 'https://img.rocket.new/generatedImages/rocket_gen_img_109de7944-1763298346992.png',
      alt: 'Sarah Chen, CEO and Co-Founder'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Co-Founder & CTO',
      background: 'AI Research Scientist, PhD in Natural Language Processing from MIT',
      story: 'Michael led AI teams at Amazon before founding Interview Copilot to make advanced NLP accessible',
      linkedin: 'https://linkedin.com',
      image: 'https://img.rocket.new/generatedImages/rocket_gen_img_18c66c46c-1763301780768.png',
      alt: 'Michael Rodriguez, CTO and Co-Founder'
    },
    {
      name: 'Dr. Priya Sharma',
      role: 'Head of AI Ethics',
      background: 'Former Microsoft AI Ethics Lead, Published researcher in responsible AI',
      story: 'Priya ensures our AI coaching maintains ethical standards and promotes fair interview practices',
      linkedin: 'https://linkedin.com',
      image: 'https://img.rocket.new/generatedImages/rocket_gen_img_12672b149-1763294392419.png',
      alt: 'Dr. Priya Sharma, Head of AI Ethics'
    },
    {
      name: 'James Thompson',
      role: 'VP of Product',
      background: 'Former Product Lead at LinkedIn, Expert in career development platforms',
      story: 'James brings 15 years of experience building products that connect talent with opportunities',
      linkedin: 'https://linkedin.com',
      image: 'https://img.rocket.new/generatedImages/rocket_gen_img_19cde4c16-1763291996198.png',
      alt: 'James Thompson, VP of Product'
    }
  ];

  const stats: Stat[] = [
    { value: '75K+', label: 'Candidates Coached', icon: 'UserGroupIcon' },
    { value: '92%', label: 'Success Rate Improvement', icon: 'ChartBarIcon' },
    { value: '150+', label: 'Countries Reached', icon: 'GlobeAltIcon' },
    { value: '4.9/5', label: 'User Satisfaction', icon: 'StarIcon' }
  ];

  const values = [
    {
      icon: 'HeartIcon',
      title: 'Diversity & Inclusion',
      description: 'Making interview success accessible to candidates from all backgrounds and experiences'
    },
    {
      icon: 'ShieldCheckIcon',
      title: 'Ethical AI Practices',
      description: 'Transparent algorithms, bias mitigation, and responsible AI development at our core'
    },
    {
      icon: 'AcademicCapIcon',
      title: 'Continuous Learning',
      description: 'Partnering with universities and research institutions to advance interview coaching science'
    },
    {
      icon: 'LockClosedIcon',
      title: 'Privacy First',
      description: 'User data protection and privacy are non-negotiable principles in everything we build'
    }
  ];

  const awards = [
    { title: 'TechCrunch Disrupt Finalist', year: '2025' },
    { title: 'HR Tech Innovation Award', year: '2025' },
    { title: 'AI Excellence in Career Tech', year: '2026' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold mb-6">
            Democratizing Interview Success Through AI Innovation
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8">
            We're bridging the gap between talent and opportunity by making professional interview coaching accessible to everyone.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg px-6 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={stat.icon as any} size={20} variant="solid" />
                  <div className="text-3xl font-bold">{stat.value}</div>
                </div>
                <div className="text-sm text-primary-foreground/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Story */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl shadow-card p-8 md:p-12">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground mb-6">
              Our Story
            </h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-foreground/80 text-lg leading-relaxed mb-4">
                Interview Copilot was born from a simple observation: talented professionals were missing opportunities not because they lacked skills, but because they struggled with interview performance.
              </p>
              <p className="text-foreground/80 text-lg leading-relaxed mb-4">
                After conducting thousands of interviews at Fortune 500 companies, our founders recognized that traditional career coaching was expensive, inaccessible, and didn't address real-time interview challenges.
              </p>
              <p className="text-foreground/80 text-lg leading-relaxed">
                We built Interview Copilot to level the playing field—combining cutting-edge AI with proven coaching methodologies to help every candidate present their best self during interviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Timeline */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            Our Journey
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {timeline.map((item, index) => (
              <button
                key={index}
                onClick={() => setActiveTimeline(index)}
                className={`text-left p-6 rounded-xl transition-all duration-300 ${
                  activeTimeline === index
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                    : 'bg-card hover:bg-card/80 text-foreground'
                }`}
              >
                <div className="text-sm font-semibold mb-2 opacity-80">{item.year}</div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className={`text-sm mb-3 ${
                  activeTimeline === index ? 'text-primary-foreground/90' : 'text-foreground/70'
                }`}>
                  {item.description}
                </p>
                {item.metric && (
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    activeTimeline === index
                      ? 'bg-primary-foreground/20'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {item.metric}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            Meet Our Team
          </h2>
          <p className="text-center text-foreground/70 text-lg mb-12 max-w-2xl mx-auto">
            Led by industry veterans from Google, Amazon, Microsoft, and LinkedIn
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {team.map((member, index) => (
              <div key={index} className="bg-card rounded-xl shadow-card p-6 hover:shadow-lg transition-shadow duration-300">
                <div className="flex gap-6">
                  <img
                    src={member.image}
                    alt={member.alt}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-xl text-foreground">{member.name}</h3>
                        <p className="text-primary font-medium">{member.role}</p>
                      </div>
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors"
                        aria-label={`${member.name} LinkedIn profile`}
                      >
                        <Icon name="BuildingOfficeIcon" size={20} />
                      </a>
                    </div>
                    <p className="text-sm text-foreground/70 mb-3">{member.background}</p>
                    <p className="text-sm text-foreground/80 italic">"{member.story}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            Our Values
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="bg-card rounded-xl p-6 shadow-card hover:shadow-lg transition-shadow duration-300">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon name={value.icon as any} size={24} className="text-primary" variant="solid" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-foreground/70">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Awards & Recognition */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground mb-12">
            Recognition & Awards
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {awards.map((award, index) => (
              <div key={index} className="bg-card rounded-xl p-6 shadow-card">
                <Icon name="TrophyIcon" size={32} className="text-accent mx-auto mb-3" variant="solid" />
                <h3 className="font-semibold text-foreground mb-1">{award.title}</h3>
                <p className="text-sm text-foreground/70">{award.year}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-headline text-4xl md:text-5xl font-bold mb-6">
            Join Thousands of Successful Candidates
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Experience the future of interview preparation with AI-powered coaching
          </p>
          <button className="bg-accent text-accent-foreground px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:bg-accent/90 transition-all duration-300 hover:scale-105">
            Start Your Free Trial
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUsPage;
