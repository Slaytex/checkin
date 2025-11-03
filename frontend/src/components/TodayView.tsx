import { format, parseISO } from 'date-fns';
import { Day, Drink } from '../types';

interface TodayViewProps {
  day: Day;
  onDrinkCheckOff: (drinkId: number) => void;
  onDrinkUncheck: (drinkId: number) => void;
  onMaxDrinksUpdate: (maxDrinks: number) => void;
  onGymUpdate: (wentToGym: boolean) => void;
  onCheat: () => void;
}

export function TodayView({ day, onDrinkCheckOff, onDrinkUncheck, onMaxDrinksUpdate, onGymUpdate, onCheat }: TodayViewProps) {
  const date = parseISO(day.date);
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  
  const checkedDrinks = day.drinks.filter(d => d.checked_off === 1);
  const uncheckedDrinks = day.drinks.filter(d => d.checked_off === 0);
  const totalDrinks = day.drinks.length;
  const wentToGym = day.went_to_gym === 1;
  const availableDrinks = wentToGym ? 2 : 1;
  const allDrinksConsumed = checkedDrinks.length >= availableDrinks && availableDrinks > 0;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{ 
        fontSize: '24px', 
        marginBottom: '10px',
        color: '#333',
      }}>
        {formattedDate}
      </h2>
      
      <div style={{ 
        marginBottom: '30px',
        padding: '15px',
        background: wentToGym ? '#e8f5e9' : '#fff3e0',
        border: `2px solid ${wentToGym ? '#4caf50' : '#ff9800'}`,
        borderRadius: '8px',
      }}>
        <label style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '500',
          color: '#333',
          cursor: 'pointer',
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
          color: '#666',
        }}>
          {wentToGym 
            ? '✅ Great job! You earned 2 drinks today!' 
            : '💪 Go to the gym to earn 2 drinks instead of 1!'}
        </p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ 
          fontSize: '20px', 
          marginBottom: '15px',
          color: '#333',
        }}>
          Drinks ({checkedDrinks.length} / {availableDrinks})
        </h3>
        
        {day.drinks.length === 0 ? (
          <p style={{ color: '#999', fontStyle: 'italic' }}>
            {wentToGym 
              ? 'Mark that you went to the gym above to unlock drinks!' 
              : 'Mark that you went to the gym to earn drinks!'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {day.drinks.map((drink: Drink) => (
              <div
                key={drink.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  background: drink.checked_off ? '#e8f5e9' : '#fff3e0',
                  border: `2px solid ${drink.checked_off ? '#4caf50' : '#ff9800'}`,
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={drink.checked_off === 1}
                  onChange={() => {
                    if (drink.checked_off === 1) {
                      onDrinkUncheck(drink.id);
                    } else {
                      onDrinkCheckOff(drink.id);
                    }
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    marginRight: '15px',
                    cursor: 'pointer',
                  }}
                />
                <span style={{
                  fontSize: '16px',
                  flex: 1,
                  textDecoration: drink.checked_off ? 'line-through' : 'none',
                  color: drink.checked_off ? '#666' : '#333',
                }}>
                  {drink.drink_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {allDrinksConsumed && (
        <div style={{
          marginBottom: '20px',
          padding: '20px',
          background: '#ffebee',
          border: '2px solid #f44336',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <p style={{ 
            color: '#d32f2f', 
            fontSize: '16px', 
            marginBottom: '15px',
            fontWeight: '500',
          }}>
            All your drinks for today have been consumed.
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
            color: '#666', 
            fontSize: '12px', 
            marginTop: '10px',
          }}>
            You can cheat up to 3 times per week. Each cheat fills the red meter.
          </p>
        </div>
      )}

      <div style={{
        padding: '15px',
        background: '#f5f5f5',
        borderRadius: '8px',
        marginTop: '20px',
      }}>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
          <strong>How it works:</strong><br />
          • <strong>Gym = 2 drinks</strong>: If you went to the gym, you can have 2 drinks. Unused drinks move forward.<br />
          • <strong>No Gym = 1 drink</strong>: If you didn't go to the gym, you can have 1 drink. Unused drinks are lost.<br />
          • Any excess drinks from gym days will be split between Friday, Saturday, and Sunday.
        </p>
      </div>
    </div>
  );
}

