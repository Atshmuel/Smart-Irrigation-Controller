import React, { useState, useEffect } from 'react';
import '../styles/Forms.css';

const API_URL = 'http://localhost:3002/api/pots';

const AddPot = () => {
    const [name, setName] = useState('');
    const [speciesId, setSpeciesId] = useState('');
    const [speciesList, setSpeciesList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        const fetchSpecies = async () => {
            try {
                const response = await fetch(`${API_URL}/species/get`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'שגיאה בטעינת זני הצמחים');
                }
                console.log(data);

                setSpeciesList(data ?? []);
            } catch (error) {
                setMessage(error.message || 'שגיאה בטעינת זני הצמחים');
            }
        };

        fetchSpecies();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setStatus('');

        try {
            const response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, type_id: speciesId }),
            });

            if (response.ok) {
                setMessage('עציץ חדש נוצר בהצלחה!');
                setStatus('success');
                setName('');
                setSpeciesId('');
            } else {
                const errorData = await response.json();
                setMessage(errorData.message || 'שגיאה ביצירת עציץ חדש');
                setStatus('error');
            }
        } catch (error) {
            console.error('Error creating pot:', error);
            setMessage('שגיאה ביצירת עציץ חדש');
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main>
            <div className="form-container">
                <h1>הוספת עציץ חדש</h1>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>שם העציץ:</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>זן:</label>
                        <select
                            value={speciesId}
                            onChange={(e) => setSpeciesId(e.target.value)}
                            required
                        >
                            <option value="">בחר זן</option>
                            {speciesList?.map((species) => (
                                <option key={species.id} value={species.id}>
                                    {species.type}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button className="form-button" type="submit" disabled={loading}>
                        {loading ? 'יוצר...' : 'צור עציץ חדש'}
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

export default AddPot;