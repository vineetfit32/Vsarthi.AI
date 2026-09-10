// Full adaptive interview question tree
// Each question: { id, key, section, text:{en,hi}, type:'choice'|'multiselect'|'scale'|'text', options?, required? }

export const SECTIONS = {
  CHIEF_COMPLAINT: 'chiefComplaint',
  HPI:             'hpi',
  PAST_MEDICAL:    'pastMedical',
  DRUG_ALLERGY:    'drugAllergy',
  FAMILY:          'family',
  PERSONAL:        'personal',
  ROS:             'ros',
  AYUSH:           'ayush',
};

// ─── Chief Complaint ────────────────────────────────────────────────────────
export const chiefComplaintQuestion = {
  id: 'cc_main',
  key: 'chiefComplaint',
  section: SECTIONS.CHIEF_COMPLAINT,
  text: {
    en: "What is the main reason for your visit today? (Select all that apply)",
    hi: "आज आप डॉक्टर के पास किस कारण से आए हैं? (सभी लागू विकल्प चुनें)",
  },
  type: 'multiselect',
  options: [
    { value: 'chest_pain',    label: { en: '❤ Chest Pain',          hi: '❤ सीने में दर्द' } },
    { value: 'fever',         label: { en: '🌡 Fever',               hi: '🌡 बुखार' } },
    { value: 'cough',         label: { en: '😮‍💨 Cough',               hi: '😮‍💨 खांसी' } },
    { value: 'headache',      label: { en: '🧠 Headache',            hi: '🧠 सिरदर्द' } },
    { value: 'abdominal_pain',label: { en: '🫃 Abdominal Pain',      hi: '🫃 पेट दर्द' } },
    { value: 'sob',           label: { en: '💨 Breathlessness',      hi: '💨 सांस फूलना' } },
    { value: 'joint_pain',    label: { en: '🦴 Joint Pain',          hi: '🦴 जोड़ों में दर्द' } },
    { value: 'diabetes_fu',   label: { en: '💉 Diabetes Follow-up',  hi: '💉 मधुमेह फॉलो-अप' } },
    { value: 'htn_fu',        label: { en: '🫀 Hypertension Follow-up', hi: '🫀 उच्च रक्तचाप फॉलो-अप' } },
    { value: 'skin',          label: { en: '🩹 Skin Problem',         hi: '🩹 त्वचा की समस्या' } },
    { value: 'urinary',       label: { en: '🫗 Urinary Problem',     hi: '🫗 मूत्र संबंधी समस्या' } },
    { value: 'other',         label: { en: '📝 Other',               hi: '📝 अन्य' } },
  ],
  required: true,
};

export const durationQuestion = {
  id: 'cc_duration',
  key: 'duration',
  section: SECTIONS.CHIEF_COMPLAINT,
  text: {
    en: 'How long have you had this problem?',
    hi: 'यह समस्या कितने समय से है?',
  },
  type: 'choice',
  options: [
    { value: 'today',    label: { en: 'Started today',       hi: 'आज शुरू हुई' } },
    { value: '2_3_days', label: { en: '2–3 days',            hi: '2–3 दिन' } },
    { value: '1_week',   label: { en: 'About a week',        hi: 'लगभग एक हफ्ता' } },
    { value: '2_4_weeks',label: { en: '2–4 weeks',           hi: '2–4 हफ्ते' } },
    { value: '1_3_months',label:{ en: '1–3 months',          hi: '1–3 महीने' } },
    { value: 'over_3mo', label: { en: 'More than 3 months',  hi: '3 महीने से अधिक' } },
    { value: 'years',    label: { en: 'Years (chronic)',      hi: 'सालों से (दीर्घकालिक)' } },
  ],
  required: true,
};

// ─── HPI — Branching by chief complaint keyword ──────────────────────────────
const siteQ = (forComplaints) => ({
  id: 'hpi_site', key: 'site', section: SECTIONS.HPI,
  forComplaints,
  text: { en: 'Where exactly is the pain / discomfort? (Site)', hi: 'दर्द / तकलीफ ठीक कहाँ है?' },
  type: 'choice',
  options: [
    { value: 'central_chest', label: { en: 'Centre of chest', hi: 'छाती के बीच में' } },
    { value: 'left_chest',    label: { en: 'Left side of chest', hi: 'छाती की बाईं ओर' } },
    { value: 'right_chest',   label: { en: 'Right side of chest', hi: 'छाती की दाईं ओर' } },
    { value: 'epigastric',    label: { en: 'Upper abdomen (below chest)', hi: 'ऊपरी पेट' } },
    { value: 'whole_abdomen', label: { en: 'Whole abdomen', hi: 'पूरा पेट' } },
    { value: 'right_lower',   label: { en: 'Lower right abdomen', hi: 'निचला दाहिना पेट' } },
    { value: 'left_lower',    label: { en: 'Lower left abdomen', hi: 'निचला बायां पेट' } },
    { value: 'forehead',      label: { en: 'Forehead', hi: 'माथा' } },
    { value: 'back_of_head',  label: { en: 'Back of head', hi: 'सिर के पीछे' } },
    { value: 'all_over',      label: { en: 'All over / diffuse', hi: 'सभी जगह' } },
  ],
});

