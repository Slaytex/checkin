import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { TodayView } from './components/TodayView';
import { PlanningView } from './components/PlanningView';
import { CheatMeter } from './components/CheatMeter';
import { Day } from './types';

function App() {
  const [today, setToday] = useState<string>('');
  const [currentDay, setCurrentDay] = useState<Day | null>(null);
  const [view, setView] = useState<'today' | 'planning'>('today');
  const [loading, setLoading] = useState(true);
  const [cheatCount, setCheatCount] = useState(0);
  const [goodDays, setGoodDays] = useState(0);

  useEffect(() => {
    const fetchToday = async () => {
      try {
        const response = await fetch('/api/days/today');
        const data = await response.json();
        setToday(data.date);
        await fetchDay(data.date);
        await fetchCheatData();
      } catch (error) {
        console.error('Failed to fetch today:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchToday();
  }, []);

  const fetchCheatData = async () => {
    try {
      const [cheatResponse, goodDaysResponse] = await Promise.all([
        fetch('/api/cheats/current'),
        fetch('/api/cheats/good-days/current')
      ]);
      const cheatData = await cheatResponse.json();
      const goodDaysData = await goodDaysResponse.json();
      setCheatCount(cheatData.count || 0);
      setGoodDays(goodDaysData.goodDays || 0);
    } catch (error) {
      console.error('Failed to fetch cheat data:', error);
    }
  };

  const fetchDay = async (date: string) => {
    try {
      const response = await fetch(`/api/days/${date}`);
      const data = await response.json();
      setCurrentDay(data);
    } catch (error) {
      console.error('Failed to fetch day:', error);
    }
  };

  const handleDrinkCheckOff = async (drinkId: number) => {
    if (!today) return;
    
    try {
      await fetch(`/api/drinks/${today}/check-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drinkId }),
      });
      await fetchDay(today);
    } catch (error) {
      console.error('Failed to check off drink:', error);
    }
  };

  const handleDrinkUncheck = async (drinkId: number) => {
    if (!today) return;
    
    try {
      await fetch(`/api/drinks/${today}/uncheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drinkId }),
      });
      await fetchDay(today);
    } catch (error) {
      console.error('Failed to uncheck drink:', error);
    }
  };

  const handleMaxDrinksUpdate = async (date: string, maxDrinks: number) => {
    try {
      await fetch(`/api/days/${date}/max-drinks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_drinks: maxDrinks }),
      });
      if (date === today) {
        await fetchDay(today);
      }
    } catch (error) {
      console.error('Failed to update max drinks:', error);
    }
  };

  const handleGymUpdate = async (date: string, wentToGym: boolean) => {
    try {
      await fetch(`/api/days/${date}/gym`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ went_to_gym: wentToGym }),
      });
      if (date === today) {
        await fetchDay(today);
        await fetchCheatData();
      }
    } catch (error) {
      console.error('Failed to update gym status:', error);
    }
  };

  const handleCheat = async (date: string) => {
    try {
      await fetch(`/api/cheats/${date}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      await fetchCheatData();
    } catch (error) {
      console.error('Failed to record cheat:', error);
    }
  };

  // Calculate background red intensity
  // Background turns red at 3 cheats, then diminishes based on good days
  // Each good day reduces brightness by ~10% (0.1 opacity)
  const maxCheats = 3;
  const baseOpacity = cheatCount >= maxCheats ? 0.3 : 0; // Only red if 3+ cheats
  const reducedOpacity = Math.max(0, baseOpacity - (goodDays * 0.03)); // Each good day reduces by 3% opacity
  const backgroundColor = reducedOpacity > 0 
    ? `rgba(211, 47, 47, ${reducedOpacity})` // Red overlay
    : 'transparent';

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white',
        fontSize: '20px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      position: 'relative',
      paddingTop: '8px', // Space for cheat meter
    }}>
      {/* Red overlay background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: backgroundColor,
        pointerEvents: 'none',
        zIndex: 1,
        transition: 'background 0.5s ease',
      }} />
      <CheatMeter cheatCount={cheatCount} maxCheats={3} />
      <div style={{ position: 'relative', zIndex: 2 }}>
      <header style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <h1 style={{ 
          fontSize: '32px', 
          marginBottom: '10px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          CheckIn
        </h1>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Track your daily meals and drinks
        </p>
        <nav style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setView('today')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: view === 'today' ? '#667eea' : '#e0e0e0',
              color: view === 'today' ? 'white' : '#333',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
          >
            Today
          </button>
          <button
            onClick={() => setView('planning')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: view === 'planning' ? '#667eea' : '#e0e0e0',
              color: view === 'planning' ? 'white' : '#333',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
          >
            Plan Week
          </button>
        </nav>
      </header>

      {view === 'today' && currentDay && (
        <TodayView
          day={currentDay}
          onDrinkCheckOff={async (drinkId) => {
            await handleDrinkCheckOff(drinkId);
            await fetchCheatData();
          }}
          onDrinkUncheck={async (drinkId) => {
            await handleDrinkUncheck(drinkId);
            await fetchCheatData();
          }}
          onMaxDrinksUpdate={(maxDrinks) => handleMaxDrinksUpdate(today, maxDrinks)}
          onGymUpdate={(wentToGym) => handleGymUpdate(today, wentToGym)}
          onCheat={() => handleCheat(today)}
        />
      )}

      {view === 'planning' && (
        <PlanningView
          onMaxDrinksUpdate={handleMaxDrinksUpdate}
          onGymUpdate={handleGymUpdate}
        />
      )}
      </div>
    </div>
  );
}

export default App;

