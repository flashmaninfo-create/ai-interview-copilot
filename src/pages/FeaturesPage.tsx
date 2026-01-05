import { useRef } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';
import { Mic, Zap, Shield, Globe, Code, Database } from 'lucide-react';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { FadeIn, SlideUp } from '../components/ui/motion';
import { SEO } from '../components/SEO';

const detailedFeatures = [
  {
    title: "Real-time Intelligence",
    description: "Our core engine processes audio instantly to give you the edge.",
    items: [
      { icon: Mic, title: "Deepgram Nova-2 Integration", text: "Industry-leading transcription accuracy with <300ms latency." },
      { icon: Zap, title: "WebSocket Streaming", text: "Continuous bi-directional data flow for zero-lag performance." },
      { icon: Globe, title: "Multi-Platform Support", text: "Works on Google Meet, Zoom, Teams, and Webex." }
    ]
  },
  {
    title: "AI Assistance Layer",
    description: "Multiple LLMs working in harmony to provide the best answer.",
    items: [
      { icon: Code, title: "Context-Aware Hints", text: "Analyzes the conversation flow to suggest relevant talking points." },
      { icon: Database, title: "Knowledge Retrieval", text: "Instantly pulls up documentation and system design patterns." },
      { icon: Shield, title: "Privacy First", text: "Your data is processed locally and ephemeral." }
    ]
  }
];

export function FeaturesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const y = useTransform(scrollYProgress, [0, 1], [0, 50]);

  return (
    <div className="bg-background min-h-screen relative overflow-hidden text-slate-200" ref={containerRef}>
      <SEO 
        title="Features" 
        description="Explore the powerful features of Interview Copilot: Real-time transcription, AI hints, and live coding assistance."
      />

      <main className="pt-24 pb-16">
        {/* Header */}
        <Section className="text-center relative z-10">
          <FadeIn>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Powerful features<br />
              <span className="text-primary">built for engineers</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12">
              We've packed everything you need to crush technical interviews into one seamless extension.
            </p>
          </FadeIn>
        </Section>

        {/* Feature Blocks */}
        {detailedFeatures.map((section, idx) => (
          <Section key={idx} className={idx % 2 === 1 ? "bg-surface/30" : ""}>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <SlideUp className={idx % 2 === 1 ? "lg:order-2" : ""}>
                <h2 className="text-3xl font-bold text-white mb-4">{section.title}</h2>
                <p className="text-slate-400 text-lg mb-8">{section.description}</p>
                <div className="space-y-6">
                  {section.items.map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.2 }}
                      className="flex gap-4"
                    >
                      <div className="w-12 h-12 rounded-lg bg-surface border border-white/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-1">{item.title}</h4>
                        <p className="text-sm text-slate-400">{item.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </SlideUp>

              <motion.div 
                style={{ y }}
                className={`relative ${idx % 2 === 1 ? "lg:order-1" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 blur-[100px] rounded-full"></div>
                <Card className="relative z-10 aspect-video flex items-center justify-center border-white/10 bg-black/40 backdrop-blur-xl">
                    <span className="text-slate-500 font-mono text-sm">Interactive Demo Placeholder</span>
                </Card>
              </motion.div>
            </div>
          </Section>
        ))}
      </main>
    </div>
  );
}
