interface CheatMeterProps {
  cheatCount: number;
  maxCheats: number;
}

export function CheatMeter({ cheatCount, maxCheats }: CheatMeterProps) {
  const percentage = (cheatCount / maxCheats) * 100;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '8px',
      background: '#f0f0f0',
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${percentage}%`,
        background: cheatCount >= maxCheats ? '#d32f2f' : '#f44336',
        transition: 'width 0.3s ease, background 0.3s ease',
      }} />
    </div>
  );
}

