import { Shield } from 'lucide-react';
import { Section } from '../../components/ui/Section';
import { FadeIn } from '../../components/ui/motion';

export function EthicalSection() {
  return (
    <Section className="bg-[#FFFBEB] text-slate-900 border-y border-yellow-200 py-24">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <FadeIn className="text-center mb-16 max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <Shield className="w-16 h-16 text-yellow-600 fill-yellow-100" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            Ethical. Transparent. Legal.
          </h2>
          <p className="text-xl text-slate-700 font-medium">
            Interview Copilot is a guidance tool designed for learning and confidence—not deception.
          </p>
        </FadeIn>

        {/* Card Grid */}
        <div className="grid md:grid-cols-3 gap-8">
            <FadeIn delay={0.1} className="bg-white p-8 rounded-2xl shadow-sm border border-yellow-200">
                <h3 className="font-bold text-lg mb-3 text-slate-900">For Your Practice</h3>
                <p className="text-slate-600">Perfect for mock interviews and learning how to structure answers effectively.</p>
            </FadeIn>
            
            <FadeIn delay={0.2} className="bg-white p-8 rounded-2xl shadow-sm border border-yellow-200">
                <h3 className="font-bold text-lg mb-3 text-slate-900">You Are In Control</h3>
                <p className="text-slate-600">The AI provides suggestions, but you choose what to say and how to say it.</p>
            </FadeIn>

            <FadeIn delay={0.3} className="bg-white p-8 rounded-2xl shadow-sm border border-yellow-200">
                <h3 className="font-bold text-lg mb-3 text-slate-900">Private & Secure</h3>
                <p className="text-slate-600">Your audio and transcriptions are processed securely and never shared.</p>
            </FadeIn>
        </div>
      </div>
    </Section>
  );
}
