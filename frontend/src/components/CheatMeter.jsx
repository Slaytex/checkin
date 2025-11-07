function CheatMeter({ cheatCount, maxCheats }) {
  const exceededLimit = cheatCount > maxCheats;

  return (
    <>
      {/* Full screen pulsing red overlay when cheats > 3 */}
      {exceededLimit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(211, 47, 47, 1)',
          zIndex: 999,
          animation: 'pulse 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Top bar meter */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '8px',
        background: '#1a1a1a',
        zIndex: 1000,
      }}>
        <div style={{
          height: '100%',
          width: exceededLimit ? '100%' : `${(cheatCount / maxCheats) * 100}%`,
          background: cheatCount >= maxCheats ? '#d32f2f' : '#f44336',
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}

export default CheatMeter;

