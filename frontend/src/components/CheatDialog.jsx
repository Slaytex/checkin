function CheatDialog({ drinkTypes, onSubmit, onCancel }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#2a2a2a',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
      }}>
        <h2 style={{
          fontSize: '24px',
          marginBottom: '20px',
          color: '#ffffff',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 600,
        }}>
          Select drink type
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {Object.keys(drinkTypes).map((drinkType) => (
            <button
              key={drinkType}
              onClick={() => onSubmit(drinkType)}
              style={{
                padding: '15px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#5568d3';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#667eea';
              }}
            >
              {drinkType} ({drinkTypes[drinkType]} point{drinkTypes[drinkType] !== 1 ? 's' : ''})
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            background: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
            width: '100%',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default CheatDialog;

