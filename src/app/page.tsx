import Image from "next/image";
import { BrandHeader } from "@/components/BrandHeader";
import { ConsultationForm } from "@/components/ConsultationForm";

const benefits = [
  "Know exactly what to do to get more customers",
  "Get a plan made for your business, not a generic one",
  "Stop guessing what to post and where to spend",
  "Start using your plan right after the call",
  "Talk to a real person who understands your problem",
];

const steps = [
  { title: "Fill the Form", body: "Tell us about your business. It takes less than a minute." },
  { title: "Talk to Us One-to-One", body: "We look at your business and understand what is stopping your sales." },
  { title: "Get Your Plan and Start", body: "You get a customized digital marketing plan you can use immediately." },
];

export default function HomePage() {
  return (
    <>
      <BrandHeader />
      <main>
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero-layout">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot" /> FREE AI-POWERED DIGITAL MARKETING AUDIT</div>
              <h1 id="hero-title">Get a Free <span>Digital Marketing Plan</span> Made for Your Business</h1>
              <p className="hero-subtitle">Book a free 1 hour AI marketing consultation call. Leave with a plan you can start using right away.</p>
              <p className="hero-description"><strong>Posting, boosting, and still not getting enough sales?</strong><br />This free call is for small and medium business owners who are struggling to sell their products or services. We look at your business and build a plan that fits it.</p>
              <a className="button button-primary hero-button" href="#consultation-form">Get My Free Consultation <span aria-hidden="true">↓</span></a>
              <p className="hero-caption">A personalized growth plan to help improve your online presence and generate more leads.</p>
            </div>
            <div className="hero-portrait">
              <div className="portrait-halo" aria-hidden="true" />
              <Image
                src="/prasidhika-shakya-portrait.png"
                alt="Prasidhika Shakya"
                width={1254}
                height={1254}
                priority
                sizes="(max-width: 760px) 78vw, (max-width: 1120px) 38vw, 420px"
                className="portrait-image"
              />
            </div>
          </div>
          <div className="hero-orb hero-orb-one" aria-hidden="true" />
          <div className="hero-orb hero-orb-two" aria-hidden="true" />
        </section>

        <section className="benefits section-shell" aria-labelledby="benefits-title">
          <div className="section-heading">
            <p className="section-kicker">YOUR BUSINESS, WITH A CLEARER DIRECTION</p>
            <h2 id="benefits-title">Walk away knowing <span>what to do next.</span></h2>
          </div>
          <ul className="benefit-list">
            {benefits.map((benefit) => <li key={benefit}><span className="check-icon" aria-hidden="true">✓</span><span>{benefit}</span></li>)}
          </ul>
        </section>

        <section className="process-section" aria-labelledby="process-title">
          <div className="section-shell">
            <div className="section-heading">
              <p className="section-kicker">A SIMPLE THREE-STEP PROCESS</p>
              <h2 id="process-title">From questions to a <span>practical plan.</span></h2>
            </div>
            <ol className="steps-grid">
              {steps.map((step, index) => (
                <li className="step-card" key={step.title}>
                  <span className="step-number">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="consultation-form" className="form-section section-shell" aria-labelledby="form-title">
          <div className="form-intro">
            <p className="section-kicker">YOUR FREE ONE-TO-ONE CONSULTATION</p>
            <h2 id="form-title">Let’s make a plan for <span>your business.</span></h2>
            <p>Tell us a little about your business and we’ll take it from there.</p>
          </div>
          <ConsultationForm />
        </section>
      </main>
      <footer className="site-footer">Prasidhika Shakya <span>·</span> Digital Marketing Strategy</footer>
    </>
  );
}
