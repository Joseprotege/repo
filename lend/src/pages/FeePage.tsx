import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, CheckCircle2, Info } from 'lucide-react';
import { FEE_TIERS } from '../types';

const TIER_ICONS = ['🌱', '🌿', '🌳', '🏙️', '🌐'];
const TIER_COLORS = [
  'border-emerald-200 bg-emerald-50',
  'border-teal-200 bg-teal-50',
  'border-blue-200 bg-blue-50',
  'border-violet-200 bg-violet-50',
  'border-slate-200 bg-slate-50',
];

export const FeePage: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
    {/* Header */}
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <TrendingUp size={20} className="text-teal-700" />
        </div>
        <h1 className="text-3xl font-black text-slate-900">Platform Fee Schedule</h1>
      </div>
      <p className="text-slate-600 leading-relaxed">
        Foster charges a small platform fee on paid tasks — money that goes directly toward
        server costs, safety features, and making the service better for everyone.
        Volunteer tasks (where no payment is requested) are always <strong>100% free</strong>.
      </p>
    </div>

    {/* Core philosophy */}
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-6 mb-10">
      <h2 className="font-bold text-teal-900 mb-3 flex items-center gap-2">
        <Users size={18} />
        Fees grow with the platform — not before
      </h2>
      <p className="text-teal-800 text-sm leading-relaxed mb-4">
        When Foster is small, the fee is zero. As the platform grows and delivers more value,
        the fee rises — but only to fund the infrastructure that makes that growth possible.
        You'll always know exactly what you're paying and why.
      </p>
      <div className="flex flex-wrap gap-3">
        {[
          'No hidden fees',
          'Volunteer tasks are always free',
          'Escrow protects both parties',
          'Fee locked at time of agreement',
        ].map(point => (
          <div key={point} className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold bg-white rounded-full px-3 py-1.5 border border-teal-200">
            <CheckCircle2 size={12} />
            {point}
          </div>
        ))}
      </div>
    </div>

    {/* Fee tiers */}
    <h2 className="text-xl font-bold text-slate-900 mb-4">Fee tiers by user count</h2>
    <div className="space-y-3 mb-10">
      {FEE_TIERS.map((tier, i) => (
        <div
          key={tier.label}
          className={`rounded-2xl border p-5 ${TIER_COLORS[i]}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{TIER_ICONS[i]}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{tier.label}</h3>
                  <span className="text-xs font-mono bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-600">
                    {tier.minUsers.toLocaleString()}
                    {tier.maxUsers ? `–${tier.maxUsers.toLocaleString()}` : '+'} users
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{tier.description}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-black text-slate-900">{tier.feePct}%</p>
              <p className="text-xs text-slate-500">platform fee</p>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Example calculation */}
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-10">
      <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Info size={18} className="text-slate-500" />
        Example calculation
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2 border-b border-slate-100">
          <span className="text-slate-500">Task payment agreed</span>
          <span className="font-semibold">$50.00</span>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-100">
          <span className="text-slate-500">
            Platform fee <span className="text-xs bg-teal-100 text-teal-700 rounded px-1">Community tier — 5%</span>
          </span>
          <span className="font-semibold text-slate-600">−$2.50</span>
        </div>
        <div className="flex justify-between py-2 font-bold text-teal-700">
          <span>Helper receives</span>
          <span>$47.50</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-4">
        The fee is deducted from the agreed amount at release time.
        The lister pays the full amount; the helper receives the net payout.
      </p>
    </div>

    {/* Escrow flow */}
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-10">
      <h2 className="font-bold text-slate-900 mb-4">How escrow works</h2>
      <ol className="space-y-3">
        {[
          { step: 1, text: 'Helper makes an offer and optionally requests a payment amount.' },
          { step: 2, text: 'Lister accepts the offer and agrees to the payment terms.' },
          { step: 3, text: 'Lister funds escrow via Stripe — money is held safely by Foster.' },
          { step: 4, text: 'Helper completes the task, following the step guide and communicating via chat.' },
          { step: 5, text: 'Lister verifies the task is done and marks it complete.' },
          { step: 6, text: "Foster releases the net payout to the helper's connected Stripe account." },
        ].map(({ step, text }) => (
          <li key={step} className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
              {step}
            </div>
            <p className="text-sm text-slate-700">{text}</p>
          </li>
        ))}
      </ol>
    </div>

    {/* Footer links */}
    <div className="pt-6 border-t border-slate-200 text-sm text-slate-500 flex flex-wrap gap-4">
      <Link to="/legal/terms" className="text-teal-600 hover:text-teal-700 font-semibold">Terms of Service</Link>
      <Link to="/legal/privacy" className="text-teal-600 hover:text-teal-700 font-semibold">Privacy Policy</Link>
      <Link to="/browse" className="text-teal-600 hover:text-teal-700 font-semibold">Browse Tasks</Link>
    </div>
  </div>
);
