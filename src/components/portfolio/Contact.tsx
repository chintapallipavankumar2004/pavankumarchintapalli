import { useState, type FormEvent } from "react";
import { ArrowUpRight, Mail } from "lucide-react";
import { profile, services } from "@/data/portfolio";

export function Contact() {
  const [draftRequested, setDraftRequested] = useState(false);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const service = String(data.get("service") ?? "");
    const message = String(data.get("message") ?? "").trim();
    for (const field of ["name", "message"]) {
      const input = form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement;
      input.setCustomValidity(input.value.trim() ? "" : "Please enter more than spaces.");
    }
    if (!form.reportValidity()) return;
    const subject = encodeURIComponent(`${service} enquiry from ${name}`);
    const body = encodeURIComponent(
      `Service needed: ${service}\n\n${message}\n\nName: ${name}\nEmail: ${email}`,
    );
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
    // Opening a draft cannot confirm delivery. Preserve the user's entries.
    setDraftRequested(true);
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
            Let’s Build Your
            <br />
            Next Project<span className="accent-dot">.</span>
          </h2>
          <p>Tell me what you need, and let’s discuss the next step.</p>
          {profile.availableForFreelance && (
            <p className="availability">
              <span aria-hidden="true" />
              Available for freelance projects
            </p>
          )}
          <a className="contact-email" href={`mailto:${profile.email}`}>
            <Mail size={18} aria-hidden="true" />
            <span>{profile.email}</span>
          </a>
          {profile.phone && (
            <a className="text-link" href={`tel:${profile.phone.replace(/\s/g, "")}`}>
              {profile.phone}
            </a>
          )}
        </div>
        <form
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
          <div className="form-field">
            <label htmlFor="contact-service">Service needed</label>
            <select id="contact-service" name="service" required defaultValue="">
              <option value="" disabled>
                Select a service
              </option>
              {services.map((service) => (
                <option key={service.title}>{service.title}</option>
              ))}
              <option>Let’s figure it out together</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="contact-message">Short project description</label>
            <textarea
              id="contact-message"
              name="message"
              required
              maxLength={2000}
              rows={4}
              placeholder="What would you like to build or improve?"
              aria-describedby="project-description-hint"
            />
            <p id="project-description-hint" className="field-hint">
              A few lines about your idea, goals, and any existing website are a good start.
            </p>
          </div>
          <button type="submit" className="portfolio-button button-primary draft-button">
            Create Email Draft <ArrowUpRight size={18} aria-hidden="true" />
          </button>
          <p id="email-draft-note" className="form-note">
            Opens a draft in your email app. Review it and press send there. You can also email me
            directly using the address here.
          </p>
          <p role="status" className="draft-status">
            {draftRequested
              ? "Email draft requested — nothing has been sent by this website. If your email app didn’t open, copy your details and email me directly. Your entries are still here."
              : ""}
          </p>
        </form>
      </div>
    </section>
  );
}
