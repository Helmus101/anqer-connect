import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import {
    SearchableNotes,
    SuggestedIntros,
    AutoTagging,
    EnrichedProfiles,
    RelationshipStrength,
    Pipelines
} from '../components/layout/Features';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing-page">
            <Navbar />

            <main>
                {/* Hero Section */}
                <section className="hero-section">
                    <div className="container">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="hero-content"
                        >
                            <h1 className="hero-title">
                                Your network is your net worth. <br />
                                <span className="text-gradient">Make it intentional.</span>
                            </h1>
                            <p className="hero-subtitle">
                                The Relationship OS for Gen Z Founders & Creators. <br />
                                <span className="opacity-80">Never lose touch with people who matter.</span>
                            </p>

                            <div className="hero-cta">
                                <Input placeholder="Enter your email" className="email-input" />
                                <Button size="lg">
                                    Get early access <ArrowRight size={18} className="ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Social Proof */}
                <section className="social-proof">
                    <p className="social-label">BACKED BY FOUNDERS OF</p>
                    <div className="logos-grid">
                        {['Stripe', 'Airbnb', 'Vercel', 'Linear', 'Loom'].map((logo) => (
                            <span key={logo} className="logo-text">{logo}</span>
                        ))}
                    </div>
                </section>

                {/* Integrations */}
                <section className="integrations-section text-center py-10 border-b border-border-subtle">
                    <p className="text-secondary text-sm mb-6 uppercase tracking-wider">Works where you live</p>
                    <div className="flex-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                        {/* Placeholder text for logos as we don't have SVGs handy, in real app use SVGs */}
                        <span>WhatsApp</span>
                        <span>•</span>
                        <span>Discord</span>
                        <span>•</span>
                        <span>iMessage</span>
                        <span>•</span>
                        <span>Instagram</span>
                        <span>•</span>
                        <span>Snapchat</span>
                    </div>
                </section>

                {/* New Features */}
                <SearchableNotes />
                <SuggestedIntros />
                <AutoTagging />
                <EnrichedProfiles />
                <RelationshipStrength />
                <Pipelines />

                {/* Video Section */}
                <section className="video-section">
                    <div className="container">
                        <div className="video-container">
                            <div className="video-overlay">
                                <div className="play-button">
                                    <Play fill="currentColor" size={24} />
                                </div>
                                <span className="video-label">Watch our launch video</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="footer">
                    <div className="container flex-between">
                        <span className="footer-logo">anqer</span>
                        <div className="footer-links">
                            <a href="#">Twitter</a>
                            <a href="#">LinkedIn</a>
                            <a href="#">Privacy</a>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default LandingPage;
