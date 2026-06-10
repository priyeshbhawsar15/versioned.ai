'use client';

interface SkeletonPulseProps {
  className?: string;
}

export default function SkeletonPulse({ className = '' }: SkeletonPulseProps) {
  return (
    <div className={`animate-pulse bg-[#222a3d] rounded ${className}`} />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-4 p-3 border-b border-[#424754]">
      <SkeletonPulse className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonPulse className="h-3 w-3/4" />
        <SkeletonPulse className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="border border-[#424754] rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonPulse className="w-12 h-12 rounded" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-1/3" />
          <SkeletonPulse className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonPulse className="h-3 w-full" />
      <SkeletonPulse className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonMetricCard() {
  return (
    <div className="bg-[#0b1326] border border-[#424754] p-3 rounded space-y-2">
      <SkeletonPulse className="h-3 w-1/2" />
      <SkeletonPulse className="h-8 w-1/3" />
    </div>
  );
}
