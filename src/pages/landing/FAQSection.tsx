import { useState } from 'react';
import { Section } from '../../components/ui/Section';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

const faqs = [
  {
    question: "Is this detectable by interview platforms?",
    answer: "No. Interview Copilot runs entirely locally on your machine or in a separate browser window. It does not inject code into the interview platform's webpage, making it technically undetectable by anti-cheating software that monitors the DOM."
  },
  {
    question: "Does it work with Zoom, Teams, and Google Meet?",
    answer: "Yes! Since Copilot listens to system audio (or microphone input), it works independently of the conferencing tool you use. It supports all major platforms including Zoom, MS Teams, Google Meet, WebEx, and Chime."
  },
  {
    question: "Is it legal to use?",
    answer: "Using AI assistance for preparation and real-time guidance is generally legal. However, we strictly advise against using it to cheat on factual knowledge tests or coding assessments where external help is explicitly forbidden. It is designed as a 'coach' to help you structure your thoughts, not a tool to bypass skill requirements."
  },
  {
    question: "Can I try it for free?",
    answer: "Yes, we offer a 7-day free trial with full access to all features so you can experience the confident boost before committing."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Section className="bg-white py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, index) => (
          <div 
             key={index} 
             className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
          >
             <button
               onClick={() => setOpenIndex(openIndex === index ? null : index)}
               className="w-full text-left p-6 flex justify-between items-center group bg-white hover:bg-slate-50 transition-colors"
             >
               <span className="font-bold text-lg text-slate-900">{faq.question}</span>
               <div className={cn(
                 "w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center transition-transform duration-300",
                 openIndex === index ? "rotate-45" : "rotate-0"
               )}>
                 <Plus className={cn("w-4 h-4 text-slate-600", openIndex === index && "text-primary")} />
               </div>
             </button>
             
             <AnimatePresence>
               {openIndex === index && (
                 <motion.div
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: "auto", opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   transition={{ duration: 0.3, ease: "easeInOut" }}
                 >
                   <div className="p-6 pt-0 border-t border-slate-100 text-slate-600 leading-relaxed font-medium">
                     {faq.answer}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        ))}
      </div>
    </Section>
  );
}
