import { Section } from '../../components/ui/Section';

const companies = [
  'Google', 'Meta', 'Amazon', 'Netflix', 'Microsoft', 'Uber', 'Airbnb', 'Stripe'
];

export function SocialProofSection() {
  return (
    <Section className="bg-surface/30 border-y border-white/5 py-12">
      {/* Client Logos Ticker */}
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500 mb-8 uppercase tracking-wider">Trusted by candidates interviewing at</p>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          {companies.map((company) => (
            <span key={company} className="text-xl font-bold text-slate-300">{company}</span>
          ))}
        </div>
      </div>
    </Section>
  );
}