export const HPI_QUESTIONS = {
  // Questions for chest pain
  chest_pain: [
    siteQ(['chest_pain']),
    {
      id: 'hpi_onset', key: 'onset', section: SECTIONS.HPI,
      text: { en: 'How did it start? (Onset)', hi: 'यह कैसे शुरू हुआ?' },
      type: 'choice',
      options: [
        { value: 'sudden',     label: { en: 'Suddenly (within seconds/minutes)', hi: 'अचानक (सेकंड / मिनटों में)' } },
        { value: 'gradual',    label: { en: 'Gradually (over hours)', hi: 'धीरे-धीरे (घंटों में)' } },
        { value: 'exertion',   label: { en: 'During exertion / exercise', hi: 'परिश्रम / व्यायाम के दौरान' } },
        { value: 'rest',       label: { en: 'At rest', hi: 'आराम के समय' } },
        { value: 'after_food', label: { en: 'After eating', hi: 'खाने के बाद' } },
      ],
    },
    {
      id: 'hpi_character', key: 'character', section: SECTIONS.HPI,
      text: { en: 'How would you describe the pain? (Character)', hi: 'दर्द कैसा है?' },
      type: 'choice',
      options: [
        { value: 'crushing',   label: { en: 'Crushing / pressure / tight', hi: 'दबाने जैसा / टाइट' } },
        { value: 'burning',    label: { en: 'Burning', hi: 'जलन' } },
        { value: 'stabbing',   label: { en: 'Sharp / stabbing', hi: 'तेज / छुरा मारने जैसा' } },
        { value: 'dull_ache',  label: { en: 'Dull ache', hi: 'हल्का दर्द' } },
        { value: 'tearing',    label: { en: 'Tearing', hi: 'फाड़ने जैसा' } },
      ],
    },
    {
      id: 'hpi_radiation', key: 'radiation', section: SECTIONS.HPI,
      text: { en: 'Does the pain spread anywhere? (Radiation)', hi: 'क्या दर्द कहीं फैलता है?' },
      type: 'multiselect',
      options: [
        { value: 'no_radiation', label: { en: 'No, stays in one place', hi: 'नहीं, एक जगह रहता है' } },
        { value: 'arm',          label: { en: 'Left arm / shoulder', hi: 'बाईं बांह / कंधा' } },
        { value: 'jaw',          label: { en: 'Jaw / neck', hi: 'जबड़ा / गर्दन' } },
        { value: 'back',         label: { en: 'Back', hi: 'पीठ' } },
        { value: 'epigastric',   label: { en: 'Stomach', hi: 'पेट' } },
      ],
    },
    {
      id: 'hpi_associated', key: 'associated', section: SECTIONS.HPI,
      text: { en: 'Any other symptoms along with this? (Associated)', hi: 'साथ में और कोई लक्षण?' },
      type: 'multiselect',
      options: [
        { value: 'none',          label: { en: 'None', hi: 'कोई नहीं' } },
        { value: 'sob',           label: { en: 'Shortness of breath', hi: 'सांस फूलना' } },
        { value: 'sweating',      label: { en: 'Sweating', hi: 'पसीना' } },
        { value: 'nausea',        label: { en: 'Nausea / vomiting', hi: 'उल्टी जी मचलाना' } },
        { value: 'palpitations',  label: { en: 'Heart racing / palpitations', hi: 'दिल की धड़कन तेज' } },
        { value: 'dizziness',     label: { en: 'Dizziness / fainting', hi: 'चक्कर / बेहोशी' } },
        { value: 'cough',         label: { en: 'Cough', hi: 'खांसी' } },
      ],
    },
    {
      id: 'hpi_severity', key: 'severity', section: SECTIONS.HPI,
      text: { en: 'How severe is the pain now? (0 = none, 10 = worst imaginable)', hi: 'दर्द की तीव्रता अभी कितनी है? (0 = कोई नहीं, 10 = असहनीय)' },
      type: 'scale',
      min: 0, max: 10,
    },
    {
      id: 'hpi_relieving', key: 'relieving', section: SECTIONS.HPI,
      text: { en: 'What makes it better or worse? (Modifying factors)', hi: 'क्या चीज़ दर्द को बेहतर या बदतर बनाती है?' },
      type: 'multiselect',
      options: [
        { value: 'rest_helps',    label: { en: 'Rest makes it better', hi: 'आराम से बेहतर' } },
        { value: 'exercise_worse',label: { en: 'Exercise makes it worse', hi: 'व्यायाम से बदतर' } },
        { value: 'food_helps',    label: { en: 'Food / antacids help', hi: 'खाना / एंटासिड से राहत' } },
        { value: 'food_worse',    label: { en: 'Food makes it worse', hi: 'खाने से बदतर' } },
        { value: 'deep_breath',   label: { en: 'Worse on deep breathing', hi: 'गहरी सांस से बदतर' } },
        { value: 'position',      label: { en: 'Changes with position', hi: 'स्थिति बदलने से बदलता है' } },
        { value: 'nothing',       label: { en: 'Nothing helps', hi: 'कुछ भी मदद नहीं करता' } },
      ],
    },
  ],

  // Questions for fever
  fever: [
    {
      id: 'hpi_fever_grade', key: 'feverGrade', section: SECTIONS.HPI,
      text: { en: 'How high is the fever?', hi: 'बुखार कितना है?' },
      type: 'choice',
      options: [
        { value: 'low',    label: { en: 'Low-grade (< 100°F)', hi: 'हल्का (< 100°F / 37.8°C)' } },
        { value: 'high',   label: { en: 'High (100–103°F)', hi: 'तेज (100–103°F)' } },
        { value: 'very_high', label: { en: 'Very high (> 103°F)', hi: 'बहुत तेज (> 103°F)' } },
        { value: 'not_measured', label: { en: 'Not measured', hi: 'नहीं मापा' } },
      ],
    },
    {
      id: 'hpi_fever_pattern', key: 'feverPattern', section: SECTIONS.HPI,
      text: { en: 'What is the fever pattern?', hi: 'बुखार का पैटर्न क्या है?' },
      type: 'choice',
      options: [
        { value: 'continuous', label: { en: 'Continuous (always there)', hi: 'लगातार (हमेशा रहता है)' } },
        { value: 'remittent',  label: { en: 'Goes down but doesn\'t become normal', hi: 'कम होता है पर सामान्य नहीं होता' } },
        { value: 'intermittent', label: { en: 'Comes and goes (spikes)', hi: 'आता-जाता है (तेज उछाल)' } },
        { value: 'evening',    label: { en: 'Only in evenings', hi: 'केवल शाम को' } },
      ],
    },
    {
      id: 'hpi_associated', key: 'associated', section: SECTIONS.HPI,
      text: { en: 'Symptoms associated with the fever?', hi: 'बुखार के साथ और क्या है?' },
      type: 'multiselect',
      options: [
        { value: 'chills',       label: { en: 'Chills / rigors', hi: 'ठंड लगना / कंपकंपी' } },
        { value: 'sweating',     label: { en: 'Night sweats', hi: 'रात में पसीना' } },
        { value: 'headache',     label: { en: 'Headache', hi: 'सिरदर्द' } },
        { value: 'body_ache',    label: { en: 'Body ache / myalgia', hi: 'शरीर में दर्द' } },
        { value: 'rash',         label: { en: 'Rash', hi: 'चकत्ते' } },
        { value: 'sore_throat',  label: { en: 'Sore throat', hi: 'गले में दर्द' } },
        { value: 'cough',        label: { en: 'Cough', hi: 'खांसी' } },
        { value: 'nausea',       label: { en: 'Nausea / vomiting', hi: 'उल्टी' } },
        { value: 'diarrhea',     label: { en: 'Diarrhoea', hi: 'दस्त' } },
        { value: 'confusion',    label: { en: 'Confusion / altered consciousness', hi: 'भ्रम / चेतना में बदलाव' } },
        { value: 'low_urine',    label: { en: 'Reduced urine output', hi: 'मूत्र कम आना' } },
        { value: 'fast_heartbeat', label: { en: 'Heart racing', hi: 'दिल तेज धड़कना' } },
        { value: 'none',         label: { en: 'None of the above', hi: 'उपरोक्त में से कोई नहीं' } },
      ],
    },
    {
      id: 'hpi_severity', key: 'severity', section: SECTIONS.HPI,
      text: { en: 'How much is the fever affecting you? (0 = not at all, 10 = very severely)', hi: 'बुखार आपको कितना प्रभावित कर रहा है? (0 = बिल्कुल नहीं, 10 = बहुत ज्यादा)' },
      type: 'scale', min: 0, max: 10,
    },
  ],

  // Questions for headache
  headache: [
    siteQ(['headache']),
    {
      id: 'hpi_onset', key: 'onset', section: SECTIONS.HPI,
      text: { en: 'How did the headache start?', hi: 'सिरदर्द कैसे शुरू हुआ?' },
      type: 'choice',
      options: [
        { value: 'sudden',   label: { en: 'Sudden (worst in seconds — "thunderclap")', hi: 'अचानक (कुछ सेकंड में — "थंडरक्लैप")' } },
        { value: 'gradual',  label: { en: 'Gradually', hi: 'धीरे-धीरे' } },
        { value: 'woke_up',  label: { en: 'Woke up with it', hi: 'नींद से उठा तो था' } },
        { value: 'exercise', label: { en: 'After exercise', hi: 'व्यायाम के बाद' } },
      ],
    },
    {
      id: 'hpi_character', key: 'character', section: SECTIONS.HPI,
      text: { en: 'What kind of headache is it?', hi: 'सिरदर्द किस प्रकार का है?' },
      type: 'choice',
      options: [
        { value: 'throbbing',  label: { en: 'Throbbing / pulsating', hi: 'धड़कता हुआ' } },
        { value: 'pressing',   label: { en: 'Pressing / tightness (band around head)', hi: 'दबाव / कसाव (सिर के चारों ओर)' } },
        { value: 'stabbing',   label: { en: 'Sharp / stabbing', hi: 'तेज / चुभने वाला' } },
        { value: 'dull',       label: { en: 'Dull / constant ache', hi: 'हल्का / लगातार दर्द' } },
      ],
    },
    {
      id: 'hpi_associated', key: 'associated', section: SECTIONS.HPI,
      text: { en: 'Any other symptoms?', hi: 'साथ में और क्या है?' },
      type: 'multiselect',
      options: [
        { value: 'nausea',          label: { en: 'Nausea / vomiting', hi: 'उल्टी जी मचलाना' } },
        { value: 'photophobia',     label: { en: 'Light sensitivity', hi: 'प्रकाश से तकलीफ' } },
        { value: 'neck_stiffness',  label: { en: 'Neck stiffness', hi: 'गर्दन में अकड़न' } },
        { value: 'vision_change',   label: { en: 'Vision changes / aura', hi: 'दृष्टि में बदलाव' } },
        { value: 'face_droop',      label: { en: 'Facial weakness / drooping', hi: 'चेहरे में कमजोरी' } },
        { value: 'arm_weakness',    label: { en: 'Arm or leg weakness', hi: 'हाथ-पैर में कमजोरी' } },
        { value: 'speech_slurred',  label: { en: 'Slurred speech', hi: 'बोलने में कठिनाई' } },
        { value: 'rash_all_over',   label: { en: 'Rash all over body', hi: 'पूरे शरीर पर चकत्ते' } },
        { value: 'none',            label: { en: 'None', hi: 'कोई नहीं' } },
      ],
    },
    {
      id: 'hpi_severity', key: 'severity', section: SECTIONS.HPI,
      text: { en: 'Severity (0 = none, 10 = worst ever)', hi: 'तीव्रता (0 = कोई नहीं, 10 = सबसे तेज)' },
      type: 'scale', min: 0, max: 10,
    },
  ],

  // Generic / other complaint
  default: [
    {
      id: 'hpi_onset', key: 'onset', section: SECTIONS.HPI,
      text: { en: 'How did it start?', hi: 'यह कैसे शुरू हुआ?' },
      type: 'choice',
      options: [
        { value: 'sudden',  label: { en: 'Suddenly', hi: 'अचानक' } },
        { value: 'gradual', label: { en: 'Gradually', hi: 'धीरे-धीरे' } },
        { value: 'unknown', label: { en: 'Don\'t know', hi: 'पता नहीं' } },
      ],
    },
    {
      id: 'hpi_associated', key: 'associated', section: SECTIONS.HPI,
      text: { en: 'Are there any other symptoms with it?', hi: 'साथ में और कोई लक्षण?' },
      type: 'multiselect',
      options: [
        { value: 'fever',      label: { en: 'Fever', hi: 'बुखार' } },
        { value: 'pain',       label: { en: 'Pain', hi: 'दर्द' } },
        { value: 'weakness',   label: { en: 'Weakness / fatigue', hi: 'कमजोरी / थकान' } },
        { value: 'weight_loss',label: { en: 'Weight loss', hi: 'वजन घटना' } },
        { value: 'appetite',   label: { en: 'Loss of appetite', hi: 'भूख न लगना' } },
        { value: 'none',       label: { en: 'None', hi: 'कोई नहीं' } },
      ],
    },
    {
      id: 'hpi_severity', key: 'severity', section: SECTIONS.HPI,
      text: { en: 'How severe is it? (0 = none, 10 = worst imaginable)', hi: 'तीव्रता कितनी है? (0 = कोई नहीं, 10 = असहनीय)' },
      type: 'scale', min: 0, max: 10,
    },
  ],
};

