import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { Day } from '../types';

interface PlanningViewProps {
  onMaxDrinksUpdate: (date: string, maxDrinks: number) => void;
  onGymUpdate?: (date: string, wentToGym: boolean) => void;
}

export function PlanningView({ onMaxDrinksUpdate, onGymUpdate }: PlanningViewProps) {
  const [weekDays, setWeekDays] = useState<{ date: string; dayName: string; maxDrinks: number; wentToGym: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWeek = async () => {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayName = format(date, 'EEEE');
        
        try {
          const response = await fetch(`/api/days/${dateStr}`);
          const day: Day = await response.json();
          days.push({
            date: dateStr,
            dayName,
            maxDrinks: day.max_drinks || 0,
            wentToGym: day.went_to_gym || 0,
          });
        } catch (error) {
          days.push({
            date: dateStr,
            dayName,
            maxDrinks: 0,
            wentToGym: 0,
          });
        }
      }
      
      setWeekDays(days);
      setLoading(false);
    };

    loadWeek();
  }, []);

  const handleMaxDrinksChange = async (date: string, maxDrinks: number) => {
    await onMaxDrinksUpdate(date, maxDrinks);
    // Update local state
    setWeekDays(prev => prev.map(day => 
      day.date === date ? { ...day, maxDrinks } : day
    ));
  };

  const handleGymChange = async (date: string, wentToGym: boolean) => {
    if (onGymUpdate) {
      await onGymUpdate(date, wentToGym);
      // Update local state
      setWeekDays(prev => prev.map(day => 
        day.date === date ? { ...day, wentToGym: wentToGym ? 1 : 0 } : day
      ));
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '30px',
        textAlign: 'center',
        color: '#666',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    }}>
      <h2 style={{ 
        fontSize: '24px', 
        marginBottom: '20px',
        color: '#333',
      }}>
        Plan Your Week
      </h2>
      
      <p style={{ 
        color: '#666', 
        marginBottom: '30px',
        lineHeight: '1.6',
      }}>
        Mark which days you plan to go to the gym. Monday-Thursday default to 2 drinks max, but you only 
        get 2 drinks if you went to the gym that day. Otherwise, you get 1 drink. Unused drinks from gym 
        days will be redistributed forward.
      </p>

      <div style={{ display: 'grid', gap: '15px' }}>
        {weekDays.map(({ date, dayName, maxDrinks, wentToGym }) => {
          const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
          const isFriday = dayName === 'Friday';
          const isWeekday = dayName !== 'Saturday' && dayName !== 'Sunday' && dayName !== 'Friday';
          const checkedGym = wentToGym === 1;
          
          return (
            <div
              key={date}
              style={{
                padding: '20px',
                background: isWeekend ? '#fff3e0' : isFriday ? '#e3f2fd' : checkedGym ? '#e8f5e9' : '#f5f5f5',
                border: `2px solid ${isWeekend ? '#ff9800' : isFriday ? '#2196f3' : checkedGym ? '#4caf50' : '#e0e0e0'}`,
                borderRadius: '8px',
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: isWeekday ? '15px' : '0',
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    fontSize: '18px', 
                    marginBottom: '5px',
                    color: '#333',
                  }}>
                    {dayName}
                  </h3>
                  <p style={{ 
                    fontSize: '14px', 
                    color: '#666',
                  }}>
                    {format(parseISO(date), 'MMMM d')}
                  </p>
                </div>
                
                {isWeekday && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                  }}>
                    <label style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px', 
                      color: '#333',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={checkedGym}
                        onChange={(e) => handleGymChange(date, e.target.checked)}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                        }}
                      />
                      <span>💪 Gym</span>
                    </label>
                  </div>
                )}
              </div>
              
              {isWeekday && (
                <div style={{ 
                  marginTop: '10px',
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#666',
                }}>
                  Available drinks: <strong>{checkedGym ? '2' : '1'}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        padding: '15px',
        background: '#f5f5f5',
        borderRadius: '8px',
        marginTop: '30px',
      }}>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
          <strong>How it works:</strong> Monday-Thursday allow 2 drinks maximum. Mark which days you plan to 
          go to the gym - gym days get 2 drinks available, non-gym days get 1 drink. Unused drinks from gym 
          days will automatically move to the next day. If you don't go to the gym and don't drink your 1 beer, 
          it's lost (doesn't move forward). Any excess drinks at the end of the week will be split between 
          Friday, Saturday, and Sunday.
        </p>
      </div>
    </div>
  );
}

