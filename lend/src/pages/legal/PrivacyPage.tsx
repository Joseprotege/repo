import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

/**
 * STARTER privacy policy. The structure and language below is a reasonable
 * baseline for a peer-to-peer marketplace using Supabase for auth/storage,
 * but it must be reviewed by a qualified attorney before this product is
 * offered to the public. Do not treat it as legal advice.
 */
export const PrivacyPage: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
    <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
      <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
      <p>
        <strong>Draft.</strong> This policy is a starting template only. Have an
        attorney review and adapt it (especially for GDPR / CCPA / CPRA
        compliance) before launching publicly.
      </p>
    </div>

    <h1 className="text-3xl font-black text-slate-900 mb-2">Privacy Policy</h1>
    <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

    <section className="space-y-6 text-slate-700 leading-relaxed">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">What we collect</h2>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>Account info:</strong> email address, password (hashed by our auth provider), display name, optional avatar.</li>
          <li><strong>Profile info:</strong> bio, skills, neighborhood, city — anything you choose to share on your profile.</li>
          <li><strong>Activity:</strong> tasks you post, offers you make, messages you send, ratings you give and receive, reports you file.</li>
          <li><strong>Technical info:</strong> browser type, device, IP address, and basic usage analytics so we can improve the service.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">How we use it</h2>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>To operate the service — show your tasks to nearby members, route offers, send notifications.</li>
          <li>To compute reliability scores and the anonymous Community Pulse signals.</li>
          <li>To investigate reports and protect members from harm.</li>
          <li>To improve the product (aggregated, anonymized analytics).</li>
          <li>To comply with legal obligations when required.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">What other members can see</h2>
        <p>
          Your display name, avatar, bio, neighborhood, skills, reliability score,
          and the listings you post are visible to other members. Community Pulse
          broadcasts are anonymous by design — they never include your name or the
          specific task that was completed.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Who we share data with</h2>
        <p>
          We do not sell your personal information. We share data only with:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>Service providers</strong> we use to run the platform (e.g., Supabase for database/auth/storage, Vercel for hosting).</li>
          <li><strong>Law enforcement</strong> when legally compelled or when we believe disclosure is necessary to prevent serious harm.</li>
          <li><strong>Other members</strong>, but only the public profile information described above.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">How long we keep it</h2>
        <p>
          We keep account data for as long as your account is active. If you delete
          your account, we delete or anonymize your personal data within 30 days,
          except records we are legally required to retain.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct,
          export, or delete your personal data, and to object to or restrict
          certain processing. To exercise any of these rights, email
          <span className="font-mono text-sm"> privacy@example.com</span>.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Children</h2>
        <p>
          Foster is not directed to people under 18. If we learn we've collected
          information from a minor, we will delete it.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Changes</h2>
        <p>
          We may update this policy. If changes are material, we will let you know
          in-app. Continued use after the changes take effect means you accept the
          updated policy.
        </p>
      </div>
    </section>

    <div className="mt-12 pt-6 border-t border-slate-200 text-sm text-slate-500">
      See also: <Link to="/legal/terms" className="text-teal-600 hover:text-teal-700 font-semibold">Terms of Service</Link>
    </div>
  </div>
);