// Helper: get HPI questions for selected chief complaints
export function getHPIQuestions(chiefComplaints = []) {
  if (!chiefComplaints.length) return HPI_QUESTIONS.default;
  const primary = chiefComplaints[0];
  return HPI_QUESTIONS[primary] || HPI_QUESTIONS.default;
}

// ─── Past Medical History ────────────────────────────────────────────────────
export const PAST_MEDICAL_QUESTIONS = [
  {
    id: 'pmh_conditions', key: 'pastMedical', section: SECTIONS.PAST_MEDICAL,
    text: { en: 'Do you have any of the following conditions?', hi: 'क्या आपको निम्न में से कोई बीमारी है?' },
    type: 'multiselect',
    options: [
      { value: 'none',           label: { en: 'None', hi: 'कोई नहीं' } },
      { value: 'hypertension',   label: { en: 'Hypertension (High BP)', hi: 'उच्च रक्तचाप' } },
      { value: 'diabetes',       label: { en: 'Diabetes', hi: 'मधुमेह' } },
      { value: 'heart_disease',  label: { en: 'Heart disease / IHD', hi: 'हृदय रोग' } },
      { value: 'asthma',         label: { en: 'Asthma / COPD', hi: 'दमा / COPD' } },
      { value: 'thyroid',        label: { en: 'Thyroid disorder', hi: 'थायरॉइड विकार' } },
      { value: 'kidney',         label: { en: 'Kidney disease', hi: 'गुर्दे की बीमारी' } },
      { value: 'liver',          label: { en: 'Liver disease', hi: 'लिवर की बीमारी' } },
      { value: 'epilepsy',       label: { en: 'Epilepsy / seizures', hi: 'मिर्गी' } },
      { value: 'tb',             label: { en: 'Tuberculosis (TB)', hi: 'तपेदिक (TB)' } },
      { value: 'cancer',         label: { en: 'Cancer', hi: 'कैंसर' } },
      { value: 'stroke',         label: { en: 'Stroke / paralysis', hi: 'स्ट्रोक / पक्षाघात' } },
      { value: 'other_pmh',      label: { en: 'Other', hi: 'अन्य' } },
    ],
  },
  {
    id: 'pmh_surgery', key: 'pastSurgery', section: SECTIONS.PAST_MEDICAL,
    text: { en: 'Have you had any surgeries or hospitalizations?', hi: 'क्या आपकी कभी सर्जरी या अस्पताल में भर्ती हुए हैं?' },
    type: 'choice',
    options: [
      { value: 'none', label: { en: 'No surgeries', hi: 'कोई सर्जरी नहीं' } },
      { value: 'yes',  label: { en: 'Yes — I\'ll describe below', hi: 'हां — नीचे बताऊंगा/बताऊंगी' } },
    ],
  },
  {
    id: 'pmh_surgery_detail', key: 'pastSurgeryDetail', section: SECTIONS.PAST_MEDICAL,
    text: { en: 'Please briefly describe the surgery / hospitalization (what, when)', hi: 'सर्जरी / अस्पताल में भर्ती का संक्षेप में विवरण दें (क्या, कब)' },
    type: 'text',
    conditionalOn: { key: 'pastSurgery', value: 'yes' },
  },
];

