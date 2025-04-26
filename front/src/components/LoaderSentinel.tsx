import React from 'react';

interface Props {
    sentinelRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
}

export const LoaderSentinel: React.FC<Props> = ({ sentinelRef, isLoading }) => {
  return (
    <div className="loader-wrapper">
      {isLoading && <div className="loader" />}
      <div ref={sentinelRef} style={{ height: '1px' }} />
    </div>
  );
};
