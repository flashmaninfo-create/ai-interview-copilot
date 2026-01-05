import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SlideUp } from '../../components/ui/motion';

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-white">
      {/* Background Effects (Subtle for Light Mode) */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
         <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full opacity-60"></div>
         <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/5 blur-[100px] rounded-full opacity-40"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="max-w-2xl">
            <SlideUp delay={0.1}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1] mb-6">
                Nail Every Interview Answer. <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                  In Real-Time.
                </span>
              </h1>
            </SlideUp>

            <SlideUp delay={0.2}>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg font-medium">
                Your silent interview coach. Providing instant, structured guidance while you speak—naturally and confidently.
              </p>
            </SlideUp>

            {/* Trust Badges */}
            <SlideUp delay={0.25} className="flex flex-wrap gap-4 mb-8 text-sm text-slate-600 font-medium">
               <div className="flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-green-500" />
                 <span>Not a cheating tool</span>
               </div>
               <div className="flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-green-500" />
                 <span>You stay in control</span>
               </div>
               <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Privacy-first design</span>
               </div>
            </SlideUp>

            <SlideUp delay={0.3} className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button variant="primary" size="lg" className="bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 text-white px-8 h-12 rounded-lg text-base shadow-lg shadow-primary/25 border-0">
                Try Interview Copilot Free
              </Button>
              <Button variant="outline" size="lg" className="border-slate-300 hover:bg-slate-50 text-slate-700 px-8 h-12 rounded-lg text-base">
                See How It Works
              </Button>
            </SlideUp>
          </div>

          {/* Feature Image */}
          <motion.div
            style={{ y, opacity }}
            className="hidden lg:block relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
               {/* Placeholder for the 'Woman in Suit' image - using a generic professional gradient for now if no image asset */}
               <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 relative">
                 <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <span className="text-sm">Professional Interview Image</span>
                 </div>
               </div>
            </div>
            {/* Decorative blob behind image */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/20 to-secondary/20 blur-3xl rounded-full opacity-50"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