// ─── Drug & Allergy History ──────────────────────────────────────────────────
export const DRUG_ALLERGY_QUESTIONS = [
  {
    id: 'da_current_meds', key: 'currentMeds', section: SECTIONS.DRUG_ALLERGY,
    text: { en: 'Are you currently taking any medicines?', hi: 'क्या आप अभी कोई दवाइयां ले रहे हैं?' },
    type: 'choice',
    options: [
      { value: 'none', label: { en: 'No medicines', hi: 'कोई दवाई नहीं' } },
      { value: 'yes',  label: { en: 'Yes', hi: 'हां' } },
    ],
  },
  {
    id: 'da_meds_detail', key: 'currentMedsDetail', section: SECTIONS.DRUG_ALLERGY,
    text: { en: 'Please list the medicines you are taking (name, dose, frequency)', hi: 'दवाइयों की सूची दें (नाम, मात्रा, कितनी बार)' },
    type: 'text',
    conditionalOn: { key: 'currentMeds', value: 'yes' },
  },
  {
    id: 'da_allergy', key: 'drugAllergy', section: SECTIONS.DRUG_ALLERGY,
    text: { en: 'Are you allergic to any medicines or foods?', hi: 'क्या आपको किसी दवाई या खाने से एलर्जी है?' },
    type: 'choice',
    options: [
      { value: 'none', label: { en: 'No known allergies', hi: 'कोई ज्ञात एलर्जी नहीं' } },
      { value: 'yes',  label: { en: 'Yes', hi: 'हां' } },
    ],
  },
  {
    id: 'da_allergy_detail', key: 'drugAllergyDetail', section: SECTIONS.DRUG_ALLERGY,
    text: { en: 'What are you allergic to, and what reaction did you have?', hi: 'किस चीज़ से एलर्जी है और क्या प्रतिक्रिया हुई?' },
    type: 'text',
    conditionalOn: { key: 'drugAllergy', value: 'yes' },
  },
];

