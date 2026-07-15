import { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { detectUnitsFromFilenames } from '../lib/units.js';

const ReportContext = createContext(null);

const DEFAULT_CATEGORY = { id: 'vistoriada', nome: 'Vistoriada', cor: '2A78D6', padrao: true };

const initialState = {
  step: 1,
  pdfFiles: [],
  detectedUnits: [],
  naoReconhecidas: [],
  buildingConfig: null, // { pavMin, pavMax, numMin, numMax, lados } — definido ao detectar unidades
  categories: [DEFAULT_CATEGORY],
  unitCategoryOverrides: {}, // { [unitCode]: categoryId }
  reportData: {
    obra: '',
    responsavel: '',
    dataInicio: '',
    dataFim: '',
    construtora: '',
    gerenciadora: '',
  },
  logoFile: null,
  logoUrl: null,
  capaPhotoFile: null,
  capaPhotoUrl: null,
  introContent: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };

    case 'ADD_PDF_FILES': {
      const pdfFiles = [...state.pdfFiles, ...action.files];
      const { parsed, naoReconhecidas, bounds } = detectUnitsFromFilenames(pdfFiles.map(f => f.name));
      const buildingConfig = state.buildingConfig || {
        pavMin: bounds.pavMin, pavMax: bounds.pavMax,
        numMin: bounds.numMin, numMax: bounds.numMax,
        lados: bounds.lados,
      };
      return { ...state, pdfFiles, detectedUnits: parsed, naoReconhecidas, buildingConfig };
    }

    case 'CLEAR_PDF_FILES':
      return { ...state, pdfFiles: [], detectedUnits: [], naoReconhecidas: [], buildingConfig: null, unitCategoryOverrides: {} };

    case 'SET_BUILDING_CONFIG':
      return { ...state, buildingConfig: { ...state.buildingConfig, ...action.config } };

    case 'ADD_CATEGORY': {
      const id = action.category.id || `cat_${Date.now()}`;
      return { ...state, categories: [...state.categories, { ...action.category, id }] };
    }

    case 'REMOVE_CATEGORY': {
      if (action.id === DEFAULT_CATEGORY.id) return state;
      const overrides = { ...state.unitCategoryOverrides };
      Object.keys(overrides).forEach(k => { if (overrides[k] === action.id) delete overrides[k]; });
      return { ...state, categories: state.categories.filter(c => c.id !== action.id), unitCategoryOverrides: overrides };
    }

    case 'SET_UNIT_CATEGORY': {
      const overrides = { ...state.unitCategoryOverrides };
      if (action.categoryId === null) {
        delete overrides[action.unitCode];
      } else {
        overrides[action.unitCode] = action.categoryId;
      }
      return { ...state, unitCategoryOverrides: overrides };
    }

    case 'SET_REPORT_DATA':
      return { ...state, reportData: { ...state.reportData, ...action.data } };

    case 'SET_LOGO':
      return { ...state, logoFile: action.file, logoUrl: action.url };

    case 'SET_COVER_PHOTO':
      return { ...state, capaPhotoFile: action.file, capaPhotoUrl: action.url };

    case 'SET_INTRO_CONTENT':
      return { ...state, introContent: action.content };

    default:
      return state;
  }
}

export function ReportProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(() => ({
    setStep: (step) => dispatch({ type: 'SET_STEP', step }),
    addPdfFiles: (files) => dispatch({ type: 'ADD_PDF_FILES', files }),
    clearPdfFiles: () => dispatch({ type: 'CLEAR_PDF_FILES' }),
    setBuildingConfig: (config) => dispatch({ type: 'SET_BUILDING_CONFIG', config }),
    addCategory: (category) => dispatch({ type: 'ADD_CATEGORY', category }),
    removeCategory: (id) => dispatch({ type: 'REMOVE_CATEGORY', id }),
    setUnitCategory: (unitCode, categoryId) => dispatch({ type: 'SET_UNIT_CATEGORY', unitCode, categoryId }),
    setReportData: (data) => dispatch({ type: 'SET_REPORT_DATA', data }),
    setLogo: (file, url) => dispatch({ type: 'SET_LOGO', file, url }),
    setCapaPhoto: (file, url) => dispatch({ type: 'SET_COVER_PHOTO', file, url }),
    setIntroContent: (content) => dispatch({ type: 'SET_INTRO_CONTENT', content }),
  }), []);

  const value = useMemo(() => ({ state, ...actions }), [state, actions]);

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport precisa estar dentro de ReportProvider');
  return ctx;
}

export { DEFAULT_CATEGORY };
