'use client';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-[#222a3d] border border-[#424754] flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[32px] text-[#8c909f]">{icon}</span>
        </div>
        <h3 className="text-[20px] font-semibold tracking-[-0.01em] leading-7 text-[#dae2fd] mb-2">
          {title}
        </h3>
        <p className="text-[14px] leading-5 text-[#c2c6d6] mb-6">
          {description}
        </p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="bg-[#4d8eff] text-[#00285d] px-4 py-2 rounded text-[14px] font-medium hover:bg-[#adc6ff] transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
