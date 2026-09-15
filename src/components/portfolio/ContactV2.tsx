import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Copy, Github, Linkedin, Mail } from "lucide-react";
import { profile, services } from "@/data/portfolioData";

export function ContactV2() {
  const formRef = useRef<HTMLFormElement>(null);
  const [draftRequested, setDraftRequested] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preparing, setPreparing] = useState(false);
  useEffect(() => {
    const onService = (event: Event) => {
      const service = (event as CustomEvent<string>).detail;
      const select = formRef.current?.elements.namedItem("service") as HTMLSelectElement | null;
      if (select) select.value = service;
      window.setTimeout(
        () => document.querySelector<HTMLInputElement>("#contact-name")?.focus(),
        0,
      );
    };
    window.addEventListener("service-enquiry", onService);
    return () => window.removeEventListener("service-enquiry", onService);
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (preparing) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const service = String(data.get("service") ?? "");
    const budget = String(data.get("budget") ?? "");
    const message = String(data.get("message") ?? "").trim();
    for (const field of ["name", "message"]) {
      const input = form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement;
      input.setCustomValidity(input.value.trim() ? "" : "Please enter more than spaces.");
    }
    if (!form.reportValidity()) return;
    setPreparing(true);
    const subject = encodeURIComponent(`${service} enquiry from ${name}`);
    const body = encodeURIComponent(
      `Service: ${service}\nBudget: ${budget || "Not specified"}\nPhone / WhatsApp: ${phone || "Not provided"}\n\n${message}\n\nName: ${name}\nEmail: ${email}`,
    );
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
    setDraftRequested(true);
    window.setTimeout(() => setPreparing(false), 1200);
  };

  return (
    <section
      id="contact"
      tabIndex={-1}
      aria-labelledby="contact-heading"
      className="portfolio-section contact-section"
    >
      <div className="portfolio-container contact-grid">
        <div className="contact-copy">
          <p className="eyebrow">
            <span>04 /</span> Let’s talk
          </p>
          <h2 id="contact-heading">
            Have a Project
            <br />
            in Mind<span className="accent-dot">?</span>
          </h2>
          <p>Tell me what you’re planning, and I’ll get back to you to discuss the next step.</p>
          {profile.availableForFreelance && (
            <p className="availability">
              <span aria-hidden="true" />
              Available for freelance projects
            </p>
          )}
          <div className="contact-methods">
            <a className="contact-email" href={`mailto:${profile.email}`}>
              <Mail size={18} aria-hidden="true" />
              <span>{profile.email}</span>
            </a>
            <button
              type="button"
              className="text-link copy-email"
              onClick={async () => {
                await navigator.clipboard.writeText(profile.email);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
              {copied ? "Email copied" : "Copy email"}
            </button>
            <a className="text-link" href={profile.linkedin} target="_blank" rel="noreferrer">
              <Linkedin size={17} /> LinkedIn
            </a>
            <a className="text-link" href={profile.github} target="_blank" rel="noreferrer">
              <Github size={17} /> GitHub
            </a>
          </div>
        </div>
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="contact-form"
          aria-label="Project enquiry"
          aria-describedby="email-draft-note"
          onInput={(event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
              target.setCustomValidity("");
            setDraftRequested(false);
          }}
        >
          <div className="form-pair">
            <div className="form-field">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                placeholder="Your name"
              />
            </div>
            <div className="form-field">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div className="form-pair">
            <div className="form-field">
              <label htmlFor="contact-phone">
                Phone or WhatsApp <span>(optional)</span>
              </label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={30}
                placeholder="Your number"
              />
            </div>
            <div className="form-field">
              <label htmlFor="contact-service">Service</label>
              <select id="contact-service" name="service" required defaultValue="">
                <option value="" disabled>
                  Select a service
                </option>
                {services.map((service) => (
                  <option key={service.title}>{service.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="contact-budget">
              Budget range <span>(optional)</span>
            </label>
            <select id="contact-budget" name="budget" defaultValue="">
              <option value="">Not decided yet</option>
              <option>Under ₹25,000</option>
              <option>₹25,000–₹50,000</option>
              <option>₹50,000–₹1,00,000</option>
              <option>Above ₹1,00,000</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="contact-message">Project description</label>
            <textarea
              id="contact-message"
              name="message"
              required
              maxLength={2000}
              rows={5}
              placeholder="What would you like to build or improve?"
              aria-describedby="project-description-hint"
            />
            <p id="project-description-hint" className="field-hint">
              Share your idea, goal, preferred timeline, and any existing website.
            </p>
          </div>
          <button
            type="submit"
            className="portfolio-button button-primary draft-button"
            disabled={preparing}
          >
            {preparing ? "Preparing Draft…" : "Create Email Draft"}{" "}
            <ArrowUpRight size={18} aria-hidden="true" />
          </button>
          <p id="email-draft-note" className="form-note">
            This opens your email app with a draft. Review and send it there; the website does not
            claim delivery.
          </p>
          <p role="status" className="draft-status">
            {draftRequested
              ? "Your draft was prepared. Nothing has been sent by this website, and your entries remain here."
              : ""}
          </p>
        </form>
      </div>
    </section>
  );
}
