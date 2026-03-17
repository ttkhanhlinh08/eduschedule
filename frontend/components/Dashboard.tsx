
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BellSchedule, 
  GlobalParams, 
  Subject, 
  Grade, 
  Class, 
  Teacher, 
  ScheduleResult, 
  TeacherType, 
  SubjectType,
  Language,
  ModelConfig
} from '../types.ts';
import { 
  DEFAULT_BELL_SCHEDULE, 
  DEFAULT_GLOBAL_PARAMS, 
  INITIAL_SUBJECTS, 
  INITIAL_GRADES, 
  INITIAL_CLASSES, 
  INITIAL_TEACHERS,
  DEFAULT_MODEL_CONFIG 
} from '../constants.ts';
import { translations } from '../i18n.ts';
import DataManagement from './DataManagement.tsx';
import ScheduleView from './ScheduleView.tsx';
import { generateSchedule, fetchDataset, getProgress, getResult, stopSolverAPI } from '../services/main.ts';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');
  const [language, setLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState(false);
  const [bell, setBell] = useState<BellSchedule>(DEFAULT_BELL_SCHEDULE);
  const [params, setParams] = useState<GlobalParams>(DEFAULT_GLOBAL_PARAMS);
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [grades, setGrades] = useState<Grade[]>(INITIAL_GRADES);
  const [classes, setClasses] = useState<Class[]>(INITIAL_CLASSES);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_MODEL_CONFIG);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const intervalRef = React.useRef<number | null>(null);
  const [progress, setProgress] = useState<{
    feasible: boolean;
    bestScore: number | null;
  }>({
    feasible: false,
    bestScore: null
  });

  useEffect(() => {
    async function loadInitialData() {
      try {
        const data = await fetchDataset();

        if (data?.bell) setBell(data.bell);
        if (data?.params) setParams(data.params);
        if (data?.subjects) setSubjects(data.subjects);
        if (data?.grades) setGrades(data.grades);
        if (data?.classes) setClasses(data.classes);
        if (data?.teachers) setTeachers(data.teachers);
        if (data?.language) setLanguage(data.language);
        if (data?.modelConfig) setModelConfig(data.modelConfig);
      } catch (err) {
        console.warn("Using default dataset");
      } finally {
        setLoaded(true);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    const savedJob = localStorage.getItem("jobId");
    if (savedJob) {
      setJobId(savedJob);
    }
  }, []);

  const t = translations[language];

  // MASTER NORMALIZATION EFFECT
  const normalizedGrades = useMemo(() => {
    return grades.map(g => {
      const filteredSubjects = g.subjects.filter(gs =>
        subjects.some(s => s.id === gs.subjectId)
      );

      return {
        ...g,
        subjects: filteredSubjects
      };
    });
  }, [grades, subjects]);

  const normalizedTeachers = useMemo(() => {
    return teachers.map(t => {
      const filteredSubjects = t.subjectIds.filter(id =>
        subjects.some(s => s.id === id)
      );

      return {
        ...t,
        subjectIds: filteredSubjects
      };
    });
  }, [teachers, subjects]);

  const normalizedClasses = useMemo(() => {
    return classes.filter(c =>
      normalizedGrades.some(g => g.id === c.gradeId)
    );
  }, [classes, normalizedGrades]);

  useEffect(() => {
    setResult(null);
  }, [normalizedGrades, normalizedTeachers, normalizedClasses]);

  const handleRunOptimizer = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setLoading(true);
    setProgress({ feasible: false, bestScore: null });

    const id = await generateSchedule(
      bell,
      params,
      subjects,
      normalizedGrades,
      normalizedClasses,
      normalizedTeachers,
      language,
      modelConfig
    );

    setJobId(id);
    localStorage.setItem("jobId", id);

    let isFetching = false;

    intervalRef.current = setInterval(async () => {
      if (isFetching) return;
      isFetching = true;

      try {
        const data = await getProgress(id);

        // update feasible progress
        if (data.feasible) {
          setProgress({
            feasible: true,
            bestScore: data.best_score
          });
        }

        // finished
        if (data.status === "finished") {
          const schedule = await getResult(id);

          setResult(schedule);
          setActiveTab('output');

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          setLoading(false);
        }

      } catch (err) {
        console.warn("Server timeout or restart");

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        setLoading(false);
      } finally {
        isFetching = false;
      }
    }, 2000);
  };

  const stopSolver = async () => {
    if (!jobId) return;

    await stopSolverAPI(jobId);
    const schedule = await getResult(jobId);

    setResult(schedule);
    setActiveTab('output');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setLoading(false);
  };

  if (!loaded) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
            <i className="fas fa-calendar-check text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">{t.appName}</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">{t.tagline}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${language === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('vi')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${language === 'vi' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              VI
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('input')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'input' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {t.dataEntry}
            </button>
            <button 
              onClick={() => setActiveTab('output')}
              disabled={!result}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'output' ? 'bg-white shadow-sm text-indigo-600' : result ? 'text-slate-600 hover:text-slate-900' : 'text-slate-300 cursor-not-allowed'}`}
            >
              {t.timetables}
            </button>
          </div>
          <button 
            onClick={handleRunOptimizer}
            disabled={loading}
            className={`px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> {t.optimizing}</>
            ) : (
              <><i className="fas fa-play"></i> {t.generate}</>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {loading && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white p-6">
            <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-md w-full text-slate-900">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-microchip text-3xl text-indigo-600"></i>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">{t.analyzing}</h3>
              {progress.feasible && (
                <div className="mt-4 text-sm text-emerald-600 font-semibold">
                  Feasible solution found — Score: {progress.bestScore}
                </div>
              )}
              <p className="text-center text-slate-500 text-sm mb-4 leading-relaxed">
                {t.analyzingDesc}
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
              </div>
              <button
                onClick={stopSolver}
                className="mt-6 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600"
              >
                Stop & View Current Solution
              </button>
            </div>
          </div>
        )}

        {activeTab === 'input' ? (
          <DataManagement 
            loaded={loaded}
            language={language}
            bell={bell} setBell={setBell}
            params={params} setParams={setParams}
            subjects={subjects} setSubjects={setSubjects}
            grades={grades} setGrades={setGrades}
            classes={classes} setClasses={setClasses}
            teachers={teachers} setTeachers={setTeachers}
            modelConfig={modelConfig} setModelConfig={setModelConfig}
          />
        ) : (
          result && <ScheduleResultView 
            language={language}
            result={result} 
            teachers={teachers} 
            classes={classes} 
            subjects={subjects} 
            bell={bell}
            params={params}
          />
        )}
      </main>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

