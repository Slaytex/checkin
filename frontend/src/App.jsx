import { useState, useEffect } from 'react';
import { format, parseISO, getYear, getMonth } from 'date-fns';
import TodayView from './components/TodayView';
import CheatMeter from './components/CheatMeter';
import CheatDialog from './components/CheatDialog';

function App() {
  const [today, setToday] = useState('');
  const [currentDay, setCurrentDay] = useState(null);
  const [drinkTypes, setDrinkTypes] = useState({});
  const [pointsSummary, setPointsSummary] = useState(null);
  const [cheatCount, setCheatCount] = useState(0);
  const [goodDays, setGoodDays] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState({ totalDrinkPoints: 0, totalGymVisits: 0 });
  const [reservePoints, setReservePoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCheatDialog, setShowCheatDialog] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Get today's date
        const todayResponse = await fetch('/api/days/today');
        const todayData = await todayResponse.json();
        setToday(todayData.date);

        // Get drink types
        const drinkTypesResponse = await fetch('/api/drinks/types');
        const drinkTypesData = await drinkTypesResponse.json();
        setDrinkTypes(drinkTypesData);

        // Fetch day data and related info
        await Promise.all([
          fetchDay(todayData.date),
          fetchCheatData(),
          fetchMonthlyStats(),
          fetchReservePoints()
        ]);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const fetchDay = async (date) => {
    try {
      const [dayResponse, pointsResponse] = await Promise.all([
        fetch(`/api/days/${date}`),
        fetch(`/api/drinks/${date}/points`)
      ]);
      const dayData = await dayResponse.json();
      const pointsData = await pointsResponse.json();
      setCurrentDay(dayData);
      setPointsSummary(pointsData);
    } catch (error) {
      console.error('Failed to fetch day:', error);
    }
  };

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

  const fetchMonthlyStats = async () => {
    try {
      const now = new Date();
      const year = getYear(now);
      const month = getMonth(now) + 1;
      const response = await fetch(`/api/cheats/monthly/${year}/${month}`);
      const data = await response.json();
      setMonthlyStats(data);
    } catch (error) {
      console.error('Failed to fetch monthly stats:', error);
    }
  };

  const fetchReservePoints = async () => {
    try {
      const response = await fetch('/api/drinks/reserve');
      const data = await response.json();
      setReservePoints(data.totalReserve || 0);
    } catch (error) {
      console.error('Failed to fetch reserve points:', error);
    }
  };

  const handleGymUpdate = async (wentToGym) => {
    try {
      await fetch(`/api/days/${today}/gym`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ went_to_gym: wentToGym }),
      });
      await Promise.all([
        fetchDay(today),
        fetchMonthlyStats(),
        fetchReservePoints()
      ]);
    } catch (error) {
      console.error('Failed to update gym status:', error);
    }
  };

  const handleDrinkCheckOff = async (drinkId) => {
    try {
      await fetch(`/api/drinks/${today}/check-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drinkId }),
      });
      await Promise.all([
        fetchDay(today),
        fetchCheatData(),
        fetchMonthlyStats(),
        fetchReservePoints()
      ]);
    } catch (error) {
      console.error('Failed to check off drink:', error);
    }
  };

  const handleDrinkUncheck = async (drinkId) => {
    try {
      await fetch(`/api/drinks/${today}/uncheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drinkId }),
      });
      await Promise.all([
        fetchDay(today),
        fetchCheatData(),
        fetchMonthlyStats(),
        fetchReservePoints()
      ]);
    } catch (error) {
      console.error('Failed to uncheck drink:', error);
    }
  };

  const handleDrinkTypeUpdate = async (drinkId, drinkType) => {
    try {
      await fetch(`/api/drinks/${drinkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drink_type: drinkType }),
      });
      await fetchDay(today);
    } catch (error) {
      console.error('Failed to update drink type:', error);
    }
  };

  const handleCheat = () => {
    setShowCheatDialog(true);
  };

  const handleCheatSubmit = async (drinkType) => {
    try {
      await fetch(`/api/cheats/${today}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drink_type: drinkType }),
      });
      setShowCheatDialog(false);
      await Promise.all([
        fetchCheatData(),
        fetchMonthlyStats(),
        fetchReservePoints()
      ]);
    } catch (error) {
      console.error('Failed to record cheat:', error);
      alert('Failed to record cheat. You may have reached the weekly limit.');
    }
  };

  // Calculate background red intensity
  const maxCheats = 3;
  const baseOpacity = cheatCount >= maxCheats ? 0.3 : 0;
  const reducedOpacity = Math.max(0, baseOpacity - (goodDays * 0.03));
  const backgroundColor = reducedOpacity > 0 
    ? `rgba(211, 47, 47, ${reducedOpacity})` 
    : 'transparent';

  const openMonthlySummary = (e) => {
    e.preventDefault();
    const now = new Date();
    const year = getYear(now);
    const month = getMonth(now) + 1;
    window.open(`/summary.html?year=${year}&month=${month}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: '#ffffff',
        fontSize: '20px',
        fontFamily: 'Montserrat, sans-serif'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      position: 'relative',
      paddingTop: '60px',
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
          background: '#2a2a2a',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                marginBottom: '10px',
                color: '#ffffff',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
              }}>
                CheckIn
              </h1>
              <p style={{ color: '#cccccc', marginBottom: '15px', fontFamily: 'Montserrat, sans-serif' }}>
                Track your gym visits and drinks
              </p>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '20px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: '#999', marginBottom: '5px', fontFamily: 'Montserrat, sans-serif' }}>
                  This Month
                </div>
                {pointsSummary && (
                  <>
                    {pointsSummary.accumulatedPoints > 0 ? (
                      <div style={{ 
                        fontSize: '18px', 
                        color: '#4caf50', 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontWeight: 500 
                      }}>
                        Drink credit: {pointsSummary.accumulatedPoints}
                      </div>
                    ) : (
                      <div style={{ 
                        fontSize: '18px', 
                        color: '#ffffff', 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontWeight: 500 
                      }}>
                        Drink credit: 0
                      </div>
                    )}
                    {pointsSummary.remainingPoints < 0 && (
                      <div style={{ 
                        fontSize: '18px', 
                        color: '#f44336', 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontWeight: 700 
                      }}>
                        Drink debt: {Math.abs(pointsSummary.remainingPoints)}
                      </div>
                    )}
                  </>
                )}
                <div style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}>
                  Gym Visits: {monthlyStats.totalGymVisits}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openMonthlySummary(e);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontFamily: 'Montserrat, sans-serif',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#5568d3';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#667eea';
                }}
              >
                View Summary
              </button>
            </div>
          </div>
        </header>

        {currentDay && pointsSummary && (
          <TodayView
            day={currentDay}
            drinkTypes={drinkTypes}
            pointsSummary={pointsSummary}
            onDrinkCheckOff={handleDrinkCheckOff}
            onDrinkUncheck={handleDrinkUncheck}
            onDrinkTypeUpdate={handleDrinkTypeUpdate}
            onGymUpdate={handleGymUpdate}
            onCheat={handleCheat}
          />
        )}

        {showCheatDialog && (
          <CheatDialog
            drinkTypes={drinkTypes}
            onSubmit={handleCheatSubmit}
            onCancel={() => setShowCheatDialog(false)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
