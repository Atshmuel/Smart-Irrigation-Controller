import React, { useState } from 'react';
import '../styles/Forms.css';

const API_URL = 'http://localhost:3002/api/pots';

const AddPlantSpecies = () => {
    const [type, setType] = useState('');
    const [instructions, setInstructions] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setStatus('');

        try {
            const response = await fetch(`${API_URL}/species/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type, instructions }),
            });

            if (response.ok) {
                setMessage('זן חדש נוצר בהצלחה!');
                setStatus('success');
                setType('');
                setInstructions('');
            } else {
                const errorData = await response.json();
                setMessage(errorData.message || 'שגיאה ביצירת זן חדש');
                setStatus('error');
            }
        } catch (error) {
            console.error('Error creating plant species:', error);
            setMessage('שגיאה ביצירת זן חדש');
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main>
            <div className="form-container">
                <h1>הוספת זן חדש</h1>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>שם הזן:</label>
                        <input
                            type="text"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>תיאור:</label>
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            required
                        />
                    </div>
                    <button className="form-button" type="submit" disabled={loading}>
                        {loading ? 'יוצר...' : 'צור זן חדש'}
                    </button>
                    {message && (
                        <div className={`toast toast-${status}`}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </main>
    );
};

export default AddPlantSpecies;