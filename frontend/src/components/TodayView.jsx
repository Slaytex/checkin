import { format, parseISO } from 'date-fns';

function TodayView({ day, drinkTypes, pointsSummary, onDrinkCheckOff, onDrinkUncheck, onDrinkTypeUpdate, onGymUpdate, onCheat }) {
  if (!day || !day.date) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#ffffff' }}>Loading...</div>;
  }
  
  let formattedDate = day.date;
  try {
    const date = parseISO(day.date);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error, day.date);
    formattedDate = day.date;
  }
  
  const drinks = day.drinks || [];
  const wentToGym = day.went_to_gym === 1;
  
  // Check if cheat button should appear (used all earned points, not accumulated)
  const canCheat = pointsSummary && pointsSummary.earnedPoints > 0 && pointsSummary.usedPoints >= pointsSummary.earnedPoints;

  return (
    <div style={{
      background: '#2a2a2a',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    }}>
      <h2 style={{ 
        fontSize: '24px', 
        marginBottom: '20px',
        color: '#ffffff',
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 600,
      }}>
        {formattedDate}
      </h2>
      
      {/* Gym Checkbox */}
      <div style={{ 
        marginBottom: '30px',
        padding: '15px',
        background: wentToGym ? '#1a4d2e' : '#3a3a3a',
        border: `2px solid ${wentToGym ? '#4caf50' : '#555'}`,
        borderRadius: '8px',
      }}>
        <label style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 500,
          color: '#ffffff',
          cursor: 'pointer',
          fontFamily: 'Montserrat, sans-serif',
        }}>
          <input
            type="checkbox"
            checked={wentToGym}
            onChange={(e) => onGymUpdate(e.target.checked)}
            style={{
              width: '24px',
              height: '24px',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '18px' }}>
            💪 Went to the Gym
          </span>
        </label>
        <p style={{ 
          marginTop: '10px',
          fontSize: '14px',
          color: '#cccccc',
          fontFamily: 'Montserrat, sans-serif',
        }}>
          {wentToGym 
            ? 'Great job! You earned 2 points today! (1 base + 1 gym bonus)'
            : 'You have 1 point available today. Go to the gym to earn an extra point!'}
        </p>
      </div>

      {/* Points Summary */}
      {pointsSummary && (
        <div style={{
          marginBottom: '30px',
          padding: '20px',
          background: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #444',
        }}>
          <h3 style={{
            fontSize: '18px',
            marginBottom: '15px',
            color: '#ffffff',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
          }}>
            Points Summary
          </h3>
          <div style={{ display: 'grid', gap: '10px', fontFamily: 'Montserrat, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cccccc' }}>
              <span>Earned Today:</span>
              <span style={{ fontWeight: 500, color: '#ffffff' }}>{pointsSummary.earnedPoints}</span>
            </div>
            {pointsSummary.accumulatedPoints > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cccccc' }}>
                <span>Accumulated (Mon-Thu):</span>
                <span style={{ fontWeight: 500, color: '#ffffff' }}>{pointsSummary.accumulatedPoints}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cccccc' }}>
              <span>Total Available:</span>
              <span style={{ fontWeight: 500, color: '#ffffff' }}>{pointsSummary.totalAvailablePoints}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cccccc' }}>
              <span>Used:</span>
              <span style={{ fontWeight: 500, color: '#ffffff' }}>{pointsSummary.usedPoints}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              paddingTop: '10px',
              borderTop: '1px solid #444',
              color: pointsSummary.remainingPoints >= 0 ? '#4caf50' : '#f44336',
              fontWeight: 600,
            }}>
              <span>Remaining:</span>
              <span>{pointsSummary.remainingPoints}</span>
            </div>
          </div>
        </div>
      )}

      {/* Drinks List */}
      <div style={{ marginBottom: '30px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            marginBottom: '15px',
            color: '#ffffff',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
          }}>
            Drinks
          </h3>
          
          {drinks.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic', fontFamily: 'Montserrat, sans-serif' }}>
              No drinks available yet. Points will create drink slots automatically.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {drinks.map((drink) => {
                const canCheck = pointsSummary && 
                  pointsSummary.remainingPoints >= (drink.points || 1) && 
                  !drink.checked_off;
                
                return (
                  <div
                    key={drink.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      padding: '15px',
                      background: drink.checked_off ? '#1a4d2e' : '#3a3a3a',
                      border: `2px solid ${drink.checked_off ? '#4caf50' : '#555'}`,
                      borderRadius: '8px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={drink.checked_off === 1}
                      onChange={() => {
                        if (drink.checked_off === 1) {
                          onDrinkUncheck(drink.id);
                        } else if (canCheck) {
                          onDrinkCheckOff(drink.id);
                        }
                      }}
                      disabled={!canCheck && !drink.checked_off}
                      style={{
                        width: '24px',
                        height: '24px',
                        cursor: canCheck || drink.checked_off ? 'pointer' : 'not-allowed',
                      }}
                    />
                    <select
                      value={drink.drink_type || 'Beer'}
                      onChange={(e) => onDrinkTypeUpdate(drink.id, e.target.value)}
                      disabled={drink.checked_off === 1}
                      style={{
                        padding: '8px',
                        background: '#1a1a1a',
                        color: '#ffffff',
                        border: '1px solid #555',
                        borderRadius: '6px',
                        fontFamily: 'Montserrat, sans-serif',
                        cursor: drink.checked_off === 1 ? 'not-allowed' : 'pointer',
                        flex: 1,
                      }}
                    >
                      {Object.keys(drinkTypes).map((type) => (
                        <option key={type} value={type}>
                          {type} ({drinkTypes[type]} point{drinkTypes[type] !== 1 ? 's' : ''})
                        </option>
                      ))}
                    </select>
                    <span style={{
                      fontSize: '14px',
                      color: '#999',
                      fontFamily: 'Montserrat, sans-serif',
                      minWidth: '60px',
                      textAlign: 'right',
                    }}>
                      {drink.points || 1} pt{drink.points !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {/* Cheat Button */}
      {canCheat && (
        <div style={{
          marginBottom: '20px',
          padding: '20px',
          background: '#3a1a1a',
          border: '2px solid #f44336',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <p style={{ 
            color: '#f44336', 
            fontSize: '16px', 
            marginBottom: '15px',
            fontWeight: 500,
            fontFamily: 'Montserrat, sans-serif',
          }}>
            All your earned points for today have been used.
          </p>
          <button
            onClick={onCheat}
            style={{
              padding: '15px 30px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s',
              fontFamily: 'Montserrat, sans-serif',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#d32f2f';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#f44336';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🍺 I Cheated
          </button>
          <p style={{ 
            color: '#999', 
            fontSize: '12px', 
            marginTop: '10px',
            fontFamily: 'Montserrat, sans-serif',
          }}>
            You can cheat up to 3 times per week. Each cheat fills the red meter.
          </p>
        </div>
      )}
    </div>
  );
}

export default TodayView;

