// src/components/DemoModeBar.jsx
import React from 'react';
import { AlertCircle, User, Heart, Activity, Leaf, Baby, X } from 'lucide-react';
import clsx from 'clsx';

export const DEMO_PERSONAS = [
  {
    id: 'demo_cardio',
    icon: Heart,
    name: 'Cardiac Red-Flag',
    patient: {
      name: 'Ramesh Gupta',
      age: 58,
      gender: 'male',
      dob: '1968-04-12',
      phone: '9876543210',
      abhaId: '12345678901234',
    },
    answers: {
      chiefComplaint: ['chest_pain'],
      duration: '2_3_days',
      site: 'central_chest',
      onset: 'exertion',
      character: 'pressure',
      radiation: ['arm', 'jaw'],
      severity: 8,
      associated: ['sob', 'sweating'],
      relieving: ['rest'],
      pastMedical: ['hypertension'],
      currentMeds: 'yes',
      currentMedsDetail: 'Amlodipine 5mg OD',
      drugAllergy: 'no',
    },
    ayushMode: false,
  },
  {
    id: 'demo_diabetic',
    icon: Activity,
    name: 'Chronic Diabetic + Lab Report',
    patient: {
      name: 'Meera Verma',
      age: 42,
      gender: 'female',
      dob: '1984-11-25',
      phone: '8765432109',
      abhaId: '98765432109876',
    },
    answers: {
      chiefComplaint: ['diabetes_fu'],
      duration: 'years',
      pastMedical: ['diabetes', 'hypertension'],
      currentMeds: 'yes',
      currentMedsDetail: 'Metformin 500mg BD, Telmisartan 40mg OD',
      drugAllergy: 'yes',
      drugAllergyDetail: 'Penicillin (Urticaria)',
    },
    ayushMode: false,
  },
  {
    id: 'demo_ayush',
    icon: Leaf,
    name: 'AYUSH Intake (Vata Vyadhi)',
    patient: {
      name: 'Suresh Joshi',
      age: 64,
      gender: 'male',
      dob: '1962-08-19',
      phone: '7654321098',
      abhaId: '11223344556677',
    },
    answers: {
      chiefComplaint: ['joint_pain'],
      duration: 'over_3mo',
      severity: 6,
      pastMedical: ['osteoarthritis'],
      prakriti: 'vata_pitta',
      vikriti: 'vata_vriddhi',
      sara: 'madhyama',
      samhanana: 'madhyama',
      pramana: 'sama',
      satmya: ['sarva_rasa', 'ushna'],
      sattva: 'madhyama',
      aharaShakti: 'vishamagni',
      vyayamaShakti: 'alpa',
      vaya: 'vriddha',
      aharaHabits: ['irregular_timing', 'dry_cold_food'],
      viharaHabits: ['ratrijagarana', 'sedentary_desk'],
      nidana: 'weather_season',
      sampraptiDetail: 'Stiffness in both knees aggravated in cold morning hours',
    },
    ayushMode: true,
  },
  {
    id: 'demo_pediatric',
    icon: Baby,
    name: 'Pediatric Acute Fever',
    patient: {
      name: 'Aarav Sharma',
      age: 7,
      gender: 'male',
      dob: '2019-02-14',
      phone: '9988776655',
      abhaId: '',
    },
    answers: {
      chiefComplaint: ['fever', 'cough'],
      duration: '2_3_days',
      severity: 6,
      pastMedical: ['none'],
      currentMeds: 'yes',
      currentMedsDetail: 'Paracetamol syrup SOS',
      drugAllergy: 'no',
    },
    ayushMode: false,
  },
];

export default function DemoModeBar({ isDemo, onToggleDemo, onSelectPersona, activePersonaId }) {
  if (!isDemo) return null;

  return (
    <div className="bg-amber-500 text-slate-900 px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between gap-3 flex-wrap border-b border-amber-600 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <span className="bg-black text-amber-300 px-2 py-0.5 rounded-full font-black text-[10px] tracking-wider uppercase">
          DEMO DATA — NOT REAL PATIENT INFORMATION
        </span>
        <span className="hidden md:inline text-amber-950 font-medium">
          Hackathon / Presentation Mode Active
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-bold text-amber-950">Quick Personas:</span>
        {DEMO_PERSONAS.map(p => {
          const Icon = p.icon;
          const isActive = activePersonaId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPersona(p)}
              className={clsx(
                'px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all text-[11px] font-bold',
                isActive
                  ? 'bg-black text-white shadow'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-900'
              )}
            >
              <Icon size={12} />
              {p.name}
            </button>
          );
        })}
        <button
          onClick={onToggleDemo}
          className="ml-2 bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded-lg text-[10px] font-bold"
          title="Exit Demo Mode"
        >
          Exit Demo
        </button>
      </div>
    </div>
  );
}
