import React from 'react';

export default function Card({ title, description, icon: Icon, children, className = '' }) {
  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-sm p-5 transition-all duration-200 hover:shadow-md ${className}`}
    >
      {(title || Icon) && (
        <div className="flex items-start gap-3 mb-4">
          {Icon && (
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
              <Icon size={20} />
            </div>
          )}
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
