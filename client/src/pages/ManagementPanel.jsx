import { useState, useEffect } from 'react';
import '../styles/ManagementPanel.css';

const API_URL = 'http://localhost:3002/api/pots';

function ManagementPanel({ potId = 1 }) {
    const [isOn, setIsOn] = useState(true);
    const [schedule, setSchedule] = useState({
        startHour: '06',
        startMinute: '00',
        endHour: '20',
        endMinute: '00',
        days: {
            sunday: false,
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false
        }
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle');

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysDisplay = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setStatus('loading');
            try {
                await Promise.all([
                    fetchPotStatus(),
                ]);
                setStatus('idle');
            } catch (error) {
                setMessage('שגיאה בטעינת הנתונים');
                setStatus('error');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [potId]);

    const fetchPotStatus = async () => {
        try {
            const response = await fetch(`${API_URL}/${potId}`);
            const data = await response.json();
            setIsOn(data.status);

            // Load saved schedule if exists
            if (data.schedule) {
                const savedDays = JSON.parse(data.schedule.days || '[]');
                setSchedule(prev => ({
                    ...prev,
                    startHour: String(data.schedule.start_hour).padStart(2, '0'),
                    startMinute: String(data.schedule.start_minute).padStart(2, '0'),
                    endHour: String(data.schedule.end_hour).padStart(2, '0'),
                    endMinute: String(data.schedule.end_minute).padStart(2, '0'),
                    days: {
                        sunday: savedDays.includes(0),
                        monday: savedDays.includes(1),
                        tuesday: savedDays.includes(2),
                        wednesday: savedDays.includes(3),
                        thursday: savedDays.includes(4),
                        friday: savedDays.includes(5),
                        saturday: savedDays.includes(6)
                    }
                }));
            }
        } catch (error) {
            console.error('Error fetching pot status:', error);
        }
    };

    const handleToggle = async (newState) => {
        setLoading(true);
        setStatus('loading');
        try {
            const endpoint = newState ? 'on' : 'off';
            const response = await fetch(`${API_URL}/${endpoint}/${potId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setIsOn(newState);
                setMessage(newState ? '✓ המכשיר הופעל בהצלחה' : '✓ המכשיר כובה בהצלחה');
                setStatus('success');
                setTimeout(() => setMessage(''), 3000);
            } else {
                const errorData = await response.json();

                // Handle warning message
                if (response.status === 201) {
                    setMessage(errorData.message || 'אישור נדרש');
                    setStatus('warning');
                } else {
                    setMessage(errorData.message || 'Error');
                    setStatus('error');
                }
            }
        } catch (error) {
            console.error('Error toggling pot:', error);
            setMessage('שגיאה בשליחת הבקשה');
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleChange = (e) => {
        const { name, value } = e.target;
        let numValue = parseInt(value) || 0;

        // Validate input
        if (name === 'startHour' || name === 'endHour') {
            if (numValue > 23) numValue = 23;
            if (numValue < 0) numValue = 0;
        } else if (name === 'startMinute' || name === 'endMinute') {
            if (numValue > 59) numValue = 59;
            if (numValue < 0) numValue = 0;
        }

        setSchedule(prev => ({
            ...prev,
            [name]: String(numValue).padStart(2, '0')
        }));
    };

    const handleDayToggle = (day) => {
        setSchedule(prev => ({
            ...prev,
            days: {
                ...prev.days,
                [day]: !prev.days[day]
            }
        }));
    };

    const handleSaveSchedule = async () => {
        setLoading(true);
        setStatus('loading');

        const selectedDays = Object.keys(schedule.days)
            .filter(day => schedule.days[day])
            .map(day => daysOfWeek.indexOf(day));

        if (selectedDays.length === 0) {
            setMessage('בחר לפחות יום אחד');
            setStatus('error');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                startHour: parseInt(schedule.startHour),
                startMinute: parseInt(schedule.startMinute),
                endHour: parseInt(schedule.endHour),
                endMinute: parseInt(schedule.endMinute),
                days: selectedDays
            };

            const response = await fetch(`${API_URL}/schedule/${potId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setMessage('✓ לוח הזמנים נשמר בהצלחה');
                setStatus('success');
                setTimeout(() => setMessage(''), 3000);
            } else {
                const errorData = await response.json();
                setMessage(errorData.message || 'שגיאה בשמירת לוח הזמנים');
                setStatus('error');
            }
        } catch (error) {
            console.error('Error saving schedule:', error);
            setMessage('שגיאה בשליחת הבקשה');
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="management-panel">
            <div className="management-container">
                <h1>🌱 ניהול מערכת ההשקיה</h1>

                {/* Control Section */}
                <div className="control-section">
                    <h2>⚡ שליטה במכשיר</h2>
                    <div className="toggle-label">
                        <span>מצב המכשיר</span>
                        <span className={`status-badge ${isOn ? 'on' : 'off'}`}>
                            {isOn ? '🟢 פעיל' : '🔴 כבוי'}
                        </span>
                    </div>
                    <div className="toggle-switch-container">
                        <button
                            className={`toggle-btn ${!isOn ? 'active' : ''}`}
                            onClick={() => handleToggle(false)}
                            disabled={loading}
                        >
                            {isOn ? 'כיבוי' : 'כבה'}

                        </button>
                        <button
                            className={`toggle-btn ${isOn ? 'active' : ''}`}
                            onClick={() => handleToggle(true)}
                            disabled={loading}
                        >
                            {isOn ? 'דלוק' : 'הדלק'}
                        </button>
                    </div>
                </div>

                {/* Schedule Section */}
                <div className="schedule-section">
                    <h2>📅 הגדרת לוח זמנים</h2>

                    <div className="schedule-inputs">
                        <div className="time-group">
                            <label>שעת התחלה</label>
                            <div className="time-picker">
                                <input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={schedule.startHour}
                                    name="startHour"
                                    onChange={handleScheduleChange}
                                    placeholder="00"
                                />
                                <span>:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={schedule.startMinute}
                                    name="startMinute"
                                    onChange={handleScheduleChange}
                                    placeholder="00"
                                />
                            </div>
                        </div>

                        <div className="time-group">
                            <label>שעת סיום</label>
                            <div className="time-picker">
                                <input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={schedule.endHour}
                                    name="endHour"
                                    onChange={handleScheduleChange}
                                    placeholder="00"
                                />
                                <span>:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={schedule.endMinute}
                                    name="endMinute"
                                    onChange={handleScheduleChange}
                                    placeholder="00"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="days-section">
                        <label>ימים בשבוע <span>: {Object.values(schedule.days).filter(day => day).length} ימים מתוזמנים</span></label>
                        <div className="days-grid">
                            {daysOfWeek.map((day, index) => (
                                <button
                                    key={day}
                                    className={`day-btn ${schedule.days[day] ? 'selected' : ''}`}
                                    onClick={() => handleDayToggle(day)}
                                    title={daysDisplay[index]}
                                >
                                    {daysDisplay[index]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        className="save-btn"
                        onClick={handleSaveSchedule}
                        disabled={loading}
                    >
                        {loading ? '⏳ שומר...' : '💾 שמור לוח זמנים'}
                    </button>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`message-box ${status}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ManagementPanel;
