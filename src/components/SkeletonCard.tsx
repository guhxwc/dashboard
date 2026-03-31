import React from 'react';

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = "h-32" }: SkeletonCardProps) {
  return (
    <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-2xl ${className}`} />
  );
}
