import { supabase } from '../lib/supabase';

export type ReportTargetType = 'listing' | 'profile' | 'broadcast' | 'offer';
export type ReportReason =
  | 'spam' | 'scam' | 'harassment' | 'inappropriate'
  | 'unsafe' | 'impersonation' | 'other';

export interface ReportInput {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

export async function fileReport(input: ReportInput): Promise<boolean> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details ?? '',
  } as never);

  if (error) {
    console.error('[reports] fileReport:', error.message);
    return false;
  }
  return true;
}
