import { useState } from 'react';
import { Mail, MessageSquare, Clock, MapPin, CheckCircle } from 'lucide-react';
import { SEO } from '../components/SEO';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FadeIn, SlideUp } from '../components/ui/motion';

export function ContactPage() {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    setTimeout(() => {
        setFormState('success');
    }, 1500);
  };

  return (
    <div className="bg-background min-h-screen text-slate-200">
      <SEO 
        title="Contact Support" 
        description="Get in touch with the Interview Copilot team. We are here to help with any questions or support needs."
      />
      <main className="pt-24 pb-16">
        <Section className="text-center">
          <FadeIn>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Get in touch
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Have questions about enterprise plans or need technical support? 
              We're here to help.
            </p>
          </FadeIn>
        </Section>

        <Section>
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <SlideUp>
               <h2 className="text-2xl font-bold text-white mb-8">Contact Information</h2>
               <div className="space-y-8">
                  <Card className="hover:border-primary/50 transition-colors">
                      <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                              <Mail className="w-5 h-5" />
                          </div>
                          <div>
                              <h3 className="font-bold text-white mb-1">Email Support</h3>
                              <p className="text-slate-400 text-sm mb-2">For general inquiries and technical help.</p>
                              <a href="mailto:support@interviewcopilot.ai" className="text-primary hover:text-primary/80 font-medium">support@interviewcopilot.ai</a>
                          </div>
                      </div>
                  </Card>

                   <Card className="hover:border-primary/50 transition-colors">
                      <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
                              <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                              <h3 className="font-bold text-white mb-1">Live Chat</h3>
                              <p className="text-slate-400 text-sm mb-2">Available for Pro and Enterprise users.</p>
                              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                  Online Now
                              </div>
                          </div>
                      </div>
                  </Card>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface/30 p-4 rounded-xl border border-white/5">
                          <Clock className="w-5 h-5 text-slate-400 mb-2" />
                          <div className="text-sm font-medium text-white">Response Time</div>
                          <div className="text-xs text-slate-500">~2 hours avg.</div>
                      </div>
                      <div className="bg-surface/30 p-4 rounded-xl border border-white/5">
                          <MapPin className="w-5 h-5 text-slate-400 mb-2" />
                          <div className="text-sm font-medium text-white">Location</div>
                          <div className="text-xs text-slate-500">San Francisco, CA</div>
                      </div>
                   </div>
               </div>
            </SlideUp>

            <SlideUp delay={0.2}>
               <Card className="bg-surface border-white/10 p-8">
                  {formState === 'success' ? (
                      <div className="text-center py-12">
                          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mx-auto mb-6">
                              <CheckCircle className="w-8 h-8" />
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
                          <p className="text-slate-400">We've received your message and will get back to you shortly.</p>
                          <Button variant="outline" className="mt-8" onClick={() => setFormState('idle')}>
                              Send Another Message
                          </Button>
                      </div>
                  ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                          <div className="grid sm:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-300">First Name</label>
                                  <input type="text" required className="w-full bg-background border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="John" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-300">Last Name</label>
                                  <input type="text" required className="w-full bg-background border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Doe" />
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">Email Address</label>
                              <input type="email" required className="w-full bg-background border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="john@company.com" />
                          </div>

                          <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">Subject</label>
                              <select className="w-full bg-background border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
                                  <option>General Inquiry</option>
                                  <option>Technical Support</option>
                                  <option>Billing Question</option>
                                  <option>Enterprise Sales</option>
                              </select>
                          </div>

                          <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">Message</label>
                              <textarea required rows={4} className="w-full bg-background border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" placeholder="How can we help you?" />
                          </div>

                          <Button 
                              type="submit" 
                              variant="gradient" 
                              fullWidth 
                              size="lg"
                              isLoading={formState === 'submitting'}
                          >
                              Send Message
                          </Button>
                      </form>
                  )}
               </Card>
            </SlideUp>
          </div>
        </Section>
      </main>
    </div>
  );
}
