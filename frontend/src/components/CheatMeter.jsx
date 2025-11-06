function CheatMeter({ cheatCount, maxCheats }) {
  return (
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
        width: `${(cheatCount / maxCheats) * 100}%`,
        background: cheatCount >= maxCheats ? '#d32f2f' : '#f44336',
        transition: 'width 0.3s ease, background 0.3s ease',
      }} />
    </div>
  );
}

export default CheatMeter;

