/**
 * Contact Page
 * Contact form and company information
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from './LandingPage/sections/Footer';
import Icon from '../components/ui/AppIcon';
import { contactService } from '../lib/services/contactService';
import { adminService } from '../lib/services/adminService';

// Define types for settings
interface ContactMethod {
    icon: string;
    title: string;
    description: string;
    value: string;
    link: string;
}

interface OfficeLocation {
    city: string;
    address: string;
    region: string;
    country: string;
}

interface BusinessHours {
    weekday: string;
    saturday: string;
    sunday: string;
}

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
    inquiryType: 'general',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Settings State
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([]);
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [hours, setHours] = useState<BusinessHours>({
      weekday: '9:00 AM - 6:00 PM PST',
      saturday: '10:00 AM - 4:00 PM PST',
      sunday: 'Closed'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
        const [methods, locs, busHours] = await Promise.all([
            adminService.getAppConfig('contact_methods'),
            adminService.getAppConfig('office_locations'),
            adminService.getAppConfig('business_hours')
        ]);

        const parseConfig = (val: any) => {
            if (!val) return null;
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch (e) {
                     console.error('Failed to parse config:', e);
                     return null;
                }
            }
            return val;
        };

        const parsedMethods = parseConfig(methods);
        const parsedLocs = parseConfig(locs);
        const parsedHours = parseConfig(busHours);

        if (parsedMethods) setContactMethods(parsedMethods as ContactMethod[]);
        else {
             // Fallback Defaults
             setContactMethods([
                {
                  icon: 'EnvelopeIcon',
                  title: 'Email Us',
                  description: 'Our team responds within 24 hours',
                  value: 'support@interviewcopilot.ai',
                  link: 'mailto:support@interviewcopilot.ai',
                },
                {
                  icon: 'ChatBubbleLeftRightIcon',
                  title: 'Live Chat',
                  description: 'Available Mon-Fri, 9am-6pm PST',
                  value: 'Start Chat',
                  link: '#',
                },
                {
                  icon: 'PhoneIcon',
                  title: 'Call Us',
                  description: 'For urgent enterprise inquiries',
                  value: '+1 (555) 123-4567',
                  link: 'tel:+15551234567',
                },
              ]);
        }

        if (parsedLocs) setOffices(parsedLocs as OfficeLocation[]);
        else {
            setOffices([
                {
                  city: 'San Francisco',
                  address: '123 Market Street, Suite 400',
                  region: 'San Francisco, CA 94103',
                  country: 'United States',
                },
                {
                  city: 'New York',
                  address: '456 Broadway, Floor 12',
                  region: 'New York, NY 10013',
                  country: 'United States',
                },
                {
                  city: 'London',
                  address: '789 Tech Hub, Shoreditch',
                  region: 'London EC2A 3AY',
                  country: 'United Kingdom',
                },
              ]);
        }

        if (parsedHours) setHours(parsedHours as BusinessHours);

    } catch (err) {
        console.error('Failed to load contact settings:', err);
        // Defaults are already set for hours, and arrays default to empty which is fine as fallbacks are handled above if desired
        if (contactMethods.length === 0) {
             setContactMethods([
                {
                  icon: 'EnvelopeIcon',
                  title: 'Email Us',
                  description: 'Our team responds within 24 hours',
                  value: 'support@interviewcopilot.ai',
                  link: 'mailto:support@interviewcopilot.ai',
                },
                {
                    icon: 'ChatBubbleLeftRightIcon',
                    title: 'Live Chat',
                    description: 'Available Mon-Fri, 9am-6pm PST',
                    value: 'Start Chat',
                    link: '#',
                },
                {
                    icon: 'PhoneIcon',
                    title: 'Call Us',
                    description: 'For urgent enterprise inquiries',
                    value: '+1 (555) 123-4567',
                    link: 'tel:+15551234567',
                },
             ]);
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Split name into first and last
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Build subject with inquiry type prefix
    const inquiryLabels: Record<string, string> = {
      general: 'General Inquiry',
      support: 'Technical Support',
      enterprise: 'Enterprise Sales',
      partnership: 'Partnership',
      feedback: 'Product Feedback'
    };
    const subjectWithType = `[${inquiryLabels[formData.inquiryType]}] ${formData.subject}`;

    try {
      await contactService.sendMessage({
        first_name: firstName,
        last_name: lastName,
        email: formData.email,
        subject: subjectWithType,
        message: formData.company 
          ? `Company: ${formData.company}\n\n${formData.message}`
          : formData.message
      });

      setSubmitted(true);
      setLoading(false);

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          company: '',
          subject: '',
          message: '',
          inquiryType: 'general',
        });
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/5 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h1 className="font-headline text-5xl font-bold text-foreground mb-4">
              Get in Touch
            </h1>
            <p className="font-body text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions about Xtroone? We're here to help you succeed.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 border-b border-border">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactMethods.map((method, idx) => (
              <a
                key={idx}
                href={method.link}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all hover:border-primary group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon name={method.icon as any} size={28} className="text-primary" />
                  </div>
                  <h3 className="font-headline text-xl font-bold text-foreground mb-2">{method.title}</h3>
                  <p className="font-body text-sm text-muted-foreground mb-3">{method.description}</p>
                  <p className="font-semibold text-primary group-hover:underline">{method.value}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Main Contact Form */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <div>
              <h2 className="font-headline text-3xl font-bold text-foreground mb-4">
                Send Us a Message
              </h2>
              <p className="font-body text-muted-foreground mb-8">
                Fill out the form below and our team will get back to you within 24 hours.
              </p>

              {/* Success Message */}
              {submitted && (
                <div className="mb-6 p-6 bg-green-50 border-2 border-green-500 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                        <Icon name="CheckCircleIcon" size={28} className="text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-headline text-xl font-bold text-green-900 mb-2">
                        Thank You for Reaching Out!
                      </h3>
                      <p className="font-body text-green-800 mb-1">
                        We've received your message and appreciate you contacting us.
                      </p>
                      <p className="font-body text-green-700 text-sm">
                        Our team will review your inquiry and get back to you within 24 hours.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Icon name="ExclamationCircleIcon" size={24} className="text-red-500" />
                    <p className="font-body text-red-800">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block font-medium text-foreground mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block font-medium text-foreground mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="company" className="block font-medium text-foreground mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Your Company"
                    />
                  </div>
                  <div>
                    <label htmlFor="inquiryType" className="block font-medium text-foreground mb-2">
                      Inquiry Type *
                    </label>
                    <select
                      id="inquiryType"
                      name="inquiryType"
                      value={formData.inquiryType}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="enterprise">Enterprise Sales</option>
                      <option value="partnership">Partnership</option>
                      <option value="feedback">Product Feedback</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block font-medium text-foreground mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="How can we help you?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block font-medium text-foreground mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || submitted}
                  className="w-full px-8 py-4 bg-accent text-accent-foreground rounded-lg font-semibold shadow-cta hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : submitted ? '✓ Message Sent!' : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Info Section */}
            <div className="space-y-8">
              {/* FAQ Quick Links */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-headline text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Icon name="QuestionMarkCircleIcon" size={24} className="text-primary" />
                  Quick Answers
                </h3>
                <p className="font-body text-muted-foreground mb-4">
                  Looking for immediate answers? Check out our FAQ section.
                </p>
                <Link
                  to="/#faq"
                  className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                  View FAQ
                  <Icon name="ArrowRightIcon" size={16} />
                </Link>
              </div>

              {/* Office Locations */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-headline text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Icon name="MapPinIcon" size={24} className="text-primary" />
                  Our Offices
                </h3>
                <div className="space-y-4">
                  {offices.map((office, idx) => (
                    <div key={idx} className="pb-4 border-b border-border last:border-0 last:pb-0">
                      <h4 className="font-semibold text-foreground mb-1">{office.city}</h4>
                      <p className="text-sm text-muted-foreground">{office.address}</p>
                      <p className="text-sm text-muted-foreground">{office.region}</p>
                      <p className="text-sm text-muted-foreground">{office.country}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-primary-foreground">
                <h3 className="font-headline text-xl font-bold mb-4 flex items-center gap-2">
                  <Icon name="ClockIcon" size={24} />
                  Business Hours
                </h3>
                <div className="space-y-2 font-body">
                  <div className="flex justify-between">
                    <span>Monday - Friday:</span>
                    <span className="font-semibold">{hours.weekday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday:</span>
                    <span className="font-semibold">{hours.saturday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday:</span>
                    <span className="font-semibold">{hours.sunday}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm opacity-90">
                  Emergency support available 24/7 for enterprise customers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-accent py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-headline text-4xl font-bold text-primary-foreground mb-4">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="font-body text-xl text-primary-foreground/90 mb-8">
            Start your free trial today and experience real-time AI interview assistance.
          </p>
          <Link
            to="/#pricing"
            className="inline-block px-8 py-4 bg-accent-foreground text-accent rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
