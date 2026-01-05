import { Section } from '../../components/ui/Section';
import { FadeIn } from '../../components/ui/motion';

export function RealTimeGuidanceSection() {
  return (
    <Section className="bg-white py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <FadeIn>
          <div className="text-[#6366F1] font-bold tracking-[0.2em] text-sm mb-4 uppercase">REAL-TIME INTERVIEW GUIDANCE</div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Your Invisible Interview Coach
          </h2>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Get instant answers, smart hints, and coding assistance while you speak. It's like having a senior engineer whispering in your ear.
          </p>
        </FadeIn>
      </div>

      <div className="max-w-5xl mx-auto mt-16 flex flex-col gap-12">
        {/* Media Block 1 */}
        <FadeIn delay={0.1}>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-50 aspect-[16/9] relative group">
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-100">
               {/* Placeholder for actual screenshot/demo */}
               <span className="font-medium">Real-time Transcription & Hints UI Preview</span>
            </div>
            {/* Optional overlay or interaction hint */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        </FadeIn>

        {/* Media Block 2 */}
        <FadeIn delay={0.2}>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-50 aspect-[16/9] relative group">
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-100">
               {/* Placeholder for actual screenshot/demo */}
               <span className="font-medium">Code Assistant & Solution View UI Preview</span>
            </div>
             {/* Optional overlay or interaction hint */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}