// ─── Family History ──────────────────────────────────────────────────────────
export const FAMILY_QUESTIONS = [
  {
    id: 'fh_conditions', key: 'familyHistory', section: SECTIONS.FAMILY,
    text: { en: 'Do any close family members (parents, siblings) have these conditions?', hi: 'क्या परिवार में (माता-पिता, भाई-बहन) ये बीमारियां हैं?' },
    type: 'multiselect',
    options: [
      { value: 'none',          label: { en: 'None known', hi: 'कोई नहीं' } },
      { value: 'hypertension',  label: { en: 'Hypertension', hi: 'उच्च रक्तचाप' } },
      { value: 'diabetes',      label: { en: 'Diabetes', hi: 'मधुमेह' } },
      { value: 'heart_disease', label: { en: 'Heart disease', hi: 'हृदय रोग' } },
      { value: 'cancer',        label: { en: 'Cancer', hi: 'कैंसर' } },
      { value: 'stroke',        label: { en: 'Stroke', hi: 'स्ट्रोक' } },
      { value: 'tb',            label: { en: 'Tuberculosis', hi: 'तपेदिक' } },
      { value: 'kidney',        label: { en: 'Kidney disease', hi: 'गुर्दे की बीमारी' } },
      { value: 'thyroid',       label: { en: 'Thyroid', hi: 'थायरॉइड' } },
    ],
  },
];

// ─── Personal History ────────────────────────────────────────────────────────
export const PERSONAL_QUESTIONS = [
  {
    id: 'ph_smoking', key: 'smoking', section: SECTIONS.PERSONAL,
    text: { en: 'Do you smoke?', hi: 'क्या आप धूम्रपान करते/करती हैं?' },
    type: 'choice',
    options: [
      { value: 'never',     label: { en: 'Never smoked', hi: 'कभी नहीं' } },
      { value: 'ex',        label: { en: 'Ex-smoker (quit)', hi: 'पहले करते थे (छोड़ दिया)' } },
      { value: 'occasional',label: { en: 'Occasionally', hi: 'कभी-कभी' } },
      { value: 'daily',     label: { en: 'Daily smoker', hi: 'रोज करते हैं' } },
    ],
  },
  {
    id: 'ph_alcohol', key: 'alcohol', section: SECTIONS.PERSONAL,
    text: { en: 'Do you consume alcohol?', hi: 'क्या आप शराब पीते/पीती हैं?' },
    type: 'choice',
    options: [
      { value: 'never',     label: { en: 'Never', hi: 'कभी नहीं' } },
      { value: 'occasional',label: { en: 'Occasionally (social)', hi: 'कभी-कभी (सामाजिक)' } },
      { value: 'regular',   label: { en: 'Regular drinker', hi: 'नियमित रूप से' } },
      { value: 'heavy',     label: { en: 'Heavy / daily drinker', hi: 'अत्यधिक / रोज' } },
    ],
  },
  {
    id: 'ph_diet', key: 'diet', section: SECTIONS.PERSONAL,
    text: { en: 'What is your diet?', hi: 'आपका आहार कैसा है?' },
    type: 'choice',
    options: [
      { value: 'veg',     label: { en: 'Vegetarian', hi: 'शाकाहारी' } },
      { value: 'nonveg',  label: { en: 'Non-vegetarian', hi: 'मांसाहारी' } },
      { value: 'eggetarian', label: { en: 'Eggetarian', hi: 'अंडाहारी' } },
      { value: 'vegan',   label: { en: 'Vegan', hi: 'वीगन' } },
    ],
  },
  {
    id: 'ph_exercise', key: 'exercise', section: SECTIONS.PERSONAL,
    text: { en: 'How physically active are you?', hi: 'आप कितने शारीरिक रूप से सक्रिय हैं?' },
    type: 'choice',
    options: [
      { value: 'sedentary', label: { en: 'Sedentary (desk job / minimal activity)', hi: 'बहुत कम (बैठे रहने वाला काम)' } },
      { value: 'light',     label: { en: 'Light activity (walking)', hi: 'हल्की गतिविधि (टहलना)' } },
      { value: 'moderate',  label: { en: 'Moderate (exercise 3–4 times/week)', hi: 'मध्यम (सप्ताह में 3–4 बार व्यायाम)' } },
      { value: 'active',    label: { en: 'Very active (daily workout)', hi: 'बहुत सक्रिय (रोज व्यायाम)' } },
    ],
  },
];

// ─── Review of Systems ───────────────────────────────────────────────────────
export const ROS_QUESTIONS = [
  {
    id: 'ros_symptoms', key: 'rosSymptoms', section: SECTIONS.ROS,
    text: { en: 'In the past few weeks, have you noticed any of these?', hi: 'पिछले कुछ हफ्तों में क्या आपने इनमें से कुछ महसूस किया?' },
    type: 'multiselect',
    options: [
      { value: 'none',          label: { en: 'None', hi: 'कोई नहीं' } },
      { value: 'weight_loss',   label: { en: 'Unexplained weight loss', hi: 'बिना वजह वजन कम होना' } },
      { value: 'fatigue',       label: { en: 'Unusual tiredness / fatigue', hi: 'असामान्य थकान' } },
      { value: 'night_sweats',  label: { en: 'Night sweats', hi: 'रात में पसीना' } },
      { value: 'appetite_loss', label: { en: 'Loss of appetite', hi: 'भूख न लगना' } },
      { value: 'urinary_freq',  label: { en: 'Frequent urination', hi: 'बार-बार पेशाब' } },
      { value: 'thirst',        label: { en: 'Excessive thirst', hi: 'अत्यधिक प्यास' } },
      { value: 'vision',        label: { en: 'Vision problems', hi: 'दृष्टि में समस्या' } },
      { value: 'hearing',       label: { en: 'Hearing difficulties', hi: 'सुनने में कठिनाई' } },
      { value: 'skin_change',   label: { en: 'Skin changes / lumps', hi: 'त्वचा में बदलाव / गांठ' } },
      { value: 'bleeding',      label: { en: 'Unusual bleeding / bruising', hi: 'असामान्य रक्तस्राव / नील' } },
      { value: 'anxiety',       label: { en: 'Anxiety / depression', hi: 'चिंता / उदासी' } },
    ],
  },
];

