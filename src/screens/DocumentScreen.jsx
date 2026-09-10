import React, { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { t } from '../data/languages.js';
import { extractDocument } from '../services/ocr.js';
import {
  Upload, FileText, Image, Trash2, Edit3, Check, X, AlertCircle,
  PlusCircle, ChevronRight, ArrowRight, Clock, FlaskConical, Camera
} from 'lucide-react';
import StepHeader from '../components/StepHeader.jsx';
import CameraCaptureModal from '../components/CameraCaptureModal.jsx';
import clsx from 'clsx';

export default function DocumentScreen() {
  const { state, actions } = useApp();
  const { language, documents } = state;
  const T = (key) => t(language, key);

  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [processingFiles, setProcessingFiles] = useState([]); // [{name, progress}]
  const fileInputRef = useRef(null);

  // Handle file drop/select
  const handleFiles = useCallback(async (files) => {
    for (const file of Array.from(files)) {
      if (!file.type.match(/image\/(jpeg|png|webp)|application\/pdf/)) continue;

      const fileId = `processing_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setProcessingFiles(prev => [...prev, { id: fileId, name: file.name }]);

      try {
        const extracted = await extractDocument(file);
        actions.addDocument(extracted);
      } catch (err) {
        console.error('OCR error:', err);
      } finally {
        setProcessingFiles(prev => prev.filter(f => f.id !== fileId));
      }
    }
  }, [actions]);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  // Sort documents chronologically
  const sortedDocs = [...documents].sort((a, b) =>
    new Date(b.uploadDate) - new Date(a.uploadDate)
  );

  // Add demo documents
  const addDemoDoc = async () => {
    const demoFile = new File(['demo'], 'Apollo_Prescription_2024.jpg', { type: 'image/jpeg' });
    await handleFiles([demoFile]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <StepHeader currentStep="documents" language={language} />

      <CameraCaptureModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(file) => handleFiles([file])}
      />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">{T('docTitle')}</h2>
          <p className="text-slate-500 mt-1">{T('docSub')}</p>
        </div>

        {/* Upload options grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px]',
              isDragging
                ? 'border-primary-400 bg-primary-50 scale-[1.01]'
                : 'border-slate-300 bg-white hover:border-primary-300 hover:bg-primary-50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-2 text-primary-600">
              <Upload size={22} />
            </div>
            <p className="font-bold text-slate-800 text-sm sm:text-base">
              {isDragging ? 'Drop to upload' : 'Tap to Upload Files'}
            </p>
            <p className="text-slate-400 text-xs mt-0.5">{T('docFormats')}</p>
          </div>

          {/* Camera Scan Button */}
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="border-2 border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50 rounded-3xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[160px] group shadow-sm"
          >
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-2 text-emerald-600 group-hover:scale-110 transition-transform">
              <Camera size={22} />
            </div>
            <p className="font-bold text-slate-800 text-sm sm:text-base">Scan with Camera</p>
            <p className="text-slate-400 text-xs mt-0.5">Take photo of prescription or report</p>
          </button>
        </div>

        {/* Processing files */}
        {processingFiles.map(f => (
          <div key={f.id} className="card p-4 mb-3 flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="text-primary-500" size={18} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-700 text-sm">{f.name}</p>
              <p className="text-xs text-primary-600 mt-0.5 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                {T('docProcessing')}
              </p>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div className="bg-primary-500 h-1.5 rounded-full shimmer" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        ))}

        {/* Demo button */}
        {documents.length === 0 && processingFiles.length === 0 && (
          <div className="text-center mb-6">
            <p className="text-slate-400 text-sm mb-3">No documents uploaded yet</p>
            <button
              onClick={addDemoDoc}
              className="btn-secondary text-sm py-2 px-5"
            >
              <FlaskConical size={16} /> Load Demo Documents
            </button>
          </div>
        )}

        {/* Timeline */}
        {sortedDocs.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-primary-500" />
              {T('docTimeline')}
            </h3>
            <div className="space-y-4">
              {sortedDocs.map((doc, idx) => (
                <DocumentCard key={doc.id} doc={doc} language={language} T={T} actions={actions} />
              ))}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-slate-200">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex-1"
          >
            <PlusCircle size={18} /> {T('docAddMore')}
          </button>
          <button
            onClick={() => actions.setStep('summary')}
            className="btn-primary flex-1"
          >
            {T('proceedToSummary')} <ChevronRight size={18} />
          </button>
        </div>

        {/* Skip link */}
        <div className="text-center mt-4">
          <button
            onClick={() => actions.setStep('summary')}
            className="text-slate-400 text-sm hover:text-slate-600 underline"
          >
            {T('docSkip')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DocumentCard ─────────────────────────────────────────────────────────────
function DocumentCard({ doc, language, T, actions }) {
  const [expanded, setExpanded] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const d = doc.extractedData || {};
  const typeIcon = doc.type === 'lab_report' ? <FlaskConical size={16} /> : <FileText size={16} />;
  const typeBadge = {
    prescription:     { label: 'Rx', color: 'badge-blue' },
    lab_report:       { label: 'Lab', color: 'badge-amber' },
    discharge_summary:{ label: 'D/C', color: 'badge-green' },
  }[doc.type] || { label: 'Doc', color: 'badge-blue' };

  const startEdit = (field, value) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    actions.updateDocument({
      id: doc.id,
      extractedData: { ...d, [editingField]: editValue },
    });
    setEditingField(null);
  };

  const hasAbnormals = d.labValues?.some(lv => lv.isAbnormal);

  return (
    <div className={clsx(
      'card overflow-hidden',
      doc.abnormal || hasAbnormals ? 'border-l-4 border-l-red-400' : ''
    )}>
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          doc.type === 'lab_report' ? 'bg-amber-100' : 'bg-blue-100'
        )}>
          <span className={doc.type === 'lab_report' ? 'text-amber-600' : 'text-blue-600'}>{typeIcon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={typeBadge.color}>{typeBadge.label}</span>
            {(doc.abnormal || hasAbnormals) && (
              <span className="badge-red"><AlertCircle size={10} /> {T('docAbnormal')}</span>
            )}
          </div>
          <p className="font-semibold text-slate-800 mt-1 text-sm truncate">{doc.name}</p>
          <p className="text-xs text-slate-400">
            {doc.uploadDate} · {d.source || doc.source || 'Unknown source'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(e => !e)}
            className="btn-ghost p-1.5 text-slate-400"
          >
            {expanded ? <X size={16} /> : <ArrowRight size={16} />}
          </button>
          <button
            onClick={() => actions.removeDocument(doc.id)}
            className="btn-ghost p-1.5 text-red-400"
            title={T('docDelete')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <p className="text-xs text-slate-400 italic">{T('docEditHint')}</p>

          {/* Diagnosis */}
          <EditableField
            label={T('docDiagnosis')}
            value={d.diagnosis || ''}
            fieldKey="diagnosis"
            editingField={editingField}
            editValue={editValue}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={() => setEditingField(null)}
            onEditValueChange={setEditValue}
          />

          {/* Medicines */}
          {d.medicines?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{T('docMedicines')}</p>
              <div className="space-y-1">
                {d.medicines.map((med, i) => (
                  <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-1.5">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                    <span className="text-sm text-slate-700 font-medium">{med.name}</span>
                    <span className="text-xs text-slate-500">{med.dose} · {med.frequency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lab values */}
          {d.labValues?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{T('docLabValues')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase tracking-wide">
                      <th className="text-left pb-1">Test</th>
                      <th className="text-right pb-1">Value</th>
                      <th className="text-right pb-1">Normal</th>
                      <th className="text-right pb-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.labValues.map((lv, i) => (
                      <tr key={i} className={clsx('border-t border-slate-100', lv.isAbnormal ? 'bg-red-50' : '')}>
                        <td className="py-1.5 text-slate-700 font-medium">{lv.test}</td>
                        <td className="py-1.5 text-right font-semibold text-slate-800">
                          {lv.value} {lv.unit}
                        </td>
                        <td className="py-1.5 text-right text-slate-400 text-xs">{lv.normalRange}</td>
                        <td className="py-1.5 text-right">
                          {lv.isAbnormal
                            ? <span className="badge-red">⚠ Abnormal</span>
                            : <span className="badge-green">Normal</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {d.notes && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-500 mb-1">Notes</p>
              {d.notes}
            </div>
          )}

          {/* Mark abnormal */}
          <button
            onClick={() => actions.updateDocument({ id: doc.id, abnormal: !doc.abnormal })}
            className={clsx(
              'text-xs py-1.5 px-3 rounded-lg border font-medium transition-all',
              doc.abnormal
                ? 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100'
                : 'border-slate-300 text-slate-500 bg-white hover:bg-slate-50'
            )}
          >
            {doc.abnormal ? '✓ Marked Abnormal' : T('docMarkAbnormal')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── EditableField ─────────────────────────────────────────────────────────────
function EditableField({ label, value, fieldKey, editingField, editValue, onEdit, onSave, onCancel, onEditValueChange }) {
  const isEditing = editingField === fieldKey;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        {!isEditing && (
          <button onClick={() => onEdit(fieldKey, value)} className="btn-ghost p-1 text-slate-400">
            <Edit3 size={12} />
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={editValue}
            onChange={e => onEditValueChange(e.target.value)}
            className="input-field text-sm py-2 flex-1"
            autoFocus
          />
          <button onClick={onSave} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200">
            <Check size={16} />
          </button>
          <button onClick={onCancel} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200">
            <X size={16} />
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{value || '—'}</p>
      )}
    </div>
  );
}
