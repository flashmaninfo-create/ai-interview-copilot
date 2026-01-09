import { useState } from 'react';
import Icon from '../../../components/ui/AppIcon';

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

const FAQSection = () => {
  const [openId, setOpenId] = useState<number | null>(1);

  const faqs: FAQ[] = [
    {
      id: 1,
      question: "Is my data recorded or stored?",
      answer: "No. Interview Copilot uses audio-only transcription in real-time and does not record or store any video, audio, or transcription data. All processing happens live, and nothing is saved to our servers. Your privacy is our top priority."
    },
    {
      id: 2,
      question: "Does this record video or screen?",
      answer: "Absolutely not. Interview Copilot only listens to audio for transcription purposes. We do not capture, record, or store any video or screen content. The Chrome Extension overlay is visible only to you and does not interfere with screen sharing."
    },
    {
      id: 3,
      question: "Can I turn it off anytime?",
      answer: "Yes. You have complete control. You can manually activate transcription by pressing space or enter, toggle the overlay on/off at any time, or completely close the extension. The system only works when you explicitly activate it."
    },
    {
      id: 4,
      question: "Does it work with Zoom / Teams / Meet?",
      answer: "Yes. Interview Copilot works independently of your meeting platform. It captures system audio, so it's compatible with Zoom, Microsoft Teams, Google Meet, and any other video conferencing tool. No special integration required."
    },
    {
      id: 5,
      question: "What happens during screen sharing?",
      answer: "When you need to share your screen, simply close the Chrome Extension overlay and switch to Stealth Console mode on a second device (tablet, iPad, or mobile). You'll continue receiving live transcription and AI answers on your secondary device while your main screen is shared."
    },
    {
      id: 6,
      question: "Is this detectable?",
      answer: "Interview Copilot is designed to be discreet. The Chrome Extension overlay is only visible on your screen (not during screen sharing), and the Stealth Console runs on a separate device. We use standard browser APIs and do not inject any code into meeting platforms. However, we encourage users to use this tool responsibly and ethically."
    },
    {
      id: 7,
      question: "How accurate is the transcription?",
      answer: "We use Deepgram, one of the most advanced speech-to-text APIs available, providing 95%+ accuracy for clear audio. Transcription quality depends on audio clarity, accent, and background noise. The system works best with good microphone quality and minimal background noise."
    },
    {
      id: 8,
      question: "What information do I need to provide?",
      answer: "To get the most accurate AI answers, you'll create an interview profile that includes your resume, the job description, your tech stack, experience level, and interview schedule. This context helps our AI provide role-specific, relevant answers tailored to your background."
    },
    {
      id: 9,
      question: "Can I use this on multiple devices?",
      answer: "Yes. Your account works across multiple devices. You can use the Chrome Extension on your laptop and simultaneously access the Stealth Console on your tablet or mobile device. Both will show synchronized transcription and AI answers in real-time."
    },
    {
      id: 10,
      question: "What if I run out of credits?",
      answer: "If you run out of credits during an interview, the transcription and AI assistance will pause. You can purchase additional credits instantly through your account dashboard, and service will resume immediately. We recommend monitoring your credit balance before important interviews."
    }
  ];

  const toggleFAQ = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
            <Icon name="QuestionMarkCircleIcon" size={20} className="text-primary" />
            <span className="text-sm font-medium text-primary">FAQ</span>
          </div>
          <h2 className="font-headline text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Addressing the Hard Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Clear, calm, factual answers to your privacy and functionality concerns
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-card rounded-lg border border-border shadow-card overflow-hidden transition-all duration-250"
            >
              <button
                onClick={() => toggleFAQ(faq.id)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-muted transition-colors duration-250"
              >
                <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                <Icon
                  name="ChevronDownIcon"
                  size={24}
                  className={`text-accent flex-shrink-0 transition-transform duration-250 ${
                    openId === faq.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openId === faq.id && (
                <div className="px-6 pb-5 pt-2">
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