// ─── AYUSH / Dashavidha Pariksha (Full 14 Classical Clinical Parameters) ───────
export const AYUSH_QUESTIONS = [
  {
    id: 'ayush_prakriti', key: 'prakriti', section: SECTIONS.AYUSH,
    text: { en: '1. What is your constitutional body type? (Prakriti / प्रकृति)', hi: '1. आपकी प्राकृतिक शारीरिक बनावट कैसी है? (प्रकृति)' },
    type: 'choice',
    options: [
      { value: 'vata',       label: { en: 'Vata (Lean, quick, light sleep, variable appetite)', hi: 'वात (पतला, चंचल, हल्की नींद, परिवर्तनशील भूख)' } },
      { value: 'pitta',      label: { en: 'Pitta (Medium build, sharp intellect, strong appetite, intolerant to heat)', hi: 'पित्त (मध्यम काया, तीक्ष्ण बुद्धि, तेज भूख, गर्मी असहनीय)' } },
      { value: 'kapha',      label: { en: 'Kapha (Broad build, calm, deep sleep, slow steady digestion)', hi: 'कफ (मजबूत काया, शांत, गहरी नींद, धीमा पाचन)' } },
      { value: 'vata_pitta', label: { en: 'Dwandwaja: Vata-Pitta', hi: 'द्वन्द्वज: वात-पित्त' } },
      { value: 'pitta_kapha',label: { en: 'Dwandwaja: Pitta-Kapha', hi: 'द्वन्द्वज: पित्त-कफ' } },
      { value: 'vata_kapha', label: { en: 'Dwandwaja: Vata-Kapha', hi: 'द्वन्द्वज: वात-कफ' } },
    ],
  },
  {
    id: 'ayush_vikriti', key: 'vikriti', section: SECTIONS.AYUSH,
    text: { en: '2. Which current imbalance are you experiencing? (Vikriti / विकृति)', hi: '2. वर्तमान में कौन सा दोष असंतुलित महसूस हो रहा है? (विकृति)' },
    type: 'choice',
    options: [
      { value: 'vata_vriddhi',  label: { en: 'Vata Imbalance (Joint stiffness, dryness, gas, anxiety)', hi: 'वात वृद्धि (जोड़ों में दर्द/कड़ापन, रूखापन, गैस, बेचैनी)' } },
      { value: 'pitta_vriddhi', label: { en: 'Pitta Imbalance (Hyperacidity, burning sensation, skin flares, irritability)', hi: 'पित्त वृद्धि (एसिडिटी, जलन, त्वचा पर लालिमा, चिड़चिड़ापन)' } },
      { value: 'kapha_vriddhi', label: { en: 'Kapha Imbalance (Heaviness, lethargy, excess mucus, water retention)', hi: 'कफ वृद्धि (भारीपन, सुस्ती, कफ/बलगम, सूजन)' } },
      { value: 'tridosha',      label: { en: 'Mixed / Sannipataja (All three doshas involved)', hi: 'सन्निपातज (तीनों दोषों का मिश्रित प्रभाव)' } },
    ],
  },
  {
    id: 'ayush_sara', key: 'sara', section: SECTIONS.AYUSH,
    text: { en: '3. Quality of your body tissues and vital essence (Sara / सार)', hi: '3. आपके धातुओं की दृढ़ता और सार कैसा है? (सार)' },
    type: 'choice',
    options: [
      { value: 'pravara',  label: { en: 'Pravara (Excellent tissue vitality, clear skin, strong bones)', hi: 'प्रवर (उत्कृष्ट धातु सार, चमकदार त्वचा, मजबूत हड्डियां)' } },
      { value: 'madhyama', label: { en: 'Madhyama (Moderate tissue strength)', hi: 'मध्यम (औसत धातु बल)' } },
      { value: 'avara',    label: { en: 'Avara (Weak tissue tone, fatigue easily, fragile)', hi: 'अवर (कमजोर धातु बल, जल्दी थकान)' } },
    ],
  },
  {
    id: 'ayush_samhanana', key: 'samhanana', section: SECTIONS.AYUSH,
    text: { en: '4. Body compactness and joint structure (Samhanana / संहनन)', hi: '4. शरीर का गठन और जोड़ों की सुदृढ़ता कैसी है? (संहनन)' },
    type: 'choice',
    options: [
      { value: 'susamhata', label: { en: 'Well-knit, symmetrical, compact joints', hi: 'सुसंहत (सुगठित व मजबूत जोड़)' } },
      { value: 'madhyama',  label: { en: 'Moderately compact', hi: 'मध्यम संहनन' } },
      { value: 'heena',     label: { en: 'Loose joint articulation, asymmetrical build', hi: 'हीन संहनन (ढीले जोड़, कमजोर ढांचा)' } },
    ],
  },
  {
    id: 'ayush_pramana', key: 'pramana', section: SECTIONS.AYUSH,
    text: { en: '5. Anthropometric body proportions (Pramana / प्रमाण)', hi: '5. शरीर की शारीरिक माप व अनुपात कैसा है? (प्रमाण)' },
    type: 'choice',
    options: [
      { value: 'sama',      label: { en: 'Balanced / Ideal proportions (Sama)', hi: 'सम प्रमाण (संतुलित अनुपात)' } },
      { value: 'krisha',    label: { en: 'Underweight / Emaciated (Krisha)', hi: 'कृश (कम वजन / दुबला)' } },
      { value: 'sthula',    label: { en: 'Overweight / Tendency to obesity (Sthula)', hi: 'स्थूल (अधिक वजन / मोटापा)' } },
    ],
  },
  {
    id: 'ayush_satmya', key: 'satmya', section: SECTIONS.AYUSH,
    text: { en: '6. Food and environmental adaptation (Satmya / सात्म्य)', hi: '6. आपको कौन से रस और वातावरण अनुकूल पड़ते हैं? (सात्म्य)' },
    type: 'multiselect',
    options: [
      { value: 'sarva_rasa',  label: { en: 'All 6 tastes well-tolerated (Sarva-rasa satmya)', hi: 'षड्रस सात्म्य (सभी 6 रस अनुकूल)' } },
      { value: 'madhura',     label: { en: 'Sweet / Ghee / Milk products suit best', hi: 'मधुर, घी, दूध अनुकूल' } },
      { value: 'katu_tikta',  label: { en: 'Pungent / Bitter spices tolerated', hi: 'कटु-तिक्त मसाले अनुकूल' } },
      { value: 'sheetala',    label: { en: 'Cold weather / cooling foods suit best', hi: 'शीतल वातावरण अनुकूल' } },
      { value: 'ushna',       label: { en: 'Warm weather / hot soups suit best', hi: 'उष्ण मौसम व गर्म आहार अनुकूल' } },
    ],
  },
  {
    id: 'ayush_sattva', key: 'sattva', section: SECTIONS.AYUSH,
    text: { en: '7. Mental temperament and stress resilience (Sattva / सत्त्व)', hi: '7. आपकी मानसिक दृढ़ता व सहनशीलता कैसी है? (सत्त्व)' },
    type: 'choice',
    options: [
      { value: 'pravara', label: { en: 'Pravara (Strong mental resilience, steady memory, handles distress calmly)', hi: 'प्रवर (मजबूत मनोबल, स्थिर चित्त, धैर्यवान)' } },
      { value: 'madhyama',label: { en: 'Madhyama (Moderate resilience, needs occasional reassurance)', hi: 'मध्यम (औसत मनोबल)' } },
      { value: 'avara',   label: { en: 'Avara (Easily anxious, fearful, emotionally overwhelmed)', hi: 'अवर (जल्दी घबराहट, भयभीत, कमजोर मनोबल)' } },
    ],
  },
  {
    id: 'ayush_ahara_shakti', key: 'aharaShakti', section: SECTIONS.AYUSH,
    text: { en: '8. Digestive and metabolic fire (Ahara Shakti / Agni / आहार शक्ति व अग्नि)', hi: '8. आपकी पाचन क्षमता और भूख कैसी है? (आहार शक्ति व अग्नि)' },
    type: 'choice',
    options: [
      { value: 'samagni',    label: { en: 'Samagni (Balanced — timely appetite, smooth digestion)', hi: 'समाग्नि (संतुलित पाचन, समय पर भूख)' } },
      { value: 'teekshnagni',label: { en: 'Teekshnagni (Very sharp — ravenous hunger, burning if delayed)', hi: 'तीक्ष्णाग्नि (अत्यधिक भूख, जलन)' } },
      { value: 'mandagni',   label: { en: 'Mandagni (Sluggish — low appetite, fullness after small meals)', hi: 'मंदाग्नि (धीमा पाचन, भारीपन)' } },
      { value: 'vishamagni', label: { en: 'Vishamagni (Erratic — irregular appetite, gas, alternating stools)', hi: 'विषमाग्नि (अनियमित भूख, गैस, अनिश्चित पाचन)' } },
    ],
  },
  {
    id: 'ayush_vyayama_shakti', key: 'vyayamaShakti', section: SECTIONS.AYUSH,
    text: { en: '9. Physical endurance and exercise capacity (Vyayama Shakti / व्यायाम शक्ति)', hi: '9. शारीरिक श्रम व व्यायाम सहन करने की शक्ति कैसी है? (व्यायाम शक्ति)' },
    type: 'choice',
    options: [
      { value: 'uttama',   label: { en: 'Uttama (High — can perform heavy physical work with ease)', hi: 'उत्तम (कठिन श्रम आसानी से)' } },
      { value: 'madhyama', label: { en: 'Madhyama (Moderate endurance)', hi: 'मध्यम (हल्का-मध्यम व्यायाम)' } },
      { value: 'alpa',     label: { en: 'Alpa (Low — breathless or exhausted quickly)', hi: 'अल्प (जल्दी सांस फूलना व थकान)' } },
    ],
  },
  {
    id: 'ayush_vaya', key: 'vaya', section: SECTIONS.AYUSH,
    text: { en: '10. Biological age phase (Vaya / वय)', hi: '10. जीवन की कौन सी अवस्था है? (वय)' },
    type: 'choice',
    options: [
      { value: 'balya',    label: { en: 'Balya (< 16 years — Kapha predominant age)', hi: 'बाल्यावस्था (< 16 वर्ष — कफ प्रधान)' } },
      { value: 'madhyama', label: { en: 'Madhyama (16–60 years — Pitta predominant age)', hi: 'युवा/मध्यमावस्था (16–60 वर्ष — पित्त प्रधान)' } },
      { value: 'vriddha',  label: { en: 'Vriddha (> 60 years — Vata predominant age)', hi: 'वृद्धावस्था (> 60 वर्ष — वात प्रधान)' } },
    ],
  },
  {
    id: 'ayush_ahara', key: 'aharaHabits', section: SECTIONS.AYUSH,
    text: { en: '11. Specific dietary patterns (Ahara / आहार)', hi: '11. आपके खान-पान की आदतें कैसी हैं? (आहार)' },
    type: 'multiselect',
    options: [
      { value: 'irregular_timing', label: { en: 'Irregular meal timings (Vishamashana)', hi: 'विषमाशन (भोजन का अनिश्चित समय)' } },
      { value: 'heavy_dinner',     label: { en: 'Heavy or late night dinners', hi: 'देर रात या भारी भोजन' } },
      { value: 'dry_cold_food',    label: { en: 'Frequent dry, packaged, or cold food (Rooksha Ahara)', hi: 'रूखा, ठंडा या पैकेटबंद खाना' } },
      { value: 'oily_spicy',       label: { en: 'Deep fried, excessively spicy or sour foods', hi: 'तला-भुना, अत्यधिक मिर्च-मसाला' } },
      { value: 'balanced_sattvic', label: { en: 'Fresh, warm, homemade vegetarian food (Sattvic Ahara)', hi: 'ताजा, सुपाच्य, सात्विक भोजन' } },
    ],
  },
  {
    id: 'ayush_vihara', key: 'viharaHabits', section: SECTIONS.AYUSH,
    text: { en: '12. Lifestyle, sleep & occupational posture (Vihara / विहार व निद्रा)', hi: '12. आपकी दिनचर्या, नींद और रहन-सहन कैसा है? (विहार)' },
    type: 'multiselect',
    options: [
      { value: 'ratrijagarana', label: { en: 'Late night awakening (Ratri Jagarana)', hi: 'रात्रि जागरण (देर रात तक जागना)' } },
      { value: 'divasvapna',    label: { en: 'Daytime sleeping after lunch (Diva Swapna)', hi: 'दिन में भोजन के बाद सोना' } },
      { value: 'sedentary_desk',label: { en: 'Continuous prolonged sitting / desk work', hi: 'लगातार घंटों तक बैठे रहना' } },
      { value: 'high_stress',   label: { en: 'Mental stress / screen strain', hi: 'मानसिक तनाव / अत्यधिक स्क्रीन समय' } },
      { value: 'good_routine',  label: { en: 'Regular Dinacharya (early riser, 7-8h restful sleep)', hi: 'नियमित दिनचर्या व पर्याप्त नींद' } },
    ],
  },
  {
    id: 'ayush_nidana', key: 'nidana', section: SECTIONS.AYUSH,
    text: { en: '13. Suspected triggers or causative factors (Nidana / निदान)', hi: '13. इस रोग का मुख्य कारण क्या लगता है? (निदान)' },
    type: 'choice',
    options: [
      { value: 'diet_lifestyle', label: { en: 'Dietary errors and erratic lifestyle', hi: 'आहार-विहार की गड़बड़ी' } },
      { value: 'weather_season', label: { en: 'Weather / seasonal transition (Ritu Sandhi)', hi: 'मौसम परिवर्तन / ठंड / गर्मी' } },
      { value: 'mental_stress',  label: { en: 'Severe psychological stress / grief / worry (Manasika)', hi: 'मानसिक तनाव / चिंता / शोक' } },
      { value: 'physical_strain',label: { en: 'Physical trauma, overuse or lifting strain (Abhighata)', hi: 'चोट, अत्यधिक श्रम या खिंचाव' } },
    ],
  },
  {
    id: 'ayush_samprapti', key: 'sampraptiDetail', section: SECTIONS.AYUSH,
    text: { en: '14. Progression and manifestation of your condition (Samprapti / सम्प्राप्ति)', hi: '14. तकलीफ कैसे शुरू होकर कहाँ तक फैली? (सम्प्राप्ति विवरण)' },
    type: 'text',
  },
];

