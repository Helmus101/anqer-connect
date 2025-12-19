import { motion } from 'framer-motion';
import { Search, Sparkles, Tag, Briefcase } from 'lucide-react';
import { Button } from '../ui/Button';
import './Features.css';

const FeatureSection = ({ title, subtitle, children, align = 'left' }: any) => (
    <section className={`feature-section ${align}`}>
        <div className="container">
            <div className="feature-grid">
                <div className="feature-text">
                    <h2 className="feature-title">{title}</h2>
                    <p className="feature-subtitle">{subtitle}</p>
                </div>
                <div className="feature-visual">
                    {children}
                </div>
            </div>
        </div>
    </section>
);

export const SearchableNotes = () => (
    <FeatureSection
        title="Searchable notes"
        subtitle="Instantly recall context. “Who did I speak to about X?”"
        align="left"
    >
        <div className="visual-card search-card">
            <div className="fake-search-bar">
                <Search size={18} className="text-tertiary" />
                <span>who did i speak to about x?</span>
            </div>
            <div className="search-result">
                <div className="result-header">
                    <div className="avatar">J</div>
                    <div className="result-info">
                        <span className="name">James Jackson</span>
                        <span className="meta">2 days ago</span>
                    </div>
                </div>
                <p className="result-preview">
                    ...mentioned he is interested in <span className="highlight">AI application layer</span> startups...
                </p>
            </div>
        </div>
    </FeatureSection>
);

export const SuggestedIntros = () => (
    <FeatureSection
        title="Networks never divide, they multiply"
        subtitle="AI suggested intros to supercharge your network."
        align="right"
    >
        <div className="visual-card intro-card">
            <div className="ai-badge"><Sparkles size={14} /> AI Suggestion</div>
            <p className="suggestion-text">
                <strong>Will</strong> is currently fundraising. Introduce him to your investor <strong>Tom</strong>, who regularly invests in the AI application layer?
            </p>
            <div className="intro-actions">
                <Button size="sm" variant="secondary">Ignore</Button>
                <Button size="sm" variant="primary">Draft Intro</Button>
            </div>
        </div>
    </FeatureSection>
);

export const AutoTagging = () => (
    <FeatureSection
        title="Define once, forever up-to-date"
        subtitle="Automatic tagging into lists based on enriched data."
        align="left"
    >
        <div className="visual-card tagging-card">
            <div className="tag-definition">
                <div className="tag-header">
                    <Tag size={16} />
                    <span>Investors</span>
                </div>
                <p className="tag-rule">
                    Current angel investors, or those working in venture capital...
                </p>
            </div>
            <div className="tag-definition">
                <div className="tag-header">
                    <Briefcase size={16} />
                    <span>Founders</span>
                </div>
                <p className="tag-rule">
                    Current or former founders... exclude advisors...
                </p>
            </div>
            <div className="tag-match-list">
                <div className="matched-user">
                    <div className="avatar-sm">A</div>
                    <span>Added Alex Rivera</span>
                </div>
                <div className="matched-user">
                    <div className="avatar-sm">S</div>
                    <span>Added Sarah Chen</span>
                </div>
            </div>
        </div>
    </FeatureSection>
);

export const EnrichedProfiles = () => {
    const interests = [
        "Pickleball", "Golden State Warriors", "Meditation",
        "The Alchemist", "Burning Man", "Jazz Music",
        "Acquired Podcast", "Hackathons", "Longevity",
        "Biotech", "Existentialist Philosophy"
    ];

    return (
        <section className="feature-section center">
            <div className="container">
                <div className="center-content">
                    <h2 className="feature-title">Deeply enriched profiles</h2>
                    <p className="feature-subtitle">Know who they are, what they do, and what they love.</p>

                    <div className="interests-cloud">
                        {interests.map((interest, i) => (
                            <motion.span
                                key={i}
                                className="interest-tag"
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                {interest}
                            </motion.span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export const RelationshipStrength = () => (
    <FeatureSection
        title="Real relationship strength"
        subtitle="Measured based on volume and quality of interactions."
        align="right"
    >
        <div className="visual-card strength-card">
            <div className="strength-row">
                <div className="user-info">
                    <div className="avatar">A</div>
                    <span>Alex Rivera</span>
                </div>
                <div className="strength-meter">
                    <div className="meter-fill high"></div>
                </div>
            </div>
            <div className="strength-row">
                <div className="user-info">
                    <div className="avatar">M</div>
                    <span>Mike Ross</span>
                </div>
                <div className="strength-meter">
                    <div className="meter-fill medium"></div>
                </div>
            </div>
        </div>
    </FeatureSection>
);

export const Pipelines = () => (
    <section className="feature-section center">
        <div className="container">
            <div className="center-content">
                <h2 className="feature-title">Pipelines for everything</h2>
                <p className="feature-subtitle">Fundraising, Hiring, Sales.</p>
                <h3 className="hero-subtitle text-gradient" style={{ marginTop: '1rem' }}>
                    A light-touch CRM, perfected for human-first interaction.
                </h3>

                <div className="pipeline-visual">
                    <div className="pipeline-column">
                        <span className="col-header">To Contact</span>
                        <div className="pipeline-card">John Doe</div>
                        <div className="pipeline-card">Jane Smith</div>
                    </div>
                    <div className="pipeline-column">
                        <span className="col-header">In Contact</span>
                        <div className="pipeline-card">Alex Rivera</div>
                    </div>
                    <div className="pipeline-column">
                        <span className="col-header">Closed</span>
                        <div className="pipeline-card">Sarah Chen</div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);
