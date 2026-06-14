import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

/**
 * STARTER terms of service. The structure and language below is a reasonable
 * baseline for a peer-to-peer marketplace, but it must be reviewed by a
 * qualified attorney before this product is offered to the public. Do not
 * treat it as legal advice or as finished copy.
 */
export const TermsPage: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
    <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
      <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
      <p>
        <strong>Draft.</strong> These terms are a starting template only.
        Have an attorney review and adapt them before launching publicly.
      </p>
    </div>

    <h1 className="text-3xl font-black text-slate-900 mb-2">Terms of Service</h1>
    <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

    <section className="space-y-6 text-slate-700 leading-relaxed">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">1. About Foster</h2>
        <p>
          Foster is a community platform that helps neighbors offer and request help with
          everyday tasks. Foster itself is not a party to any agreement between members,
          does not provide the services listed, and does not employ the people who offer them.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">2. Who can use Foster</h2>
        <p>
          You must be at least 18 years old to create an account. You agree that the
          information you provide is accurate and that you will keep it up to date.
          One person, one account.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">3. Your conduct</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Post anything illegal, fraudulent, hateful, harassing, or sexually explicit.</li>
          <li>Impersonate someone else or misrepresent your skills, identity, or location.</li>
          <li>Use Foster to recruit for, advertise, or coordinate activity unrelated to peer-to-peer help.</li>
          <li>Try to bypass safety, reporting, or rating features.</li>
          <li>Scrape, copy, or resell content from Foster without our written permission.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">4. Tasks and offers</h2>
        <p>
          When you post a task or accept an offer, you are entering into a direct,
          private agreement with the other member. You are solely responsible for
          evaluating the other party, agreeing on terms, and complying with applicable
          laws. Foster does not guarantee outcomes, quality, safety, or that any
          specific person will actually show up.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">5. Payments and escrow</h2>
        <p>
          Paid tasks use an escrow model powered by Stripe. When a lister funds escrow,
          Stripe places an authorization hold on their card. Funds are only captured and
          transferred to the helper after the lister marks the task complete. Foster
          charges a platform fee (shown before you confirm payment) that is deducted from
          the total before the helper is paid. Fees, timing, and refund eligibility are
          subject to Stripe's terms as well as ours.
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Cancelling a pending or held payment voids the authorization hold; no charge is made.</li>
          <li>Once a payment is released, it cannot be reversed through Foster — contact Stripe support for disputes.</li>
          <li>Helpers must connect a Stripe Express account to receive payouts; payout timing is governed by Stripe's payout schedule.</li>
          <li>Foster is not responsible for Stripe outages, payment failures, or bank processing delays.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">6. Ratings, reports, and removal</h2>
        <p>
          We may remove content, suspend accounts, or refuse service for any reason,
          including violations of these terms, repeated negative ratings, or credible
          reports. We may share information with law enforcement when legally required
          or when we believe doing so is necessary to prevent harm.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">7. Disclaimer of warranties</h2>
        <p>
          Foster is provided <em>as is</em>, without warranties of any kind, express or
          implied. We do not warrant that the service will be uninterrupted, error-free,
          or that any member will be reliable or trustworthy.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">8. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Foster and its operators are not
          liable for indirect, incidental, special, or consequential damages, or for
          loss of profits, data, goodwill, or other intangible losses arising out of
          your use of the service or any interaction with another member.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">9. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. If we make material changes,
          we will provide notice in-app. Continued use after the changes take effect
          means you accept the new terms.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">10. Contact</h2>
        <p>
          Questions about these terms? Reach out at{' '}
          <a href="mailto:supportfoster@gmail.com" className="text-teal-600 hover:text-teal-700 font-mono text-sm">supportfoster@gmail.com</a>.
        </p>
      </div>
    </section>

    <div className="mt-12 pt-6 border-t border-slate-200 text-sm text-slate-500">
      See also: <Link to="/legal/privacy" className="text-teal-600 hover:text-teal-700 font-semibold">Privacy Policy</Link>
    </div>
  </div>
);