// Internal Sub-component for result orchestration
const ScheduleResultView: React.FC<{ 
  language: Language,
  result: ScheduleResult, 
  teachers: Teacher[], 
  classes: Class[], 
  subjects: Subject[], 
  bell: BellSchedule,
  params: GlobalParams
}> = ({ language, result, teachers, classes, subjects, bell, params }) => {
  const [viewType, setViewType] = useState<'class' | 'teacher' | 'sanity'>('class');
  const t = translations[language];

  const statusConfig = {
    SUCCESS: {
      container: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      iconWrapper: 'bg-emerald-100 text-emerald-600',
      icon: 'fa-check-circle',
      title: t.success,
      message:
        language === 'vi'
          ? `Đã tìm thấy giải pháp tối ưu với ${result.assignments.length} nhiệm vụ và ${result.penalties} điểm phạt.`
          : `Found an optimal solution with ${result.assignments.length} assignments and ${result.penalties} penalty points.`,
    },
    PARTIAL: {
      container: 'bg-amber-50 border-amber-100 text-amber-800',
      iconWrapper: 'bg-amber-100 text-amber-600',
      icon: 'fa-exclamation-circle',
      title: t.partial || 'Partial Success',
      message:
        language === 'vi'
          ? `Đã tìm thấy giải pháp khả thi nhưng chưa tối ưu. ${result.assignments.length} nhiệm vụ, ${result.penalties} điểm phạt.`
          : `A feasible but non-optimal solution was found. ${result.assignments.length} assignments with ${result.penalties} penalty points.`,
    },
    FAILED: {
      container: 'bg-rose-50 border-rose-100 text-rose-800',
      iconWrapper: 'bg-rose-100 text-rose-600',
      icon: 'fa-times-circle',
      title: t.failed,
      message:
        language === 'vi'
          ? `Không tìm được giải pháp hợp lệ. Vui lòng kiểm tra lại ràng buộc hoặc dữ liệu đầu vào.`
          : `No feasible solution found. Please review constraints or input data.`,
    },
  };

  const config = statusConfig[result.status] || statusConfig.FAILED;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Result Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center gap-4 ${config.container}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.iconWrapper}`}>
          <i className={`fas ${config.icon} text-xl`}></i>
        </div>
        <div>
          <h3 className="font-bold">{config.title}</h3>
          <p className="text-sm opacity-90">{config.message}</p>
        </div>
      </div>

      {result?.violatedConstraints?.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{t.violatedTitle}</h4>
          <ul className="space-y-2">
            {result.violatedConstraints.map((v, i) => {
              const template = t[v.code as keyof typeof t];

              const message = template
                ? template.replace(/\{\{(.*?)\}\}/g, (_, key) =>
                    v.params[key] !== undefined ? String(v.params[key]) : ''
                  )
                : v.code;

              return (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <i className="fas fa-times-circle text-rose-500 mt-1"></i>
                  <span>{message}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* View Switcher */}
      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-lg w-fit">
        <button 
          onClick={() => setViewType('class')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewType === 'class' ? 'bg-white shadow text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {t.byClass}
        </button>
        <button 
          onClick={() => setViewType('teacher')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewType === 'teacher' ? 'bg-white shadow text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {t.byTeacher}
        </button>
        <button 
          onClick={() => setViewType('sanity')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewType === 'sanity' ? 'bg-white shadow text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {t.sanityCheck}
        </button>
      </div>

      {/* Render the actual grid */}
      <ScheduleView 
        language={language}
        type={viewType}
        result={result}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        bell={bell}
        params={params}
      />
    </div>
  );
};

export default Dashboard;
