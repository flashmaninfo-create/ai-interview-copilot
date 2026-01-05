import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { Section } from '../../components/ui/Section';
import { Quote, Star } from 'lucide-react';

const stats = [
    { label: 'Active Users', value: 10000, suffix: '+' },
    { label: 'Interviews Aced', value: 50000, suffix: '+' },
    { label: 'Success Rate', value: 98, suffix: '%' },
    { label: 'Supported Platforms', value: 8, suffix: '' },
];

export function StatsSection() {
  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true
  });

  return (
    <Section className="bg-white py-24">
       <div className="flex flex-col gap-20">
          {/* 1. Metrics Row */}
          <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                      <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#6366F1] mb-2 font-mono">
                          {inView ? <CountUp end={stat.value} suffix={stat.suffix} duration={2.5} separator="," /> : '0'}
                      </div>
                      <div className="text-slate-600 font-medium text-lg">{stat.label}</div>
                  </div>
              ))}
          </div>

          {/* 2. Testimonial Block */}
          <div className="max-w-4xl mx-auto w-full">
            <div className="p-8 md:p-12 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Quote className="w-32 h-32 text-slate-900" />
                </div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="flex gap-1 mb-8">
                        {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 fill-amber-400 text-amber-400" />)}
                    </div>
                    
                    <blockquote className="text-2xl md:text-3xl font-bold text-slate-900 leading-relaxed mb-8 max-w-3xl">
                        "I've failed 5 Amazon interviews in a row. With Copilot, I finally cracked the L6 loop. It felt like I had a prompt teleprompter guiding me."
                    </blockquote>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl">JD</div>
                        <div className="text-left">
                            <div className="font-bold text-slate-900 text-lg">James D.</div>
                            <div className="text-slate-500">Senior SDE at Amazon</div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
       </div>
    </Section>
  );
}
