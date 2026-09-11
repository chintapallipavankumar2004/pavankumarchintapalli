import React, { useState } from 'react';
import { Mail, Code, Linkedin, Clock, Send, CheckCircle2 } from 'lucide-react';
import { PROFILE_INFO } from '../data/initialData';
import { appCheckToken } from '../lib/firebase';
import { validateEnquiry } from '../lib/validation';
import { useSettings } from '../lib/settings';

interface ContactSectionProps {
  selectedServicePreset?: string;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ selectedServicePreset }) => {
  const settings = useSettings();
  const [error, setError] = useState('');
  const [website, setWebsite] = useState('');
  const pending = React.useRef<{ id: string; content: string } | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState(selectedServicePreset || 'website');
  const [budget, setBudget] = useState('Not specified');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync selectedServicePreset if changed from parent
  React.useEffect(() => {
    if (selectedServicePreset) {
      setService(selectedServicePreset);
    }
  }, [selectedServicePreset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsSuccess(false);
    setError('');
    try {
      const enquiry = validateEnquiry({ fullName, email, phone, service, budget, description });
      const content = JSON.stringify(enquiry);
      if (pending.current?.content !== content)
        pending.current = { id: crypto.randomUUID(), content };
      const token = await appCheckToken();
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Firebase-AppCheck': token },
        body: JSON.stringify({ ...enquiry, id: pending.current.id, website }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok || result.saved !== true)
        throw new Error(result.error || 'Could not save your enquiry. Please try again.');
      setIsSuccess(true);
      pending.current = null;
      setFullName('');
      setEmail('');
      setPhone('');
      setDescription('');
    } catch (error) {
      setError(
        error instanceof Error && error.name !== 'TimeoutError'
          ? error.message
          : 'We could not confirm your submission. Please retry; duplicate submissions are prevented.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-[#111827] text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Info & Verified Contact Details */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <span className="px-3 py-1 rounded-md bg-white/10 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
                Let's Connect
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mt-3 tracking-tight">
                Have a Project in Mind?
              </h2>
              <p className="text-base md:text-lg text-gray-300 mt-2 leading-relaxed">
                Whether you need a full business website, a specific web application, branding
                assets, or technical consultation, let’s talk.
              </p>
            </div>

            {/* Direct Contact Channels */}
            <div className="space-y-4">
              <a
                id="contact-email-link"
                href={`mailto:${PROFILE_INFO.email}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#5b4cf0] text-white flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-xs text-gray-400 block font-medium">Primary Email</span>
                  <span className="text-sm font-medium text-white truncate block group-hover:text-[#c4c0ff] transition-colors">
                    {PROFILE_INFO.email}
                  </span>
                </div>
              </a>

              <a
                id="contact-github-link"
                href={PROFILE_INFO.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">GitHub Repository</span>
                  <span className="text-sm font-medium text-white group-hover:text-[#c4c0ff] transition-colors">
                    {PROFILE_INFO.githubDisplay}
                  </span>
                </div>
              </a>

              <a
                id="contact-linkedin-link"
                href={PROFILE_INFO.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-600/30 text-blue-300 flex items-center justify-center shrink-0">
                  <Linkedin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">LinkedIn Profile</span>
                  <span className="text-sm font-medium text-white group-hover:text-[#c4c0ff] transition-colors">
                    {PROFILE_INFO.linkedinDisplay}
                  </span>
                </div>
              </a>
            </div>

            {/* Fast reply reassurance */}
            <div className="p-4 rounded-xl bg-[#5b4cf0]/10 border border-[#5b4cf0]/30 text-xs text-[#c4c0ff] flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#c4c0ff] shrink-0" />
              <span>{settings.responseWindow || 'Contact me to discuss availability.'}</span>
            </div>
          </div>

          {/* Right Interactive Project Enquiry Form */}
          <div className="lg:col-span-7 bg-white p-8 rounded-2xl text-[#141b2b] shadow-2xl">
            <h3 className="text-2xl font-bold text-[#141b2b] mb-1">Send a Direct Enquiry</h3>
            <p className="text-xs sm:text-sm text-[#474555] mb-6">
              Tell me what you have in mind so we can discuss your project.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="hidden" aria-hidden="true">
                <label>
                  Website
                  <input
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>
              {error && (
                <p role="alert" className="text-red-700 text-sm">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="enq-name"
                    className="block text-xs sm:text-sm font-semibold text-[#141b2b] mb-1"
                  >
                    Full Name *
                  </label>
                  <input
                    id="enq-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full h-11 px-3.5 rounded-lg border border-[#c8c4d8] bg-white text-[#141b2b] text-sm focus:border-[#5b4cf0] focus:ring-2 focus:ring-[#5b4cf0]/20 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="enq-email"
                    className="block text-xs sm:text-sm font-semibold text-[#141b2b] mb-1"
                  >
                    Email Address *
                  </label>
                  <input
                    id="enq-email"
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-11 px-3.5 rounded-lg border border-[#c8c4d8] bg-white text-[#141b2b] text-sm focus:border-[#5b4cf0] focus:ring-2 focus:ring-[#5b4cf0]/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="enq-phone"
                    className="block text-xs sm:text-sm font-semibold text-[#141b2b] mb-1"
                  >
                    WhatsApp / Phone{' '}
                    <span className="text-[#474555] font-normal text-xs">(Optional)</span>
                  </label>
                  <input
                    id="enq-phone"
                    type="tel"
                    maxLength={32}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-11 px-3.5 rounded-lg border border-[#c8c4d8] bg-white text-[#141b2b] text-sm focus:border-[#5b4cf0] focus:ring-2 focus:ring-[#5b4cf0]/20 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="enq-service"
                    className="block text-xs sm:text-sm font-semibold text-[#141b2b] mb-1"
                  >
                    Service Required *
                  </label>
                  <select
                    id="enq-service"
                    required
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#c8c4d8] bg-white text-[#141b2b] text-sm focus:border-[#5b4cf0] focus:ring-2 focus:ring-[#5b4cf0]/20 focus:outline-none transition-all"
                  >
                    <option value="website">Website Development</option>
                    <option value="webapp">Custom Web Application</option>
                    <option value="branding">Design & Branding (Posters / Logos)</option>
                    <option value="automation">Workflow Automation & Integrations</option>
                    <option value="consulting">General Technical Consultation</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="enq-budget"
                  className="block text-xs sm:text-sm font-semibold text-[#141b2b] mb-1"
                >
                  Estimated Budget Range
                </label>
                <select
                  id="enq-budget"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#c8c4d8] bg-white text-[#141b2b] text-sm focus:border-[#5b4cf0] focus:ring-2 focus:ring-[#5b4cf0]/20 focus:outline-none transition-all"
                >
                  <option value="Not specified">Let’s discuss the budget</option>
                  <option value="Under INR 15000">Under ₹15,000</option>
                  <option value="INR 15000-35000">₹15,000–₹35,000</option>
                  <option value="INR 35000-75000">₹35,000–₹75,000</option>
                  <option value="Over INR 75000">Over ₹75,000</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="enq-desc"
                  className="block text-xs sm:text-sm font-semibold text-[#141b2b] mb-1"
                >
                  Project Description *
                </label>
                <textarea
                  id="enq-desc"
                  required
                  rows={4}
                  minLength={20}
                  maxLength={5000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell me about your business, the core problem to solve, and your ideal timeline..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c8c4d8] bg-white text-[#141b2b] text-sm focus:border-[#5b4cf0] focus:ring-2 focus:ring-[#5b4cf0]/20 focus:outline-none transition-all"
                ></textarea>
              </div>

              {isSuccess && (
                <div
                  id="enquiry-success"
                  className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Thank you! Your enquiry has been saved for Pavan to review.</span>
                </div>
              )}

              <button
                id="btn-submit-enquiry"
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-lg bg-[#5b4cf0] text-white font-semibold text-sm sm:text-base hover:bg-[#422cd8] transition-all duration-200 shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-75"
              >
                {isSubmitting ? (
                  <span>Sending Message...</span>
                ) : (
                  <>
                    <span>Send Project Enquiry</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
