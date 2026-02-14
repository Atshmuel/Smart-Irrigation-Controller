import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../styles/ManagementPanel.css';
import Toast from '../components/Toast';

const API_URL = 'http://localhost:3002/api/pots';

function ManagementPanel() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [pots, setPots] = useState([]);
    const [selectedPotId, setSelectedPotId] = useState(null);
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
    const [showToast, setShowToast] = useState(false);

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysDisplay = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setStatus('loading');
            try {
                // Fetch pots list
                const potsResponse = await fetch(`${API_URL}/all`);
                const potsData = await potsResponse.json();
                setPots(potsData);

                if (potsData.length) {
                    // Check if potId is in URL params
                    const urlPotId = searchParams.get('potId');
                    const potIdFromUrl = urlPotId ? parseInt(urlPotId) : null;

                    // Check if the potId from URL exists in the pots list
                    const potExists = potIdFromUrl && potsData.some(pot => pot.id === potIdFromUrl);
                    const idToSelect = potExists ? potIdFromUrl : potsData[0].id;

                    setSelectedPotId(idToSelect);
                    await fetchPotStatus(idToSelect);
                }
                setStatus('idle');
            } catch (error) {
                showToastMessage('שגיאה בטעינת הנתונים', 'error');
                setStatus('error');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [searchParams]);

    const showToastMessage = (msg, type) => {
        setMessage(msg);
        setStatus(type);
        setShowToast(true);
    };

    const fetchPotStatus = async (potId) => {
        try {
            const response = await fetch(`${API_URL}/${potId}?withSchedule=true`);
            const data = await response.json();
            setIsOn(data.status);

            // Load saved schedule if exists
            if (data.schedule) {
                const savedDays = data.schedule.days || [];

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

    const handlePotChange = async (e) => {
        const newPotId = parseInt(e.target.value);
        setSelectedPotId(newPotId);

        // Update URL query parameter
        const newParams = new URLSearchParams(searchParams);
        newParams.set('potId', newPotId.toString());
        setSearchParams(newParams);

        setLoading(true);
        try {
            await fetchPotStatus(newPotId);
        } catch (error) {
            console.error('Error changing pot:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (newState) => {
        setLoading(true);
        setStatus('loading');
        try {
            const endpoint = newState ? 'on' : 'off';
            const response = await fetch(`${API_URL}/${endpoint}/${selectedPotId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.requestConfirmation) {
                    showToastMessage(data.message || 'אישור נדרש', 'warning');
                    return;
                }

                setIsOn(newState);
                showToastMessage(newState ? '✓ המכשיר הופעל בהצלחה' : '✓ המכשיר כובה בהצלחה', 'success');
                setStatus('success');
            } else {
                const errorData = await response.json();
                // Handle warning message
                if (response.status === 201) {
                    showToastMessage(errorData.message || 'אישור נדרש', 'warning');
                    setStatus('warning');
                } else {
                    showToastMessage(errorData.message || 'Error', 'error');
                    setStatus('error');
                }
            }
        } catch (error) {
            console.error('Error toggling pot:', error);
            showToastMessage('שגיאה בשליחת הבקשה', 'error');
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
            showToastMessage('בחר לפחות יום אחד', 'error');
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

            const response = await fetch(`${API_URL}/schedule/${selectedPotId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                showToastMessage('✓ לוח הזמנים נשמר בהצלחה', 'success');
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
        <main>
            <div className="management-panel">
                <div className="management-container">
                    <div className="header-section">
                        <h1>🌱 ניהול מערכת ההשקיה</h1>

                        {/* Pot Selector - Enhanced */}
                        <div className="pot-selector-header">
                            <div className="selector-wrapper">
                                <label>בחר עציץ:</label>
                                <select value={selectedPotId} onChange={handlePotChange} className="pot-select-custom">
                                    {pots.map((pot) => (
                                        <option key={pot.id} value={pot.id}>
                                            🌿 {pot.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Control Buttons - Inline with Selector */}
                            {selectedPotId && (
                                <div className="control-buttons-inline">
                                    <div className="pot-info">
                                        <span className={`pot-status ${isOn ? 'active' : 'inactive'}`}>
                                            {isOn ? '🟢 פעיל' : '🔴 כבוי'}
                                        </span>
                                    </div>
                                    <button
                                        className={`toggle-btn-inline ${!isOn ? 'active' : ''}`}
                                        onClick={() => handleToggle(false)}
                                        disabled={loading || !isOn}
                                        title="כיבוי"
                                    >
                                        כיבוי
                                    </button>
                                    <button
                                        className={`toggle-btn-inline ${isOn ? 'active' : ''}`}
                                        onClick={() => handleToggle(true)}
                                        disabled={loading || isOn}
                                        title="הדלקה"
                                    >
                                        הדלקה
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Control Section - Removed, integrated in header */}

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
                    {showToast && (
                        <Toast
                            message={message}
                            type={status}
                            onClose={() => setShowToast(false)}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}

export default ManagementPanel;
