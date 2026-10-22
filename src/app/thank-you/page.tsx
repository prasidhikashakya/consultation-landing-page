import type { Metadata } from "next";
import { BrandHeader } from "@/components/BrandHeader";

export const metadata: Metadata = {
  title: "Thank You | Prasidhika Shakya",
  description: "Next steps for your free digital marketing consultation.",
  openGraph: {
    title: "Thank You | Prasidhika Shakya",
    description: "Next steps for your free digital marketing consultation.",
    type: "website",
  },
};

const whatsappMessage = "Hi, I just submitted the form for the Free Digital Marketing Consultation. I'd like to know the next steps.";
const whatsappUrl = `https://wa.me/9779848853856?text=${encodeURIComponent(whatsappMessage)}`;

function getVimeoEmbedUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!/(^|\.)vimeo\.com$/i.test(url.hostname) || url.username || url.password) return null;
    const id = url.pathname.match(/\/(?:video\/)?(\d+)(?:\/|$)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

export default function ThankYouPage() {
  const videoUrl = getVimeoEmbedUrl(process.env.NEXT_PUBLIC_VIMEO_URL);

  return (
    <>
      <BrandHeader />
      <main className="thankyou-page section-shell">
        <div className="thankyou-content">
          <div className="success-mark" aria-hidden="true">✓</div>
          <p className="section-kicker">THANK YOU</p>
          <h1>Congratulations<span>!</span></h1>
          <p className="thankyou-lead">You have taken the first step toward a digital marketing plan made for your business.</p>

          <div className="next-steps">
            <h2>Your next steps</h2>
            <ol>
              <li><span>1</span>Watch the short video below.</li>
              <li><span>2</span>Message me on WhatsApp.</li>
              <li><span>3</span>We will set up your free 1-hour consultation call.</li>
            </ol>
          </div>

          <section className="video-section" aria-labelledby="video-title">
            <h2 id="video-title">Watch This Video</h2>
            <div className="video-frame">
              {videoUrl ? (
                <iframe src={videoUrl} title="Prasidhika Shakya consultation video" allow="fullscreen; picture-in-picture" allowFullScreen />
              ) : (
                <div className="video-placeholder">
                  <span className="play-placeholder" aria-hidden="true">▶</span>
                  <strong>Video coming soon</strong>
                  <span>Add a valid Vimeo video URL to NEXT_PUBLIC_VIMEO_URL when it’s ready.</span>
                </div>
              )}
            </div>
          </section>

          <a className="button whatsapp-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <span className="whatsapp-icon" aria-hidden="true">◉</span>Connect with Me on WhatsApp <span aria-hidden="true">↗</span>
          </a>
        </div>
      </main>
      <footer className="site-footer">Prasidhika Shakya <span>·</span> Digital Marketing Strategy</footer>
    </>
  );
}