// ─── Master question sequence ────────────────────────────────────────────────
export function buildQuestionSequence(chiefComplaints = [], ayushMode = false) {
  const hpiQuestions = getHPIQuestions(chiefComplaints);
  
  return [
    // Section 1 — Chief Complaint
    chiefComplaintQuestion,
    durationQuestion,
    // Section 2 — HPI
    ...hpiQuestions,
    // Section 3 — Past Medical
    ...PAST_MEDICAL_QUESTIONS,
    // Section 4 — Drug & Allergy
    ...DRUG_ALLERGY_QUESTIONS,
    // Section 5 — Family History
    ...FAMILY_QUESTIONS,
    // Section 6 — Personal History
    ...PERSONAL_QUESTIONS,
    // Section 7 — Review of Systems
    ...ROS_QUESTIONS,
    // Section 8 — AYUSH (optional)
    ...(ayushMode ? AYUSH_QUESTIONS : []),
  ];
}

export const SECTION_LABELS = {
  [SECTIONS.CHIEF_COMPLAINT]: { en: 'Chief Complaint', hi: 'मुख्य शिकायत', icon: '🏥' },
  [SECTIONS.HPI]:             { en: 'Present Illness', hi: 'वर्तमान बीमारी', icon: '📋' },
  [SECTIONS.PAST_MEDICAL]:    { en: 'Past History', hi: 'पिछला इतिहास', icon: '📁' },
  [SECTIONS.DRUG_ALLERGY]:    { en: 'Medicines & Allergy', hi: 'दवा और एलर्जी', icon: '💊' },
  [SECTIONS.FAMILY]:          { en: 'Family History', hi: 'पारिवारिक इतिहास', icon: '👨‍👩‍👧' },
  [SECTIONS.PERSONAL]:        { en: 'Personal History', hi: 'व्यक्तिगत इतिहास', icon: '🧍' },
  [SECTIONS.ROS]:             { en: 'Review of Systems', hi: 'प्रणाली समीक्षा', icon: '🔍' },
  [SECTIONS.AYUSH]:           { en: 'AYUSH Assessment', hi: 'आयुष मूल्यांकन', icon: '🌿' },
};
