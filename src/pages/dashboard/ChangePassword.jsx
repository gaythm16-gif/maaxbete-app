import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './DashboardPages.css';

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (newPass !== confirm) {
      setMessage({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }
    const result = await changePassword(current, newPass);
    if (result.ok) {
      setMessage({ type: 'success', text: 'Mot de passe modifié.' });
      setCurrent('');
      setNewPass('');
      setConfirm('');
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  return (
    <div className="dashboard-page">
      <h1>Change Password</h1>
      <p className="page-desc">Modifier le mot de passe de ce compte.</p>
      <form className="form-transfer" onSubmit={handleSubmit}>
        <label>
          Mot de passe actuel
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </label>
        <label>
          Nouveau mot de passe
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <label>
          Confirmer le nouveau mot de passe
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>
        {message.text && (
          <p className={`form-message ${message.type}`}>{message.text}</p>
        )}
        <button type="submit">Changer le mot de passe</button>
      </form>
    </div>
  );
}
