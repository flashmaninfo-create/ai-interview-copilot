import { CheckCircle, XCircle } from 'lucide-react';
import { Section } from '../../components/ui/Section';
import { Card } from '../../components/ui/Card';
import { FadeIn } from '../../components/ui/motion';

export function ComparisonSection() {
  return (
    <Section className="bg-slate-50 py-24">
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <FadeIn delay={0.1}>
          <Card className="p-8 bg-white border-slate-200 shadow-sm h-full relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-400"></div>
             <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900">What It IS</h3>
             </div>
             <ul className="space-y-4">
                 {[
                     'Live guidance assistant',
                     'Structured response hints',
                     'Confidence booster',
                     'Real-time context analysis',
                     'Your mentor in your ear'
                 ].map((item, i) => (
                     <li key={i} className="flex items-start gap-3 text-slate-600 font-medium">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></div>
                         <span>{item}</span>
                     </li>
                 ))}
             </ul>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card className="p-8 bg-white border-slate-200 shadow-sm h-full relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-400"></div>
             <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900">What It's NOT</h3>
             </div>
             <ul className="space-y-4">
                 {[
                     'Not auto-answering for you',
                     'Not impersonating you',
                     'Not recording your interviews',
                     'Not a cheating tool',
                     'Not robotic scripts'
                 ].map((item, i) => (
                     <li key={i} className="flex items-start gap-3 text-slate-600 font-medium">
                         <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2"></div>
                         <span>{item}</span>
                     </li>
                 ))}
             </ul>
          </Card>
        </FadeIn>
      </div>
    </Section>
  );
}

