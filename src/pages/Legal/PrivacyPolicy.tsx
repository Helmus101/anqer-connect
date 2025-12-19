import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-white text-black p-8 font-sans">
            <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-8 flex items-center gap-2 text-gray-500 hover:text-black transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <h1 className="text-3xl font-extrabold tracking-tighter mb-8">Privacy Policy</h1>

                <div className="space-y-8 text-sm leading-relaxed text-gray-700">
                    <section>
                        <h2 className="text-black font-bold mb-2 uppercase tracking-wide text-xs">1. Introduction</h2>
                        <p>
                            Welcome to Anqer. We respect your privacy and are committed to protecting your personal data.
                            This privacy policy will inform you as to how we look after your personal data when you visit our
                            application and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-black font-bold mb-2 uppercase tracking-wide text-xs">2. Data We Collect</h2>
                        <p className="mb-2">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                            <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
                            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
                            <li><strong>Usage Data:</strong> includes information about how you use our website and services.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-black font-bold mb-2 uppercase tracking-wide text-xs">3. Google User Data</h2>
                        <p>
                            Our application accesses Google User Data (Contacts, Calendar, Gmail) only with your explicit consent
                            to provide the core functionality of syncing your interactions. We do not sell this data to third parties.
                            We generally cache this data locally or in your private database instance to improve performance.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-black font-bold mb-2 uppercase tracking-wide text-xs">4. Data Security</h2>
                        <p>
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost,
                            used or accessed in an unauthorized way, altered or disclosed.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-black font-bold mb-2 uppercase tracking-wide text-xs">5. Contact Us</h2>
                        <p>
                            If you have any questions about this privacy policy or our privacy practices, please contact us.
                        </p>
                    </section>

                    <div className="pt-8 border-t border-gray-100 text-xs text-gray-400">
                        Last Updated: December 2025
                    </div>
                </div>
            </div>
        </div>
    )
}
