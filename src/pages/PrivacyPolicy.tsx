import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Layout } from '@/components/Layout';

const LAST_UPDATED = 'May 15, 2025';
const CONTACT_EMAIL = 'cookmate067@gmail.com';

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 + i * 0.055, duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const sections = [
  {
    title: '1. Information We Collect',
    body: [
      'Account information you provide when you register: full name, email address, and password (stored as a salted hash).',
      'Profile data you choose to add: cooking skill level, avatar photo, and dietary preferences.',
      'Usage data: recipes you view, save, cook, and rate; meal plans you create; and search queries you enter.',
      'Device data: device type, operating system version, app version, and approximate timezone — used for crash reporting and compatibility.',
      'Communications: if you contact us by email, we keep those messages to resolve your inquiry.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    body: [
      'To operate and personalize the CookMate service — showing recipe recommendations, populating your meal planner, and remembering your saved recipes.',
      'To improve the app — analysing aggregate usage patterns to prioritise new features and fix bugs.',
      'To send service notifications — password-reset emails, meal-plan reminders you opt into, and critical security alerts.',
      'To protect CookMate and our users — detecting abuse, investigating policy violations, and complying with legal obligations.',
      'We do not sell, rent, or trade your personal information to third parties for their own marketing purposes.',
    ],
  },
  {
    title: '3. Data Sharing',
    body: [
      'Service providers: we share data with trusted vendors (cloud hosting, transactional email, error monitoring) strictly to deliver the service. They are contractually prohibited from using it for other purposes.',
      'Legal requirements: we may disclose data when required by law, court order, or to protect the safety of our users or the public.',
      'Business transfers: if CookMate is acquired or merges with another company, your data may be transferred as part of that transaction. You will be notified via email and an in-app notice.',
      'Aggregated analytics: we may share non-identifiable, aggregated statistics (e.g., "Filipino recipes are the most-saved category") with partners or in public reports.',
    ],
  },
  {
    title: '4. Data Storage & Security',
    body: [
      'Your data is stored on servers located in a secure data centre. Passwords are hashed with bcrypt and are never stored in plain text.',
      'All data in transit between your device and our servers is encrypted using TLS 1.2 or higher.',
      'We enforce rate limiting, brute-force protection, and optional two-factor authentication (TOTP) on all accounts.',
      'In the event of a data breach that is likely to result in risk to your rights or freedoms, we will notify you within 72 hours of becoming aware of it.',
      'Despite our efforts, no method of electronic storage or transmission is 100 % secure. We encourage you to use a strong, unique password and to enable two-factor authentication.',
    ],
  },
  {
    title: '5. Cookies & Local Storage',
    body: [
      'CookMate uses a session cookie and a CSRF cookie to keep you signed in securely. These are strictly necessary and cannot be disabled while you are logged in.',
      'We use localStorage and IndexedDB to cache recipe data and your meal plan for offline use. None of this data leaves your device without your action.',
      'We do not use third-party advertising cookies or cross-site tracking pixels.',
    ],
  },
  {
    title: '6. Your Rights & Choices',
    body: [
      'Access & portability: you can request an export of all data we hold about you from Settings → Privacy & Security → Request data export.',
      'Correction: you can update your name, email, avatar, and preferences at any time from your profile settings.',
      'Deletion: you can delete your account from Settings → Privacy & Security → Danger Zone. Your data is purged from production systems within 7 days.',
      'Opt-out of notifications: you can disable push and email notifications from Settings → Notifications at any time.',
      'Data sharing preferences: you can control personalised suggestions, cooking activity insights, and diagnostic data from Settings → Privacy & Security.',
    ],
  },
  {
    title: '7. Children\'s Privacy',
    body: [
      'CookMate is not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13.',
      'If you believe a child under 13 has provided us with personal information, please contact us at ' + CONTACT_EMAIL + ' and we will delete it promptly.',
    ],
  },
  {
    title: '8. Third-Party Links',
    body: [
      'CookMate may contain links to external websites (e.g., original recipe sources, YouTube cooking videos). We are not responsible for the privacy practices of those sites and encourage you to review their policies.',
    ],
  },
  {
    title: '9. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date at the top of this page and, where appropriate, send you an in-app notification.',
      'Continued use of CookMate after changes are posted constitutes your acceptance of the revised policy.',
    ],
  },
  {
    title: '10. Contact Us',
    body: [
      'If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at: ' + CONTACT_EMAIL,
      'We aim to respond to all privacy-related inquiries within 5 business days.',
    ],
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mb-10"
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-bold text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-stone-100"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
              <ShieldCheck className="size-7" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 md:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-2 text-sm font-medium text-stone-500 dark:text-stone-400">
                Last updated: {LAST_UPDATED}
              </p>
            </div>
          </div>

          <p className="mt-6 text-base font-medium leading-relaxed text-stone-600 dark:text-stone-400 max-w-2xl">
            CookMate ("<strong className="text-stone-800 dark:text-stone-200">we</strong>", "
            <strong className="text-stone-800 dark:text-stone-200">us</strong>", or "
            <strong className="text-stone-800 dark:text-stone-200">our</strong>") is committed to protecting
            your personal information. This Privacy Policy explains what data we collect, how we use it, and
            the choices you have.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.section
              key={section.title}
              custom={i}
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-100/60 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none"
            >
              <h2 className="mb-4 text-lg font-extrabold text-stone-900 dark:text-stone-100">
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.body.map((point, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-500" />
                    <p className="text-sm font-medium leading-relaxed text-stone-600 dark:text-stone-400">
                      {point}
                    </p>
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          custom={sections.length}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mt-8 rounded-2xl border border-orange-100 bg-orange-50/60 p-6 text-center dark:border-orange-900/40 dark:bg-orange-950/20"
        >
          <ShieldCheck className="mx-auto mb-3 size-8 text-orange-500" />
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
            Questions about this policy? Email us at{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-bold text-orange-600 hover:underline dark:text-orange-400"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
