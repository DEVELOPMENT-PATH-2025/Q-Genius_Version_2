import React, { useState } from 'react';
import { Upload, Building2 } from 'lucide-react';
import { savePaperToDB } from '../services/mockServices';
import { PaperStatus, QuestionPaper } from '../types';
import { useAuth } from '../src/AuthContext';

export const SubmitPaperForm: React.FC = () => {
  const [department, setDepartment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !department || !user) return;

    setIsSubmitting(true);
    try {
      const newPaper: any = {
        id: `paper-${Date.now()}`,
        title: file.name,
        courseCode: 'N/A',
        facultyId: user.uid,
        facultyName: `${user.firstName} ${user.lastName}`,
        createdAt: new Date().toISOString(),
        status: PaperStatus.PENDING_APPROVAL,
        questions: [],
        totalMarks: 0,
        durationMinutes: 0,
        department: department,
      };

      await savePaperToDB(newPaper);
      setMessage({ type: 'success', text: 'Paper submitted successfully!' });
      setDepartment('');
      setFile(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error submitting paper:', error);
      setMessage({ type: 'error', text: 'Failed to submit paper.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
        <div className="relative">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select 
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20"
            required
          >
            <option value="">Select Department</option>
            <option value="BBA">BBA</option>
            <option value="CSE(AI&DS)">CSE(AI&DS)</option>
            <option value="CSE(CY)">CSE(CY)</option>
            <option value="CSE(IT)">CSE(IT)</option>
            <option value="Civil Engineering (CE)">Civil Engineering (CE)</option>
            <option value="Computer Science and Engineering">Computer Science and Engineering</option>
            <option value="Electrical and Communication Engineering (ECE)">Electrical and Communication Engineering (ECE)</option>
            <option value="Electrical and Electronics Engineering (EEE)">Electrical and Electronics Engineering (EEE)</option>
            <option value="First Year (FY)">First Year (FY)</option>
            <option value="MBA">MBA</option>
            <option value="Mechanical Engineering (ME)">Mechanical Engineering (ME)</option>
            <option value="Pharmacy (PY)">Pharmacy (PY)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Upload Question Paper</label>
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-brand-500 transition-colors">
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="file-upload"
            required
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-900">{file ? file.name : 'Click to upload or drag and drop'}</p>
            <p className="text-xs text-slate-500 mt-1">PDF, DOCX up to 10MB</p>
          </label>
        </div>
      </div>
      <button 
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Paper'}
      </button>
      {message && (
        <div className={`p-4 rounded-2xl text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}
    </form>
  );
};
