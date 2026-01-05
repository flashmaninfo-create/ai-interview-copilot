import { Section } from '../../components/ui/Section';
import { FadeIn } from '../../components/ui/motion';

// Platform logos (using text/Lucide icons as placeholders for now, can be replaced with SVGs)
const platforms = [
  { name: 'Google Meet', color: 'text-green-500' },
  { name: 'Microsoft Teams', color: 'text-indigo-400' },
  { name: 'Zoom', color: 'text-blue-500' },
  { name: 'Webex', color: 'text-cyan-500' },
  { name: 'Discord', color: 'text-purple-500' },
  { name: 'Slack', color: 'text-red-400' },
  { name: 'WhatsApp', color: 'text-green-400' },
  { name: 'Telegram', color: 'text-sky-400' }
];

export function PlatformSupportSection() {
  return (
    <Section className="py-12 border-b border-white/5">
      <div className="text-center mb-8">
        <FadeIn>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Supported Platforms
          </span>
        </FadeIn>
      </div>

      <div className="flex flex-wrap justify-center gap-8 md:gap-12 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
        {platforms.map((platform, index) => (
          <FadeIn key={index} delay={index * 0.05}>
            <div className="flex items-center gap-2">
              {/* Placeholder for actual SVG logo */}
              <div className={`w-3 h-3 rounded-full ${platform.color.replace('text-', 'bg-')}`}></div>
              <span className="text-lg font-semibold text-slate-300">{platform.name}</span>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
