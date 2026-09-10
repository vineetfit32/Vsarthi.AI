import React, { createContext, useContext, useReducer, useCallback } from 'react';

// ─── Initial state ───────────────────────────────────────────────────────────
const initialState = {
  // Navigation & View mode
  activeView: 'landing',     // 'landing' | 'patient' | 'doctor_queue' | 'triage' | 'admin' | 'kiosk'
  isDemoMode: false,
  activePersonaId: null,
  isKiosk: false,
  selectedPatientRecord: null,

  // UI settings
  currentStep: 'language',   // 'language' | 'identity' | 'consent' | 'interview' | 'documents' | 'summary' | 'physician' | 'session_end'
  language: 'en',
  highContrast: false,
  largeFont: false,
  ttsEnabled: true,
  ayushMode: false,

  // Patient identity
  patient: {
    abhaId: '',
    name: '',
    dob: '',
    gender: '',
    phone: '',
    isNew: false,
    isVerified: false,
  },

  // Consent
  consent: {
    dataCapture: false,
    dataSharing: false,
    accepted: false,
  },

  // Interview
  interview: {
    answers: {},
    questionIndex: 0,
    questions: [],           // built once chief complaint is selected
    isComplete: false,
    redFlag: null,
    chatHistory: [],         // [{id, role:'assistant'|'user', text, time}]
  },

  // Documents
  documents: [],             // [{id, name, type, uploadDate, source, status, extractedData, abnormal}]

  // Summary
  summary: {
    generated: false,
    generating: false,
    sections: {},            // { chiefComplaint, hpi, ... }
    patientFriendly: {},
    sectionStatus: {},       // { sectionKey: 'pending'|'accepted'|'amended'|'rejected' }
    physicianNotes: {},      // { sectionKey: string }
    pushedToHIS: false,
    hisToken: null,
  },

  // Session
  session: {
    startTime: null,
    isEnded: false,
  },
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };

    case 'TOGGLE_HIGH_CONTRAST':
      return { ...state, highContrast: !state.highContrast };

    case 'TOGGLE_LARGE_FONT':
      return { ...state, largeFont: !state.largeFont };

    case 'TOGGLE_TTS':
      return { ...state, ttsEnabled: !state.ttsEnabled };

    case 'TOGGLE_AYUSH':
      return { ...state, ayushMode: !state.ayushMode };

    case 'SET_PATIENT':
      return { ...state, patient: { ...state.patient, ...action.payload } };

    case 'SET_CONSENT':
      return { ...state, consent: { ...state.consent, ...action.payload } };

    case 'INIT_INTERVIEW':
      return {
        ...state,
        interview: {
          ...state.interview,
          questions: action.payload.questions,
          questionIndex: 0,
          answers: {},
          chatHistory: [],
          isComplete: false,
          redFlag: null,
        },
        session: { ...state.session, startTime: new Date().toISOString() },
      };

    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        interview: {
          ...state.interview,
          chatHistory: [...state.interview.chatHistory, action.payload],
        },
      };

    case 'SET_ANSWER': {
      const { key, value } = action.payload;
      const newAnswers = { ...state.interview.answers, [key]: value };
      return {
        ...state,
        interview: { ...state.interview, answers: newAnswers },
      };
    }

    case 'SET_QUESTION_INDEX':
      return {
        ...state,
        interview: { ...state.interview, questionIndex: action.payload },
      };

    case 'SET_INTERVIEW_QUESTIONS':
      return {
        ...state,
        interview: { ...state.interview, questions: action.payload },
      };

    case 'SET_RED_FLAG':
      return {
        ...state,
        interview: { ...state.interview, redFlag: action.payload },
      };

    case 'COMPLETE_INTERVIEW':
      return {
        ...state,
        interview: { ...state.interview, isComplete: true },
      };

    case 'ADD_DOCUMENT':
      return {
        ...state,
        documents: [...state.documents, action.payload],
      };

    case 'UPDATE_DOCUMENT': {
      const docs = state.documents.map(d =>
        d.id === action.payload.id ? { ...d, ...action.payload } : d
      );
      return { ...state, documents: docs };
    }

    case 'REMOVE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter(d => d.id !== action.payload),
      };

    case 'SET_SUMMARY':
      return {
        ...state,
        summary: {
          ...state.summary,
          ...action.payload,
          sectionStatus: action.payload.sections
            ? Object.fromEntries(Object.keys(action.payload.sections).map(k => [k, 'pending']))
            : state.summary.sectionStatus,
        },
      };

    case 'SET_SECTION_STATUS': {
      const { sectionKey, status } = action.payload;
      return {
        ...state,
        summary: {
          ...state.summary,
          sectionStatus: { ...state.summary.sectionStatus, [sectionKey]: status },
        },
      };
    }

    case 'SET_PHYSICIAN_NOTE': {
      const { sectionKey, note } = action.payload;
      return {
        ...state,
        summary: {
          ...state.summary,
          physicianNotes: { ...state.summary.physicianNotes, [sectionKey]: note },
        },
      };
    }

    case 'SET_PUSHED_TO_HIS':
      return {
        ...state,
        summary: { ...state.summary, pushedToHIS: true, hisToken: action.payload },
      };

    case 'SET_VIEW':
      return { ...state, activeView: action.payload };

    case 'TOGGLE_DEMO_MODE':
      return { ...state, isDemoMode: !state.isDemoMode };

    case 'SET_KIOSK_MODE':
      return { ...state, isKiosk: action.payload };

    case 'SET_SELECTED_PATIENT':
      return { ...state, selectedPatientRecord: action.payload };

    case 'LOAD_PERSONA': {
      const p = action.payload;
      return {
        ...state,
        isDemoMode: true,
        activePersonaId: p.id,
        patient: { ...state.patient, ...p.patient, isNew: false, isVerified: true },
        ayushMode: !!p.ayushMode,
        interview: {
          ...state.interview,
          answers: { ...p.answers },
          redFlag: p.answers.chiefComplaint?.includes('chest_pain') ? {
            id: 'acs',
            name: 'Possible Acute Coronary Syndrome',
            severity: 'critical',
            message: 'Chest pain with arm radiation — urgent cardiac triage required.',
          } : null,
        },
      };
    }

    case 'END_SESSION':
      return {
        ...state,
        currentStep: 'session_end',
        session: { ...state.session, isEnded: true },
      };

    case 'RESET':
      return { ...initialState, isDemoMode: state.isDemoMode, activeView: state.isKiosk ? 'kiosk' : 'landing' };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Convenience action creators
  const actions = {
    setView:         (view)    => dispatch({ type: 'SET_VIEW',       payload: view }),
    toggleDemoMode:  ()        => dispatch({ type: 'TOGGLE_DEMO_MODE' }),
    setKioskMode:    (isKiosk) => dispatch({ type: 'SET_KIOSK_MODE', payload: isKiosk }),
    loadPersona:     (persona) => dispatch({ type: 'LOAD_PERSONA',   payload: persona }),
    setSelectedPatient:(pat)   => dispatch({ type: 'SET_SELECTED_PATIENT', payload: pat }),
    setStep:         (step)    => dispatch({ type: 'SET_STEP',       payload: step }),
    setLanguage:     (lang)    => dispatch({ type: 'SET_LANGUAGE',   payload: lang }),
    toggleHighContrast:()      => dispatch({ type: 'TOGGLE_HIGH_CONTRAST' }),
    toggleLargeFont: ()        => dispatch({ type: 'TOGGLE_LARGE_FONT' }),
    toggleTTS:       ()        => dispatch({ type: 'TOGGLE_TTS' }),
    toggleAyush:     ()        => dispatch({ type: 'TOGGLE_AYUSH' }),
    setPatient:      (data)    => dispatch({ type: 'SET_PATIENT',    payload: data }),
    setConsent:      (data)    => dispatch({ type: 'SET_CONSENT',    payload: data }),
    initInterview:   (qs)      => dispatch({ type: 'INIT_INTERVIEW', payload: { questions: qs } }),
    addChatMessage:  (msg)     => dispatch({ type: 'ADD_CHAT_MESSAGE', payload: msg }),
    setAnswer:       (key, val)=> dispatch({ type: 'SET_ANSWER',     payload: { key, value: val } }),
    setQuestionIndex:(idx)     => dispatch({ type: 'SET_QUESTION_INDEX', payload: idx }),
    setInterviewQuestions:(qs) => dispatch({ type: 'SET_INTERVIEW_QUESTIONS', payload: qs }),
    setRedFlag:      (flag)    => dispatch({ type: 'SET_RED_FLAG',   payload: flag }),
    completeInterview:()       => dispatch({ type: 'COMPLETE_INTERVIEW' }),
    addDocument:     (doc)     => dispatch({ type: 'ADD_DOCUMENT',   payload: doc }),
    updateDocument:  (doc)     => dispatch({ type: 'UPDATE_DOCUMENT', payload: doc }),
    removeDocument:  (id)      => dispatch({ type: 'REMOVE_DOCUMENT', payload: id }),
    setSummary:      (data)    => dispatch({ type: 'SET_SUMMARY',    payload: data }),
    setSectionStatus:(key, st) => dispatch({ type: 'SET_SECTION_STATUS', payload: { sectionKey: key, status: st } }),
    setPhysicianNote:(key, n)  => dispatch({ type: 'SET_PHYSICIAN_NOTE', payload: { sectionKey: key, note: n } }),
    setPushedToHIS:  (token)   => dispatch({ type: 'SET_PUSHED_TO_HIS', payload: token }),
    endSession:      ()        => dispatch({ type: 'END_SESSION' }),
    reset:           ()        => dispatch({ type: 'RESET' }),
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
